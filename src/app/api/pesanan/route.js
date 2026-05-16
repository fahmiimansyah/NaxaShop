import { NextResponse } from 'next/server';
import db from '../../lib/db'; 

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('id');

  if (!orderId) {
    return NextResponse.json({ pesan: 'Masukin resi dulu bre!' }, { status: 400 });
  }

  try {
    // Kita gabungin tabel transaksi sama produk biar dapet nama barang & harganya sekalian
    const [dataTransaksi] = await db.query(
      `SELECT t.*, p.nama_produk, p.harga 
       FROM transaksi t 
       JOIN produk p ON t.produk_id = p.id 
       WHERE t.order_id = ?`,
      [orderId]
    );

    if (dataTransaksi.length === 0) {
      return NextResponse.json({ pesan: 'Resi gaib! Gak ketemu di sistem kita bre.' }, { status: 404 });
    }

    return NextResponse.json({ 
      sukses: true, 
      data: dataTransaksi[0] 
    });

  } catch (error) {
    console.error("Dapur Lacak meledak:", error);
    return NextResponse.json({ pesan: "Waduh, dapur lagi ngadat bre!" }, { status: 500 });
  }
}