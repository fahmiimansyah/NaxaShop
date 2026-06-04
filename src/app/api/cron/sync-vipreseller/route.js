import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import {
  cekStatusVipReseller,
  ambilVipResellerTrxIdDariResponse
} from '../../../lib/vipreseller';
import { kirimEmailTopupSukses } from '../../../lib/mailer';

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function statusSukses(status) {
  const s = normalisasiStatus(status);

  return (
    ['sukses', 'success', 'berhasil', 'done', 'completed', 'complete'].includes(s) ||
    s.includes('success') ||
    s.includes('sukses') ||
    s.includes('berhasil')
  );
}

function statusGagal(status) {
  const s = normalisasiStatus(status);

  return (
    ['gagal', 'failed', 'fail', 'error', 'canceled', 'cancelled', 'refund', 'refunded'].includes(s) ||
    s.includes('gagal') ||
    s.includes('failed') ||
    s.includes('error') ||
    s.includes('cancel')
  );
}

function bacaJsonAman(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ambilDataStatusVip(data) {
  if (Array.isArray(data?.data)) return data.data[0] || {};
  if (data?.data && typeof data.data === 'object') return data.data;
  return data || {};
}

function ambilStatusVip(data) {
  const detail = ambilDataStatusVip(data);

  return (
    detail?.status ||
    detail?.message ||
    data?.status ||
    data?.message ||
    ''
  );
}

function ambilSnVip(data) {
  const detail = ambilDataStatusVip(data);

  return (
    detail?.sn ||
    detail?.serial_number ||
    detail?.serialNumber ||
    detail?.note ||
    data?.sn ||
    data?.serial_number ||
    data?.serialNumber ||
    data?.note ||
    ''
  );
}

function ambilCronSecretDariRequest(request) {
  const url = new URL(request.url);

  return (
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    url.searchParams.get('secret') ||
    ''
  );
}

async function syncSatuTransaksi(trx) {
  const responseSebelumnya = bacaJsonAman(trx.apigames_response);
  const trxid = ambilVipResellerTrxIdDariResponse(responseSebelumnya);

  if (!trxid) {
    await db.query(
      `UPDATE transaksi
       SET catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAuto sync VIPReseller dilewati pada ', NOW(), ': TRXID belum ditemukan.'),
           updated_at = NOW()
       WHERE order_id = ?`,
      [trx.order_id]
    );

    return {
      order_id: trx.order_id,
      aksi: 'skip',
      alasan: 'trxid tidak ditemukan'
    };
  }

  const hasil = await cekStatusVipReseller({ trxid });

  const statusRaw = ambilStatusVip(hasil.data);
  const statusNormal = normalisasiStatus(statusRaw);
  const sn = ambilSnVip(hasil.data);

  const responseText = JSON.stringify({
    source: 'cron_sync_vipreseller',
    checked_at: new Date().toISOString(),
    trxid,
    response: hasil.data
  });

  if (!hasil.ok) {
    await db.query(
      `UPDATE transaksi
       SET apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAuto sync VIPReseller gagal cek status pada ', NOW(), '. TRXID: ', ?, '. Status HTTP: ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [responseText, trxid, hasil.status || '-', trx.order_id]
    );

    return {
      order_id: trx.order_id,
      aksi: 'error',
      status_provider: statusNormal || '-'
    };
  }

  if (statusSukses(statusRaw)) {
    await db.query(
      `UPDATE transaksi
       SET status_topup = 'sukses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAuto sync VIPReseller: SUKSES pada ', NOW(), '. TRXID: ', ?, '. SN/Note: ', ?),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_topup != 'sukses'`,
      [responseText, trxid, sn || '-', trx.order_id]
    );

    if (trx.customer_email) {
      try {
        await kirimEmailTopupSukses({
          to: trx.customer_email,
          orderId: trx.order_id,
          namaProduk: trx.nama_produk || trx.kode_produk,
          harga: trx.harga,
          paymentType: trx.payment_type
        });
      } catch (error) {
        console.error('Gagal kirim email sukses dari cron VIPReseller:', error);
      }
    }

    return {
      order_id: trx.order_id,
      aksi: 'sukses',
      status_provider: statusNormal,
      trxid
    };
  }

  if (statusGagal(statusRaw)) {
    await db.query(
      `UPDATE transaksi
       SET status_topup = 'gagal',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAuto sync VIPReseller: GAGAL pada ', NOW(), '. TRXID: ', ?, '. Status: ', ?),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_topup != 'sukses'`,
      [responseText, trxid, statusRaw || '-', trx.order_id]
    );

    return {
      order_id: trx.order_id,
      aksi: 'gagal',
      status_provider: statusNormal,
      trxid
    };
  }

  await db.query(
    `UPDATE transaksi
     SET status_topup = 'proses',
         apigames_response = ?,
         catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAuto sync VIPReseller: masih PROSES pada ', NOW(), '. TRXID: ', ?, '. Status: ', ?),
         updated_at = NOW()
     WHERE order_id = ?
       AND status_topup != 'sukses'`,
    [responseText, trxid, statusRaw || 'waiting', trx.order_id]
  );

  return {
    order_id: trx.order_id,
    aksi: 'proses',
    status_provider: statusNormal || 'waiting',
    trxid
  };
}

export async function GET(request) {
  try {
    const secretMasuk = ambilCronSecretDariRequest(request);
    const secretEnv = process.env.CRON_SECRET || '';

    if (!secretEnv || secretMasuk !== secretEnv) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Secret cron tidak valid.'
        },
        { status: 403 }
      );
    }

    const [transaksi] = await db.query(
      `SELECT
         t.*,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.provider = 'vipreseller'
         AND t.status_bayar = 'sukses'
         AND t.status_topup = 'proses'
       ORDER BY t.updated_at ASC
       LIMIT 10`
    );

    const hasil = [];

    for (const trx of transaksi) {
      try {
        const hasilSatu = await syncSatuTransaksi(trx);
        hasil.push(hasilSatu);
      } catch (error) {
        console.error('Gagal sync satu transaksi VIPReseller:', trx.order_id, error);

        hasil.push({
          order_id: trx.order_id,
          aksi: 'error',
          pesan: error.message || String(error)
        });
      }
    }

    return NextResponse.json({
      sukses: true,
      pesan: `Auto sync VIPReseller selesai. Dicek: ${hasil.length} transaksi.`,
      data: hasil
    });
  } catch (error) {
    console.error('Cron sync VIPReseller error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Cron sync VIPReseller error.'
      },
      { status: 500 }
    );
  }
}