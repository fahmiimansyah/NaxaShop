import { NextResponse } from 'next/server';
import db from '../../lib/db';
import { rateLimit } from '../../lib/rate-limit';
function formatOrderId(id) {
  return String(id || '').trim().toUpperCase();
}

function orderIdValid(orderId) {
  // Support format lama:
  // NX-1712345678901
  //
  // Support format baru:
  // NX-1712345678901-A1B2C3D4
  return /^NX-\d{10,20}(-[A-Z0-9]{8})?$/.test(orderId);
}
function maskSensitive(value) {
  const text = String(value || "").trim();

  if (!text) return "";
  if (text.length <= 4) return "****";

  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

export async function GET(request) {
  try {
    const limit = await rateLimit(request, {
  key: 'lacak-order',
  limit: 20,
  windowMs: 60_000
});

if (!limit.allowed) {
  return NextResponse.json(
    {
      sukses: false,
      pesan: `Terlalu sering cek order. Coba lagi ${limit.retryAfter} detik lagi.`
    },
    { status: 429 }
  );
}
    const { searchParams } = new URL(request.url);
    const orderId = formatOrderId(searchParams.get('id'));

    if (!orderId) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Masukkan Order ID terlebih dahulu.'
        },
        { status: 400 }
      );
    }

    if (!orderIdValid(orderId)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format Order ID tidak valid.'
        },
        { status: 400 }
      );
    }

    const [dataTransaksi] = await db.query(
      `SELECT 
        t.order_id,
        t.id_player,
        t.zone_player,
        t.harga AS harga_transaksi,
        t.payment_type,
        t.status_bayar,
        t.status_topup,
        t.created_at,
        t.updated_at,
        COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
        AND t.deleted_at IS NULL
       LIMIT 1`,
      [orderId]
    );

    if (dataTransaksi.length === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Order ID tidak ditemukan. Pastikan Order ID yang dimasukkan sudah benar.'
        },
        { status: 404 }
      );
    }

    const trx = dataTransaksi[0];

    return NextResponse.json(
  {
    sukses: true,
    data: {
      order_id: trx.order_id,
      nama_produk: trx.nama_produk,
      id_player: maskSensitive(trx.id_player),
      zone_player: trx.zone_player ? maskSensitive(trx.zone_player) : "",
      harga: trx.harga_transaksi,
      payment_type: trx.payment_type,
      status_bayar: trx.status_bayar,
      status_topup: trx.status_topup,
      created_at: trx.created_at,
      updated_at: trx.updated_at
    }
  },
  {
    headers: {
      'Cache-Control': 'no-store'
    }
  }
);
  } catch (error) {
    console.error('GET /api/pesanan error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Sistem belum bisa mengecek pesanan. Coba lagi sebentar lagi.'
      },
      { status: 500 }
    );
  }
}