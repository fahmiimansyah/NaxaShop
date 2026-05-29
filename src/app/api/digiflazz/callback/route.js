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
  return ['sukses', 'success', 'berhasil'].includes(s);
}

function statusProviderGagal(status) {
  const s = normalisasiStatus(status);
  return ['gagal', 'failed', 'fail', 'error'].includes(s);
}

function statusProviderMasihProses(status) {
  const s = normalisasiStatus(status);

  return [
    '',
    'pending',
    'proses',
    'process',
    'processing',
    'waiting'
  ].includes(s);
}

function bikinCustomerNoDigiflazz(trx) {
  const idPlayer = bersihinText(trx.id_player);
  const zonePlayer = bersihinText(trx.zone_player);

  if (zonePlayer) {
    return `${idPlayer}|${zonePlayer}`;
  }

  return idPlayer;
}

function signatureDigiflazzValid({ rawBody, signatureHeader, secret }) {
  if (!secret) return false;

  const signatureDariDigiflazz = bersihinText(signatureHeader);

  if (!signatureDariDigiflazz) return false;

  const hash = crypto
    .createHmac('sha1', secret)
    .update(rawBody)
    .digest('hex');

  const signatureKita = `sha1=${hash}`;

  const a = Buffer.from(signatureDariDigiflazz);
  const b = Buffer.from(signatureKita);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function ambilDataCallback(payload) {
  return payload?.data || payload || {};
}

function ambilStatusCallback(data) {
  return (
    data?.status ||
    data?.buyer_last_status ||
    data?.message ||
    ''
  );
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
    console.error('Gagal update catatan callback Digiflazz:', error);
  }
}

