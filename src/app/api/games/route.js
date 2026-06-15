import { NextResponse } from 'next/server';
import db from '../../lib/db';
import { ensureGameCategoryColumns } from '../../lib/game-categories';

export async function GET() {
  try {
    await ensureGameCategoryColumns(db);

    const [hasil] = await db.query(
      `SELECT *
       FROM games
       WHERE status_game IN ('aktif', 'coming_soon', 'gangguan')
       ORDER BY
         CASE status_game
           WHEN 'aktif' THEN 1
           WHEN 'coming_soon' THEN 2
           WHEN 'gangguan' THEN 3
           ELSE 4
         END,
         sort_order ASC,
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
