import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../../lib/db';
import { orderVipReseller } from '../../../lib/vipreseller';
import { rateLimit } from '../../../lib/rate-limit';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../lib/mailer';
import { prosesVoucherMakasihOrderPertama } from '../../../lib/voucher';
import { transaksiDigiflazz } from '../../../lib/digiflazz';

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
      pesan:
        pesan ||
        'IP server belum terdaftar di whitelist Digiflazz.',
      aksi:
        'Tambahkan IP publik server/laptop ke whitelist Development IP Digiflazz, atau jalankan backend dari VPS dengan IP tetap.'
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
    pesan:
      pesan ||
      hasilProvider.statusRaw ||
      'Provider mengembalikan status gagal.',
    aksi: 'Cek response provider di dashboard admin.'
  };
}

function bikinCustomerNoDigiflazz(trx) {
  const idPlayer = bersihinText(trx.id_player);
  const zonePlayer = bersihinText(trx.zone_player);

  // Untuk banyak produk game Digiflazz, format target sering pakai user_id|zone_id.
  // Kalau nanti produk tertentu butuh format lain, helper ini yang kita adjust.
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

  const suksesFinal = statusProviderSukses(statusRaw);
  const masihProses = statusProviderMasihProses(statusRaw);

  return {
    provider: 'apigames',
    gagal,
    suksesFinal,
    masihProses,
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

  const statusRaw = hasil.status || hasil.data?.data?.status || '';

  const gagal =
    !hasil.ok ||
    hasil.gagal ||
    statusProviderGagal(statusRaw) ||
    statusProviderButuhAdmin(statusRaw);

  const suksesFinal =
    hasil.sukses ||
    statusProviderSukses(statusRaw);

  const masihProses =
    hasil.pending ||
    statusProviderMasihProses(statusRaw);

  return {
    provider: 'digiflazz',
    gagal,
    suksesFinal,
    masihProses,
    statusRaw,
    statusNormal: normalisasiStatus(statusRaw),
    data: hasil.data
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

  if (provider === 'vipreseller') {
  return tembakVipReseller(trx);
  }

  if (provider === 'mock') {
    return {
      provider: 'mock',
      gagal: false,
      suksesFinal: true,
      masihProses: false,
      statusRaw: 'Sukses',
      statusNormal: 'sukses',
      data: {
        status: 'Sukses',
        message: 'Mock provider sukses',
        ref_id: trx.order_id
      }
    };
  }

  throw new Error(`Provider tidak dikenali: ${provider}`);
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
    const provider = normalisasiProvider(trx.provider);

    if (trx.status_bayar === 'sukses' && trx.status_topup === 'sukses') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Transaksi sudah sukses.',
        data: {
          provider,
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
            provider,
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
          provider,
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
          provider,
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
          provider,
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
          provider,
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
          provider,
          status_bayar: 'sukses',
          status_topup: 'gagal'
        }
      });
    }

    if (!realTopupAktif()) {
      if (trx.status_bayar !== 'sukses') {
        await db.query(
          `UPDATE transaksi
           SET catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nPayment sync: ENABLE_REAL_TOPUP=false, provider tidak ditembak pada ', NOW()),
               updated_at = NOW()
           WHERE order_id = ?`,
          [orderId]
        );
      }

      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran sukses. Mode aman aktif, provider tidak ditembak.',
        data: {
          provider,
          status_bayar: 'sukses',
          status_topup: 'pending',
          mode_real_topup: false
        }
      });
    }

    const [hasilLock] = await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nPayment sync memproses top-up via ', ?, ' pada ', NOW()),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_topup = 'pending'`,
      [provider, orderId]
    );

    if (hasilLock.affectedRows === 0) {
      return NextResponse.json({
        sukses: true,
        pesan:
          'Pembayaran sukses, tapi top-up sudah bukan pending. Tidak ditembak ulang.',
        data: {
          provider,
          status_bayar: 'sukses',
          status_topup: trx.status_topup
        }
      });
    }

    let hasilProvider;

    try {
      hasilProvider = await tembakProvider(trx);
    } catch (error) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nPayment sync gagal tembak provider ', ?, ' pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [provider, error.message || 'Unknown provider error', orderId]
      );

      await kirimNotifAman({
        subject: `🚨 Provider Error via Payment Sync - ${orderId}`,
        title: `Provider Error dari Payment Sync (${provider.toUpperCase()})`,
        message:
          'Pembayaran sukses, tapi sistem gagal menembak provider. Cek dashboard admin.',
        orderId,
        detail: error.message || String(error)
      });

      return NextResponse.json({
        sukses: true,
        pesan:
          'Pembayaran sukses, tapi top-up gagal diproses. Admin sudah dinotifikasi.',
        data: {
          provider,
          status_bayar: 'sukses',
          status_topup: 'gagal'
        }
      });
    }

    if (hasilProvider.gagal) {
  const masalahProvider = deteksiMasalahProvider(hasilProvider);

  await db.query(
    `UPDATE transaksi
     SET status_topup = 'gagal',
         apigames_response = ?,
         catatan_admin = CONCAT(
           IFNULL(catatan_admin, ''),
           '\nProvider ', ?, ' gagal saat payment sync pada ', NOW(),
           '\nJenis: ', ?,
           '\nLabel: ', ?,
           '\nPesan: ', ?,
           '\nAksi: ', ?
         ),
         updated_at = NOW()
     WHERE order_id = ?`,
    [
      JSON.stringify(hasilProvider.data),
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
        ? `⚙️ Konfigurasi Provider Bermasalah - ${orderId}`
        : `🚨 Top-up Gagal via Payment Sync - ${orderId}`,
    title:
      masalahProvider.jenis === 'konfigurasi_provider'
        ? `Konfigurasi ${String(hasilProvider.provider || provider).toUpperCase()} Bermasalah`
        : `Top-up Gagal dari ${String(hasilProvider.provider || provider).toUpperCase()}`,
    message:
      masalahProvider.jenis === 'konfigurasi_provider'
        ? 'Pembayaran sukses, tapi provider menolak request karena masalah konfigurasi. Ini bukan kesalahan customer.'
        : 'Pembayaran sukses, tapi provider mengembalikan status gagal saat payment sync.',
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

  return NextResponse.json({
    sukses: true,
    pesan:
      masalahProvider.jenis === 'konfigurasi_provider'
        ? 'Pembayaran sukses, tapi provider sedang butuh pengecekan konfigurasi admin.'
        : 'Pembayaran sukses, tapi top-up gagal. Admin sudah dinotifikasi.',
    data: {
      provider: hasilProvider.provider || provider,
      status_bayar: 'sukses',
      status_topup: 'gagal',
      status_provider: hasilProvider.statusNormal,
      status_apigames: hasilProvider.statusNormal,
      jenis_gagal: masalahProvider.jenis,
      label_gagal: masalahProvider.label,
      pesan_provider: masalahProvider.pesan,
      butuh_admin: true
    }
  });
}

    if (hasilProvider.suksesFinal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nProvider ', ?, ' langsung SUKSES via payment sync pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          JSON.stringify(hasilProvider.data),
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
          console.error('Gagal kirim email sukses customer:', error);

          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${orderId}`,
            title: 'Top-up Sukses Tapi Email Customer Gagal',
            message:
              'Provider sudah sukses via payment sync, tapi email customer gagal dikirim.',
            orderId,
            detail: error.message || String(error)
          });
        }
      }

      await prosesVoucherMakasihOrderPertama(db, orderId);

      return NextResponse.json({
        sukses: true,
        pesan: 'Pembayaran sukses, top-up berhasil.',
        data: {
          provider: hasilProvider.provider || provider,
          status_bayar: 'sukses',
          status_topup: 'sukses',
          status_provider: hasilProvider.statusNormal,
          status_apigames: hasilProvider.statusNormal
        }
      });
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nOrder terkirim ke provider ', ?, ' via payment sync pada ', NOW(), ': ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        JSON.stringify(hasilProvider.data),
        hasilProvider.provider || provider,
        hasilProvider.statusRaw || 'Status provider proses/belum final',
        orderId
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Pembayaran sukses, top-up sedang diproses.',
      data: {
        provider: hasilProvider.provider || provider,
        status_bayar: 'sukses',
        status_topup: 'proses',
        status_provider: hasilProvider.statusNormal,
        status_apigames: hasilProvider.statusNormal
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
