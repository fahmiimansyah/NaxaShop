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

function angka(value) {
  return Number(value || 0);
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
    const [ringkasan] = await db.query(
      `SELECT 
         COALESCE(SUM(harga), 0) AS totalOmset,
         COALESCE(SUM(harga_modal), 0) AS totalModal,
         COALESCE(SUM(harga - harga_modal), 0) AS totalProfit
       FROM transaksi
       WHERE status_bayar = 'sukses'
         AND status_topup = 'sukses'`
    );

    const totalOmset = angka(ringkasan[0]?.totalOmset);
    const totalModal = angka(ringkasan[0]?.totalModal);
    const totalProfit = angka(ringkasan[0]?.totalProfit);

    const [hitungSukses] = await db.query(
      `SELECT COUNT(*) AS total
       FROM transaksi
       WHERE status_bayar = 'sukses'
         AND status_topup = 'sukses'`
    );

    const [hitungPending] = await db.query(
      `SELECT COUNT(*) AS total
       FROM transaksi
       WHERE status_bayar = 'pending'`
    );

    const [hitungProses] = await db.query(
      `SELECT COUNT(*) AS total
       FROM transaksi
       WHERE status_bayar = 'sukses'
         AND status_topup = 'proses'`
    );

    const [hitungUser] = await db.query(
      `SELECT
         COUNT(*) AS totalUser,
         COALESCE(SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END), 0) AS userVerified,
         COALESCE(SUM(CASE WHEN provider = 'google' THEN 1 ELSE 0 END), 0) AS userGoogle,
         COALESCE(SUM(CASE WHEN password IS NOT NULL THEN 1 ELSE 0 END), 0) AS userManual,
         COALESCE(SUM(CASE WHEN last_login_at >= NOW() - INTERVAL 24 HOUR THEN 1 ELSE 0 END), 0) AS userAktif24Jam,
         COALESCE(SUM(CASE WHEN last_login_at >= NOW() - INTERVAL 15 MINUTE THEN 1 ELSE 0 END), 0) AS userAktif15Menit
       FROM users`
    );

    const [orderanTerbaru] = await db.query(
      `SELECT *
       FROM transaksi
       ORDER BY id DESC
       LIMIT 5`
    );

    return NextResponse.json({
      sukses: true,
      data: {
        totalCuan: totalOmset, // fallback lama biar UI lama gak rusak
        totalOmset,
        totalModal,
        totalProfit,

        suksesTopup: angka(hitungSukses[0]?.total),
        pendingBayar: angka(hitungPending[0]?.total),
        prosesTopup: angka(hitungProses[0]?.total),

        totalUser: angka(hitungUser[0]?.totalUser),
        userVerified: angka(hitungUser[0]?.userVerified),
        userGoogle: angka(hitungUser[0]?.userGoogle),
        userManual: angka(hitungUser[0]?.userManual),
        userAktif24Jam: angka(hitungUser[0]?.userAktif24Jam),
        userAktif15Menit: angka(hitungUser[0]?.userAktif15Menit),

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