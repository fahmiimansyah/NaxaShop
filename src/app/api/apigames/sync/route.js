import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../../lib/db';
import { rateLimit } from '../../../lib/rate-limit';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../lib/mailer';

function bersihinText(value) {
  return String(value || '').trim();
}

function orderIdValid(orderId) {
  return /^NX-\d{10,20}(-[A-Z0-9]{8})?$/.test(orderId);
}

function bikinSignatureApiGames({ merchantId, secretKey, refId }) {
  return crypto
    .createHash('md5')
    .update(`${merchantId}:${secretKey}:${refId}`)
    .digest('hex');
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function ambilStatusApiGames(data) {
  return (
    data?.data?.status ||
    data?.status ||
    data?.data?.transaction_status ||
    data?.transaction_status ||
    ''
  );
}

function statusApiGamesSukses(status) {
  const s = normalisasiStatus(status);

  return ['sukses', 'success', 'berhasil'].includes(s);
}

function statusApiGamesGagal(status) {
  const s = normalisasiStatus(status);

  return ['gagal', 'failed', 'fail', 'error'].includes(s);
}

function statusApiGamesButuhAdmin(status) {
  const s = normalisasiStatus(status);

  return ['sukses sebagian', 'partial', 'partial success'].includes(s);
}

function statusApiGamesMasihProses(status) {
  const s = normalisasiStatus(status);

  return [
    'pending',
    'proses',
    'process',
    'processing',
    'validasi provider',
    'validasi_provider'
  ].includes(s);
}

async function kirimNotifAman(payload) {
  try {
    await kirimEmailAdmin(payload);
  } catch (error) {
    console.error('Gagal kirim email admin:', error);
  }
}

async function cekStatusApiGames(refId) {
  const merchantId = process.env.APIGAMES_MERCHANT_ID;
  const secretKey = process.env.APIGAMES_SECRET;

  if (!merchantId || !secretKey) {
    throw new Error('Env APIGames belum lengkap');
  }

  const signature = bikinSignatureApiGames({
    merchantId,
    secretKey,
    refId
  });

  const url = new URL('https://v1.apigames.id/v2/transaksi/status');
  url.searchParams.set('merchant_id', merchantId);
  url.searchParams.set('ref_id', refId);
  url.searchParams.set('signature', signature);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  const raw = await response.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    data = {
      raw_response: raw
    };
  }

  return {
    ok: response.ok,
    data
  };
}

