import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== EMAIL_CEO) {
    return false;
  }

  return true;
}

function bersihinText(value) {
  return String(value || '').trim();
}

export async function GET() {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const [daftarProduk] = await db.query(
      `SELECT id, kode_produk, nama_produk, harga, game_id
       FROM produk
       ORDER BY id DESC`
    );

    return NextResponse.json({
      sukses: true,
      data: daftarProduk
    });
  } catch (error) {
    console.error('Gagal narik produk:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal narik data produk bre!' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const dataBaru = await request.json();

    const kode_produk = bersihinText(dataBaru.kode_produk);
    const nama_produk = bersihinText(dataBaru.nama_produk);
    const game_id = dataBaru.game_id;
    const hargaAngka = Number(dataBaru.harga);

    if (!kode_produk || !nama_produk || !hargaAngka || !game_id) {
      return NextResponse.json(
        { sukses: false, pesan: 'Data produk belum lengkap bre!' },
        { status: 400 }
      );
    }

    if (Number.isNaN(hargaAngka) || hargaAngka <= 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Harga produk harus angka valid bre!' },
        { status: 400 }
      );
    }

    const [cekGame] = await db.query(
      `SELECT id FROM games WHERE id = ? LIMIT 1`,
      [game_id]
    );

    if (cekGame.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game buat produk ini gak ketemu bre!' },
        { status: 400 }
      );
    }

    const [cekKode] = await db.query(
      `SELECT id FROM produk WHERE kode_produk = ? LIMIT 1`,
      [kode_produk]
    );

    if (cekKode.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode Produk udah ada bre! Pake kode lain.' },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO produk (kode_produk, nama_produk, harga, game_id)
       VALUES (?, ?, ?, ?)`,
      [kode_produk, nama_produk, hargaAngka, game_id]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Berhasil nambahin produk ke etalase!'
    });
  } catch (error) {
    console.error('Dapur input meledak:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur input meledak!' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const id = body.id;
    const game_id = body.game_id;
    const kode_produk = bersihinText(body.kode_produk);
    const nama_produk = bersihinText(body.nama_produk);
    const harga = Number(body.harga);

    if (!id || !game_id || !kode_produk || !nama_produk || !harga) {
      return NextResponse.json(
        { sukses: false, pesan: 'Data produk belum lengkap bre!' },
        { status: 400 }
      );
    }

    if (Number.isNaN(harga) || harga <= 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Harga produk gak valid bre!' },
        { status: 400 }
      );
    }

    const [cekProduk] = await db.query(
      `SELECT id FROM produk WHERE id = ? LIMIT 1`,
      [id]
    );

    if (cekProduk.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Produk gak ketemu bre!' },
        { status: 404 }
      );
    }

    const [cekGame] = await db.query(
      `SELECT id FROM games WHERE id = ? LIMIT 1`,
      [game_id]
    );

    if (cekGame.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game buat produk ini gak ketemu bre!' },
        { status: 400 }
      );
    }

    const [cekKode] = await db.query(
      `SELECT id FROM produk WHERE kode_produk = ? AND id != ? LIMIT 1`,
      [kode_produk, id]
    );

    if (cekKode.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode produk udah dipakai produk lain bre!' },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE produk
       SET game_id = ?,
           kode_produk = ?,
           nama_produk = ?,
           harga = ?
       WHERE id = ?`,
      [game_id, kode_produk, nama_produk, harga, id]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Produk berhasil diedit bre!'
    });
  } catch (error) {
    console.error('Edit produk error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur edit produk meledak bre!' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const adminValid = await cekAdmin();

  if (!adminValid) {
    return NextResponse.json(
      { sukses: false, pesan: 'Akses ditolak bre! Lu bukan admin.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID produk wajib dikirim bre!' },
        { status: 400 }
      );
    }

    const [cekProduk] = await db.query(
      `SELECT id FROM produk WHERE id = ? LIMIT 1`,
      [id]
    );

    if (cekProduk.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Produk gak ketemu bre!' },
        { status: 404 }
      );
    }

    await db.query(
      `DELETE FROM produk WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Produk berhasil dihapus dari etalase!'
    });
  } catch (error) {
    console.error('Gagal hapus produk:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur hapus produk meledak bre!' },
      { status: 500 }
    );
  }
}