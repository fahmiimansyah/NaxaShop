import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return false;
  }

  return true;
}

async function ambilListAlert(whereSql, limit = 8) {
  const [rows] = await db.query(
    `SELECT
       t.id,
       t.order_id,
       t.game_id,
       t.produk_id,
       t.kode_produk,
       t.id_player,
       t.zone_player,
       t.harga,
       t.payment_type,
       t.status_bayar,
       t.status_topup,
       t.customer_whatsapp,
       t.customer_email,
       t.catatan_admin,
       t.created_at,
       t.updated_at,
       COALESCE(p.nama_produk, t.kode_produk) AS nama_produk,
       COALESCE(g.nama, CONCAT('Game ID ', t.game_id)) AS nama_game
     FROM transaksi t
     LEFT JOIN produk p ON t.produk_id = p.id
     LEFT JOIN games g ON t.game_id = g.id
     WHERE ${whereSql}
     ORDER BY COALESCE(t.updated_at, t.created_at) DESC
     LIMIT ?`,
    [limit]
  );

  return rows;
}

export async function GET() {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const [ringkasanRows] = await db.query(
      `SELECT
         SUM(CASE
           WHEN status_bayar = 'sukses' AND status_topup = 'gagal'
           THEN 1 ELSE 0
         END) AS topupGagal,

         SUM(CASE
           WHEN status_bayar = 'sukses'
            AND status_topup = 'proses'
            AND COALESCE(updated_at, created_at) <= NOW() - INTERVAL 10 MINUTE
           THEN 1 ELSE 0
         END) AS prosesKelamaan,

         SUM(CASE
           WHEN status_bayar = 'pending'
            AND created_at <= NOW() - INTERVAL 30 MINUTE
           THEN 1 ELSE 0
         END) AS pendingLama
       FROM transaksi`
    );

    const topupGagal = await ambilListAlert(
      `t.status_bayar = 'sukses' AND t.status_topup = 'gagal'`
    );

    const prosesKelamaan = await ambilListAlert(
      `t.status_bayar = 'sukses'
       AND t.status_topup = 'proses'
       AND COALESCE(t.updated_at, t.created_at) <= NOW() - INTERVAL 10 MINUTE`
    );

    const pendingLama = await ambilListAlert(
      `t.status_bayar = 'pending'
       AND t.created_at <= NOW() - INTERVAL 30 MINUTE`
    );

    return NextResponse.json({
      sukses: true,
      data: {
        ringkasan: {
          topupGagal: ringkasanRows[0].topupGagal || 0,
          prosesKelamaan: ringkasanRows[0].prosesKelamaan || 0,
          pendingLama: ringkasanRows[0].pendingLama || 0,
          total:
            Number(ringkasanRows[0].topupGagal || 0) +
            Number(ringkasanRows[0].prosesKelamaan || 0) +
            Number(ringkasanRows[0].pendingLama || 0)
        },
        topupGagal,
        prosesKelamaan,
        pendingLama
      }
    });
  } catch (error) {
    console.error('Gagal ambil alert admin:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ambil pusat tindakan bre!' },
      { status: 500 }
    );
  }
}