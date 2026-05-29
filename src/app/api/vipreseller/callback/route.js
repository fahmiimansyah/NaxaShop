import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../../lib/db';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../lib/mailer';

function bersihinText(value) {
  return String(value || '').trim();
}

function orderIdValid(orderId) {
  return /^NX-\d{10,20}(-[A-Z0-9]{8})?$/.test(orderId);
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function statusProviderSukses(status) {
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

function statusProviderGagal(status) {
  const s = normalisasiStatus(status);

  return [
    'gagal',
    'failed',
    'fail',
    'error',
    'canceled',
    'cancelled',
    'refund',
    'refunded'
  ].includes(s);
}

function statusProviderMasihProses(status) {
  const s = normalisasiStatus(status);

  return [
    '',
    'pending',
    'waiting',
    'proses',
    'process',
    'processing',
    'in progress'
  ].includes(s);
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

function ambilDataCallback(payload) {
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data[0] || {};
  }

  if (payload?.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload || {};
}

function ambilStatusCallback(data, payload) {
  return (
    data?.status ||
    data?.message ||
    payload?.status ||
    payload?.message ||
    ''
  );
}

function ambilTrxIdCallback(data, payload) {
  return bersihinText(
    data?.trxid ||
      data?.trx_id ||
      data?.trxId ||
      data?.transaction_id ||
      data?.transactionId ||
      data?.id_transaksi ||
      payload?.trxid ||
      payload?.trx_id ||
      payload?.trxId ||
      payload?.transaction_id ||
      payload?.transactionId ||
      ''
  );
}

function ambilOrderIdCallback(data, payload) {
  return bersihinText(
    data?.ref_id ||
      data?.refId ||
      data?.order_id ||
      data?.orderId ||
      data?.client_order_id ||
      data?.merchant_ref ||
      payload?.ref_id ||
      payload?.refId ||
      payload?.order_id ||
      payload?.orderId ||
      payload?.client_order_id ||
      payload?.merchant_ref ||
      ''
  ).toUpperCase();
}

function ambilSnCallback(data, payload) {
  return bersihinText(
    data?.sn ||
      data?.serial_number ||
      data?.serialNumber ||
      data?.note ||
      payload?.sn ||
      payload?.serial_number ||
      payload?.serialNumber ||
      payload?.note ||
      ''
  );
}

function timingSafeStringEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));

  if (aa.length !== bb.length) return false;

  return crypto.timingSafeEqual(aa, bb);
}

