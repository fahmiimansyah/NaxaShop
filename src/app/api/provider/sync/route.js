import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';
import { rateLimit } from '../../../lib/rate-limit';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../lib/mailer';
import { transaksiDigiflazz } from '../../../lib/digiflazz';
import { cekStatusVipReseller, ambilVipResellerTrxIdDariResponse } from '../../../lib/vipreseller';
import crypto from 'crypto';

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

function orderIdValid(orderId) {
  return /^NX-\d{10,20}(-[A-Z0-9]{8})?$/.test(orderId);
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function normalisasiProvider(value) {
  return String(value || 'apigames').trim().toLowerCase();
}

function statusSukses(status) {
  const s = normalisasiStatus(status);
  return ['sukses', 'success', 'berhasil'].includes(s);
}

function statusGagal(status) {
  const s = normalisasiStatus(status);
  return ['gagal', 'failed', 'fail', 'error'].includes(s);
}

function statusProses(status) {
  const s = normalisasiStatus(status);

  return [
    '',
    'pending',
    'proses',
    'process',
    'processing'
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

async function kirimNotifAman(payload) {
  try {
    await kirimEmailAdmin(payload);
  } catch (error) {
    console.error('Gagal kirim email admin:', error);
  }
}

async function syncDigiflazz(trx) {
  const buyerSkuCode = trx.kode_produk_provider || trx.kode_produk;
  const customerNo = bikinCustomerNoDigiflazz(trx);

  const hasil = await transaksiDigiflazz({
    refId: trx.order_id,
    buyerSkuCode,
    customerNo
  });

  const statusRaw =
    hasil.status ||
    hasil.data?.data?.status ||
    hasil.data?.status ||
    '';

  return {
    provider: 'digiflazz',
    statusRaw,
    statusNormal: normalisasiStatus(statusRaw),
    suksesFinal: hasil.sukses || statusSukses(statusRaw),
    gagal: hasil.gagal || statusGagal(statusRaw) || !hasil.ok,
    masihProses: hasil.pending || statusProses(statusRaw),
    data: hasil.data
  };
}

async function syncMock(trx) {
  return {
    provider: 'mock',
    statusRaw: 'Sukses',
    statusNormal: 'sukses',
    suksesFinal: true,
    gagal: false,
    masihProses: false,
    data: {
      ref_id: trx.order_id,
      status: 'Sukses',
      message: 'Mock provider sukses dari /api/provider/sync'
    }
  };
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

function ambilDataStatusVipReseller(data) {
  if (Array.isArray(data?.data)) return data.data[0] || null;
  if (data?.data && typeof data.data === 'object') return data.data;
  return data || null;
}

async function syncVipReseller(trx) {
  const responseSebelumnya = bacaJsonAman(trx.apigames_response);
  const trxidSebelumnya = ambilVipResellerTrxIdDariResponse(responseSebelumnya);
  if (!trxidSebelumnya) {
  return {
    provider: 'vipreseller',
    gagal: false,
    suksesFinal: false,
    masihProses: true,
    statusRaw: 'trxid tidak ditemukan',
    statusNormal: 'butuh_admin',
    data: { message: 'trxid VIPReseller tidak ditemukan, cek manual admin.' }
  };
}
const hasil = await cekStatusVipReseller({ trxid: trxidSebelumnya });
    

  const detailStatus = ambilDataStatusVipReseller(hasil.data);
  const statusRaw =
    detailStatus?.status ||
    hasil.data?.status ||
    hasil.data?.message ||
    '';

  const statusNormal = normalisasiStatus(statusRaw);
  const suksesFinal = hasil.ok && statusSukses(statusRaw);
  const gagal =
    !hasil.ok ||
    hasil.data?.result === false ||
    statusGagal(statusRaw);

  const masihProses =
    hasil.ok &&
    !suksesFinal &&
    !gagal &&
    (
      statusProses(statusRaw) ||
      ['waiting', 'process', 'processing'].includes(statusNormal)
    );

  return {
    provider: 'vipreseller',
    statusRaw,
    statusNormal,
    suksesFinal,
    gagal,
    masihProses,
    data: hasil.data
  };
  
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
    data?.status ||
    data?.data?.transaction_status ||
    data?.transaction_status ||
    ''
  );
}

function normalisasiStatusProvider(value) {
  return String(value || '').trim().toLowerCase();
}

function statusProviderSukses(status) {
  return ['sukses', 'success', 'berhasil'].includes(
    normalisasiStatusProvider(status)
  );
}

function statusProviderGagal(status) {
  return ['gagal', 'failed', 'fail', 'error', 'partial', 'partial success', 'sukses sebagian'].includes(
    normalisasiStatusProvider(status)
  );
}

async function cekStatusApiGames(refId) {
  const merchantId = process.env.APIGAMES_MERCHANT_ID;
  const secretKey =
    process.env.APIGAMES_SECRET_KEY ||
    process.env.APIGAMES_SECRET;

  if (!merchantId || !secretKey) {
    throw new Error('Env APIGames belum lengkap');
  }

  const signature = bikinSignatureApiGames({
    merchantId,
    secretKey,
    refId
  });

  const url = new URL('https://v1.apigames.id/v2/transaksi/status');
  url.searchParams.set('merchant_id', merchantId);
  url.searchParams.set('ref_id', refId);
  url.searchParams.set('signature', signature);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  const raw = await response.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw_response: raw };
  }

  return {
    ok: response.ok,
    data
  };
}

async function syncApiGamesLangsung(orderId) {
  const [dataTrx] = await db.query(
    `SELECT
   t.id,
   t.order_id,
   t.status_bayar,
   t.status_topup,
   t.customer_email,
   t.harga,
   t.payment_type,
   t.kode_produk,
   t.apigames_response,
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

  if (trx.status_bayar !== 'sukses') {
    return NextResponse.json({
      sukses: true,
      pesan: 'Pembayaran belum sukses, provider belum perlu dicek.',
      data: {
        provider: 'apigames',
        status_bayar: trx.status_bayar,
        status_topup: trx.status_topup
      }
    });
  }

  if (trx.status_topup === 'sukses') {
    return NextResponse.json({
      sukses: true,
      pesan: 'Top-up sudah sukses.',
      data: {
        provider: 'apigames',
        status_bayar: 'sukses',
        status_topup: 'sukses'
      }
    });
  }

  if (trx.status_topup === 'pending') {
    return NextResponse.json({
      sukses: true,
      pesan: 'Top-up belum dikirim ke sistem.',
      data: {
        provider: 'apigames',
        status_bayar: 'sukses',
        status_topup: 'pending'
      }
    });
  }

  const hasilStatus = await cekStatusApiGames(orderId);

  if (!hasilStatus.ok) {
    await db.query(
      `UPDATE transaksi
       SET apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nGagal cek status APIGames pada ', NOW())
       WHERE order_id = ?`,
      [JSON.stringify(hasilStatus.data), orderId]
    );

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal cek status top-up bre.',
        data: {
          provider: 'apigames',
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup
        }
      },
      { status: 502 }
    );
  }

  const statusRaw = ambilStatusApiGames(hasilStatus.data);
  const statusNormal = normalisasiStatusProvider(statusRaw);

  if (statusProviderSukses(statusRaw)) {
    await db.query(
      `UPDATE transaksi
       SET status_topup = 'sukses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames sync SUKSES pada ', NOW()),
           updated_at = NOW()
           WHERE order_id = ?`,
      [JSON.stringify(hasilStatus.data), orderId]
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
    console.error('Gagal kirim email sukses customer via APIGames sync:', error);

    await kirimNotifAman({
      subject: `⚠️ Gagal Kirim Email Customer - ${orderId}`,
      title: 'Top-up APIGames Sukses Tapi Email Customer Gagal',
      message:
        'APIGames sudah status sukses, tapi sistem gagal mengirim email sukses ke customer.',
      orderId,
      detail: error.message || String(error)
    });
  }
}

    return NextResponse.json({
      sukses: true,
      pesan: 'Top-up sukses.',
      data: {
        provider: 'apigames',
        status_bayar: 'sukses',
        status_topup: 'sukses',
        status_provider: statusNormal
      }
    });
  }

  if (statusProviderGagal(statusRaw)) {
    await db.query(
      `UPDATE transaksi
       SET status_topup = 'gagal',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames sync GAGAL pada ', NOW(), ': ', ?)
       WHERE order_id = ?
         AND status_topup != 'sukses'`,
      [JSON.stringify(hasilStatus.data), statusRaw, orderId]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Top-up gagal atau butuh pengecekan admin.',
      data: {
        provider: 'apigames',
        status_bayar: 'sukses',
        status_topup: 'gagal',
        status_provider: statusNormal
      }
    });
  }

  await db.query(
    `UPDATE transaksi
     SET status_topup = 'proses',
         apigames_response = ?,
         catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nAPIGames sync masih proses pada ', NOW(), ': ', ?)
     WHERE order_id = ?
       AND status_topup != 'sukses'`,
    [JSON.stringify(hasilStatus.data), statusRaw || 'unknown', orderId]
  );

  return NextResponse.json({
    sukses: true,
    pesan: 'Top-up masih diproses.',
    data: {
      provider: 'apigames',
      status_bayar: 'sukses',
      status_topup: 'proses',
      status_provider: statusNormal
    }
  });
}

export async function POST(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses provider sync ditolak. Khusus admin.' },
      { status: 403 }
    );
  }

  try {
    const limit = rateLimit(request, {
      key: 'provider-sync',
      limit: 15,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Terlalu sering cek provider bre. Coba lagi ${limit.retryAfter} detik lagi.`
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

    if (trx.status_bayar !== 'sukses') {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Pembayaran belum sukses, provider belum boleh dicek.'
        },
        { status: 400 }
      );
    }

    if (trx.status_topup === 'sukses') {
      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up sudah sukses.',
        data: {
          provider,
          status_bayar: trx.status_bayar,
          status_topup: trx.status_topup
        }
      });
    }

    if (provider === 'apigames') {
  return syncApiGamesLangsung(orderId);
}

    let hasilProvider;

    if (provider === 'digiflazz') {
      hasilProvider = await syncDigiflazz(trx);
    } else if (provider === 'vipreseller') {
      hasilProvider = await syncVipReseller(trx);
    } else if (provider === 'mock') {
      hasilProvider = await syncMock(trx);
    } else {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Jalur top-up produk belum dikenali.'
        },
        { status: 400 }
      );
    }

    const responseText = JSON.stringify(hasilProvider.data);

    if (hasilProvider.gagal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'gagal',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nProvider ', ?, ' sync GAGAL pada ', NOW(), ': ', ?),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          hasilProvider.provider,
          hasilProvider.statusRaw || 'Status provider gagal',
          orderId
        ]
      );

      await kirimNotifAman({
        subject: `🚨 Top-up Gagal via Provider Sync - ${orderId}`,
        title: `Top-up Gagal dari ${hasilProvider.provider.toUpperCase()}`,
        message:
          'Provider sync membaca transaksi gagal. Cek dashboard admin.',
        orderId,
        detail: JSON.stringify(hasilProvider.data, null, 2)
      });

      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up gagal atau butuh pengecekan admin.',
        data: {
          provider: hasilProvider.provider,
          status_bayar: 'sukses',
          status_topup: 'gagal',
          status_provider: hasilProvider.statusNormal,
          response_provider: hasilProvider.data
        }
      });
    }

    if (hasilProvider.suksesFinal) {
      await db.query(
        `UPDATE transaksi
         SET status_topup = 'sukses',
             apigames_response = ?,
             catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nProvider ', ?, ' sync SUKSES pada ', NOW()),
             updated_at = NOW()
         WHERE order_id = ?`,
        [
          responseText,
          hasilProvider.provider,
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
          console.error('Gagal kirim email sukses customer via provider sync:', error);

          await kirimNotifAman({
            subject: `⚠️ Gagal Kirim Email Customer - ${orderId}`,
            title: 'Top-up Sukses Tapi Email Customer Gagal',
            message:
              'Provider sudah sukses, tapi email customer gagal dikirim.',
            orderId,
            detail: error.message || String(error)
          });
        }
      }

      return NextResponse.json({
        sukses: true,
        pesan: 'Top-up berhasil.',
        data: {
          provider: hasilProvider.provider,
          status_bayar: 'sukses',
          status_topup: 'sukses',
          status_provider: hasilProvider.statusNormal,
          response_provider: hasilProvider.data
        }
      });
    }

    await db.query(
      `UPDATE transaksi
       SET status_topup = 'proses',
           apigames_response = ?,
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\nProvider ', ?, ' sync masih PROSES pada ', NOW(), ': ', ?),
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        responseText,
        hasilProvider.provider,
        hasilProvider.statusRaw || 'Pending',
        orderId
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Top-up masih diproses.',
      data: {
        provider: hasilProvider.provider,
        status_bayar: 'sukses',
        status_topup: 'proses',
        status_provider: hasilProvider.statusNormal,
        response_provider: hasilProvider.data
      }
    });
  } catch (error) {
    console.error('Provider sync error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal sync provider bre!'
      },
      { status: 500 }
    );
  }
}