export async function POST(request) {
  try {
    const limit = rateLimit(request, {
      key: 'apigames-sync',
      limit: 20,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Terlalu sering sync APIGames bre. Coba lagi ${limit.retryAfter} detik lagi.`
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const orderId = bersihinText(body.order_id).toUpperCase();

    if (!orderId) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Order ID wajib dikirim bre!'
        },
        { status: 400 }
      );
    }

    if (!orderIdValid(orderId)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format Order ID gak valid bre!'
        },
        { status: 400 }
      );
    }

    const [dataTrx] = await db.query(
      `SELECT
         t.id,
         t.order_id,
         t.status_bayar,
         t.status_topup,
         t.customer_email,
         t.harga,
         t.payment_type,
         t.kode_produk,
         t.apigames_response,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (dataTrx.length === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Transaksi gak ketemu bre!'
        },
        { status: 404 }
      );
    }

    const trx = dataTrx[0];

    if (trx.status_bayar !== 'sukses') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran belum sukses, APIGames belum perlu dicek.',
        data: {
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup
        }
      });
    }

    if (trx.status_topup === 'sukses') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up sudah sukses.',
        data: {
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup
        }
      });
    }

    if (trx.status_topup === 'pending') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up belum dikirim ke APIGames.',
        data: {
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup
        }
      });
    }

    const hasilStatus = await cekStatusApiGames(orderId);

    if (!hasilStatus.ok) {
      await db.query(
        `UPDATE transaksi
         SET apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nGagal cek status APIGames pada ', NOW())
         WHERE order_id = ?`,
        [JSON.stringify(hasilStatus.data), orderId]
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Gagal cek status APIGames bre.',
          data: {
            status_bayar: trx.status_bayar,
            status_topup: trx.status_topup
          }
        },
        { status: 502 }
      );
    }

    const statusRaw = ambilStatusApiGames(hasilStatus.data);
    const statusNormal = normalisasiStatus(statusRaw);

    if (!statusRaw) {
      await db.query(
        `UPDATE transaksi
         SET apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nStatus APIGames tidak terbaca pada ', NOW())
         WHERE order_id = ?`,
        [JSON.stringify(hasilStatus.data), orderId]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Status APIGames belum kebaca jelas.',
        data: {
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup,
          status_apigames: ''
        }
      });
    }

    if (statusApiGamesSukses(statusRaw)) {
      const sebelumnyaSudahSukses = trx.status_topup === 'sukses';

      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames sync SUKSES pada ', NOW())
         WHERE order_id = ?`,
        [JSON.stringify(hasilStatus.data), orderId]
      );

      if (!sebelumnyaSudahSukses && trx.customer_email) {
        try {
          await kirimEmailTopupSukses({
            to: trx.customer_email,
            orderId: trx.order_id,
            namaProduk: trx.nama_produk || trx.kode_produk,
            harga: trx.harga,
            paymentType: trx.payment_type
          });
        } catch (error) {
          console.error('Gagal kirim email sukses customer:', error);

          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${orderId}`,
            title: 'Top-up Sukses Tapi Email Customer Gagal',
            message:
              'APIGames sudah status sukses, tapi sistem gagal mengirim email sukses ke customer.',
            orderId,
            detail: error.message || String(error)
          });
        }
      }

      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up sukses dari APIGames.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'sukses',
          status_apigames: statusNormal
        }
      });
    }

    if (statusApiGamesGagal(statusRaw) || statusApiGamesButuhAdmin(statusRaw)) {
      if (trx.status_topup === 'sukses') {
        return NextResponse.json({
          sukses: true,
          pesan: 'Order sudah sukses sebelumnya. Status gagal/partial diabaikan.',
          data: {
            status_bayar: trx.status_bayar,
            status_topup: trx.status_topup,
            status_apigames: statusNormal
          }
        });
      }

      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames sync status perlu admin pada ', NOW(), ': ', ?)
         WHERE order_id = ?`,
        [JSON.stringify(hasilStatus.data), statusRaw, orderId]
      );

      await kirimNotifAman({
        subject: `🚨 Top-up Perlu Dicek - ${orderId}`,
        title: 'APIGames Status Gagal / Partial',
        message:
          'Cek status APIGames menghasilkan status gagal/partial. Order masuk pusat tindakan.',
        orderId,
        detail: JSON.stringify(hasilStatus.data, null, 2)
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up gagal atau butuh pengecekan admin.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'gagal',
          status_apigames: statusNormal
        }
      });
    }

    if (statusApiGamesMasihProses(statusRaw)) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'proses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames sync masih proses pada ', NOW(), ': ', ?)
         WHERE order_id = ?
           AND status_topup != 'sukses'`,
        [JSON.stringify(hasilStatus.data), statusRaw, orderId]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up masih diproses APIGames.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'proses',
          status_apigames: statusNormal
        }
      });
    }

    await db.query(
      `UPDATE transaksi
       SET apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames sync status tidak dikenali pada ', NOW(), ': ', ?)
       WHERE order_id = ?`,
      [JSON.stringify(hasilStatus.data), statusRaw, orderId]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Status APIGames tidak dikenali, status top-up belum diubah.',
      data: {
        status_bayar: trx.status_bayar,
        status_topup: trx.status_topup,
        status_apigames: statusNormal
      }
    });
  } catch (error) {
    console.error('APIGames sync error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal sync status APIGames bre!'
      },
      { status: 500 }
    );
  }
}