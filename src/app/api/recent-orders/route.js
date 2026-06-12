import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import db from '../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function teksAman(value, fallback) {
  return String(value || fallback).trim();
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
        t.id,
        t.order_id,
        t.harga,
        t.harga_total,
        t.payment_type,
        t.created_at,
        g.nama AS nama_game,
        g.gambar AS gambar_game,
        p.nama_produk,
        p.kode_produk
       FROM transaksi t
       LEFT JOIN games g ON t.game_id = g.id
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE (
          LOWER(TRIM(COALESCE(t.user_email, ''))) = ?
          OR LOWER(TRIM(COALESCE(t.customer_email, ''))) = ?
       )
       AND LOWER(TRIM(COALESCE(t.status_bayar, ''))) IN (
          'sukses',
          'success',
          'settlement',
          'capture',
          'paid',
          'berhasil'
       )
       AND LOWER(TRIM(COALESCE(t.status_topup, ''))) IN (
          'sukses',
          'success',
          'done',
          'completed',
          'complete',
          'berhasil'
       )
       ORDER BY t.created_at DESC
       LIMIT 4`,
      [emailLogin, emailLogin]
    );

    const data = orders.map((order) => {
      return {
        id: order.id,
        order_id: order.order_id,
        order_hint: String(order.order_id || '').slice(-6),
        nama_game: teksAman(order.nama_game, 'Game'),
        gambar_game: order.gambar_game || '',
        nama_produk: teksAman(
          order.nama_produk || order.kode_produk,
          'Produk Digital'
        ),
        harga_total: order.harga_total || order.harga || 0,
        payment_type: order.payment_type || '-',
        status_label: 'Selesai',
        status_desc: 'Top-up berhasil diproses.',
        status_tone: 'success',
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