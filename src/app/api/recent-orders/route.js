import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import db from '../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function teksAman(value, fallback) {
  return String(value || fallback).trim();
}

function normalizeStatus(value = '') {
  const status = String(value || '').trim().toLowerCase();

  if (
    ['sukses', 'success', 'settlement', 'capture', 'paid', 'berhasil'].includes(
      status
    )
  ) {
    return 'sukses';
  }

  if (['pending', 'menunggu', 'unpaid', 'waiting'].includes(status)) {
    return 'pending';
  }

  if (['proses', 'process', 'processing'].includes(status)) {
    return 'proses';
  }

  if (
    [
      'gagal',
      'failed',
      'failure',
      'deny',
      'denied',
      'cancel',
      'cancelled',
      'expire',
      'expired',
    ].includes(status)
  ) {
    return 'gagal';
  }

  return status || 'pending';
}

function labelStatus(statusBayar, statusTopup) {
  const bayar = normalizeStatus(statusBayar);
  const topup = normalizeStatus(statusTopup);

  if (bayar === 'sukses' && topup === 'sukses') {
    return {
      label: 'Berhasil',
      tone: 'success',
      icon: '✅',
    };
  }

  if (bayar === 'sukses' && ['pending', 'proses'].includes(topup)) {
    return {
      label: 'Diproses',
      tone: 'process',
      icon: '⏳',
    };
  }

  if (bayar === 'pending') {
    return {
      label: 'Menunggu bayar',
      tone: 'pending',
      icon: '🕒',
    };
  }

  if (bayar === 'gagal' || topup === 'gagal') {
    return {
      label: 'Gagal',
      tone: 'failed',
      icon: '❌',
    };
  }

  return {
    label: 'Diproses',
    tone: 'process',
    icon: '⏳',
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const emailLogin = String(session?.user?.email || '').trim().toLowerCase();

    if (!emailLogin) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Login dulu buat lihat pesanan terbaru.',
          data: [],
        },
        { status: 401 }
      );
    }

    const [orders] = await db.query(
      `SELECT
        t.order_id,
        t.status_bayar,
        t.status_topup,
        t.created_at,
        g.nama AS nama_game,
        p.nama_produk,
        p.kode_produk
       FROM transaksi t
       LEFT JOIN games g ON t.game_id = g.id
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE (
          LOWER(TRIM(COALESCE(t.user_email, ''))) = ?
          OR LOWER(TRIM(COALESCE(t.customer_email, ''))) = ?
       )
       ORDER BY t.created_at DESC
       LIMIT 8`,
      [emailLogin, emailLogin]
    );

    const data = orders.map((order) => {
      const status = labelStatus(order.status_bayar, order.status_topup);

      return {
        order_hint: String(order.order_id || '').slice(-6),
        nama_game: teksAman(order.nama_game, 'Game'),
        nama_produk: teksAman(
          order.nama_produk || order.kode_produk,
          'Produk Digital'
        ),
        status_label: status.label,
        status_tone: status.tone,
        icon: status.icon,
        created_at: order.created_at,
      };
    });

    return NextResponse.json({
      sukses: true,
      data,
    });
  } catch (error) {
    console.error('GET /api/recent-orders error:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Gagal mengambil pesanan terbaru.',
        data: [],
      },
      { status: 500 }
    );
  }
}