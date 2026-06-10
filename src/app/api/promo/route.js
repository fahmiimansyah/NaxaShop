import { NextResponse } from 'next/server';
import db from '../../lib/db';

export async function GET() {
  try {
    const [promo] = await db.query(
      `SELECT 
         id,
         badge,
         title,
         description AS \`desc\`,
         cta_text AS cta,
         cta_href AS href,
         gradient,
         image_url AS imageUrl
       FROM promo_slider
       WHERE is_active = 1
       ORDER BY sort_order ASC, id DESC`
    );

    return NextResponse.json({
      sukses: true,
      data: promo
    });
  } catch (error) {
    console.error('GET /api/promo error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal ambil promo'
      },
      { status: 500 }
    );
  }
}