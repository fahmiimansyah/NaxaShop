import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../lib/db';
import { orderVipReseller } from '../../lib/vipreseller';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../lib/mailer';
import { prosesVoucherMakasihOrderPertama } from '../../lib/voucher';
import { transaksiDigiflazz } from '../../lib/digiflazz';

function bersihinText(value) {
  return String(value || '').trim();
}

function orderIdValid(orderId) {
  return /^NX-\d{10,20}(-[A-Z0-9]{8})?$/.test(orderId);
}

function realTopupAktif() {
  const realTopup = process.env.ENABLE_REAL_TOPUP === 'true';
  const midtransProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const allowSandboxRealTopup =
    process.env.ALLOW_SANDBOX_REAL_TOPUP === 'true';

  return realTopup && (midtransProduction || allowSandboxRealTopup);
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

function normalisasiProvider(value) {
  return String(value || 'apigames').trim().toLowerCase();
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

function statusProviderSukses(status) {
  const s = normalisasiStatus(status);
  return ['sukses', 'success', 'berhasil'].includes(s);
}

function statusProviderGagal(status) {
  const s = normalisasiStatus(status);
  return ['gagal', 'failed', 'fail', 'error'].includes(s);
}

function statusProviderButuhAdmin(status) {
  const s = normalisasiStatus(status);
  return ['sukses sebagian', 'partial', 'partial success'].includes(s);
}

function statusProviderMasihProses(status) {
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

function ambilPesanProvider(data) {
  return (
    data?.data?.message ||
    data?.message ||
    data?.data?.data?.message ||
    ''
  );
}

function ambilRcProvider(data) {
  return (
    data?.data?.rc ||
    data?.rc ||
    data?.data?.data?.rc ||
    ''
  );
}

function deteksiMasalahProvider(hasilProvider) {
  const provider = normalisasiProvider(hasilProvider.provider);
  const rc = String(ambilRcProvider(hasilProvider.data) || '').trim();
  const pesan = String(ambilPesanProvider(hasilProvider.data) || '').trim();
  const pesanLower = pesan.toLowerCase();

  if (
    provider === 'digiflazz' &&
    (
      rc === '45' ||
      pesanLower.includes('ip anda tidak kami kenali') ||
      (pesanLower.includes('ip') && pesanLower.includes('tidak') && pesanLower.includes('kenali'))
    )
  ) {
    return {
      jenis: 'konfigurasi_provider',
      label: 'IP Digiflazz belum whitelist',
      pesan: pesan || 'IP server belum terdaftar di whitelist Digiflazz.',
      aksi: 'Tambahkan IP publik server/laptop ke whitelist Development IP Digiflazz, atau jalankan backend dari VPS dengan IP tetap.'
    };
  }

  if (
    pesanLower.includes('signature') ||
    pesanLower.includes('sign') ||
    pesanLower.includes('username') ||
    pesanLower.includes('api key')
  ) {
    return {
      jenis: 'konfigurasi_provider',
      label: 'Credential provider bermasalah',
      pesan: pesan || 'Credential provider tidak valid.',
      aksi: 'Cek username, API key, dan mode environment provider.'
    };
  }

  if (
    pesanLower.includes('saldo') ||
    pesanLower.includes('balance')
  ) {
    return {
      jenis: 'saldo_provider',
      label: 'Saldo provider bermasalah',
      pesan: pesan || 'Saldo provider tidak mencukupi.',
      aksi: 'Cek saldo provider.'
    };
  }

  return {
    jenis: 'gagal_provider',
    label: 'Provider mengembalikan status gagal',
    pesan: pesan || hasilProvider.statusRaw || 'Provider mengembalikan status gagal.',
    aksi: 'Cek response provider di dashboard admin.'
  };
}

function bikinCustomerNoDigiflazz(trx) {
  const idPlayer = bersihinText(trx.id_player);
  const zonePlayer = bersihinText(trx.zone_player);

  if (zonePlayer) {
    return `${idPlayer}|${zonePlayer}`;
  }

  return idPlayer;
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
  const kodeProdukProvider = trx.kode_produk_provider || trx.kode_produk;

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
      produk: kodeProdukProvider,
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
    statusProviderGagal(statusRaw) ||
    statusProviderButuhAdmin(statusRaw);

  return {
    provider: 'apigames',
    gagal,
    suksesFinal: statusProviderSukses(statusRaw),
    masihProses: statusProviderMasihProses(statusRaw),
    statusRaw,
    statusNormal: normalisasiStatus(statusRaw),
    data: hasilPabrik
  };
}

async function tembakVipReseller(trx) {
  const hasil = await orderVipReseller({
    kodeProduk: trx.kode_produk_provider || trx.kode_produk,
    idPlayer: trx.id_player,
    zonePlayer: trx.zone_player
  });

  const dataStatus = Array.isArray(hasil.data?.data)
    ? hasil.data.data[0]
    : hasil.data?.data || hasil.data;

  const statusRaw =
    dataStatus?.status ||
    hasil.data?.status ||
    hasil.data?.message ||
    '';

  return {
    provider: 'vipreseller',
    gagal:
      !hasil.ok ||
      hasil.data?.result === false ||
      statusProviderGagal(statusRaw),
    suksesFinal: statusProviderSukses(statusRaw),
    masihProses:
      statusProviderMasihProses(statusRaw) ||
      ['waiting', 'process', 'processing'].includes(normalisasiStatus(statusRaw)),
    statusRaw,
    statusNormal: normalisasiStatus(statusRaw),
    data: hasil.data
  };
}

async function tembakDigiflazz(trx) {
  const refId = trx.order_id;
  const buyerSkuCode = trx.kode_produk_provider || trx.kode_produk;
  const customerNo = bikinCustomerNoDigiflazz(trx);

  const hasil = await transaksiDigiflazz({
    refId,
    buyerSkuCode,
    customerNo
  });

  const statusRaw =
    hasil.status ||
    hasil.data?.data?.status ||
    hasil.data?.status ||
    '';

  const gagal =
    !hasil.ok ||
    hasil.gagal ||
    statusProviderGagal(statusRaw) ||
    statusProviderButuhAdmin(statusRaw);

  return {
    provider: 'digiflazz',
    gagal,
    suksesFinal: hasil.sukses || statusProviderSukses(statusRaw),
    masihProses: hasil.pending || statusProviderMasihProses(statusRaw),
    statusRaw,
    statusNormal: normalisasiStatus(statusRaw),
    data: hasil.data
  };
}

async function tembakMock(trx) {
  return {
    provider: 'mock',
    gagal: false,
    suksesFinal: true,
    masihProses: false,
    statusRaw: 'Sukses',
    statusNormal: 'sukses',
    data: {
      ref_id: trx.order_id,
      status: 'Sukses',
      message: 'Mock provider sukses dari webhook'
    }
  };
}

async function tembakProvider(trx) {
  const provider = normalisasiProvider(trx.provider);

  if (provider === 'apigames') {
    return tembakApiGames(trx);
  }

  if (provider === 'digiflazz') {
    return tembakDigiflazz(trx);
  }

  if (provider === 'mock') {
    return tembakMock(trx);
  }

  if (provider === 'vipreseller') {
  return tembakVipReseller(trx);
  }

  throw new Error(`Provider tidak dikenali: ${provider}`);
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
    const provider = normalisasiProvider(trx.provider);

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
        {
          sukses: true,
          pesan: 'Order ini sudah sukses sebelumnya. Aman, gak ditembak dobel.',
          data: { provider }
        },
        { status: 200 }
      );
    }

    if (trx.status_topup === 'proses') {
      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Order ini sedang diproses. Webhook dobel diabaikan.',
          data: { provider }
        },
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
          pesan: 'Pembayaran sukses, tapi top-up sudah gagal. Menunggu retry admin.',
          data: { provider }
        },
        { status: 200 }
      );
    }

    const [hasilLock] = await db.query(
      `UPDATE transaksi
       SET status_bayar = 'sukses',
           status_topup = 'proses',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nWebhook memproses top-up via ', ?, ' pada ', NOW()),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_topup = 'pending'`,
      [provider, orderId]
    );

    if (hasilLock.affectedRows === 0) {
      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Order sudah pernah diproses. Webhook dobel diabaikan.',
          data: { provider }
        },
        { status: 200 }
      );
    }

    if (!realTopupAktif()) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'proses',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nWebhook: ENABLE_REAL_TOPUP=false, provider ', ?, ' tidak ditembak pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [provider, orderId]
      );

      return NextResponse.json(
        {
          sukses: true,
          pesan: `Payment sukses. Real top-up dimatikan, ${provider} tidak ditembak.`,
          data: {
            provider,
            status_bayar: 'sukses',
            status_topup: 'proses',
            mode_real_topup: false
          }
        },
        { status: 200 }
      );
    }

    let hasilProvider;

    try {
      hasilProvider = await tembakProvider(trx);
    } catch (error) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nWebhook gagal tembak provider ', ?, ' pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [provider, error.message || 'Unknown provider error', orderId]
      );

      await kirimNotifAman({
        subject: `🚨 Provider Error via Webhook - ${orderId}`,
        title: `Provider Error dari Webhook (${provider.toUpperCase()})`,
        message:
          'Pembayaran sukses, tapi sistem gagal menembak provider dari webhook. Cek dashboard admin.',
        orderId,
        detail: error.message || String(error)
      });

      return NextResponse.json(
        {
          sukses: true,
          pesan: `Pembayaran sukses, tapi ${provider} error. Admin sudah dinotifikasi.`,
          data: {
            provider,
            status_bayar: 'sukses',
            status_topup: 'gagal'
          }
        },
        { status: 200 }
      );
    }

    const responseText = JSON.stringify(hasilProvider.data);

    if (hasilProvider.gagal) {
      const masalahProvider = deteksiMasalahProvider(hasilProvider);

      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(
               IFNULL(catatan_admin, ''),
               '\nProvider ', ?, ' gagal saat webhook pada ', NOW(),
               '\nJenis: ', ?,
               '\nLabel: ', ?,
               '\nPesan: ', ?,
               '\nAksi: ', ?
             ),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          hasilProvider.provider || provider,
          masalahProvider.jenis,
          masalahProvider.label,
          masalahProvider.pesan,
          masalahProvider.aksi,
          orderId
        ]
      );

      await kirimNotifAman({
        subject:
          masalahProvider.jenis === 'konfigurasi_provider'
            ? `⚙️ Konfigurasi Provider Bermasalah via Webhook - ${orderId}`
            : `🚨 Top-up Gagal via Webhook - ${orderId}`,
        title:
          masalahProvider.jenis === 'konfigurasi_provider'
            ? `Konfigurasi ${String(hasilProvider.provider || provider).toUpperCase()} Bermasalah`
            : `Top-up Gagal dari ${String(hasilProvider.provider || provider).toUpperCase()}`,
        message:
          masalahProvider.jenis === 'konfigurasi_provider'
            ? 'Pembayaran sukses, tapi provider menolak request karena masalah konfigurasi. Ini bukan kesalahan customer.'
            : 'Pembayaran sukses, tapi provider mengembalikan status gagal dari webhook.',
        orderId,
        detail: JSON.stringify(
          {
            jenis: masalahProvider.jenis,
            label: masalahProvider.label,
            pesan: masalahProvider.pesan,
            aksi: masalahProvider.aksi,
            response_provider: hasilProvider.data
          },
          null,
          2
        )
      });

      return NextResponse.json(
        {
          sukses: true,
          pesan:
            masalahProvider.jenis === 'konfigurasi_provider'
              ? 'Pembayaran sukses, tapi konfigurasi provider butuh dicek admin.'
              : 'Pembayaran sukses, tapi provider gagal. Admin sudah dinotifikasi.',
          data: {
            provider: hasilProvider.provider || provider,
            status_bayar: 'sukses',
            status_topup: 'gagal',
            status_provider: hasilProvider.statusNormal,
            jenis_gagal: masalahProvider.jenis,
            label_gagal: masalahProvider.label,
            butuh_admin: true
          }
        },
        { status: 200 }
      );
    }

    if (hasilProvider.suksesFinal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nProvider ', ?, ' langsung SUKSES via webhook pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          hasilProvider.provider || provider,
          orderId
        ]
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
              'Provider sudah sukses via webhook, tapi email customer gagal dikirim.',
            orderId,
            detail: error.message || String(error)
          });
        }
      }

      await prosesVoucherMakasihOrderPertama(db, orderId);

      return NextResponse.json(
        {
          sukses: true,
          pesan: 'Pembayaran sukses, top-up berhasil via webhook.',
          data: {
            provider: hasilProvider.provider || provider,
            status_bayar: 'sukses',
            status_topup: 'sukses',
            status_provider: hasilProvider.statusNormal
          }
        },
        { status: 200 }
      );
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nOrder terkirim ke provider ', ?, ' via webhook pada ', NOW(), ': ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        responseText,
        hasilProvider.provider || provider,
        hasilProvider.statusRaw || 'Status provider proses/belum final',
        orderId
      ]
    );

    return NextResponse.json(
      {
        sukses: true,
        pesan: 'Pembayaran sukses, order sudah dikirim ke provider.',
        data: {
          provider: hasilProvider.provider || provider,
          status_bayar: 'sukses',
          status_topup: 'proses',
          status_provider: hasilProvider.statusNormal
        }
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
