import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import db from '../../../../lib/db';

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

function csvCell(value) {
  const text = String(value ?? '');
  const aman = text.replaceAll('"', '""');

  return `"${aman}"`;
}

function formatTanggal(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  });
}

function formatNamaFile() {
  const sekarang = new Date();
  const pad = (value) => String(value).padStart(2, '0');

  return [
    sekarang.getFullYear(),
    pad(sekarang.getMonth() + 1),
    pad(sekarang.getDate()),
    pad(sekarang.getHours()),
    pad(sekarang.getMinutes())
  ].join('');
}

export async function GET(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const search = bersihinText(searchParams.get('search'));
    const statusBayar = bersihinText(searchParams.get('status_bayar'));
    const statusTopup = bersihinText(searchParams.get('status_topup'));
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 5000, 1), 10000);

    const where = [];
    const values = [];

    if (search) {
      where.push(`
        (
          t.order_id LIKE ?
          OR t.id_player LIKE ?
          OR t.kode_produk LIKE ?
          OR t.zone_player LIKE ?
          OR t.customer_email LIKE ?
          OR t.customer_whatsapp LIKE ?
        )
      `);

      values.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    if (statusBayar && statusBayar !== 'all') {
      where.push(`t.status_bayar = ?`);
      values.push(statusBayar);
    }

    if (statusTopup && statusTopup !== 'all') {
      where.push(`t.status_topup = ?`);
      values.push(statusTopup);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT
         t.order_id,
         COALESCE(g.nama, CONCAT('Game ID ', t.game_id)) AS nama_game,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk,
         t.kode_produk,
         t.provider,
         t.id_player,
         t.zone_player,
         t.harga,
         t.harga_modal,
         COALESCE(t.harga - t.harga_modal, 0) AS profit,
         t.payment_type,
         t.status_bayar,
         t.status_topup,
         t.customer_whatsapp,
         t.customer_email,
         t.created_at,
         t.updated_at,
         t.catatan_admin
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       LEFT JOIN games g ON t.game_id = g.id
       ${whereSql}
       ORDER BY t.id DESC
       LIMIT ?`,
      [...values, limit]
    );

    const headers = [
      'Order ID',
      'Game',
      'Produk',
      'Kode Produk',
      'Provider',
      'ID Player',
      'Zone/Server',
      'Harga Jual',
      'Harga Modal',
      'Profit',
      'Metode Bayar',
      'Status Bayar',
      'Status Topup',
      'WhatsApp Customer',
      'Email Customer',
      'Dibuat',
      'Diupdate',
      'Catatan Admin'
    ];

    const lines = [
      headers.map(csvCell).join(','),
      ...rows.map((row) => [
        row.order_id,
        row.nama_game,
        row.nama_produk,
        row.kode_produk,
        row.provider,
        row.id_player,
        row.zone_player,
        row.harga,
        row.harga_modal,
        row.profit,
        row.payment_type,
        row.status_bayar,
        row.status_topup,
        row.customer_whatsapp,
        row.customer_email,
        formatTanggal(row.created_at),
        formatTanggal(row.updated_at),
        row.catatan_admin
      ].map(csvCell).join(','))
    ];

    const csv = `\uFEFF${lines.join('\n')}`;
    const filename = `naxashop-transaksi-${formatNamaFile()}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Gagal export transaksi CSV:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal export transaksi CSV bre!' },
      { status: 500 }
    );
  }
}
