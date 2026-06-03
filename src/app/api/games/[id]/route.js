import { NextResponse } from 'next/server';
import db from '../../../lib/db';

function idGameValid(id) {
  return /^\d+$/.test(String(id));
}

export async function GET(request, { params }) {
  try {
    const paket = await params;
    const gameId = String(paket.id || '').trim();

    if (!gameId || !idGameValid(gameId)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'ID game gak valid bre!'
        },
        { status: 400 }
      );
    }

    // 1. Ambil detail game.
    // Aktif = bisa dibeli.
    // Coming soon = tampil, tapi checkout dikunci di frontend.
    // Nonaktif = disembunyikan total.
    const [gameResult] = await db.query(
      `SELECT *
       FROM games
       WHERE id = ?
         AND status_game IN ('aktif', 'coming_soon')
       LIMIT 1`,
      [gameId]
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

    // 2. Ambil produk buat game itu.
    // Produk coming soon tetap tampil, tapi tidak bisa dipilih/beli.
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
         AND status_produk IN ('aktif', 'coming_soon')
       ORDER BY 
         CASE status_produk
           WHEN 'aktif' THEN 1
           WHEN 'coming_soon' THEN 2
           ELSE 3
         END,
         harga ASC`,
      [gameId]
    );

    const dataLengkap = {
      ...gameResult[0],
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