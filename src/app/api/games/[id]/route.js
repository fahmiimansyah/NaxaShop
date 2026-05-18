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

    // 1. Ambil detail gamenya
    const [gameResult] = await db.query(
      `SELECT *
       FROM games
       WHERE id = ?
       AND status_game = 'aktif'
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

    // 2. Ambil daftar produk/diamond buat game itu
    const [produkResult] = await db.query(
      `SELECT *
       FROM produk
       WHERE game_id = ?
       AND status_produk = 'aktif'
       ORDER BY harga ASC`,
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