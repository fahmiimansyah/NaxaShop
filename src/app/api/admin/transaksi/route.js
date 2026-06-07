import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';
import { kirimEmailTopupSukses } from '../../../lib/mailer';
import { prosesVoucherMakasihOrderPertama } from '../../../lib/voucher';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return false;
  }

  return true;
}

const STATUS_BAYAR_VALID = ['pending', 'sukses', 'gagal'];
const STATUS_TOPUP_VALID = ['pending', 'proses', 'sukses', 'gagal'];

function bersihinText(value) {
  return String(value || '').trim();
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

    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const where = [];
    const values = [];

    if (search) {
      where.push(`
        (
          t.order_id LIKE ?
          OR t.id_player LIKE ?
          OR t.kode_produk LIKE ?
          OR t.zone_player LIKE ?
        )
      `);

      values.push(
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

    const [totalRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM transaksi t
       ${whereSql}`,
      values
    );

    const total = totalRows[0].total || 0;

    const [transaksi] = await db.query(
      `SELECT
         t.id,
         t.order_id,
         t.game_id,
         t.produk_id,
         t.kode_produk,
         t.provider,
         t.kode_produk_provider,
         t.id_player,
         t.zone_player,
         t.harga,
         t.payment_type,
         t.status_bayar,
         t.status_topup,
         t.customer_whatsapp,
         t.customer_email,
         t.apigames_response,
         t.catatan_admin,
         t.created_at,
         t.updated_at,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk,
         COALESCE(g.nama, CONCAT('Game ID ', t.game_id)) AS nama_game
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       LEFT JOIN games g ON t.game_id = g.id
       ${whereSql}
       ORDER BY t.id DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    return NextResponse.json({
      sukses: true,
      data: transaksi,
      pagination: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Gagal ambil transaksi admin:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ngambil transaksi bre!' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const orderId = bersihinText(body.order_id);
    const statusBayar =
      body.status_bayar !== undefined ? bersihinText(body.status_bayar) : undefined;
    const statusTopup =
      body.status_topup !== undefined ? bersihinText(body.status_topup) : undefined;
    const catatanAdmin =
      body.catatan_admin !== undefined ? bersihinText(body.catatan_admin) : undefined;

    if (!orderId) {
      return NextResponse.json(
        { sukses: false, pesan: 'Order ID wajib dikirim bre!' },
        { status: 400 }
      );
    }

    if (statusBayar !== undefined && !STATUS_BAYAR_VALID.includes(statusBayar)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Status bayar gak valid bre!' },
        { status: 400 }
      );
    }

    if (statusTopup !== undefined && !STATUS_TOPUP_VALID.includes(statusTopup)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Status topup gak valid bre!' },
        { status: 400 }
      );
    }

    const [cekTrx] = await db.query(
      `SELECT 
         t.id,
         t.order_id,
         t.status_bayar,
         t.status_topup,
         t.customer_email,
         t.harga,
         t.payment_type,
         t.kode_produk,
         COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (cekTrx.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Transaksi gak ketemu bre!' },
        { status: 404 }
      );
    }

    const trx = cekTrx[0];

    const statusBayarAkhir =
      statusBayar !== undefined ? statusBayar : trx.status_bayar;

    if (
      (statusTopup === 'proses' || statusTopup === 'sukses') &&
      statusBayarAkhir !== 'sukses'
    ) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Pembayaran belum sukses, jangan update top-up dulu bre!'
        },
        { status: 400 }
      );
    }

    if (statusBayar === 'gagal' && trx.status_topup === 'sukses') {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Top-up sudah sukses, jangan ubah pembayaran jadi gagal bre!'
        },
        { status: 400 }
      );
    }

    const fields = [];
    const values = [];

    if (statusBayar !== undefined) {
      fields.push(`status_bayar = ?`);
      values.push(statusBayar);
    }

    if (statusTopup !== undefined) {
      fields.push(`status_topup = ?`);
      values.push(statusTopup);
    }

    if (catatanAdmin !== undefined) {
      fields.push(`catatan_admin = ?`);
      values.push(catatanAdmin || null);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Gak ada data yang diupdate bre!' },
        { status: 400 }
      );
    }

    fields.push(`updated_at = NOW()`);
    values.push(orderId);

    await db.query(
      `UPDATE transaksi
       SET ${fields.join(', ')}
       WHERE order_id = ?`,
      values
    );

    if (
      statusTopup === 'sukses' &&
      trx.status_topup !== 'sukses' &&
      trx.customer_email
    ) {
      try {
        await kirimEmailTopupSukses({
          to: trx.customer_email,
          orderId: trx.order_id,
          namaProduk: trx.nama_produk || trx.kode_produk,
          harga: trx.harga,
          paymentType: trx.payment_type
        });
      } catch (error) {
        console.error('Gagal kirim email top-up sukses:', error);
      }
    }

    if (statusTopup === 'sukses' && trx.status_topup !== 'sukses') {
      await prosesVoucherMakasihOrderPertama(db, trx.order_id);
    }

    return NextResponse.json({
      sukses: true,
      pesan: 'Transaksi berhasil diupdate bre!'
    });
  } catch (error) {
    console.error('Gagal update transaksi:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur update transaksi meledak bre!' },
      { status: 500 }
    );
  }
}
export async function DELETE(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { searchParams } = new URL(request.url);
    const orderId = bersihinText(body.order_id || searchParams.get('order_id'));

    if (!orderId) {
      return NextResponse.json(
        { sukses: false, pesan: 'Order ID wajib dikirim bre!' },
        { status: 400 }
      );
    }

    const [cekTrx] = await db.query(
      `SELECT id, order_id, status_bayar, status_topup
       FROM transaksi
       WHERE order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (cekTrx.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Transaksi gak ketemu bre!' },
        { status: 404 }
      );
    }

    await db.query(
      `DELETE FROM transaksi
       WHERE order_id = ?
       LIMIT 1`,
      [orderId]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Riwayat transaksi berhasil dihapus bre!',
      data: {
        order_id: orderId,
      },
    });
  } catch (error) {
    console.error('Gagal hapus transaksi admin:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur hapus transaksi meledak bre!' },
      { status: 500 }
    );
  }
}
