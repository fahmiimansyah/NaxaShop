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

export async function GET() {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const [hitungCuan] = await db.query(
      `SELECT SUM(harga) as total FROM transaksi WHERE status_bayar = 'sukses'`
    );

    const totalCuan = hitungCuan[0].total || 0;

    const [hitungSukses] = await db.query(
      `SELECT COUNT(*) as total FROM transaksi WHERE status_topup = 'sukses'`
    );

    const [hitungPending] = await db.query(
      `SELECT COUNT(*) as total FROM transaksi WHERE status_bayar = 'pending'`
    );

    const [hitungProses] = await db.query(
      `SELECT COUNT(*) as total FROM transaksi WHERE status_topup = 'proses'`
    );

    const [hitungUser] = await db.query(
      `SELECT
         COUNT(*) AS totalUser,
         SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) AS userVerified,
         SUM(CASE WHEN provider = 'google' THEN 1 ELSE 0 END) AS userGoogle,
         SUM(CASE WHEN password IS NOT NULL THEN 1 ELSE 0 END) AS userManual,
         SUM(CASE WHEN last_login_at >= NOW() - INTERVAL 24 HOUR THEN 1 ELSE 0 END) AS userAktif24Jam,
         SUM(CASE WHEN last_login_at >= NOW() - INTERVAL 15 MINUTE THEN 1 ELSE 0 END) AS userAktif15Menit
       FROM users`
    );

    const [orderanTerbaru] = await db.query(
      `SELECT * FROM transaksi ORDER BY id DESC LIMIT 5`
    );

    return NextResponse.json({
      sukses: true,
      data: {
        totalCuan,
        suksesTopup: hitungSukses[0].total,
        pendingBayar: hitungPending[0].total,
        prosesTopup: hitungProses[0].total,

        totalUser: hitungUser[0].totalUser || 0,
        userVerified: hitungUser[0].userVerified || 0,
        userGoogle: hitungUser[0].userGoogle || 0,
        userManual: hitungUser[0].userManual || 0,
        userAktif24Jam: hitungUser[0].userAktif24Jam || 0,
        userAktif15Menit: hitungUser[0].userAktif15Menit || 0,

        orderanTerbaru
      }
    });
  } catch (error) {
    console.error('Dapur Admin Meledak:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ngambil data dari kulkas bre!' },
      { status: 500 }
    );
  }
}