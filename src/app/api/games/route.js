import { NextResponse } from 'next/server';
import db from '../../lib/db';

export async function GET() {
  try {
    const [hasil] = await db.query(
      `SELECT *
       FROM games
       WHERE status_game = 'aktif'
       ORDER BY id ASC`
    );

    return NextResponse.json(hasil);
  } catch (error) {
    console.error('Kulkas games error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal nyambung ke Kulkas'
      },
      { status: 500 }
    );
  }
}