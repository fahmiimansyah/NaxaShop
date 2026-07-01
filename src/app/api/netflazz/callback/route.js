import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../../lib/db';
import {
  ambilStatusNetflazz,
  ambilNetflazzTrxIdDariResponse,
  netflazzSukses,
  netflazzGagal,
  netflazzPending
} from '../../../lib/netflazz';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../lib/mailer';
import { prosesVoucherMakasihOrderPertama } from '../../../lib/voucher';

function bersihinText(value) {
  return String(value || '').trim();
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function orderIdValid(orderId) {
  return /^NX-\d{10,20}(-[A-Z0-9]{8})?$/.test(orderId);
}

function timingSafeStringEqual(a, b) {
  const kiri = Buffer.from(String(a || ''));
  const kanan = Buffer.from(String(b || ''));

  if (kiri.length !== kanan.length) return false;

  return crypto.timingSafeEqual(kiri, kanan);
}

function ambilDataCallback(payload) {
  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload?.result && typeof payload.result === 'object' && !Array.isArray(payload.result)) {
    return payload.result;
  }

  return payload || {};
}

function ambilFieldAda(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return '';

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      return bersihinText(obj[field]);
    }
  }

  return '';
}

function ambilOrderIdCallback(payload, data) {
  return ambilFieldAda(data, [
    'order_id',
    'ref_id',
    'refid',
    'merchant_ref',
    'merchant_order_id'
  ]) || ambilFieldAda(payload, [
    'order_id',
    'ref_id',
    'refid',
    'merchant_ref',
    'merchant_order_id'
  ]);
}

function ambilProviderIdCallback(payload, data) {
  return ambilFieldAda(data, [
    'id',
    'trxid',
    'trx_id',
    'transaction_id',
    'id_transaksi'
  ]) || ambilFieldAda(payload, [
    'id',
    'trxid',
    'trx_id',
    'transaction_id',
    'id_transaksi'
  ]) || ambilNetflazzTrxIdDariResponse(payload);
}

function statusSukses(status) {
  const s = normalisasiStatus(status);

  return [
    'sukses',
    'success',
    'berhasil',
    'done',
    'completed',
    'complete'
  ].includes(s);
}

function statusGagal(status) {
  const s = normalisasiStatus(status);

  return [
    'gagal',
    'failed',
    'fail',
    'error',
    'cancel',
    'canceled',
    'cancelled',
    'refund',
    'refunded'
  ].includes(s);
}

function statusProses(status) {
  const s = normalisasiStatus(status);

  return [
    '',
    'pending',
    'proses',
    'process',
    'processing',
    'waiting',
    'in progress',
    'accepted',
    'diterima',
    'true'
  ].includes(s);
}

function kunciSensitif(key = '') {
  const k = String(key || '').toLowerCase();

  return (
    k.includes('api_key') ||
    k === 'apikey' ||
    k === 'key' ||
    k.includes('secret') ||
    k.includes('token') ||
    k.includes('pin') ||
    k.includes('password') ||
    k.includes('authorization')
  );
}

function sensorPayload(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sensorPayload(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, isi]) => [
        key,
        kunciSensitif(key) ? '***' : sensorPayload(isi)
      ])
    );
  }

  return value;
}

async function kirimNotifAman(payload) {
  try {
    await kirimEmailAdmin(payload);
  } catch (error) {
    console.error('Gagal kirim email admin Netflazz callback:', error);
  }
}

async function bacaPayload(request) {
  const contentType = request.headers.get('content-type') || '';
  const rawBody = await request.text();

  if (!rawBody) {
    return { rawBody, payload: {} };
  }

  if (contentType.includes('application/json')) {
    try {
      return { rawBody, payload: JSON.parse(rawBody) };
    } catch {
      return { rawBody, payload: { raw_body: rawBody } };
    }
  }

  const params = new URLSearchParams(rawBody);
  const payload = Object.fromEntries(params.entries());

  if (Object.keys(payload).length > 0) {
    return { rawBody, payload };
  }

  try {
    return { rawBody, payload: JSON.parse(rawBody) };
  } catch {
    return { rawBody, payload: { raw_body: rawBody } };
  }
}

