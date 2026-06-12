import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import crypto from 'crypto';
import { orderVipReseller, ambilVipResellerTrxIdDariResponse } from '../../../../lib/vipreseller';
import db from '../../../../lib/db';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../../lib/mailer';
import { prosesVoucherMakasihOrderPertama } from '../../../../lib/voucher';
import { transaksiDigiflazz } from '../../../../lib/digiflazz';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && session.user?.email === EMAIL_CEO);
}

function bersihinText(value) {
  return String(value || '').trim();
}

function realTopupAktif() {
  const realTopup = process.env.ENABLE_REAL_TOPUP === 'true';
  const midtransProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const allowSandboxRealTopup =
    process.env.ALLOW_SANDBOX_REAL_TOPUP === 'true';

  return realTopup && (midtransProduction || allowSandboxRealTopup);
}

function normalisasiProvider(value) {
  return String(value || 'apigames').trim().toLowerCase();
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function statusTopupBolehRetry(status) {
  const s = normalisasiStatus(status);
  return ['gagal', 'failed', 'fail', 'error'].includes(s);
}

function ambilTrxidProviderTersimpan(trx) {
  const provider = normalisasiProvider(trx?.provider);

  if (provider === 'vipreseller') {
    return ambilVipResellerTrxIdDariResponse(trx?.apigames_response);
  }

  return '';
}

function bikinSignatureApiGames({ merchantId, secretKey, refId }) {
  return crypto
    .createHash('md5')
    .update(`${merchantId}:${secretKey}:${refId}`)
    .digest('hex');
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

async function tembakApiGames(trx) {
  const merchantId = process.env.APIGAMES_MERCHANT_ID;
  const secretKey = process.env.APIGAMES_SECRET;

  if (!merchantId || !secretKey) {
    throw new Error('Env APIGames belum lengkap');
  }

  const refId = trx.order_id;
  const kodeProdukProvider = trx.kode_produk_provider || trx.kode_produk;

  const signatureApiGames = bikinSignatureApiGames({
    merchantId,
    secretKey,
    refId
  });

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
      message: 'Mock provider sukses dari retry admin'
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

  if (provider === 'vipreseller') {
  return tembakVipReseller(trx);
  }

  if (provider === 'mock') {
    return tembakMock(trx);
  }

  throw new Error(`Provider tidak dikenali: ${provider}`);
}

export async function POST(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak. Hanya admin yang bisa melakukan retry.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const orderId = bersihinText(body.order_id);

    if (!orderId) {
      return NextResponse.json(
        { sukses: false, pesan: 'Order ID wajib dikirim.' },
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
        { sukses: false, pesan: 'Transaksi tidak ditemukan.' },
        { status: 404 }
      );
    }

    const trx = dataTrx[0];
    const provider = normalisasiProvider(trx.provider);

    if (trx.status_bayar !== 'sukses') {
      return NextResponse.json(
        { sukses: false, pesan: 'Pembayaran belum sukses. Top-up belum boleh dikirim.' },
        { status: 400 }
      );
    }

    if (trx.status_topup === 'sukses') {
      return NextResponse.json(
        { sukses: false, pesan: 'Top-up sudah sukses. Retry ditolak agar tidak terkirim dua kali.' },
        { status: 400 }
      );
    }

    const trxidProviderTersimpan = ambilTrxidProviderTersimpan(trx);

    if (trxidProviderTersimpan && !statusTopupBolehRetry(trx.status_topup)) {
      await db.query(
        `UPDATE transaksi
         SET catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry ditolak: order sudah punya TRXID provider ', ?, '. Admin diminta Cek Provider pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [trxidProviderTersimpan, orderId]
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan:
            'Order ini sudah pernah dikirim ke provider. Gunakan Cek Provider dulu agar saldo tidak kepotong dua kali.',
          data: {
            provider,
            trxid_provider: trxidProviderTersimpan,
            status_topup: trx.status_topup || 'proses',
            aksi_disarankan: 'cek_provider'
          }
        },
        { status: 409 }
      );
    }

    if (trx.status_topup === 'proses' && Number(trx.umur_update_detik || 0) < 60) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Order baru saja diproses. Tunggu sebentar atau gunakan Cek Provider sebelum retry lagi.'
        },
        { status: 400 }
      );
    }

    if (!realTopupAktif()) {
      await db.query(
        `UPDATE transaksi
         SET catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry dibatalkan: ENABLE_REAL_TOPUP=false. Provider ', ?, ' tidak ditembak pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [provider, orderId]
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan: `Mode aman aktif. ENABLE_REAL_TOPUP=false, ${provider} tidak ditembak.`
        },
        { status: 400 }
      );
    }

    const [hasilLock] = await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry top-up oleh admin via ', ?, ' pada ', NOW()),
           updated_at = NOW()
       WHERE order_id = ?
         AND status_bayar = 'sukses'
         AND status_topup != 'sukses'`,
      [provider, orderId]
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

    let hasilProvider;

    try {
      hasilProvider = await tembakProvider(trx);
    } catch (error) {
      await updateGagal(
        orderId,
        null,
        `Retry gagal tembak provider ${provider} pada ${new Date().toISOString()}: ${error.message || String(error)}`
      );

      await kirimNotifAman({
        subject: `🚨 Retry Provider Error - ${orderId}`,
        title: `Retry Top-up Error Saat Menghubungi ${provider.toUpperCase()}`,
        message: 'Admin mencoba retry, tapi request ke provider error.',
        orderId,
        detail: error.message || String(error)
      });

      return NextResponse.json(
        {
          sukses: false,
          pesan: `Koneksi ke ${provider} gagal.`,
          provider
        },
        { status: 502 }
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
               '\nRetry gagal via ', ?, ' pada ', NOW(),
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
            ? `⚙️ Retry Konfigurasi Provider Bermasalah - ${orderId}`
            : `🚨 Retry Top-up Gagal - ${orderId}`,
        title:
          masalahProvider.jenis === 'konfigurasi_provider'
            ? `Konfigurasi ${String(hasilProvider.provider || provider).toUpperCase()} Bermasalah`
            : `Retry Top-up Gagal dari ${String(hasilProvider.provider || provider).toUpperCase()}`,
        message:
          masalahProvider.jenis === 'konfigurasi_provider'
            ? 'Admin retry top-up, tapi provider menolak request karena masalah konfigurasi. Ini bukan kesalahan customer.'
            : 'Admin sudah mencoba retry top-up, tapi provider masih gagal.',
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
          sukses: false,
          pesan:
            masalahProvider.jenis === 'konfigurasi_provider'
              ? 'Retry gagal karena konfigurasi provider butuh dicek admin.'
              : `Retry ke ${hasilProvider.provider || provider} gagal.`,
          data: {
            provider: hasilProvider.provider || provider,
            status_topup: 'gagal',
            status_provider: hasilProvider.statusNormal,
            jenis_gagal: masalahProvider.jenis,
            label_gagal: masalahProvider.label,
            pesan_provider: masalahProvider.pesan,
            butuh_admin: true
          },
          data_provider: hasilProvider.data
        },
        { status: 500 }
      );
    }

    if (hasilProvider.suksesFinal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry langsung SUKSES dari ', ?, ' pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [responseText, hasilProvider.provider || provider, orderId]
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

      await prosesVoucherMakasihOrderPertama(db, orderId);

      return NextResponse.json({
        sukses: true,
        pesan: 'Retry top-up sukses. Status jadi sukses.',
        data: {
          provider: hasilProvider.provider || provider,
          status_topup: 'sukses',
          status_provider: hasilProvider.statusNormal
        },
        data_provider: hasilProvider.data
      });
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nRetry terkirim ke ', ?, ' pada ', NOW(), ': ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        responseText,
        hasilProvider.provider || provider,
        hasilProvider.statusRaw || 'Status provider proses/belum final',
        orderId
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: `Retry top-up berhasil dikirim ke ${hasilProvider.provider || provider}. Status jadi proses.`,
      data: {
        provider: hasilProvider.provider || provider,
        status_topup: 'proses',
        status_provider: hasilProvider.statusNormal
      },
      data_provider: hasilProvider.data
    });
  } catch (error) {
    console.error('Retry top-up error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Retry top-up gagal diproses. Coba cek log admin.' },
      { status: 500 }
    );
  }
}
