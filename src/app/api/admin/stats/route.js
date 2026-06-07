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

function formatTanggalKey(date) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, '0');
  const tanggal = String(date.getDate()).padStart(2, '0');

  return `${tahun}-${bulan}-${tanggal}`;
}

function formatLabelPendek(dateKey) {
  const [, bulan, tanggal] = String(dateKey).split('-');
  return `${tanggal}/${bulan}`;
}

function bikinRangeTanggal(jumlahHari = 14) {
  const hasil = [];
  const hariIni = new Date();

  for (let i = jumlahHari - 1; i >= 0; i -= 1) {
    const tanggal = new Date(hariIni);
    tanggal.setDate(hariIni.getDate() - i);

    const key = formatTanggalKey(tanggal);

    hasil.push({
      tanggal: key,
      label: formatLabelPendek(key),
      omset: 0,
      modal: 0,
      profit: 0,
      orderSukses: 0
    });
  }

  return hasil;
}

function mapJumlah(rows = [], keyName = 'status') {
  return rows.reduce((acc, row) => {
    acc[row[keyName] || 'unknown'] = angka(row.total);
    return acc;
  }, {});
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

    const [ringkasanHariIni] = await db.query(
      `SELECT 
         COALESCE(SUM(harga), 0) AS omsetHariIni,
         COALESCE(SUM(harga_modal), 0) AS modalHariIni,
         COALESCE(SUM(harga - harga_modal), 0) AS profitHariIni,
         COUNT(*) AS orderHariIni
       FROM transaksi
       WHERE status_bayar = 'sukses'
         AND status_topup = 'sukses'
         AND DATE(created_at) = CURDATE()`
    );

    const [ringkasanBulanIni] = await db.query(
      `SELECT 
         COALESCE(SUM(harga), 0) AS omsetBulanIni,
         COALESCE(SUM(harga_modal), 0) AS modalBulanIni,
         COALESCE(SUM(harga - harga_modal), 0) AS profitBulanIni,
         COUNT(*) AS orderBulanIni
       FROM transaksi
       WHERE status_bayar = 'sukses'
         AND status_topup = 'sukses'
         AND YEAR(created_at) = YEAR(CURDATE())
         AND MONTH(created_at) = MONTH(CURDATE())`
    );

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

    const [statusBayarRows] = await db.query(
      `SELECT COALESCE(status_bayar, 'unknown') AS status, COUNT(*) AS total
       FROM transaksi
       GROUP BY COALESCE(status_bayar, 'unknown')`
    );

    const [statusTopupRows] = await db.query(
      `SELECT COALESCE(status_topup, 'unknown') AS status, COUNT(*) AS total
       FROM transaksi
       GROUP BY COALESCE(status_topup, 'unknown')`
    );

    const [trenRows] = await db.query(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m-%d') AS tanggal,
         COUNT(*) AS orderSukses,
         COALESCE(SUM(harga), 0) AS omset,
         COALESCE(SUM(harga_modal), 0) AS modal,
         COALESCE(SUM(harga - harga_modal), 0) AS profit
       FROM transaksi
       WHERE status_bayar = 'sukses'
         AND status_topup = 'sukses'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY tanggal ASC`
    );

    const trenMap = new Map(
      trenRows.map((row) => [
        row.tanggal,
        {
          tanggal: row.tanggal,
          label: formatLabelPendek(row.tanggal),
          omset: angka(row.omset),
          modal: angka(row.modal),
          profit: angka(row.profit),
          orderSukses: angka(row.orderSukses)
        }
      ])
    );

    const trenHarian = bikinRangeTanggal(14).map((item) => trenMap.get(item.tanggal) || item);

    const [metodeBayarRows] = await db.query(
      `SELECT
         COALESCE(payment_type, 'unknown') AS metode,
         COUNT(*) AS totalOrder,
         COALESCE(SUM(harga), 0) AS omset
       FROM transaksi
       WHERE status_bayar = 'sukses'
       GROUP BY COALESCE(payment_type, 'unknown')
       ORDER BY totalOrder DESC, omset DESC
       LIMIT 8`
    );

    const [gameTerlarisRows] = await db.query(
      `SELECT
         COALESCE(g.nama, CONCAT('Game ID ', t.game_id)) AS nama,
         COUNT(*) AS totalOrder,
         COALESCE(SUM(t.harga), 0) AS omset
       FROM transaksi t
       LEFT JOIN games g ON t.game_id = g.id
       WHERE t.status_bayar = 'sukses'
         AND t.status_topup = 'sukses'
       GROUP BY t.game_id, g.nama
       ORDER BY totalOrder DESC, omset DESC
       LIMIT 5`
    );

    const [produkTerlarisRows] = await db.query(
      `SELECT
         COALESCE(p.nama_produk, t.kode_produk) AS nama,
         COALESCE(g.nama, CONCAT('Game ID ', t.game_id)) AS game,
         COUNT(*) AS totalOrder,
         COALESCE(SUM(t.harga), 0) AS omset
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       LEFT JOIN games g ON t.game_id = g.id
       WHERE t.status_bayar = 'sukses'
         AND t.status_topup = 'sukses'
       GROUP BY t.produk_id, p.nama_produk, g.nama, t.kode_produk, t.game_id
       ORDER BY totalOrder DESC, omset DESC
       LIMIT 5`
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

        omsetHariIni: angka(ringkasanHariIni[0]?.omsetHariIni),
        modalHariIni: angka(ringkasanHariIni[0]?.modalHariIni),
        profitHariIni: angka(ringkasanHariIni[0]?.profitHariIni),
        orderHariIni: angka(ringkasanHariIni[0]?.orderHariIni),

        omsetBulanIni: angka(ringkasanBulanIni[0]?.omsetBulanIni),
        modalBulanIni: angka(ringkasanBulanIni[0]?.modalBulanIni),
        profitBulanIni: angka(ringkasanBulanIni[0]?.profitBulanIni),
        orderBulanIni: angka(ringkasanBulanIni[0]?.orderBulanIni),

        suksesTopup: angka(hitungSukses[0]?.total),
        pendingBayar: angka(hitungPending[0]?.total),
        prosesTopup: angka(hitungProses[0]?.total),

        statusBayar: mapJumlah(statusBayarRows),
        statusTopup: mapJumlah(statusTopupRows),
        trenHarian,
        metodeBayar: metodeBayarRows.map((row) => ({
          metode: row.metode,
          totalOrder: angka(row.totalOrder),
          omset: angka(row.omset)
        })),
        gameTerlaris: gameTerlarisRows.map((row) => ({
          nama: row.nama,
          totalOrder: angka(row.totalOrder),
          omset: angka(row.omset)
        })),
        produkTerlaris: produkTerlarisRows.map((row) => ({
          nama: row.nama,
          game: row.game,
          totalOrder: angka(row.totalOrder),
          omset: angka(row.omset)
        })),

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
