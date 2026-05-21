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

function realTopupAktif() {
  return process.env.ENABLE_REAL_TOPUP === 'true';
}

function pembayaranSukses(statusMidtrans) {
  if (statusMidtrans.transaction_status === 'settlement') return true;

  if (
    statusMidtrans.transaction_status === 'capture' &&
    (statusMidtrans.fraud_status === 'accept' || !statusMidtrans.fraud_status)
  ) {
    return true;
  }

  return false;
}

function pembayaranGagal(statusMidtrans) {
  return ['cancel', 'expire', 'deny', 'failure'].includes(
    statusMidtrans.transaction_status
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

function statusApiGamesMasihProses(status) {
  const s = normalisasiStatus(status);

  return [
    '',
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

async function getStatusMidtrans(orderId) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum disetting');
  }

  const authString = Buffer.from(`${serverKey}:`).toString('base64');

  const midtransBaseUrl =
    process.env.MIDTRANS_IS_PRODUCTION === 'true'
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';

  const response = await fetch(
    `${midtransBaseUrl}/v2/${encodeURIComponent(orderId)}/status`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${authString}`
      },
      cache: 'no-store'
    }
  );

  const data = await response.json();

  return {
    ok: response.ok,
    data
  };
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
  const masihProses = statusApiGamesMasihProses(statusRaw);

  return {
    gagal,
    suksesFinal,
    masihProses,
    statusRaw,
    statusNormal: normalisasiStatus(statusRaw),
    data: hasilPabrik
  };
}

export async function POST(request) {
  try {
    const limit = rateLimit(request, {
      key: 'payment-sync',
      limit: 10,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Terlalu sering cek pembayaran bre. Coba lagi ${limit.retryAfter} detik lagi.`
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
         t.*,
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

    if (trx.status_bayar === 'sukses' && trx.status_topup === 'sukses') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Transaksi sudah sukses.',
        data: {
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup
        }
      });
    }

    const statusMidtrans = await getStatusMidtrans(orderId);

    if (!statusMidtrans.ok) {
      return NextResponse.json(
        {
          sukses: false,
          pesan:
            statusMidtrans.data?.status_message ||
            'Status Midtrans belum kebaca bre.',
          data_midtrans: statusMidtrans.data
        },
        { status: 400 }
      );
    }

    const grossAmountMidtrans = Number(statusMidtrans.data.gross_amount);
    const hargaDatabase = Number(trx.harga);

    if (grossAmountMidtrans !== hargaDatabase) {
      await kirimNotifAman({
        subject: `🚨 Nominal Tidak Cocok - ${orderId}`,
        title: 'Nominal Payment Tidak Cocok',
        message:
          'Payment sync membaca nominal Midtrans berbeda dengan database. Cek dashboard admin.',
        orderId,
        detail: JSON.stringify(
          {
            grossAmountMidtrans,
            hargaDatabase,
            midtrans: statusMidtrans.data
          },
          null,
          2
        )
      });

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Nominal pembayaran gak cocok bre!'
        },
        { status: 400 }
      );
    }

    if (pembayaranGagal(statusMidtrans.data)) {
      if (trx.status_bayar === 'sukses') {
        return NextResponse.json({
          sukses: true,
          pesan:
            'Pembayaran sudah sukses sebelumnya, status gagal dari sync diabaikan.',
          data: {
            status_bayar: trx.status_bayar,
            status_topup: trx.status_topup
          }
        });
      }

      await db.query(
        `UPDATE transaksi
         SET status_bayar = 'gagal',
             status_topup = CASE
               WHEN status_topup = 'sukses' THEN status_topup
               ELSE 'gagal'
             END,
             updated_at = NOW()
         WHERE order_id = ?`,
        [orderId]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran gagal/expired sudah disinkronkan.',
        data: {
          status_bayar: 'gagal',
          status_topup: trx.status_topup === 'sukses' ? 'sukses' : 'gagal'
        }
      });
    }

    if (!pembayaranSukses(statusMidtrans.data)) {
      await db.query(
        `UPDATE transaksi
         SET status_bayar = 'pending',
             updated_at = NOW()
         WHERE order_id = ?
           AND status_bayar != 'sukses'`,
        [orderId]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran masih pending.',
        data: {
          status_bayar: 'pending',
          status_topup: trx.status_topup
        }
      });
    }

    await db.query(
      `UPDATE transaksi
       SET status_bayar = 'sukses',
           updated_at = NOW()
       WHERE order_id = ?`,
      [orderId]
    );

    if (trx.status_topup === 'sukses') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran sukses. Top-up sudah sukses.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'sukses'
        }
      });
    }

    if (trx.status_topup === 'proses') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran sukses. Top-up sudah pernah diproses.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'proses'
        }
      });
    }

    if (trx.status_topup === 'gagal') {
      return NextResponse.json({
        sukses: true,
        pesan:
          'Pembayaran sukses, tapi top-up sedang butuh pengecekan admin.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'gagal'
        }
      });
    }

    // SAFETY SWITCH:
    // Kalau ENABLE_REAL_TOPUP=false, jangan tembak APIGames real.
    // Status topup sengaja tetap pending supaya payment page tidak lanjut sync APIGames.
    if (!realTopupAktif()) {
      await db.query(
        `UPDATE transaksi
         SET catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nPayment sync: ENABLE_REAL_TOPUP=false, APIGames tidak ditembak pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [orderId]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran sukses. Mode aman aktif, APIGames tidak ditembak.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'pending',
          mode_real_topup: false
        }
      });
    }

    const [hasilLock] = await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nPayment sync memproses top-up pada ', NOW()),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_topup = 'pending'`,
      [orderId]
    );

    if (hasilLock.affectedRows === 0) {
      return NextResponse.json({
        sukses: true,
        pesan:
          'Pembayaran sukses, tapi top-up sudah bukan pending. Tidak ditembak ulang.',
        data: {
          status_bayar: 'sukses',
          status_topup: trx.status_topup
        }
      });
    }

    let hasilApiGames;

    try {
      hasilApiGames = await tembakApiGames(trx);
    } catch (error) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nPayment sync gagal tembak APIGames pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [error.message || 'Unknown APIGames error', orderId]
      );

      await kirimNotifAman({
        subject: `🚨 APIGames Error via Payment Sync - ${orderId}`,
        title: 'APIGames Error dari Payment Sync',
        message:
          'Pembayaran sukses, tapi sistem gagal menembak APIGames. Cek dashboard admin.',
        orderId,
        detail: error.message || String(error)
      });

      return NextResponse.json({
        sukses: true,
        pesan:
          'Pembayaran sukses, tapi top-up gagal diproses. Admin sudah dinotifikasi.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'gagal'
        }
      });
    }

    if (hasilApiGames.gagal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames gagal saat payment sync pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          JSON.stringify(hasilApiGames.data),
          hasilApiGames.statusRaw || 'Status APIGames gagal',
          orderId
        ]
      );

      await kirimNotifAman({
        subject: `🚨 Top-up Gagal via Payment Sync - ${orderId}`,
        title: 'Top-up Gagal dari Payment Sync',
        message:
          'Pembayaran sukses, tapi APIGames mengembalikan status gagal saat payment sync. Cek dashboard admin.',
        orderId,
        detail: JSON.stringify(hasilApiGames.data, null, 2)
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran sukses, tapi top-up gagal. Admin sudah dinotifikasi.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'gagal',
          status_apigames: hasilApiGames.statusNormal
        }
      });
    }

    if (hasilApiGames.suksesFinal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames langsung SUKSES via payment sync pada ', NOW()),
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
          console.error('Gagal kirim email sukses customer:', error);

          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${orderId}`,
            title: 'Top-up Sukses Tapi Email Customer Gagal',
            message:
              'APIGames sudah sukses via payment sync, tapi email customer gagal dikirim.',
            orderId,
            detail: error.message || String(error)
          });
        }
      }

      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran sukses, top-up berhasil.',
        data: {
          status_bayar: 'sukses',
          status_topup: 'sukses',
          status_apigames: hasilApiGames.statusNormal
        }
      });
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nOrder terkirim ke APIGames via payment sync pada ', NOW(), ': ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        JSON.stringify(hasilApiGames.data),
        hasilApiGames.statusRaw || 'Status APIGames proses/belum final',
        orderId
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Pembayaran sukses, top-up sedang diproses.',
      data: {
        status_bayar: 'sukses',
        status_topup: 'proses',
        status_apigames: hasilApiGames.statusNormal
      }
    });
  } catch (error) {
    console.error('Payment sync error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal sinkron pembayaran bre!'
      },
      { status: 500 }
    );
  }
}