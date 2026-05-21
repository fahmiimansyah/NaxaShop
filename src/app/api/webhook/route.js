import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../lib/db';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../lib/mailer';

function bersihinText(value) {
  return String(value || '').trim();
}

function orderIdValid(orderId) {
  return /^NX-\d{10,20}(-[A-Z0-9]{8})?$/.test(orderId);
}

function buatSignatureMidtrans(notif, serverKey) {
  const stringToHash = `${notif.order_id}${notif.status_code}${notif.gross_amount}${serverKey}`;

  return crypto
    .createHash('sha512')
    .update(stringToHash)
    .digest('hex');
}

function signatureValid(signatureDariMidtrans, signatureKita) {
  const a = Buffer.from(String(signatureDariMidtrans || ''), 'hex');
  const b = Buffer.from(String(signatureKita || ''), 'hex');

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function pembayaranSukses(notif) {
  if (notif.transaction_status === 'settlement') return true;

  if (
    notif.transaction_status === 'capture' &&
    (notif.fraud_status === 'accept' || !notif.fraud_status)
  ) {
    return true;
  }

  return false;
}

function pembayaranGagal(notif) {
  return ['cancel', 'expire', 'deny', 'failure'].includes(
    notif.transaction_status
  );
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function ambilStatusApiGames(data) {
  return (
    data?.data?.status ||
    data?.status_transaksi ||
    data?.transaction_status ||
    data?.status ||
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
    console.error('Gagal update catatan:', error);
  }
}

async function tembakApiGames(trx) {
  const merchantId = process.env.APIGAMES_MERCHANT_ID;
  const secretKey = process.env.APIGAMES_SECRET;

  if (!merchantId || !secretKey) {
    throw new Error('Env APIGames belum lengkap');
  }

  const refId = trx.order_id;

  const signatureApiGames = crypto
    .createHash('md5')
    .update(`${merchantId}:${secretKey}:${refId}`)
    .digest('hex');

  const responPabrik = await fetch('https://v1.apigames.id/v2/transaksi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref_id: refId,
      merchant_id: merchantId,
      produk: trx.kode_produk,
      tujuan: trx.id_player,
      server_id: trx.zone_player || '',
      signature: signatureApiGames
    }),
    cache: 'no-store'
  });

  const rawPabrik = await responPabrik.text();

  let hasilPabrik;

  try {
    hasilPabrik = JSON.parse(rawPabrik);
  } catch (error) {
    hasilPabrik = {
      raw_response: rawPabrik
    };
  }

  const statusRaw = ambilStatusApiGames(hasilPabrik);

  const gagal =
    !responPabrik.ok ||
    hasilPabrik.status === 0 ||
    hasilPabrik.status === false ||
    statusApiGamesGagal(statusRaw) ||
    statusApiGamesButuhAdmin(statusRaw);

  const suksesFinal = statusApiGamesSukses(statusRaw);

  return {
    gagal,
    suksesFinal,
    statusRaw,
    statusNormal: normalisasiStatus(statusRaw),
    data: hasilPabrik
  };
}

