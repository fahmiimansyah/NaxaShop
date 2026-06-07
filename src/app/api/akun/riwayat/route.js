import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const emailLogin = String(session?.user?.email || '').trim().toLowerCase();

    if (!emailLogin) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Login dulu buat lihat riwayat transaksi.',
        },
        { status: 401 }
      );
    }

    const [riwayat] = await db.query(
      `SELECT
         t.id,
         t.order_id,
         t.kode_produk,
         t.id_player,
         t.zone_player,
         t.harga,
         t.harga_produk,
         t.biaya_admin,
         t.harga_total,
         t.payment_type,
         t.status_bayar,
         t.status_topup,
         t.customer_email,
         t.user_email,
         t.created_at,
         t.updated_at,
         g.nama AS nama_game,
         g.gambar AS gambar_game,
         p.nama_produk
       FROM transaksi t
       LEFT JOIN games g ON t.game_id = g.id
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE (
          LOWER(TRIM(COALESCE(t.user_email, ''))) = ?
          OR LOWER(TRIM(COALESCE(t.customer_email, ''))) = ?
       )
       AND t.status_bayar = 'sukses'
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [emailLogin, emailLogin]
    );

    return NextResponse.json({
      sukses: true,
      data: riwayat,
    });
  } catch (error) {
    console.error('GET /api/akun/riwayat error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal ambil riwayat transaksi.',
      },
      { status: 500 }
    );
  }
}