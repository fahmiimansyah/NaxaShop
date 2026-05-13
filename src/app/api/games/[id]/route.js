import { NextResponse } from 'next/server';
import db from '../../../lib/db'; // Colokan kulkas lu

// Parameter context.params.id bakal otomatis nangkep angka di URL
export async function GET(request, { params }) {
    const paket = await params
  const gameId = paket.id;

  try {
    // 1. Ambil detail gamenya
    const [gameResult] = await db.query("SELECT * FROM games WHERE id = ?", [gameId]);
    
    // 2. Ambil daftar produk/diamond buat game itu
    const [produkResult] = await db.query("SELECT * FROM produk WHERE game_id = ?", [gameId]);

    // Kalo gamenya gak ada di kulkas
    if (gameResult.length === 0) {
      return NextResponse.json({ pesan: "Gamenya ga ketemu bre!" }, { status: 404 });
    }

    // Gabungin data game sama data produknya buat dikirim ke Kasir
    const dataLengkap = {
      ...gameResult[0],
      produk: produkResult
    };

    return NextResponse.json(dataLengkap);
  } catch (error) {
    console.error("Kulkas error:", error);
    return NextResponse.json({ pesan: "Gagal nyambung ke Kulkas" }, { status: 500 });
  }
}