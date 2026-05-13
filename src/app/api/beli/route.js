import { NextResponse } from 'next/server';
import db from '../../lib/db';
import midtransClient from 'midtrans-client'; // Mesin EDC lu nih

export async function POST(request) {
  try {
    const pesanan = await request.json();

    // 1. KEAMANAN TINGKAT DEWA: Ambil harga ASLI dari Kulkas
    // Jangan pernah percaya harga yang dikirim dari Frontend (Kasir)!
    const [dataProduk] = await db.query(
      "SELECT harga, nama_produk FROM produk WHERE kode_produk = ?", 
      [pesanan.kode_produk]
    );

    if (dataProduk.length === 0) {
      return NextResponse.json({ pesan: "Barang gaib bre!" }, { status: 400 });
    }

    const hargaAsli = dataProduk[0].harga;
    const namaBarang = dataProduk[0].nama_produk;

    // 2. NYALAIN MESIN MIDTRANS
    let snap = new midtransClient.Snap({
      isProduction: false, // Wajib false karena kita pake Sandbox
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    // 3. BIKIN NOMOR RESI (Order ID)
    const orderId = `NX-${Date.now()}`;

    // 4. CATET KE KULKAS (Status awal: 'Pending' - Nunggu Dibayar)
    await db.query(
      `INSERT INTO transaksi (game_id, produk_id, id_player, zone_player, server_player) 
       VALUES (?, ?, ?, ?, ?)`,
      [pesanan.game_id, pesanan.produk_id, pesanan.id_player, pesanan.zone_player || "", pesanan.server_player || "", orderId]
    );
    // (Next PR: Nanti kita tambahin kolom order_id sama status di tabel transaksi lu biar lebih rapi)

    // 5. BIKIN TAGIHAN KE MIDTRANS
    let parameterTagihan = {
      "transaction_details": {
        "order_id": orderId,
        "gross_amount": hargaAsli // Duit yang harus dibayar
      },
      "item_details": [{
        "id": pesanan.kode_produk,
        "price": hargaAsli,
        "quantity": 1,
        "name": namaBarang
      }],
      "customer_details": {
        "first_name": "Player",
        "last_name": pesanan.id_player // Sekalian nyatet ID tujuan
      }
    };

    // 6. DAPETIN LINK BAYARNYA!
    const transaksiMidtrans = await snap.createTransaction(parameterTagihan);

    return NextResponse.json({ 
      pesan: "Tagihan sukses dibikin!", 
      link_bayar: transaksiMidtrans.redirect_url // Ini link ajaibnya!
    });

  } catch (error) {
    console.error("Dapur kebakaran bre:", error);
    return NextResponse.json({ pesan: "Gagal bikin tagihan" }, { status: 500 });
  }
}