import { NextResponse } from 'next/server';
import db from '../../lib/db';

function maskNamaGame(value) {
  return String(value || 'Game').trim();
}

function maskProduk(value) {
  return String(value || 'Produk Digital').trim();
}

function labelStatus(statusBayar, statusTopup) {
  const bayar = String(statusBayar || '').toLowerCase();
  const topup = String(statusTopup || '').toLowerCase();

  if (bayar === 'success' && topup === 'success') {
    return {
      label: 'Berhasil',
      tone: 'success',
      icon: '✅'
    };
  }

  if (bayar === 'success' && ['pending', 'process', 'proses', 'processing'].includes(topup)) {
    return {
      label: 'Diproses',
      tone: 'process',
      icon: '⏳'
    };
  }

  if (bayar === 'pending') {
    return {
      label: 'Menunggu bayar',
      tone: 'pending',
      icon: '🕒'
    };
  }

  return {
    label: 'Diproses',
    tone: 'process',
    icon: '⏳'
  };
}

export async function GET() {
  try {
    const [orders] = await db.query(
      `SELECT
        t.order_id,
        t.status_bayar,
        t.status_topup,
        t.created_at,
        g.nama AS nama_game,
        p.nama_produk
       FROM transaksi t
       LEFT JOIN games g ON t.game_id = g.id
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.status_bayar IN ('success', 'pending')
       ORDER BY t.created_at DESC
       LIMIT 8`
    );

    const data = orders.map((order) => {
      const status = labelStatus(order.status_bayar, order.status_topup);

      return {
        order_hint: String(order.order_id || '').slice(-6),
        nama_game: maskNamaGame(order.nama_game),
        nama_produk: maskProduk(order.nama_produk || order.kode_produk),
        status_label: status.label,
        status_tone: status.tone,
        icon: status.icon,
        created_at: order.created_at
      };
    });

    return NextResponse.json({
      sukses: true,
      data
    });
  } catch (error) {
    console.error('GET /api/recent-orders error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal mengambil pesanan terbaru.'
      },
      { status: 500 }
    );
  }
}