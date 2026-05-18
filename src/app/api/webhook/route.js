import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../lib/db';
import { kirimEmailAdmin } from '../../lib/mailer';

function buatSignatureMidtrans(notif, serverKey) {
  const stringToHash = `${notif.order_id}${notif.status_code}${notif.gross_amount}${serverKey}`;

  return crypto
    .createHash('sha512')
    .update(stringToHash)
    .digest('hex');
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
  return ['cancel', 'expire', 'deny', 'failure'].includes(notif.transaction_status);
}

async function kirimNotifAman(payload) {
  try {
    await kirimEmailAdmin(payload);
  } catch (error) {
    console.error('Gagal kirim email admin:', error);
  }
}

export async function POST(request) {
  try {
    const notif = await request.json();

    if (
      !notif.order_id ||
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

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error('MIDTRANS_SERVER_KEY belum ada di env');

      return NextResponse.json(
        { sukses: false, pesan: 'Server payment belum siap bre!' },
        { status: 500 }
      );
    }

    const signatureKita = buatSignatureMidtrans(notif, serverKey);

    if (notif.signature_key !== signatureKita) {
      return NextResponse.json(
        { sukses: false, pesan: 'Lu siapa njir? Palsu!' },
        { status: 403 }
      );
    }

    const [dataTrx] = await db.query(
      `SELECT * FROM transaksi WHERE order_id = ? LIMIT 1`,
      [notif.order_id]
    );

    if (dataTrx.length === 0) {
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
        order_id: notif.order_id,
        grossAmountMidtrans,
        hargaDatabase
      });

      await kirimNotifAman({
        subject: `🚨 Nominal Tidak Cocok - ${notif.order_id}`,
        title: 'Nominal Payment Tidak Cocok',
        message: 'Midtrans mengirim notif, tapi nominalnya beda dengan database. Cek dashboard admin.',
        orderId: notif.order_id,
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
      await db.query(
        `UPDATE transaksi
         SET status_bayar = 'gagal',
             status_topup = 'gagal'
         WHERE order_id = ?
         AND status_topup != 'sukses'`,
        [notif.order_id]
      );

      return NextResponse.json(
        { sukses: true, pesan: 'Pembayaran gagal/expired dicatat.' },
        { status: 200 }
      );
    }

    if (!pembayaranSukses(notif)) {
      return NextResponse.json(
        { sukses: true, pesan: 'Notif diterima, tapi pembayaran belum settlement.' },
        { status: 200 }
      );
    }

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

    const [hasilLock] = await db.query(
      `UPDATE transaksi
       SET status_bayar = 'sukses',
           status_topup = 'proses'
       WHERE order_id = ?
       AND status_topup = 'pending'`,
      [notif.order_id]
    );

    if (hasilLock.affectedRows === 0) {
      return NextResponse.json(
        { sukses: true, pesan: 'Order sudah pernah diproses. Webhook dobel diabaikan.' },
        { status: 200 }
      );
    }

    const merchantId = process.env.APIGAMES_MERCHANT_ID;
    const secretKey = process.env.APIGAMES_SECRET;

    if (!merchantId || !secretKey) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nEnv APIGames belum lengkap pada ', NOW())
         WHERE order_id = ?`,
        [notif.order_id]
      );

      await kirimNotifAman({
        subject: `🚨 APIGames ENV Kosong - ${notif.order_id}`,
        title: 'Konfigurasi APIGames Belum Lengkap',
        message: 'Pembayaran sukses, tapi APIGames tidak bisa ditembak karena env belum lengkap.',
        orderId: notif.order_id,
        detail: JSON.stringify(
          {
            merchantIdAda: Boolean(merchantId),
            secretKeyAda: Boolean(secretKey)
          },
          null,
          2
        )
      });

      return NextResponse.json(
        { sukses: true, pesan: 'Pembayaran sukses, tapi APIGames env belum lengkap. Admin sudah dinotifikasi.' },
        { status: 200 }
      );
    }

    const refId = notif.order_id;

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
      })
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

    console.log('CCTV WEBHOOK APIGAMES:', hasilPabrik);

    const apiGamesGagal =
      !responPabrik.ok ||
      hasilPabrik.status === 0 ||
      hasilPabrik.status === false;

    if (apiGamesGagal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames gagal saat webhook pada ', NOW())
         WHERE order_id = ?`,
        [JSON.stringify(hasilPabrik), notif.order_id]
      );

      await kirimNotifAman({
        subject: `🚨 Top-up Gagal - ${notif.order_id}`,
        title: 'Top-up Gagal Dikirim ke APIGames',
        message: 'Ada pembayaran sukses, tapi order gagal dikirim ke APIGames. Cek dashboard admin sekarang.',
        orderId: notif.order_id,
        detail: JSON.stringify(hasilPabrik, null, 2)
      });

      return NextResponse.json(
        { sukses: true, pesan: 'Pembayaran sukses, tapi APIGames gagal. Admin sudah dinotifikasi.' },
        { status: 200 }
      );
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nOrder terkirim ke APIGames via webhook pada ', NOW())
       WHERE order_id = ?`,
      [JSON.stringify(hasilPabrik), notif.order_id]
    );

    return NextResponse.json(
      {
        sukses: true,
        pesan: 'Pembayaran sukses, order sudah dikirim ke APIGames.',
        data_apigames: hasilPabrik
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