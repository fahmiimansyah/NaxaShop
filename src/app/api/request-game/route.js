import { NextResponse } from 'next/server';
import db from '../../lib/db';
import { rateLimit } from '../../lib/rate-limit';

function bersihinText(value) {
  return String(value || '').trim();
}

export async function POST(request) {
  try {
    const limit = await rateLimit(request, {
      key: 'request-game',
      limit: 5,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Terlalu sering kirim request bre. Coba lagi ${limit.retryAfter} detik lagi.`
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    const namaGame = bersihinText(body.nama_game);
    const kontak = bersihinText(body.kontak);
    const catatan = bersihinText(body.catatan);

    if (!namaGame) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Nama game wajib diisi bre.'
        },
        { status: 400 }
      );
    }

    if (namaGame.length > 150 || kontak.length > 100 || catatan.length > 1000) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Input kepanjangan bre.'
        },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO request_game (nama_game, kontak, catatan)
       VALUES (?, ?, ?)`,
      [
        namaGame,
        kontak || null,
        catatan || null
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Request game berhasil dikirim. Makasih masukannya bree!'
    });
  } catch (error) {
    console.error('POST /api/request-game error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal kirim request game.'
      },
      { status: 500 }
    );
  }
}