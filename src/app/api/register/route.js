import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // Alat pengacak password
import db from '../../lib/db'; // Colokan Kulkas

export async function POST(request) {
  try {
    const { nama, email, password } = await request.json();

    if (!nama || !email || !password) {
      return NextResponse.json({ pesan: "Data belum lengkap bre!" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ pesan: "Password lu kependekan bre! Minimal 8 karakter." }, { status: 400 });
    }
    // 1. Cek dulu, emailnya udah pernah dipake belum?
    const [userLama] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (userLama.length > 0) {
      return NextResponse.json({ pesan: "Wah, email lu udah pernah didaftarin bre!" }, { status: 400 });
    }

    // 2. Acak passwordnya pake jurus Bcrypt (Level kekuatannya 10)
    const passwordRahasia = await bcrypt.hash(password, 10);

    // 3. Masukin ke Kulkas
    await db.query(
      "INSERT INTO users (nama, email, password) VALUES (?, ?, ?)",
      [nama, email, passwordRahasia]
    );
    
    return NextResponse.json({ pesan: "Welcome" }, { status: 201 });

  } catch (error) {
    console.error("Dapur pendaftaran error:", error);
    return NextResponse.json({ pesan: "Sistem dapur error" }, { status: 500 });
  }
}