function callbackSecretValid({ request, payload, rawBody }) {
  const expectedSecret = bersihinText(process.env.NETFLAZZ_CALLBACK_SECRET);
  const signatureSecret = bersihinText(process.env.NETFLAZZ_CALLBACK_SIGNATURE_SECRET);

  if (!expectedSecret && !signatureSecret) return false;

  const url = new URL(request.url);
  const data = ambilDataCallback(payload);

  const tokenDariRequest =
    bersihinText(request.headers.get('x-netflazz-secret')) ||
    bersihinText(request.headers.get('x-callback-secret')) ||
    bersihinText(request.headers.get('x-webhook-secret')) ||
    bersihinText(url.searchParams.get('secret')) ||
    ambilFieldAda(payload, ['secret', 'callback_secret', 'token']) ||
    ambilFieldAda(data, ['secret', 'callback_secret', 'token']);

  if (expectedSecret && tokenDariRequest && timingSafeStringEqual(tokenDariRequest, expectedSecret)) {
    return true;
  }

  const signatureDariRequest =
    bersihinText(request.headers.get('x-netflazz-signature')) ||
    bersihinText(request.headers.get('x-signature')) ||
    bersihinText(request.headers.get('x-hub-signature-256'));

  if (signatureSecret && signatureDariRequest) {
    const hash = crypto
      .createHmac('sha256', signatureSecret)
      .update(rawBody)
      .digest('hex');

    const signatureKita = signatureDariRequest.startsWith('sha256=')
      ? `sha256=${hash}`
      : hash;

    return timingSafeStringEqual(signatureDariRequest, signatureKita);
  }

  return false;
}

async function cariTransaksiNetflazz({ orderId, providerId }) {
  const orderIdBersih = bersihinText(orderId).toUpperCase();
  const providerIdBersih = bersihinText(providerId);

  if (orderIdBersih && orderIdValid(orderIdBersih)) {
    const [rows] = await db.query(
      `SELECT
         t.*,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
         AND LOWER(COALESCE(t.provider, '')) = 'netflazz'
       LIMIT 1`,
      [orderIdBersih]
    );

    if (rows.length > 0) return rows[0];
  }

  if (!providerIdBersih) return null;

  const compactExpr = `REPLACE(REPLACE(REPLACE(COALESCE(t.apigames_response, ''), ' ', ''), '\n', ''), '\r', '')`;
  const providerIdNumber = /^\d+$/.test(providerIdBersih) ? providerIdBersih : '';

  const patterns = [
    `%"id":"${providerIdBersih}"%`,
    `%"trxid":"${providerIdBersih}"%`,
    `%"trx_id":"${providerIdBersih}"%`,
    `%"transaction_id":"${providerIdBersih}"%`
  ];

  if (providerIdNumber) {
    patterns.push(`%"id":${providerIdNumber}%`);
  }

  const whereLike = patterns.map(() => `${compactExpr} LIKE ?`).join(' OR ');

  const [rows] = await db.query(
    `SELECT
       t.*,
       COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
     FROM transaksi t
     LEFT JOIN produk p ON t.produk_id = p.id
     WHERE LOWER(COALESCE(t.provider, '')) = 'netflazz'
       AND (${whereLike})
     ORDER BY t.id DESC
     LIMIT 1`,
    patterns
  );

  return rows[0] || null;
}

async function updateCatatan(orderId, catatan, responseText) {
  await db.query(
    `UPDATE transaksi
     SET apigames_response = COALESCE(?, apigames_response),
         catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\n', ?),
         updated_at = NOW()
     WHERE order_id = ?`,
    [responseText || null, catatan, orderId]
  );
}