export async function POST(request) {
  try {
    const notif = await request.json();
    const orderId = bersihinText(notif.order_id).toUpperCase();

    if (
      !orderId ||
      !notif.status_code ||
      !notif.gross_amount ||
      !notif.signature_key ||
      !notif.transaction_status
    ) {
      return NextResponse.json(
        { sukses: false, pesan: 'Notif Midtrans gak lengkap bre!' },
        { status: 400 }
      );
    }

    if (!orderIdValid(orderId)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Format Order ID webhook gak valid bre!' },
        { status: 400 }
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY belum ada di env');

      return NextResponse.json(
        { sukses: false, pesan: 'Server payment belum siap bre!' },
        { status: 500 }
      );
    }

    const signatureKita = buatSignatureMidtrans(
      {
        ...notif,
        order_id: orderId
      },
      serverKey
    );

    if (!signatureValid(notif.signature_key, signatureKita)) {
      console.error('Signature webhook Midtrans tidak valid:', {
        orderId,
        transaction_status: notif.transaction_status
      });

      return NextResponse.json(
        { sukses: false, pesan: 'Lu siapa njir? Palsu!' },
        { status: 403 }
      );
    }

    const [dataTrx] = await db.query(
      `SELECT
         t.*,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (dataTrx.length === 0) {
      await kirimNotifAman({
        subject: `🚨 Webhook Order Tidak Ditemukan - ${orderId}`,
        title: 'Webhook Midtrans Masuk Tapi Order Tidak Ada',
        message:
          'Midtrans mengirim webhook valid, tapi order_id tidak ditemukan di database.',
        orderId,
        detail: JSON.stringify(notif, null, 2)
      });

      return NextResponse.json(
        { sukses: false, pesan: 'Data transaksi gak ketemu di kulkas' },
        { status: 404 }
      );
    }

    const trx = dataTrx[0];

    const grossAmountMidtrans = Number(notif.gross_amount);
    const hargaDatabase = Number(trx.harga);

    if (grossAmountMidtrans !== hargaDatabase) {
      console.error('Nominal tidak cocok:', {
        order_id: orderId,
        grossAmountMidtrans,
        hargaDatabase
      });

      await kirimNotifAman({
        subject: `🚨 Nominal Tidak Cocok - ${orderId}`,
        title: 'Nominal Payment Tidak Cocok',
        message:
          'Midtrans mengirim notif, tapi nominalnya beda dengan database. Cek dashboard admin.',
        orderId,
        detail: JSON.stringify(
          {
            grossAmountMidtrans,
            hargaDatabase,
            notif
          },
          null,
          2
        )
      });

      return NextResponse.json(
        { sukses: false, pesan: 'Nominal pembayaran gak cocok bre!' },
        { status: 400 }
      );
    }

    if (pembayaranGagal(notif)) {
      if (trx.status_bayar === 'sukses' || trx.status_topup === 'sukses') {
        await updateCatatan(
          orderId,
          `Webhook status ${notif.transaction_status} diabaikan karena transaksi sudah pernah sukses pada ${new Date().toISOString()}`
        );

        return NextResponse.json(
          {
            sukses: true,
            pesan: 'Status gagal/expired diabaikan karena order sudah sukses sebelumnya.'
          },
          { status: 200 }
        );
      }

      await db.query(
        `UPDATE transaksi
         SET status_bayar = 'gagal',
             status_topup = 'gagal',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nWebhook Midtrans gagal/expired pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?
           AND status_bayar != 'sukses'
           AND status_topup != 'sukses'`,
        [orderId]
      );

      return NextResponse.json(
        { sukses: true, pesan: 'Pembayaran gagal/expired dicatat.' },
        { status: 200 }
      );
    }

    if (!pembayaranSukses(notif)) {
      await db.query(
        `UPDATE transaksi
         SET status_bayar = 'pending',
             updated_at = NOW()
         WHERE order_id = ?
           AND status_bayar != 'sukses'`,
        [orderId]
      );

      return NextResponse.json(
        { sukses: true, pesan: 'Notif diterima, tapi pembayaran belum settlement.' },
        { status: 200 }
      );
    }

    await db.query(
      `UPDATE transaksi
       SET status_bayar = 'sukses',
           updated_at = NOW()
       WHERE order_id = ?`,
      [orderId]
    );

    if (trx.status_topup === 'sukses') {
      return NextResponse.json(
        { sukses: true, pesan: 'Order ini sudah sukses sebelumnya. Aman, gak ditembak dobel.' },
        { status: 200 }
      );
    }

    if (trx.status_topup === 'proses') {
      return NextResponse.json(
        { sukses: true, pesan: 'Order ini sedang diproses. Webhook dobel diabaikan.' },
        { status: 200 }
      );
    }

    if (trx.status_topup === 'gagal') {
      await updateCatatan(
        orderId,
        `Webhook payment sukses diterima, tapi status_topup sudah gagal. Menunggu retry/admin pada ${new Date().toISOString()}`
      );

      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Pembayaran sukses, tapi top-up sudah gagal. Menunggu retry admin.'
        },
        { status: 200 }
      );
    }

    const [hasilLock] = await db.query(
      `UPDATE transaksi
       SET status_bayar = 'sukses',
           status_topup = 'proses',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nWebhook memproses top-up pada ', NOW()),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_topup = 'pending'`,
      [orderId]
    );

    if (hasilLock.affectedRows === 0) {
      return NextResponse.json(
        { sukses: true, pesan: 'Order sudah pernah diproses. Webhook dobel diabaikan.' },
        { status: 200 }
      );
    }

    const enableRealTopup = process.env.ENABLE_REAL_TOPUP !== 'false';

    if (!enableRealTopup) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'proses',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nWebhook: ENABLE_REAL_TOPUP=false, APIGames tidak ditembak pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [orderId]
      );

      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Payment sukses. Real top-up dimatikan, APIGames tidak ditembak.'
        },
        { status: 200 }
      );
    }

    let hasilApiGames;

    try {
      hasilApiGames = await tembakApiGames(trx);
    } catch (error) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nWebhook gagal tembak APIGames pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [error.message || 'Unknown APIGames error', orderId]
      );

      await kirimNotifAman({
        subject: `🚨 APIGames Error via Webhook - ${orderId}`,
        title: 'APIGames Error dari Webhook',
        message:
          'Pembayaran sukses, tapi sistem gagal menembak APIGames. Cek dashboard admin.',
        orderId,
        detail: error.message || String(error)
      });

      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Pembayaran sukses, tapi APIGames error. Admin sudah dinotifikasi.'
        },
        { status: 200 }
      );
    }

    if (hasilApiGames.gagal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames gagal saat webhook pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          JSON.stringify(hasilApiGames.data),
          hasilApiGames.statusRaw || 'Status APIGames gagal',
          orderId
        ]
      );

      await kirimNotifAman({
        subject: `🚨 Top-up Gagal via Webhook - ${orderId}`,
        title: 'Top-up Gagal Dikirim ke APIGames',
        message:
          'Ada pembayaran sukses, tapi APIGames mengembalikan status gagal dari webhook. Cek dashboard admin sekarang.',
        orderId,
        detail: JSON.stringify(hasilApiGames.data, null, 2)
      });

      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Pembayaran sukses, tapi APIGames gagal. Admin sudah dinotifikasi.'
        },
        { status: 200 }
      );
    }

    if (hasilApiGames.suksesFinal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames langsung SUKSES via webhook pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [JSON.stringify(hasilApiGames.data), orderId]
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
          console.error('Gagal kirim email sukses customer via webhook:', error);

          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${orderId}`,
            title: 'Top-up Sukses Tapi Email Customer Gagal',
            message:
              'APIGames sudah sukses via webhook, tapi email customer gagal dikirim.',
            orderId,
            detail: error.message || String(error)
          });
        }
      }

      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Pembayaran sukses, top-up berhasil via webhook.'
        },
        { status: 200 }
      );
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nOrder terkirim ke APIGames via webhook pada ', NOW(), ': ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        JSON.stringify(hasilApiGames.data),
        hasilApiGames.statusRaw || 'Status APIGames proses/belum final',
        orderId
      ]
    );

    return NextResponse.json(
      {
        sukses: true,
        pesan: 'Pembayaran sukses, order sudah dikirim ke APIGames.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error Webhook:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Sistem Webhook Error' },
      { status: 500 }
    );
  }
}