import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import crypto from 'crypto';
import db from '../../../../lib/db';
import { kirimEmailAdmin } from '../../../../lib/mailer';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return false;
  }

  return true;
}

function bersihinText(value) {
  return String(value || '').trim();
}

async function kirimNotifAman(payload) {
  try {
    await kirimEmailAdmin(payload);
  } catch (error) {
    console.error('Gagal kirim email admin:', error);
  }
}

export async function POST(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const orderId = bersihinText(body.order_id);

    if (!orderId) {
      return NextResponse.json(
        { sukses: false, pesan: 'Order ID wajib dikirim bre!' },
        { status: 400 }
      );
    }

    const [dataTrx] = await db.query(
      `SELECT *
       FROM transaksi
       WHERE order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (dataTrx.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Transaksi gak ketemu bre!' },
        { status: 404 }
      );
    }

    const trx = dataTrx[0];

    if (trx.status_bayar !== 'sukses') {
      return NextResponse.json(
        { sukses: false, pesan: 'Pembayaran belum sukses, jangan top-up dulu bre!' },
        { status: 400 }
      );
    }

    if (trx.status_topup === 'sukses') {
      return NextResponse.json(
        { sukses: false, pesan: 'Top-up ini udah sukses, jangan ditembak dobel bre!' },
        { status: 400 }
      );
    }

    const merchantId = process.env.APIGAMES_MERCHANT_ID;
    const secretKey = process.env.APIGAMES_SECRET;

    if (!merchantId || !secretKey) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry gagal: env APIGames belum lengkap pada ', NOW())
         WHERE order_id = ?`,
        [orderId]
      );

      await kirimNotifAman({
        subject: `🚨 Retry Gagal ENV APIGames - ${orderId}`,
        title: 'Retry Top-up Gagal: ENV APIGames Kosong',
        message: 'Admin mencoba retry, tapi APIGames env belum lengkap.',
        orderId,
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
        { sukses: false, pesan: 'Env APIGames belum lengkap bre!' },
        { status: 500 }
      );
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry top-up oleh admin pada ', NOW())
       WHERE order_id = ?`,
      [orderId]
    );

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

    const responseText = JSON.stringify(hasilPabrik);

    const apiGamesGagal =
      !responPabrik.ok ||
      hasilPabrik.status === 0 ||
      hasilPabrik.status === false;

    if (apiGamesGagal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry gagal pada ', NOW())
         WHERE order_id = ?`,
        [responseText, orderId]
      );

      await kirimNotifAman({
        subject: `🚨 Retry Top-up Gagal - ${orderId}`,
        title: 'Retry Top-up Gagal',
        message: 'Admin sudah mencoba retry top-up, tapi APIGames masih gagal merespons sukses.',
        orderId,
        detail: JSON.stringify(hasilPabrik, null, 2)
      });

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Retry ke APIGames gagal bre!',
          data_apigames: hasilPabrik
        },
        { status: 500 }
      );
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry terkirim ke APIGames pada ', NOW())
       WHERE order_id = ?`,
      [responseText, orderId]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Retry top-up berhasil dikirim ke APIGames. Status jadi proses.',
      data_apigames: hasilPabrik
    });
  } catch (error) {
    console.error('Retry top-up error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur retry top-up meledak bre!' },
      { status: 500 }
    );
  }
}