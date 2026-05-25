import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit } from '../../lib/rate-limit';

const GAME_APIGAMES = [
  'mobilelegend',
  'mobile_legends',
  'mobile-legends',
  'ml',
  'freefire',
  'free-fire',
  'ff'
];

const GAME_ENKA_GENSHIN = [
  'genshin',
  'genshinimpact',
  'genshin-impact',
  'genshin_impact',
  'gi'
];

const GAME_ENKA_HSR = [
  'hsr',
  'honkai-star-rail',
  'honkai_star_rail',
  'honkaistarrail',
  'star-rail',
  'starrail'
];

const enkaCache = globalThis.__NAXASHOP_ENKA_CACHE__ || new Map();
globalThis.__NAXASHOP_ENKA_CACHE__ = enkaCache;

function bersihinText(value) {
  return String(value || '').trim();
}

function normalisasiGame(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function inputAman(value) {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function inputUidEnkaAman(value) {
  return /^\d{6,12}$/.test(String(value || '').trim());
}

function bikinSignatureApigames(merchantId, secretKey) {
  return crypto
    .createHash('md5')
    .update(merchantId + secretKey)
    .digest('hex');
}

function gameApigames(kodeGame) {
  return GAME_APIGAMES.includes(kodeGame);
}

function gameGenshin(kodeGame) {
  return GAME_ENKA_GENSHIN.includes(kodeGame);
}

function gameHsr(kodeGame) {
  return GAME_ENKA_HSR.includes(kodeGame);
}

function ambilCache(key) {
  const dataCache = enkaCache.get(key);

  if (!dataCache) return null;

  if (Date.now() > dataCache.expiredAt) {
    enkaCache.delete(key);
    return null;
  }

  return dataCache.value;
}

function simpanCache(key, value, ttlDetik = 60) {
  const ttl = Number(ttlDetik || 60);
  const ttlAman = Math.max(30, Math.min(ttl, 3600));

  enkaCache.set(key, {
    value,
    expiredAt: Date.now() + ttlAman * 1000
  });
}

function serverCocokDenganUid(uid, serverPlayer) {
  if (!serverPlayer) return true;

  const prefixMap = {
    os_usa: ['6'],
    os_euro: ['7'],
    os_asia: ['8'],
    os_cht: ['9']
  };

  const prefixYangValid = prefixMap[serverPlayer];

  if (!prefixYangValid) return true;

  return prefixYangValid.some((prefix) => String(uid).startsWith(prefix));
}

function responStop(pesan, status = 400) {
  return NextResponse.json(
    {
      success: false,
      status: 'INVALID',
      message: pesan,

      // legacy field biar kode lama gak langsung pecah kalau masih kepakai
      sukses: false,
      support_cek_nickname: true,
      boleh_checkout: false,
      perlu_konfirmasi_manual: false,
      level_alert: 'error',
      pesan
    },
    { status }
  );
}

function responWarningManual(pesan) {
  return NextResponse.json(
    {
      success: false,
      status: 'UNAVAILABLE',
      message: pesan,

      // legacy field
      sukses: false,
      support_cek_nickname: true,
      boleh_checkout: true,
      perlu_konfirmasi_manual: true,
      level_alert: 'warning',
      pesan
    },
    { status: 200 }
  );
}

function responInfoManual(pesan) {
  return NextResponse.json(
    {
      success: false,
      status: 'UNAVAILABLE',
      message: pesan,

      // legacy field
      sukses: false,
      support_cek_nickname: false,
      boleh_checkout: true,
      perlu_konfirmasi_manual: true,
      level_alert: 'info',
      pesan
    },
    { status: 200 }
  );
}

function responSukses({ nickname, level = null, region = null, ttl = null }) {
  return NextResponse.json(
    {
      success: true,
      status: 'FOUND',
      username: nickname,

      // legacy field
      sukses: true,
      support_cek_nickname: true,
      boleh_checkout: true,
      perlu_konfirmasi_manual: false,
      level_alert: 'success',
      nickname,
      level,
      region,
      ttl,
      pesan: 'Username berhasil kebaca.',
      message: 'Username berhasil kebaca.'
    },
    { status: 200 }
  );
}

async function fetchJsonDenganTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const respon = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    let data = null;

    try {
      data = await respon.json();
    } catch {
      data = null;
    }

    return {
      ok: respon.ok,
      status: respon.status,
      data
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function cekViaApiGames({ idPlayer, serverPlayer, kodeGame }) {
  const merchantId = process.env.APIGAMES_MERCHANT_ID;
  const secretKey = process.env.APIGAMES_SECRET_KEY || process.env.APIGAMES_SECRET;

  if (!merchantId || !secretKey) {
    console.error('Konfigurasi cek username ML/FF belum siap');

    return responWarningManual(
      'Server cek username lagi sibuk. Lu tetap bisa lanjut top up manual, tapi pastikan ID dan server sudah benar.'
    );
  }

  const signature = bikinSignatureApigames(merchantId, secretKey);

  let finalUserId = idPlayer;

  if (serverPlayer) {
    finalUserId = `${idPlayer}${serverPlayer}`;
  }

  const urlPabrik =
    `https://v1.apigames.id/merchant/${encodeURIComponent(merchantId)}/cek-username/${encodeURIComponent(kodeGame)}` +
    `?user_id=${encodeURIComponent(finalUserId)}` +
    `&signature=${encodeURIComponent(signature)}`;

  const hasil = await fetchJsonDenganTimeout(
    urlPabrik,
    {
      method: 'GET',
      cache: 'no-store'
    },
    10000
  );

  const hasilPabrik = hasil.data || {};

  if (!hasil.ok) {
    if (hasil.status === 429 || hasil.status >= 500) {
      return responWarningManual(
        'Server cek username lagi rame. Lu tetap bisa lanjut top up manual, tapi pastikan ID dan server sudah benar.'
      );
    }

    return responStop('ID gak ketemu bre. Cek lagi User ID atau Zone ID-nya.', 404);
  }

  if (hasilPabrik.status === 0 || !hasilPabrik.data) {
    return responStop(
      hasilPabrik.error_msg ||
        hasilPabrik.message ||
        'ID gak ketemu bre. Cek lagi User ID atau Zone ID-nya.',
      404
    );
  }

  const nickname =
    typeof hasilPabrik.data === 'string'
      ? hasilPabrik.data
      : hasilPabrik.data?.username ||
        hasilPabrik.data?.nickname ||
        hasilPabrik.data?.name;

  if (!nickname) {
    return responWarningManual(
      'Username belum kebaca dari server. Lu tetap bisa lanjut top up manual, tapi pastikan ID dan server sudah benar.'
    );
  }

  return responSukses({ nickname });
}

function ambilNicknameEnka(data) {
  return (
    data?.playerInfo?.nickname ||
    data?.player?.nickname ||
    data?.detailInfo?.nickname ||
    data?.data?.player?.nickname ||
    data?.data?.detailInfo?.nickname ||
    data?.nickname ||
    null
  );
}

function ambilLevelEnka(data) {
  return (
    data?.playerInfo?.level ||
    data?.player?.level ||
    data?.detailInfo?.level ||
    data?.data?.player?.level ||
    data?.data?.detailInfo?.level ||
    null
  );
}

async function cekViaEnka({ idPlayer, jenisGame }) {
  if (!inputUidEnkaAman(idPlayer)) {
    return responStop('UID harus angka ya bre.', 400);
  }

  const cacheKey = `enka:${jenisGame}:${idPlayer}`;
  const cached = ambilCache(cacheKey);

  if (cached) {
    return NextResponse.json(
      {
        ...cached,
        from_cache: true
      },
      { status: 200 }
    );
  }

  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    'support@naxashop.com';

  const userAgent =
    process.env.ENKA_USER_AGENT ||
    `NaXaShop/1.0 cek-username (${supportEmail})`;

  const url =
    jenisGame === 'genshin'
      ? `https://enka.network/api/uid/${encodeURIComponent(idPlayer)}?info`
      : `https://enka.network/api/hsr/uid/${encodeURIComponent(idPlayer)}`;

  const hasil = await fetchJsonDenganTimeout(
    url,
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json'
      }
    },
    10000
  );

  const dataEnka = hasil.data || {};

  if (!hasil.ok) {
    if (hasil.status === 400) {
      return responStop('Format UID salah bre. UID harus angka.', 400);
    }

    if (hasil.status === 404) {
      return responStop('UID gak ketemu bre. Cek lagi angkanya.', 404);
    }

    if (hasil.status === 424 || hasil.status === 429 || hasil.status >= 500) {
      return responWarningManual(
        'Server cek username lagi sibuk. Lu tetap bisa lanjut top up manual, tapi pastikan UID dan server sudah benar.'
      );
    }

    return responWarningManual(
      'Cek username game ini lagi belum bisa dipakai. Lu tetap bisa lanjut top up manual, tapi pastikan UID dan server sudah benar.'
    );
  }

  const nickname = ambilNicknameEnka(dataEnka);
  const level = ambilLevelEnka(dataEnka);
  const ttl = dataEnka?.ttl || 60;

  if (!nickname) {
    return responWarningManual(
      'UID kebaca, tapi username belum muncul dari server. Lu tetap bisa lanjut top up manual, tapi pastikan UID dan server sudah benar.'
    );
  }

  const hasilBersih = {
    success: true,
    status: 'FOUND',
    username: nickname,

    // legacy field
    sukses: true,
    support_cek_nickname: true,
    boleh_checkout: true,
    perlu_konfirmasi_manual: false,
    level_alert: 'success',
    nickname,
    level,
    region: dataEnka?.region || dataEnka?.player?.region || null,
    ttl,
    pesan: 'Username berhasil kebaca.',
    message: 'Username berhasil kebaca.'
  };

  simpanCache(cacheKey, hasilBersih, ttl);

  return NextResponse.json(hasilBersih, { status: 200 });
}

export async function POST(request) {
  try {
    const limit = rateLimit(request, {
      key: 'cek-nickname',
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return responWarningManual(
        `Server cek username lagi rame. Lu tetap bisa lanjut top up manual, tapi pastikan data sudah benar.`
      );
    }

    const body = await request.json();

    const idPlayer = bersihinText(body.id_player);
    const serverPlayer = bersihinText(body.server_player);
    const kodeGame = normalisasiGame(body.kode_game);

    if (!idPlayer || !kodeGame) {
      return responStop('ID atau Kode Game kosong bre!', 400);
    }

    if (!inputAman(kodeGame)) {
      return responStop('Format kode game gak valid bre!', 400);
    }

    if (idPlayer.length > 40 || serverPlayer.length > 30 || kodeGame.length > 50) {
      return responStop('Input kepanjangan bre!', 400);
    }

    if (gameGenshin(kodeGame)) {
      if (!serverCocokDenganUid(idPlayer, serverPlayer)) {
        return responStop(
          'UID tidak cocok dengan server yang dipilih. Cek lagi UID dan server akun lu.',
          400
        );
      }

      return cekViaEnka({
        idPlayer,
        jenisGame: 'genshin'
      });
    }

    if (gameHsr(kodeGame)) {
      if (!serverCocokDenganUid(idPlayer, serverPlayer)) {
        return responStop(
          'UID tidak cocok dengan server yang dipilih. Cek lagi UID dan server akun lu.',
          400
        );
      }

      return cekViaEnka({
        idPlayer,
        jenisGame: 'hsr'
      });
    }

    if (gameApigames(kodeGame)) {
      if (!inputAman(idPlayer)) {
        return responStop('Format ID Player gak valid bre!', 400);
      }

      if (serverPlayer && !inputAman(serverPlayer)) {
        return responStop('Format server/zone gak valid bre!', 400);
      }

      return cekViaApiGames({
        idPlayer,
        serverPlayer,
        kodeGame
      });
    }

    return responInfoManual(
      'Cek username otomatis belum tersedia buat game ini. Lu tetap bisa lanjut top up manual, tapi pastikan ID dan server sudah benar.'
    );
  } catch (error) {
    console.error('Error Cek Nickname:', error);

    if (error.name === 'AbortError') {
      return responWarningManual(
        'Server cek username kelamaan jawab. Lu tetap bisa lanjut top up manual, tapi pastikan ID dan server sudah benar.'
      );
    }

    return responWarningManual(
      'Server cek username lagi sibuk. Lu tetap bisa lanjut top up manual, tapi pastikan ID dan server sudah benar.'
    );
  }
}