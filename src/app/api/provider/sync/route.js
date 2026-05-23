import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { rateLimit } from '../../../lib/rate-limit';
import { kirimEmailAdmin, kirimEmailTopupSukses } from '../../../lib/mailer';
import { transaksiDigiflazz } from '../../../lib/digiflazz';

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

async function proxyApiGamesSync(request, orderId) {
  const url = new URL('/api/apigames/sync', request.url);

  const respon = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ order_id: orderId }),
    cache: 'no-store'
  });

  const hasil = await respon.json();

  return NextResponse.json(hasil, {
    status: respon.status
  });
}

export async function POST(request) {
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

    // Transisi aman:
    // APIGames masih pakai route lama dulu.
    if (provider === 'apigames') {
      return proxyApiGamesSync(request, orderId);
    }

    let hasilProvider;

    if (provider === 'digiflazz') {
      hasilProvider = await syncDigiflazz(trx);
    } else if (provider === 'mock') {
      hasilProvider = await syncMock(trx);
    } else {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Provider tidak dikenali: ${provider}`
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
        pesan: 'Top-up gagal dari provider.',
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
        pesan: 'Top-up berhasil dari provider.',
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
      pesan: 'Top-up masih diproses provider.',
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