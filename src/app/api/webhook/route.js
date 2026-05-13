import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '../../lib/db';

export async function POST(request) {
  try {
    // 1. ANGKAT TELEPON DARI MIDTRANS
    const notif = await request.json();

    // 2. CEK KEAMANAN (Biar ga ada hacker yang pura-pura lunas)
    // Rumus Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const stringToHash = `${notif.order_id}${notif.status_code}${notif.gross_amount}${serverKey}`;
    const signatureKita = crypto.createHash('sha512').update(stringToHash).digest('hex');

    if (notif.signature_key !== signatureKita) {
      return NextResponse.json({ pesan: "Lu siapa njir? Palsu!" }, { status: 403 });
    }

    // 3. KALAU BENERAN LUNAS (Settlement)
    if (notif.transaction_status === 'settlement' || notif.transaction_status === 'capture') {
      
      // Update status di Kulkas jadi "Lunas"
      await db.query("UPDATE transaksi SET status = 'Lunas' WHERE order_id = ?", [notif.order_id]);

      // --- WAKTUNYA NELPON APIGAMES! ---
      
      // A. Ambil data pesanan dari Kulkas
      const [dataTrx] = await db.query("SELECT * FROM transaksi WHERE order_id = ?", [notif.order_id]);
      if (dataTrx.length === 0) return NextResponse.json({ pesan: "Data ga ketemu di kulkas" });
      const trx = dataTrx[0];

      // B. Ambil kode_produk (misal "ML14") dari tabel produk
      const [dataProduk] = await db.query("SELECT kode_produk FROM produk WHERE id = ?", [trx.produk_id]);
      const kodeProduk = dataProduk[0].kode_produk;

      // C. Racik bumbu APIGames
      const merchantId = process.env.APIGAMES_MERCHANT_ID;
      const secretKey = process.env.APIGAMES_SECRET;
      const refId = notif.order_id; // Pake order_id Midtrans biar gampang ngelacaknya
      
      const signatureApiGames = crypto.createHash('md5')
        .update(`${merchantId}:${secretKey}:${refId}`)
        .digest('hex');

      // D. Tembak Diamond-nya ke APIGames!
      const responPabrik = await fetch("https://v1.apigames.id/v2/transaksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref_id: refId,
          merchant_id: merchantId,
          produk: kodeProduk,
          tujuan: trx.id_player,
          server_id: trx.zone_player,
          signature: signatureApiGames
        })
      });

      const hasilPabrik = await responPabrik.json();
      console.log("CCTV WEBHOOK APIGAMES:", hasilPabrik); // Buat mantau dari terminal lu

    } else if (notif.transaction_status === 'cancel' || notif.transaction_status === 'expire') {
      // Kalo usernya ga jadi bayar / kelamaan
      await db.query("UPDATE transaksi SET status = 'Gagal' WHERE order_id = ?", [notif.order_id]);
    }

    // 4. BILANG MAKASIH KE MIDTRANS
    // Kalo lu ga balikin 200 OK, Midtrans bakal nelponin Dapur lu terus-terusan
    return NextResponse.json({ pesan: "Sip, Webhook Diterima!" });

  } catch (error) {
    console.error("Error Webhook:", error);
    return NextResponse.json({ pesan: "Sistem Webhook Error" }, { status: 500 });
  }
}