function escapeLike(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

async function kirimNotifAman(payload) {
  try {
    await kirimEmailAdmin(payload);
  } catch (error) {
    console.error('Gagal kirim email admin:', error);
  }
}

async function updateCatatan(orderId, catatan) {
  try {
    await db.query(
      `UPDATE transaksi
       SET catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\n', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [catatan, orderId]
    );
  } catch (error) {
    console.error('Gagal update catatan callback VIPReseller:', error);
  }
}

async function cariTransaksiVipReseller({ orderId, trxid }) {
  if (orderId && orderIdValid(orderId)) {
    const [byOrderId] = await db.query(
      `SELECT
         t.*,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
         AND t.provider = 'vipreseller'
       LIMIT 1`,
      [orderId]
    );

    if (byOrderId.length > 0) {
      return byOrderId[0];
    }
  }

  if (trxid) {
    const trxidLike = `%${escapeLike(trxid)}%`;

    const [byTrxId] = await db.query(
      `SELECT
         t.*,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.provider = 'vipreseller'
         AND t.apigames_response LIKE ? ESCAPE '\\\\'
       ORDER BY t.id DESC
       LIMIT 1`,
      [trxidLike]
    );

    if (byTrxId.length > 0) {
      return byTrxId[0];
    }
  }

  return null;
}

export async function POST(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const callbackSecret = process.env.VIPRESELLER_CALLBACK_SECRET || '';

  let rawBody = '';

  try {
    rawBody = await request.text();

    if (!callbackSecret) {
      console.error('VIPRESELLER_CALLBACK_SECRET belum diset.');

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Webhook secret VIPReseller belum diset.'
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);

    // Kalau VIPReseller tidak support custom header,
    // set URL callback jadi:
    // https://domainlu.com/api/vipreseller/callback?secret=ISI_SECRET_LU
    const secretDariQuery = url.searchParams.get('secret') || '';

    // Kalau suatu saat VIPReseller bisa kirim custom header,
    // ini juga siap.
    const secretDariHeader =
      request.headers.get('x-vipreseller-secret') ||
      request.headers.get('x-callback-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';

    const secretMasuk = secretDariHeader || secretDariQuery;

    if (!timingSafeStringEqual(secretMasuk, callbackSecret)) {
      console.error('Secret callback VIPReseller tidak valid:', {
        userAgent
      });

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Secret callback VIPReseller tidak valid.'
        },
        { status: 403 }
      );
    }

    let payload;

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      console.error('Payload callback VIPReseller bukan JSON:', rawBody);

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Payload callback VIPReseller bukan JSON.'
        },
        { status: 400 }
      );
    }

    const data = ambilDataCallback(payload);

    const trxid = ambilTrxIdCallback(data, payload);
    const orderId = ambilOrderIdCallback(data, payload);
    const statusRaw = ambilStatusCallback(data, payload);
    const statusNormal = normalisasiStatus(statusRaw);
    const sn = ambilSnCallback(data, payload);

    const responseText = JSON.stringify({
      source: 'vipreseller_callback',
      user_agent: userAgent,
      payload
    });

    if (!orderId && !trxid) {
      await kirimNotifAman({
        subject: '🚨 Callback VIPReseller Tanpa Order ID / TRXID',
        title: 'Callback VIPReseller Tidak Bisa Dicocokkan',
        message:
          'VIPReseller mengirim callback, tapi tidak ada order_id/ref_id/trxid yang bisa dipakai untuk mencari transaksi.',
        orderId: '-',
        detail: JSON.stringify(
          {
            userAgent,
            payload
          },
          null,
          2
        )
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi tidak ada order_id atau trxid.'
      });
    }

    if (orderId && !orderIdValid(orderId)) {
      await kirimNotifAman({
        subject: `🚨 Callback VIPReseller Order ID Aneh - ${orderId}`,
        title: 'Format Order ID Callback VIPReseller Tidak Valid',
        message:
          'VIPReseller mengirim callback dengan order_id/ref_id yang bukan format order NaXaShop.',
        orderId,
        detail: JSON.stringify(
          {
            trxid,
            userAgent,
            payload
          },
          null,
          2
        )
      });

      // Jangan return error ke provider, biar provider tidak retry terus.
      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi order_id bukan order NaXaShop.'
      });
    }

    const trx = await cariTransaksiVipReseller({
      orderId,
      trxid
    });

    if (!trx) {
      await kirimNotifAman({
        subject: `🚨 Callback VIPReseller Transaksi Tidak Ditemukan`,
        title: 'Callback VIPReseller Masuk Tapi Transaksi Tidak Ada',
        message:
          'VIPReseller mengirim callback valid, tapi transaksi tidak ditemukan di database.',
        orderId: orderId || '-',
        detail: JSON.stringify(
          {
            orderId,
            trxid,
            statusRaw,
            statusNormal,
            userAgent,
            payload
          },
          null,
          2
        )
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi transaksi tidak ditemukan.'
      });
    }

    if (trx.provider !== 'vipreseller') {
      await updateCatatan(
        trx.order_id,
        `Callback VIPReseller diterima, tapi transaksi provider=${trx.provider}. Callback diabaikan pada ${new Date().toISOString()}`
      );

      await kirimNotifAman({
        subject: `⚠️ Callback VIPReseller Salah Provider - ${trx.order_id}`,
        title: 'Callback VIPReseller Masuk ke Order Non-VIPReseller',
        message:
          'Ada callback VIPReseller untuk order yang provider-nya bukan vipreseller. Cek kemungkinan ID bentrok.',
        orderId: trx.order_id,
        detail: JSON.stringify(
          {
            provider_transaksi: trx.provider,
            orderId,
            trxid,
            userAgent,
            payload
          },
          null,
          2
        )
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi provider order bukan VIPReseller.'
      });
    }

    // Jangan pernah downgrade order yang sudah sukses.
    if (trx.status_topup === 'sukses') {
      await db.query(
        `UPDATE transaksi
         SET apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback VIPReseller diterima lagi tapi order sudah sukses pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          statusRaw || 'status kosong',
          trx.order_id
        ]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima. Order sudah sukses sebelumnya.',
        data: {
          order_id: trx.order_id,
          trxid,
          status_topup: 'sukses',
          status_provider: statusNormal
        }
      });
    }

    if (statusProviderSukses(statusRaw)) {
      const [hasilUpdate] = await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback VIPReseller SUKSES pada ', NOW(), '. TRXID: ', ?, '. SN/Note: ', ?),
             updated_at = NOW()
         WHERE order_id = ?
           AND status_topup != 'sukses'`,
        [
          responseText,
          trxid || '-',
          sn || '-',
          trx.order_id
        ]
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
          console.error(
            'Gagal kirim email sukses customer dari callback VIPReseller:',
            error
          );

          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${trx.order_id}`,
            title: 'Callback VIPReseller Sukses Tapi Email Customer Gagal',
            message:
              'Top-up sukses dari callback VIPReseller, tapi email customer gagal dikirim.',
            orderId: trx.order_id,
            detail: error.message || String(error)
          });
        }
      }

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback VIPReseller sukses. Status top-up jadi sukses.',
        data: {
          order_id: trx.order_id,
          trxid,
          status_topup: 'sukses',
          status_provider: statusNormal,
          sn
        }
      });
    }

    if (statusProviderGagal(statusRaw)) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback VIPReseller GAGAL pada ', NOW(), '. TRXID: ', ?, '. Status: ', ?, '. Pesan: ', ?),
             updated_at = NOW()
         WHERE order_id = ?
           AND status_topup != 'sukses'`,
        [
          responseText,
          trxid || '-',
          statusRaw || '-',
          data.message || payload.message || '-',
          trx.order_id
        ]
      );

      await kirimNotifAman({
        subject: `🚨 Callback VIPReseller Gagal - ${trx.order_id}`,
        title: 'Top-up Gagal dari Callback VIPReseller',
        message:
          'VIPReseller mengirim callback gagal untuk transaksi yang pembayaran sudah sukses.',
        orderId: trx.order_id,
        detail: JSON.stringify(
          {
            trxid,
            statusRaw,
            statusNormal,
            data,
            payload
          },
          null,
          2
        )
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback VIPReseller gagal. Status top-up jadi gagal.',
        data: {
          order_id: trx.order_id,
          trxid,
          status_topup: 'gagal',
          status_provider: statusNormal
        }
      });
    }

    if (statusProviderMasihProses(statusRaw)) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = CASE
               WHEN status_topup = 'sukses' THEN 'sukses'
               WHEN status_topup = 'gagal' THEN 'gagal'
               ELSE 'proses'
             END,
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback VIPReseller masih PROSES pada ', NOW(), '. TRXID: ', ?, '. Status: ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          trxid || '-',
          statusRaw || 'Pending',
          trx.order_id
        ]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback VIPReseller proses/pending diterima.',
        data: {
          order_id: trx.order_id,
          trxid,
          status_topup: trx.status_topup === 'gagal' ? 'gagal' : 'proses',
          status_provider: statusNormal
        }
      });
    }

    await db.query(
      `UPDATE transaksi
       SET apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback VIPReseller status tidak dikenali pada ', NOW(), '. TRXID: ', ?, '. Status: ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        responseText,
        trxid || '-',
        statusRaw || 'status kosong',
        trx.order_id
      ]
    );

    await kirimNotifAman({
      subject: `⚠️ Callback VIPReseller Status Tidak Dikenali - ${trx.order_id}`,
      title: 'Status Callback VIPReseller Tidak Dikenali',
      message:
        'VIPReseller mengirim status yang belum dikenali sistem. Cek dashboard admin.',
      orderId: trx.order_id,
      detail: JSON.stringify(
        {
          trxid,
          statusRaw,
          statusNormal,
          data,
          payload
        },
        null,
        2
      )
    });

    return NextResponse.json({
      sukses: true,
      pesan: 'Callback diterima, tapi status provider tidak dikenali.',
      data: {
        order_id: trx.order_id,
        trxid,
        status_provider: statusNormal
      }
    });
  } catch (error) {
    console.error('Error callback VIPReseller:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Sistem callback VIPReseller error.'
      },
      { status: 500 }
    );
  }
}