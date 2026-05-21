import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../lib/db';
import { rateLimit } from '../../lib/rate-limit';

const METODE_BAYAR_VALID = ['qris', 'bca_va'];

function bersihinText(value) {
  return String(value || '').trim();
}

function bersihinWhatsapp(value) {
  return String(value || '')
    .trim()
    .replace(/\s/g, '')
    .replace(/-/g, '')
    .replace(/\+/g, '');
}

function whatsappValid(value) {
  if (!value) return true; // opsional
  return /^62[0-9]{8,15}$/.test(value);
}

function emailValid(value) {
  if (!value) return true; // opsional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function bikinOrderId() {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NX-${Date.now()}-${random}`;
}

function getMidtransBaseUrl() {
  return process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

async function updateTransaksiGagal(orderId, catatan) {
  if (!orderId) return;

  try {
    await db.query(
      `UPDATE transaksi
       SET status_bayar = 'gagal',
           status_topup = 'gagal',
           catatan_admin = CONCAT(IFNULL(catatan_admin, ''), '\n', ?)
       WHERE order_id = ?`,
      [catatan, orderId]
    );
  } catch (error) {
    console.error('Gagal update transaksi jadi gagal:', error);
  }
}

export async function POST(request) {
  let orderId = '';
  let transaksiSudahDicatat = false;

  try {
    const limit = rateLimit(request, {
      key: 'beli',
      limit: 5,
      windowMs: 60_000
    });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: `Terlalu sering checkout bre. Coba lagi ${limit.retryAfter} detik lagi.`
        },
        { status: 429 }
      );
    }

    const pesanan = await request.json();

    const gameId = Number(pesanan.game_id);
    const produkId = Number(pesanan.produk_id);
    const kodeProduk = bersihinText(pesanan.kode_produk);
    const idPlayer = bersihinText(pesanan.id_player);
    const zonePlayer = bersihinText(pesanan.zone_player);
    const metodeBayar = bersihinText(pesanan.metode_bayar);

    const customerWhatsapp = bersihinWhatsapp(pesanan.customer_whatsapp);
    const customerEmail = bersihinText(pesanan.customer_email).toLowerCase();

    if (customerWhatsapp && !whatsappValid(customerWhatsapp)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Nomor WhatsApp gak valid bre! Pakai format 628xxxx.'
        },
        { status: 400 }
      );
    }

    if (customerEmail && !emailValid(customerEmail)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format email pembeli gak valid bre!'
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(gameId) ||
      gameId <= 0 ||
      !Number.isInteger(produkId) ||
      produkId <= 0 ||
      !kodeProduk ||
      !idPlayer ||
      !metodeBayar
    ) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Data pesanan belum lengkap bre!'
        },
        { status: 400 }
      );
    }

    if (idPlayer.length > 50 || zonePlayer.length > 50) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'ID atau server terlalu panjang bre!'
        },
        { status: 400 }
      );
    }

    if (!METODE_BAYAR_VALID.includes(metodeBayar)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Metode bayar gak valid bre!'
        },
        { status: 400 }
      );
    }

    // Ambil produk dari database.
    // Jangan percaya harga/game/produk dari frontend.
    const [dataProduk] = await db.query(
      `SELECT 
         p.id,
         p.game_id,
         p.kode_produk,
         p.nama_produk,
         p.harga,
         g.zone_id,
         g.server_game
       FROM produk p
       JOIN games g ON p.game_id = g.id
       WHERE p.id = ?
         AND p.game_id = ?
         AND p.kode_produk = ?
         AND p.status_produk = 'aktif'
         AND g.status_game = 'aktif'
       LIMIT 1`,
      [produkId, gameId, kodeProduk]
    );

    if (dataProduk.length === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Produk gak tersedia atau sudah nonaktif bre!'
        },
        { status: 400 }
      );
    }

    const produk = dataProduk[0];
    const hargaAsli = Number(produk.harga);

    if (!hargaAsli || hargaAsli <= 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Harga produk gak valid bre!'
        },
        { status: 400 }
      );
    }

    const butuhZoneId = Number(produk.zone_id) === 1;
    const butuhServer =
      produk.server_game && String(produk.server_game).trim() !== '';

    if ((butuhZoneId || butuhServer) && !zonePlayer) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: butuhServer
            ? 'Server wajib dipilih bre!'
            : 'Zone ID wajib diisi bre!'
        },
        { status: 400 }
      );
    }

    const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

    if (!SERVER_KEY) {
      console.error('MIDTRANS_SERVER_KEY belum ada di env');

      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Konfigurasi payment belum siap bre!'
        },
        { status: 500 }
      );
    }

    orderId = bikinOrderId();

    // Catat transaksi dulu supaya kalau Midtrans sukses tapi response error,
    // order tetap punya jejak di database/admin.
    await db.query(
      `INSERT INTO transaksi
       (
         order_id,
         game_id,
         produk_id,
         kode_produk,
         id_player,
         zone_player,
         harga,
         payment_type,
         status_bayar,
         status_topup,
         customer_whatsapp,
         customer_email
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        produk.game_id,
        produk.id,
        produk.kode_produk,
        idPlayer,
        zonePlayer,
        hargaAsli,
        metodeBayar,
        'pending',
        'pending',
        customerWhatsapp || null,
        customerEmail || null
      ]
    );

    transaksiSudahDicatat = true;

    const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');
    const midtransBaseUrl = getMidtransBaseUrl();

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: hargaAsli
      },
      customer_details: {
        first_name: 'Player',
        last_name: idPlayer,
        email: customerEmail || undefined,
        phone: customerWhatsapp || undefined
      }
    };

    if (metodeBayar === 'qris') {
      payload.payment_type = 'qris';
    }

    if (metodeBayar === 'bca_va') {
      payload.payment_type = 'bank_transfer';
      payload.bank_transfer = {
        bank: 'bca'
      };
    }

    const response = await fetch(`${midtransBaseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Midtrans gagal:', data);

      await updateTransaksiGagal(
        orderId,
        `Midtrans gagal bikin tagihan pada ${new Date().toISOString()}: ${JSON.stringify(data)}`
      );

      return NextResponse.json(
        {
          sukses: false,
          pesan: data.status_message || 'Gagal bikin tagihan Midtrans'
        },
        { status: 400 }
      );
    }

    if (metodeBayar === 'qris') {
      const qrisAction = data.actions?.find(
        (action) => action.name === 'generate-qr-code'
      );

      if (!qrisAction?.url) {
        await updateTransaksiGagal(
          orderId,
          `QRIS dari Midtrans tidak kebaca pada ${new Date().toISOString()}: ${JSON.stringify(data)}`
        );

        return NextResponse.json(
          {
            sukses: false,
            pesan: 'QRIS dari Midtrans gak kebaca bre!'
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        sukses: true,
        order_id: orderId,
        tipe: 'qris',
        qris_url: qrisAction.url,
        harga: hargaAsli,
        nama_produk: produk.nama_produk
      });
    }

    if (metodeBayar === 'bca_va') {
      const vaNumber = data.va_numbers?.[0]?.va_number;

      if (!vaNumber) {
        await updateTransaksiGagal(
          orderId,
          `Nomor VA dari Midtrans tidak kebaca pada ${new Date().toISOString()}: ${JSON.stringify(data)}`
        );

        return NextResponse.json(
          {
            sukses: false,
            pesan: 'Nomor VA dari Midtrans gak kebaca bre!'
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        sukses: true,
        order_id: orderId,
        tipe: 'va',
        bank: 'BCA',
        va_number: vaNumber,
        harga: hargaAsli,
        nama_produk: produk.nama_produk
      });
    }

    await updateTransaksiGagal(
      orderId,
      `Metode bayar belum didukung setelah charge pada ${new Date().toISOString()}`
    );

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Metode bayar belum didukung bre!'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Dapur beli kebakaran:', error);

    if (transaksiSudahDicatat && orderId) {
      await updateTransaksiGagal(
        orderId,
        `Error /api/beli pada ${new Date().toISOString()}: ${error.message || String(error)}`
      );
    }

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal bikin tagihan'
      },
      { status: 500 }
    );
  }
}