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

function bikinTokenVerifikasi() {
  const tokenMentah = crypto.randomBytes(32).toString('hex');
  const tokenRahasia = hashToken(tokenMentah);
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 jam

  return { tokenMentah, tokenRahasia, expires };
}

function getBaseUrl(request) {
  const origin = request.headers.get('origin');

  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    origin ||
    new URL(request.url).origin
  );
}

async function cobaKirimEmailVerifikasi({ email, nama, link }) {
  try {
    await kirimEmailVerifikasi({
      to: email,
      nama,
      link,
    });

    return { terkirim: true, error: null };
  } catch (error) {
    console.error('Email verifikasi gagal dikirim:', {
      message: error?.message,
      code: error?.code,
      command: error?.command,
      hostname: error?.hostname,
    });

    return { terkirim: false, error };
  }
}

export async function POST(request) {
  const limit = await rateLimit(request, {
    key: 'register',
    limit: 3,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        sukses: false,
        pesan: `Terlalu sering daftar bre. Coba lagi ${limit.retryAfter} detik lagi.`,
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
      `SELECT id, nama, email, email_verified
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const passwordRahasia = await bcrypt.hash(password, 10);
    const { tokenMentah, tokenRahasia, expires } = bikinTokenVerifikasi();
    const baseUrl = getBaseUrl(request).replace(/\/$/, '');
    const verificationLink = `${baseUrl}/api/verify-email?token=${tokenMentah}`;

    // CASE 1: email sudah ada dan sudah verified
    if (userLama.length > 0 && Number(userLama[0].email_verified) === 1) {
      return NextResponse.json(
        { sukses: false, pesan: 'Wah, email lu udah pernah didaftarin bre!' },
        { status: 400 }
      );
    }

    // CASE 2: email sudah ada tapi belum verified
    // Ini fix kasus frontend error tapi DB keburu sukses.
    // User bisa daftar ulang, password/token diperbarui, link verifikasi dikirim ulang.
    if (userLama.length > 0 && Number(userLama[0].email_verified) !== 1) {
      await db.query(
        `UPDATE users
         SET nama = ?,
             password = ?,
             provider = COALESCE(provider, 'credentials'),
             verification_token = ?,
             verification_expires = ?
         WHERE id = ?`,
        [nama, passwordRahasia, tokenRahasia, expires, userLama[0].id]
      );

      const emailResult = await cobaKirimEmailVerifikasi({
        email,
        nama,
        link: verificationLink,
      });

      if (!emailResult.terkirim) {
        return NextResponse.json(
          {
            sukses: true,
            emailWarning: true,
            pesan:
              'Akun lu sebenernya udah dibuat, tapi email verifikasi lagi ngadat. Coba daftar/login lagi beberapa menit lagi atau hubungi admin bre.',
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          sukses: true,
          resent: true,
          pesan:
            'Email ini sudah pernah daftar tapi belum diverifikasi. Link verifikasi baru udah dikirim bre, cek inbox/spam ya.',
        },
        { status: 200 }
      );
    }

    // CASE 3: user baru
    await db.query(
      `INSERT INTO users
       (nama, email, password, provider, role, email_verified, verification_token, verification_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nama, email, passwordRahasia, 'credentials', 'user', 0, tokenRahasia, expires]
    );

    const emailResult = await cobaKirimEmailVerifikasi({
      email,
      nama,
      link: verificationLink,
    });

    if (!emailResult.terkirim) {
      return NextResponse.json(
        {
          sukses: true,
          emailWarning: true,
          pesan:
            'Akun berhasil dibuat, tapi email verifikasi lagi ngadat. Data akun lu aman kok bre, coba daftar/login lagi beberapa menit lagi atau hubungi admin.',
        },
        { status: 201 }
      );
    }

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
      { sukses: false, pesan: 'Sistem dapur error. Coba lagi bentar ya bre.' },
      { status: 500 }
    );
  }
}
