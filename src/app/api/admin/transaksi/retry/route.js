import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import crypto from 'crypto';
import db from '../../../../lib/db';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../../lib/mailer';

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

function realTopupAktif() {
  return process.env.ENABLE_REAL_TOPUP === 'true';
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

async function updateGagal(orderId, responseText, catatan) {
  await db.query(
    `UPDATE transaksi
     SET status_topup = 'gagal',
         apigames_response = ?,
         catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\n', ?),
         updated_at = NOW()
     WHERE order_id = ?`,
    [responseText || null, catatan, orderId]
  );
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
      `SELECT
         t.*,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk,
         TIMESTAMPDIFF(SECOND, COALESCE(t.updated_at, t.created_at), NOW()) AS umur_update_detik
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
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

    if (trx.status_topup === 'proses' && Number(trx.umur_update_detik || 0) < 60) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Order ini baru aja diproses bre. Tunggu sebentar sebelum retry lagi.'
        },
        { status: 400 }
      );
    }

    // SAFETY SWITCH:
    // Kalau ENABLE_REAL_TOPUP=false, tombol retry tidak akan nembak APIGames real.
    if (!realTopupAktif()) {
      await db.query(
        `UPDATE transaksi
         SET catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry dibatalkan: ENABLE_REAL_TOPUP=false pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [orderId]
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Mode aman aktif bre. ENABLE_REAL_TOPUP=false, APIGames tidak ditembak.'
        },
        { status: 400 }
      );
    }

    const merchantId = process.env.APIGAMES_MERCHANT_ID;
    const secretKey = process.env.APIGAMES_SECRET;

    if (!merchantId || !secretKey) {
      await updateGagal(
        orderId,
        null,
        'Retry gagal: env APIGames belum lengkap pada ' + new Date().toISOString()
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

    const [hasilLock] = await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry top-up oleh admin pada ', NOW()),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_bayar = 'sukses'
         AND status_topup != 'sukses'`,
      [orderId]
    );

    if (hasilLock.affectedRows === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Order gagal dikunci untuk retry. Mungkin statusnya sudah berubah.'
        },
        { status: 409 }
      );
    }

    const refId = trx.order_id;

    const signatureApiGames = bikinSignatureApiGames({
      merchantId,
      secretKey,
      refId
    });

    let responPabrik;
    let rawPabrik;
    let hasilPabrik;

    try {
      responPabrik = await fetch('https://v1.apigames.id/v2/transaksi', {
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

      rawPabrik = await responPabrik.text();

      try {
        hasilPabrik = JSON.parse(rawPabrik);
      } catch (error) {
        hasilPabrik = {
          raw_response: rawPabrik
        };
      }
    } catch (error) {
      await updateGagal(
        orderId,
        null,
        `Retry gagal fetch APIGames pada ${new Date().toISOString()}: ${error.message || String(error)}`
      );

      await kirimNotifAman({
        subject: `🚨 Retry APIGames Error - ${orderId}`,
        title: 'Retry Top-up Error Saat Menghubungi APIGames',
        message: 'Admin mencoba retry, tapi request ke APIGames error.',
        orderId,
        detail: error.message || String(error)
      });

      return NextResponse.json(
        { sukses: false, pesan: 'Koneksi ke APIGames gagal bre!' },
        { status: 502 }
      );
    }

    const responseText = JSON.stringify(hasilPabrik);
    const statusRaw = ambilStatusApiGames(hasilPabrik);

    const apiGamesGagal =
      !responPabrik.ok ||
      hasilPabrik.status === 0 ||
      hasilPabrik.status === false ||
      statusApiGamesGagal(statusRaw) ||
      statusApiGamesButuhAdmin(statusRaw);

    if (apiGamesGagal) {
      await updateGagal(
        orderId,
        responseText,
        'Retry gagal pada ' + new Date().toISOString()
      );

      await kirimNotifAman({
        subject: `🚨 Retry Top-up Gagal - ${orderId}`,
        title: 'Retry Top-up Gagal',
        message: 'Admin sudah mencoba retry top-up, tapi APIGames masih gagal.',
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

    if (statusApiGamesSukses(statusRaw)) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry langsung SUKSES dari APIGames pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [responseText, orderId]
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
          console.error('Gagal kirim email top-up sukses setelah retry:', error);
        }
      }

      return NextResponse.json({
        sukses: true,
        pesan: 'Retry top-up sukses. Status jadi sukses.',
        data: {
          status_topup: 'sukses'
        },
        data_apigames: hasilPabrik
      });
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry terkirim ke APIGames pada ', NOW()),
           updated_at = NOW()
       WHERE order_id = ?`,
      [responseText, orderId]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Retry top-up berhasil dikirim ke APIGames. Status jadi proses.',
      data: {
        status_topup: 'proses',
        status_apigames: normalisasiStatus(statusRaw)
      },
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