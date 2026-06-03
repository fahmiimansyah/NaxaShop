import { NextResponse } from 'next/server';
import db from '../../lib/db';

export async function GET() {
  try {
    const [hasil] = await db.query(
      `SELECT *
       FROM games
       WHERE status_game IN ('aktif', 'coming_soon')
       ORDER BY 
         CASE status_game
           WHEN 'aktif' THEN 1
           WHEN 'coming_soon' THEN 2
           ELSE 3
         END,
         id ASC`
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