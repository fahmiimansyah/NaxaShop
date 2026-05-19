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

export async function POST(request) {
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

    // 1. VALIDASI INPUT DASAR
    if (!pesanan.kode_produk || !pesanan.id_player || !pesanan.metode_bayar) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Data pesanan belum lengkap bre!'
        },
        { status: 400 }
      );
    }

    if (!METODE_BAYAR_VALID.includes(pesanan.metode_bayar)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Metode bayar gak valid bre!'
        },
        { status: 400 }
      );
    }

    // 2. AMBIL PRODUK DARI DATABASE
    // Jangan percaya produk_id/game_id dari frontend.
    const [dataProduk] = await db.query(
        `SELECT 
            p.id,
            p.game_id,
            p.kode_produk,
            p.nama_produk,
            p.harga
        FROM produk p
        JOIN games g ON p.game_id = g.id
        WHERE p.kode_produk = ?
        AND p.status_produk = 'aktif'
        AND g.status_game = 'aktif'
        LIMIT 1`,
      [pesanan.kode_produk]
    );

    if (dataProduk.length === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Barang gaib bre!'
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

    // 3. CEK SERVER KEY MIDTRANS
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

    const orderId = bikinOrderId();
    const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');

    // 4. BIKIN PAYLOAD MIDTRANS
    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: hargaAsli
      },
      customer_details: {
  first_name: 'Player',
  last_name: String(pesanan.id_player),
  email: customerEmail || undefined,
  phone: customerWhatsapp || undefined
}
    };

    if (pesanan.metode_bayar === 'qris') {
      payload.payment_type = 'qris';
    }

    if (pesanan.metode_bayar === 'bca_va') {
      payload.payment_type = 'bank_transfer';
      payload.bank_transfer = {
        bank: 'bca'
      };
    }

    // 5. TEMBAK MIDTRANS DULU
    const response = await fetch('https://api.sandbox.midtrans.com/v2/charge', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Midtrans gagal:', data);

      return NextResponse.json(
        {
          sukses: false,
          pesan: data.status_message || 'Gagal bikin tagihan Midtrans'
        },
        { status: 400 }
      );
    }

    // 6. KALAU MIDTRANS SUKSES, BARU CATAT TRANSAKSI
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
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ,
  
  [
    orderId,
    produk.game_id,
    produk.id,
    produk.kode_produk,
    bersihinText(pesanan.id_player),
    bersihinText(pesanan.zone_player),
    hargaAsli,
    pesanan.metode_bayar,
    'pending',
    'pending',
    customerWhatsapp || null,
    customerEmail || null
    
  ]
)  
    // 7. BALIKIN DATA KE FRONTEND
    if (pesanan.metode_bayar === 'qris') {
      const qrisAction = data.actions?.find((action) =>
        action.name === 'generate-qr-code' || action.url
      );

      if (!qrisAction?.url) {
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

    if (pesanan.metode_bayar === 'bca_va') {
      const vaNumber = data.va_numbers?.[0]?.va_number;

      if (!vaNumber) {
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

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Metode bayar belum didukung bre!'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Dapur beli kebakaran:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal bikin tagihan'
      },
      { status: 500 }
    );
  }
}