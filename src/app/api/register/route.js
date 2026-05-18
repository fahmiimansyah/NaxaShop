import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../../lib/db';
import { kirimEmailVerifikasi } from '../../lib/mailer';
import { rateLimit } from '../../lib/rate-limit';
function bersihinText(value) {
  return String(value || '').trim();
}

function emailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export async function POST(request) {
  const limit = rateLimit(request, {
  key: 'register',
  limit: 3,
  windowMs: 60_000
});

if (!limit.allowed) {
  return NextResponse.json(
    {
      sukses: false,
      pesan: `Terlalu sering daftar bre. Coba lagi ${limit.retryAfter} detik lagi.`
    },
    { status: 429 }
  );
}
  try {
    const body = await request.json();

    const nama = bersihinText(body.nama);
    const email = bersihinText(body.email).toLowerCase();
    const password = String(body.password || '');

    if (!nama || !email || !password) {
      return NextResponse.json(
        { sukses: false, pesan: 'Data belum lengkap bre!' },
        { status: 400 }
      );
    }

    if (nama.length < 2 || nama.length > 50) {
      return NextResponse.json(
        { sukses: false, pesan: 'Nama harus 2-50 karakter bre!' },
        { status: 400 }
      );
    }

    if (!emailValid(email)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Format email gak valid bre!' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { sukses: false, pesan: 'Password lu kependekan bre! Minimal 8 karakter.' },
        { status: 400 }
      );
    }

    if (password.length > 72) {
      return NextResponse.json(
        { sukses: false, pesan: 'Password kepanjangan bre! Maksimal 72 karakter.' },
        { status: 400 }
      );
    }

    const [userLama] = await db.query(
      `SELECT id, email_verified FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (userLama.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Wah, email lu udah pernah didaftarin bre!' },
        { status: 400 }
      );
    }

    const passwordRahasia = await bcrypt.hash(password, 10);

    const tokenMentah = crypto.randomBytes(32).toString('hex');
    const tokenRahasia = hashToken(tokenMentah);

    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 jam
    const verificationLink = `${process.env.NEXTAUTH_URL}/api/verify-email?token=${tokenMentah}`;

    await db.query(
      `INSERT INTO users
       (nama, email, password, email_verified, verification_token, verification_expires)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama, email, passwordRahasia, 0, tokenRahasia, expires]
    );

    await kirimEmailVerifikasi({
      to: email,
      nama,
      link: verificationLink,
    });

    return NextResponse.json(
      {
        sukses: true,
        pesan: 'Akun berhasil dibuat! Cek email lu buat verifikasi dulu bre.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Dapur pendaftaran error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { sukses: false, pesan: 'Email ini udah terdaftar bre!' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { sukses: false, pesan: 'Sistem dapur error' },
      { status: 500 }
    );
  }
}