export async function POST(request) {
  const event = request.headers.get('x-digiflazz-event') || '';
  const userAgent = request.headers.get('user-agent') || '';
  const signatureHeader = request.headers.get('x-hub-signature') || '';
  const secret = process.env.DIGIFLAZZ_WEBHOOK_SECRET || '';

  let rawBody = '';

  try {
    rawBody = await request.text();

    if (!secret) {
      console.error('DIGIFLAZZ_WEBHOOK_SECRET belum diset.');

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Webhook secret Digiflazz belum diset.'
        },
        { status: 500 }
      );
    }

    const signatureValid = signatureDigiflazzValid({
      rawBody,
      signatureHeader,
      secret
    });

    if (!signatureValid) {
      console.error('Signature callback Digiflazz tidak valid:', {
        event,
        userAgent
      });

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Signature Digiflazz tidak valid.'
        },
        { status: 403 }
      );
    }

    let payload;

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      console.error('Payload callback Digiflazz bukan JSON:', rawBody);

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Payload callback Digiflazz bukan JSON.'
        },
        { status: 400 }
      );
    }

    // Ping event dari Digiflazz saat webhook pertama kali diset.
    if (
      normalisasiStatus(event) === 'ping' ||
      payload?.hook_id ||
      payload?.hook
    ) {
      return NextResponse.json({
        sukses: true,
        pesan: 'Ping Digiflazz diterima.',
        event,
        userAgent
      });
    }

    const data = ambilDataCallback(payload);

    const orderId = bersihinText(data.ref_id).toUpperCase();
    const buyerSkuCode = bersihinText(data.buyer_sku_code);
    const customerNo = bersihinText(data.customer_no);
    const statusRaw = ambilStatusCallback(data);
    const statusNormal = normalisasiStatus(statusRaw);

    const responseText = JSON.stringify({
      event,
      user_agent: userAgent,
      payload
    });

    if (!orderId) {
      await kirimNotifAman({
        subject: '🚨 Callback Digiflazz Tanpa Ref ID',
        title: 'Callback Digiflazz Tidak Punya ref_id',
        message:
          'Digiflazz mengirim callback, tapi ref_id kosong. Callback diabaikan.',
        orderId: '-',
        detail: JSON.stringify(
          {
            event,
            userAgent,
            payload
          },
          null,
          2
        )
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi ref_id kosong.'
      });
    }

    if (!orderIdValid(orderId)) {
      await kirimNotifAman({
        subject: `🚨 Callback Digiflazz Ref ID Aneh - ${orderId}`,
        title: 'Format ref_id Callback Digiflazz Tidak Valid',
        message:
          'Digiflazz mengirim callback dengan ref_id yang bukan format order NaXaShop.',
        orderId,
        detail: JSON.stringify(
          {
            event,
            userAgent,
            payload
          },
          null,
          2
        )
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi ref_id bukan order NaXaShop.'
      });
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
        subject: `🚨 Callback Digiflazz Order Tidak Ditemukan - ${orderId}`,
        title: 'Callback Digiflazz Masuk Tapi Order Tidak Ada',
        message:
          'Digiflazz mengirim callback valid, tapi order_id tidak ditemukan di database.',
        orderId,
        detail: JSON.stringify(
          {
            event,
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

    const trx = dataTrx[0];

    if (trx.provider !== 'digiflazz') {
      await updateCatatan(
        orderId,
        `Callback Digiflazz diterima, tapi transaksi provider=${trx.provider}. Callback diabaikan pada ${new Date().toISOString()}`
      );

      await kirimNotifAman({
        subject: `⚠️ Callback Digiflazz Salah Provider - ${orderId}`,
        title: 'Callback Digiflazz Masuk ke Order Non-Digiflazz',
        message:
          'Ada callback Digiflazz untuk order yang provider-nya bukan digiflazz. Cek kemungkinan ref_id bentrok.',
        orderId,
        detail: JSON.stringify(
          {
            provider_transaksi: trx.provider,
            event,
            userAgent,
            payload
          },
          null,
          2
        )
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima, tapi provider order bukan Digiflazz.'
      });
    }

    const kodeProviderDb = bersihinText(
      trx.kode_produk_provider || trx.kode_produk
    );

    const customerNoDb = bikinCustomerNoDigiflazz(trx);

    if (buyerSkuCode && kodeProviderDb && buyerSkuCode !== kodeProviderDb) {
      await updateCatatan(
        orderId,
        `WARNING Callback Digiflazz SKU beda. DB=${kodeProviderDb}, Callback=${buyerSkuCode} pada ${new Date().toISOString()}`
      );
    }

    if (customerNo && customerNoDb && customerNo !== customerNoDb) {
      await updateCatatan(
        orderId,
        `WARNING Callback Digiflazz customer_no beda. DB=${customerNoDb}, Callback=${customerNo} pada ${new Date().toISOString()}`
      );
    }

    // Jangan pernah downgrade order yang sudah sukses.
    if (trx.status_topup === 'sukses') {
      await db.query(
        `UPDATE transaksi
         SET apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Digiflazz diterima lagi tapi order sudah sukses pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          statusRaw || 'status kosong',
          orderId
        ]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback diterima. Order sudah sukses sebelumnya.',
        data: {
          order_id: orderId,
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
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Digiflazz SUKSES pada ', NOW(), '. SN: ', ?),
             updated_at = NOW()
         WHERE order_id = ?
           AND status_topup != 'sukses'`,
        [
          responseText,
          bersihinText(data.sn || '-'),
          orderId
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
            'Gagal kirim email sukses customer dari callback Digiflazz:',
            error
          );

          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${orderId}`,
            title: 'Callback Digiflazz Sukses Tapi Email Customer Gagal',
            message:
              'Top-up sukses dari callback Digiflazz, tapi email customer gagal dikirim.',
            orderId,
            detail: error.message || String(error)
          });
        }
      }

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback Digiflazz sukses. Status top-up jadi sukses.',
        data: {
          order_id: orderId,
          status_topup: 'sukses',
          status_provider: statusNormal,
          sn: data.sn || ''
        }
      });
    }

    if (statusProviderGagal(statusRaw)) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Digiflazz GAGAL pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?
           AND status_topup != 'sukses'`,
        [
          responseText,
          data.message || statusRaw || 'Provider mengirim status gagal',
          orderId
        ]
      );

      await kirimNotifAman({
        subject: `🚨 Callback Digiflazz Gagal - ${orderId}`,
        title: 'Top-up Gagal dari Callback Digiflazz',
        message:
          'Digiflazz mengirim callback gagal untuk transaksi yang pembayaran sudah sukses.',
        orderId,
        detail: JSON.stringify(
          {
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
        pesan: 'Callback Digiflazz gagal. Status top-up jadi gagal.',
        data: {
          order_id: orderId,
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
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Digiflazz masih PROSES pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          data.message || statusRaw || 'Pending',
          orderId
        ]
      );

      return NextResponse.json({
        sukses: true,
        pesan: 'Callback Digiflazz proses/pending diterima.',
        data: {
          order_id: orderId,
          status_topup: trx.status_topup === 'gagal' ? 'gagal' : 'proses',
          status_provider: statusNormal
        }
      });
    }

    await db.query(
      `UPDATE transaksi
       SET apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nCallback Digiflazz status tidak dikenali pada ', NOW(), ': ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        responseText,
        statusRaw || 'status kosong',
        orderId
      ]
    );

    await kirimNotifAman({
      subject: `⚠️ Callback Digiflazz Status Tidak Dikenali - ${orderId}`,
      title: 'Status Callback Digiflazz Tidak Dikenali',
      message:
        'Digiflazz mengirim status yang belum dikenali sistem. Cek dashboard admin.',
      orderId,
      detail: JSON.stringify(
        {
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
        order_id: orderId,
        status_provider: statusNormal
      }
    });
  } catch (error) {
    console.error('Error callback Digiflazz:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Sistem callback Digiflazz error.'
      },
      { status: 500 }
    );
  }
}