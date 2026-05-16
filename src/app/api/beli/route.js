import { NextResponse } from 'next/server';
import db from '../../lib/db'; 

export async function POST(request) {
  try {
    const pesanan = await request.json();

    const [dataProduk] = await db.query(
      "SELECT harga, nama_produk FROM produk WHERE kode_produk = ?", 
      [pesanan.kode_produk]
    );

    if (dataProduk.length === 0) return NextResponse.json({ pesan: "Barang gaib bre!" }, { status: 400 });
    
    const hargaAsli = dataProduk[0].harga;
    // Bikin nomor resi
    const orderId = `NX-${Date.now()}`;

    // 2. CATET KE KULKAS PAKE STRUKTUR BARU
    await db.query(
      `INSERT INTO transaksi 
      (order_id, game_id, produk_id, kode_produk, id_player, zone_player, harga, payment_type, status_bayar, status_topup) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId, 
        pesanan.game_id, 
        pesanan.produk_id, 
        pesanan.kode_produk, // Nyimpen ML_86 / HSR_60
        pesanan.id_player, 
        pesanan.zone_player || "", // Nampung Zone ID (ML) atau Server (Honkai)
        hargaAsli, // Nyimpen harga saat transaksi terjadi
        pesanan.metode_bayar, // Nyimpen 'qris' atau 'bca_va'
        'pending', // Status bayar awal
        'pending'  // Status topup awal
      ]
    );

    const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY; 
    const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');

    // PAYLOAD DASAR
    let payload = {
      transaction_details: { order_id: orderId, gross_amount: hargaAsli },
      customer_details: { first_name: "Player", last_name: pesanan.id_player }
    };

    // LOGIC PERCABANGAN METODE BAYAR
    if (pesanan.metode_bayar === 'qris') {
      payload.payment_type = "qris";
    } else if (pesanan.metode_bayar === 'bca_va') {
      payload.payment_type = "bank_transfer";
      payload.bank_transfer = { bank: "bca" };
    }

    // Tembak Midtrans
    const response = await fetch('https://api.sandbox.midtrans.com/v2/charge', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      // Bales ke Kasir Frontend sesuai metode yang dipilih
      if (pesanan.metode_bayar === 'qris') {
        return NextResponse.json({ sukses: true, tipe: 'qris', qris_url: data.actions[0].url, harga: hargaAsli });
      } else if (pesanan.metode_bayar === 'bca_va') {
        return NextResponse.json({ sukses: true, tipe: 'va', bank: 'BCA', va_number: data.va_numbers[0].va_number, harga: hargaAsli });
      }
    } else {
      return NextResponse.json({ sukses: false, pesan: data.status_message }, { status: 400 });
    }

  } catch (error) {
    console.error("Dapur kebakaran:", error);
    return NextResponse.json({ sukses: false, pesan: "Gagal bikin tagihan" }, { status: 500 });
  }
}