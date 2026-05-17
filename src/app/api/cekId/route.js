import { NextResponse } from 'next/server';
import crypto from 'crypto';

function bersihinText(value) {
  return String(value || '').trim();
}

function inputAman(value) {
  // Angka, huruf, underscore, strip.
  // Cukup aman buat ID player, server, dan kode game.
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function bikinSignatureApigames(merchantId, secretKey) {
  // Gua pertahankan format signature yang lu pakai sebelumnya.
  return crypto
    .createHash('md5')
    .update(merchantId + secretKey)
    .digest('hex');
}

export async function POST(request) {
  try {
    const body = await request.json();

    const idPlayer = bersihinText(body.id_player);
    const serverPlayer = bersihinText(body.server_player);
    const kodeGame = bersihinText(body.kode_game).toLowerCase();

    // 1. VALIDASI INPUT WAJIB
    if (!idPlayer || !kodeGame) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'ID atau Kode Game kosong bre!'
        },
        { status: 400 }
      );
    }

    // 2. VALIDASI FORMAT INPUT
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

    // 3. BATAS PANJANG BIAR GAK DIKIRIM INPUT NGACO
    if (idPlayer.length > 40 || serverPlayer.length > 30 || kodeGame.length > 50) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Input kepanjangan bre!'
        },
        { status: 400 }
      );
    }

    // 4. CEK ENV APIGAMES
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

    // 5. GABUNG ID + SERVER KALAU ADA
    // Buat ML biasanya ID + Zone digabung.
    // Kalau FF gak ada server_player, ya cuma idPlayer doang.
    let finalUserId = idPlayer;

    if (serverPlayer) {
      finalUserId = `${idPlayer}${serverPlayer}`;
    }

    // 6. BIKIN URL APIGAMES DENGAN ENCODE
    const urlPabrik =
      `https://v1.apigames.id/merchant/${encodeURIComponent(merchantId)}/cek-username/${encodeURIComponent(kodeGame)}` +
      `?user_id=${encodeURIComponent(finalUserId)}` +
      `&signature=${encodeURIComponent(signature)}`;

    // 7. KASIH TIMEOUT BIAR GAK GANTUNG
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const responPabrik = await fetch(urlPabrik, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timeout);

    const hasilPabrik = await responPabrik.json();

    // 8. HANDLE KALAU APIGAMES BALIKIN ERROR
    if (!responPabrik.ok || hasilPabrik.status === 0 || !hasilPabrik.data) {
      return NextResponse.json(
        {
          sukses: false,
          pesan:
            hasilPabrik.error_msg ||
            hasilPabrik.message ||
            'ID gak ketemu bre! Cek lagi.'
        },
        { status: 404 }
      );
    }

    // 9. AMBIL NICKNAME DARI BEBERAPA KEMUNGKINAN FORMAT
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
          pesan: 'Nickname gak kebaca dari APIGames bre!'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        sukses: true,
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