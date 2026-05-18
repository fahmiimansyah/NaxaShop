import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit } from '../../lib/rate-limit';

const GAME_SUPPORT_CEK_NICKNAME = [
  'mobilelegend',
  'mobile_legends',
  'mobile-legends',
  'ml',
  'freefire',
  'free-fire',
  'ff'
];

function bersihinText(value) {
  return String(value || '').trim();
}

function inputAman(value) {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function bikinSignatureApigames(merchantId, secretKey) {
  return crypto
    .createHash('md5')
    .update(merchantId + secretKey)
    .digest('hex');
}

function gameBisaCekNickname(kodeGame) {
  return GAME_SUPPORT_CEK_NICKNAME.includes(String(kodeGame || '').toLowerCase());
}

export async function POST(request) {
  try {
    // RATE LIMIT: maksimal 10 cek nickname / menit / IP
    const limit = rateLimit(request, {
      key: 'cek-nickname',
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Terlalu sering cek ID bre. Coba lagi ${limit.retryAfter} detik lagi.`
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    const idPlayer = bersihinText(body.id_player);
    const serverPlayer = bersihinText(body.server_player);
    const kodeGame = bersihinText(body.kode_game).toLowerCase();

    if (!idPlayer || !kodeGame) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'ID atau Kode Game kosong bre!'
        },
        { status: 400 }
      );
    }

    // INI FIX GENSHIN / HSR / DLL
    // Kalau game gak support cek nickname, jangan tembak APIGames.
    if (!gameBisaCekNickname(kodeGame)) {
      return NextResponse.json(
        {
          sukses: false,
          support_cek_nickname: false,
          pesan: 'Game ini belum support cek nickname otomatis. Lanjut checkout manual aja bre, pastikan ID dan server sudah benar.'
        },
        { status: 200 }
      );
    }

    if (!inputAman(idPlayer)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format ID Player gak valid bre!'
        },
        { status: 400 }
      );
    }

    if (!inputAman(kodeGame)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format kode game gak valid bre!'
        },
        { status: 400 }
      );
    }

    if (serverPlayer && !inputAman(serverPlayer)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format server/zone gak valid bre!'
        },
        { status: 400 }
      );
    }

    if (idPlayer.length > 40 || serverPlayer.length > 30 || kodeGame.length > 50) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Input kepanjangan bre!'
        },
        { status: 400 }
      );
    }

    const merchantId = process.env.APIGAMES_MERCHANT_ID;
    const secretKey = process.env.APIGAMES_SECRET;

    if (!merchantId || !secretKey) {
      console.error('APIGAMES_MERCHANT_ID / APIGAMES_SECRET belum disetting');

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Konfigurasi cek nickname belum siap bre!'
        },
        { status: 500 }
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const responPabrik = await fetch(urlPabrik, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeout);

    const hasilPabrik = await responPabrik.json();

    if (!responPabrik.ok || hasilPabrik.status === 0 || !hasilPabrik.data) {
      return NextResponse.json(
        {
          sukses: false,
          support_cek_nickname: true,
          pesan:
            hasilPabrik.error_msg ||
            hasilPabrik.message ||
            'ID gak ketemu bre! Cek lagi.'
        },
        { status: 404 }
      );
    }

    const nickname =
      typeof hasilPabrik.data === 'string'
        ? hasilPabrik.data
        : hasilPabrik.data?.username ||
          hasilPabrik.data?.nickname ||
          hasilPabrik.data?.name;

    if (!nickname) {
      return NextResponse.json(
        {
          sukses: false,
          support_cek_nickname: true,
          pesan: 'Nickname gak kebaca dari APIGames bre!'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        sukses: true,
        support_cek_nickname: true,
        nickname
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Cek Nickname:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'APIGames kelamaan jawab bre, coba lagi.'
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Radar error bre, server cek nickname bermasalah.'
      },
      { status: 500 }
    );
  }
}