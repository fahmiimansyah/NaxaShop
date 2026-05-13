// File: src/app/api/games/route.js
import { NextResponse } from 'next/server';
import db from '../../lib/db'; // Manggil colokan kulkas yang tadi kita bikin

export async function GET() {
  try {
    // Jurus ngambil semua data game dari kulkas
    const [hasil] = await db.query("SELECT * FROM games");
    
    // Balikin datanya ke kasir dalam bentuk JSON
    return NextResponse.json(hasil);
  } catch (error) {
    console.error("Kulkas error bre:", error);
    return NextResponse.json({ pesan: "Gagal nyambung ke Kulkas" }, { status: 500 });
  }
}