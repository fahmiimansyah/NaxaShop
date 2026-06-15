import { NextResponse } from 'next/server';
import db from '../../../lib/db';

function paramGameValid(value) {
  const param = String(value || '').trim().toLowerCase();

  return /^\d+$/.test(param) || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(param);
}

function paramAdalahId(value) {
  return /^\d+$/.test(String(value || '').trim());
}

export async function GET(request, { params }) {
  try {
    const paket = await params;
    const gameParam = String(paket.id || '').trim().toLowerCase();

    if (!gameParam || !paramGameValid(gameParam)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'ID game atau slug gak valid bre!'
        },
        { status: 400 }
      );
    }

    // Support dua versi URL:
    // - Lama: /topup/1
    // - SEO:  /topup/mobile-legends
    const cariPakaiId = paramAdalahId(gameParam);

    const [gameResult] = await db.query(
      `SELECT *
       FROM games
       WHERE ${cariPakaiId ? 'id = ?' : 'slug = ?'}
         AND status_game IN ('aktif', 'coming_soon', 'gangguan')
       LIMIT 1`,
      [gameParam]
    );

    if (gameResult.length === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Gamenya ga ketemu bre!'
        },
        { status: 404 }
      );
    }

    const game = gameResult[0];

    // Produk tetap pakai game.id asli dari database.
    const [produkResult] = await db.query(
      `SELECT
         id,
         game_id,
         kode_produk,
         nama_produk,
         harga,
         harga_coret,
         status_produk
       FROM produk
       WHERE game_id = ?
         AND status_produk IN ('aktif', 'coming_soon', 'gangguan')
       ORDER BY
         CASE status_produk
           WHEN 'aktif' THEN 1
           WHEN 'coming_soon' THEN 2
           WHEN 'gangguan' THEN 3
           ELSE 4
         END,
         harga ASC`,
      [game.id]
    );

    const dataLengkap = {
      ...game,
      produk: produkResult
    };

    return NextResponse.json(dataLengkap);
  } catch (error) {
    console.error('Kulkas detail game error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal nyambung ke Kulkas'
      },
      { status: 500 }
    );
  }
}
