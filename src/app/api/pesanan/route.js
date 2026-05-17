import { NextResponse } from 'next/server';
import db from '../../lib/db';

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = formatOrderId(searchParams.get('id'));

    if (!orderId) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Masukin resi dulu bre!'
        },
        { status: 400 }
      );
    }

    if (!orderIdValid(orderId)) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Format resi gak valid bre!'
        },
        { status: 400 }
      );
    }

    const [dataTransaksi] = await db.query(
      `SELECT 
        t.order_id,
        t.kode_produk,
        t.id_player,
        t.zone_player,
        t.harga AS harga_transaksi,
        t.payment_type,
        t.status_bayar,
        t.status_topup,
        COALESCE(p.nama_produk, t.kode_produk) AS nama_produk
       FROM transaksi t
       LEFT JOIN produk p ON t.produk_id = p.id
       WHERE t.order_id = ?
       LIMIT 1`,
      [orderId]
    );

    if (dataTransaksi.length === 0) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Resi gaib! Gak ketemu di sistem kita bre.'
        },
        { status: 404 }
      );
    }

    const trx = dataTransaksi[0];

    return NextResponse.json({
      sukses: true,
      data: {
        order_id: trx.order_id,
        nama_produk: trx.nama_produk,
        kode_produk: trx.kode_produk,
        id_player: trx.id_player,
        zone_player: trx.zone_player || '',
        harga: trx.harga_transaksi,
        payment_type: trx.payment_type,
        status_bayar: trx.status_bayar,
        status_topup: trx.status_topup
      }
    });
  } catch (error) {
    console.error('Dapur Lacak meledak:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: 'Waduh, dapur lagi ngadat bre!'
      },
      { status: 500 }
    );
  }
}