export async function POST(request) {
  try {
    const { rawBody, payload } = await bacaPayload(request);

    if (!callbackSecretValid({ request, payload, rawBody })) {
      return NextResponse.json(
        { sukses: false, pesan: 'Callback Netflazz ditolak.' },
        { status: 403 }
      );
    }

    const data = ambilDataCallback(payload);
    const orderId = bersihinText(ambilOrderIdCallback(payload, data)).toUpperCase();
    const providerId = ambilProviderIdCallback(payload, data);

    if (orderId && !orderIdValid(orderId)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Format order_id callback Netflazz tidak valid.' },
        { status: 400 }
      );
    }

    const trx = await cariTransaksiNetflazz({ orderId, providerId });

    if (!trx) {
      await kirimNotifAman({
        subject: '🚨 Callback Netflazz Tidak Ketemu Transaksi',
        title: 'Callback Netflazz Tidak Ketemu Transaksi',
        message:
          'Netflazz mengirim callback valid, tapi order/provider id tidak ditemukan di database.',
        orderId: orderId || providerId || '-',
        detail: JSON.stringify(sensorPayload(payload), null, 2)
      });

      return NextResponse.json(
        { sukses: false, pesan: 'Transaksi Netflazz tidak ditemukan.' },
        { status: 404 }
      );
    }

    const responseText = JSON.stringify(payload);
    const statusRaw = ambilStatusNetflazz(payload);
    const statusNormal = normalisasiStatus(statusRaw);
    const suksesFinal = netflazzSukses(payload) || statusSukses(statusRaw);
    const gagal = netflazzGagal(payload) || statusGagal(statusRaw);
    const masihProses = !suksesFinal && !gagal && (netflazzPending(payload) || statusProses(statusRaw));

    if (trx.status_bayar !== 'sukses') {
      await updateCatatan(
        trx.order_id,
        `Callback Netflazz masuk sebelum pembayaran sukses pada ${new Date().toISOString()}: ${statusRaw || 'status kosong'}`,
        responseText
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi pembayaran belum sukses. Status top-up tidak diubah.',
        data: {
          provider: 'netflazz',
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup,
          status_provider: statusNormal
        }
      });
    }

    if (suksesFinal) {
      if (trx.status_topup === 'sukses') {
        return NextResponse.json({
          sukses: true,
          pesan: 'Callback diterima. Order sudah sukses sebelumnya.',
          data: {
            provider: 'netflazz',
            status_bayar: 'sukses',
            status_topup: 'sukses',
            status_provider: statusNormal
          }
        });
      }

      const [hasilUpdate] = await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Netflazz SUKSES pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?
           AND status_topup != 'sukses'`,
        [responseText, statusRaw || 'Sukses', trx.order_id]
      );

      if (hasilUpdate.affectedRows > 0 && trx.customer_email) {
        try {
          await kirimEmailTopupSukses({
            to: trx.customer_email,
            orderId: trx.order_id,
            namaProduk: trx.nama_produk || trx.kode_produk,
            harga: trx.harga,
            paymentType: trx.payment_type
          });
        } catch (error) {
          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${trx.order_id}`,
            title: 'Top-up Sukses Tapi Email Customer Gagal',
            message:
              'Callback Netflazz sudah sukses, tapi email customer gagal dikirim.',
            orderId: trx.order_id,
            detail: error.message || String(error)
          });
        }
      }

      await prosesVoucherMakasihOrderPertama(db, trx.order_id);

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback Netflazz sukses diproses.',
        data: {
          provider: 'netflazz',
          status_bayar: 'sukses',
          status_topup: 'sukses',
          status_provider: statusNormal
        }
      });
    }

    if (gagal) {
      if (trx.status_topup === 'sukses') {
        await updateCatatan(
          trx.order_id,
          `Callback Netflazz gagal diabaikan karena top-up sudah sukses pada ${new Date().toISOString()}: ${statusRaw || 'status kosong'}`,
          responseText
        );

        return NextResponse.json({
          sukses: true,
          pesan: 'Callback gagal diabaikan karena order sudah sukses.',
          data: {
            provider: 'netflazz',
            status_bayar: 'sukses',
            status_topup: 'sukses',
            status_provider: statusNormal
          }
        });
      }

      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Netflazz GAGAL pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?
           AND status_topup != 'sukses'`,
        [responseText, statusRaw || 'Gagal', trx.order_id]
      );

      await kirimNotifAman({
        subject: `🚨 Top-up Gagal via Callback Netflazz - ${trx.order_id}`,
        title: 'Callback Netflazz Mengirim Status Gagal',
        message: 'Netflazz mengirim callback gagal. Cek dashboard admin.',
        orderId: trx.order_id,
        detail: JSON.stringify(sensorPayload(payload), null, 2)
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback Netflazz gagal dicatat.',
        data: {
          provider: 'netflazz',
          status_bayar: 'sukses',
          status_topup: 'gagal',
          status_provider: statusNormal
        }
      });
    }

    if (masihProses) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = CASE
               WHEN status_topup IN ('sukses', 'gagal') THEN status_topup
               ELSE 'proses'
             END,
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Netflazz PROSES pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [responseText, statusRaw || 'Proses', trx.order_id]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback Netflazz proses dicatat.',
        data: {
          provider: 'netflazz',
          status_bayar: 'sukses',
          status_topup: trx.status_topup === 'sukses' || trx.status_topup === 'gagal'
            ? trx.status_topup
            : 'proses',
          status_provider: statusNormal
        }
      });
    }

    await updateCatatan(
      trx.order_id,
      `Callback Netflazz status belum dikenali pada ${new Date().toISOString()}: ${statusRaw || 'status kosong'}`,
      responseText
    );

    await kirimNotifAman({
      subject: `⚠️ Callback Netflazz Status Tidak Dikenali - ${trx.order_id}`,
      title: 'Callback Netflazz Perlu Dicek',
      message:
        'Netflazz mengirim callback, tapi statusnya belum masuk mapping sukses/gagal/proses.',
      orderId: trx.order_id,
      detail: JSON.stringify(sensorPayload(payload), null, 2)
    });

    return NextResponse.json({
      sukses: true,
      pesan: 'Callback diterima, status belum dikenali. Admin perlu cek.',
      data: {
        provider: 'netflazz',
        status_bayar: trx.status_bayar,
        status_topup: trx.status_topup,
        status_provider: statusNormal
      }
    });
  } catch (error) {
    console.error('Callback Netflazz error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Callback Netflazz gagal diproses.' },
      { status: 500 }
    );
  }
}
