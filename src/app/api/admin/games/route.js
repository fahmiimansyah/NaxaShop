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
    const [games] = await db.query(
      `SELECT id, nama, publisher, gambar, zone_id, server_game, kode_game, status_game
      FROM games
      ORDER BY id DESC`
    );

    return NextResponse.json({
      sukses: true,
      data: games
    });
  } catch (error) {
    console.error('Gagal ambil games admin:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ngambil daftar game bre!' },
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
    const body = await request.json();
      const status_game = ['aktif', 'nonaktif'].includes(body.status_game)
  ? body.status_game
  : 'aktif';
    const nama = bersihinText(body.nama);
    const publisher = bersihinText(body.publisher);
    const gambar = bersihinText(body.gambar);
    const kode_game = bersihinText(body.kode_game);
    const server_game = bersihinText(body.server_game) || null;
    const zone_id = Number(body.zone_id) === 1 ? 1 : 0;

    if (!nama || !publisher || !gambar || !kode_game) {
      return NextResponse.json(
        { sukses: false, pesan: 'Nama, publisher, gambar, dan kode game wajib diisi bre!' },
        { status: 400 }
      );
    }

    if (
      nama.length > 100 ||
      publisher.length > 100 ||
      gambar.length > 255 ||
      kode_game.length > 100 ||
      (server_game && server_game.length > 50)
    ) {
      return NextResponse.json(
        { sukses: false, pesan: 'Ada input yang kepanjangan bre!' },
        { status: 400 }
      );
    }

    const [gameLama] = await db.query(
      `SELECT id FROM games WHERE kode_game = ? LIMIT 1`,
      [kode_game]
    );

    if (gameLama.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode game udah ada bre! Pake kode lain.' },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO games (nama, publisher, gambar, zone_id, server_game, kode_game, status_game)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nama, publisher, gambar, zone_id, server_game, kode_game, status_game]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Game baru berhasil masuk etalase CEO! 🎮'
    });
  } catch (error) {
    console.error('Gagal tambah game:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode game ini udah ada bre!' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur tambah game meledak bre!' },
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
    const nama = bersihinText(body.nama);
    const publisher = bersihinText(body.publisher);
    const gambar = bersihinText(body.gambar);
    const kode_game = bersihinText(body.kode_game);
    const server_game = bersihinText(body.server_game) || null;
    const zone_id = Number(body.zone_id) === 1 ? 1 : 0;
    const status_game = ['aktif', 'nonaktif'].includes(body.status_game)
    ? body.status_game
    : 'aktif';

    if (!id) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID game wajib dikirim bre!' },
        { status: 400 }
      );
    }

    if (!nama || !publisher || !gambar || !kode_game) {
      return NextResponse.json(
        { sukses: false, pesan: 'Data game belum lengkap bre!' },
        { status: 400 }
      );
    }

    const [cekGame] = await db.query(
      `SELECT id FROM games WHERE id = ? LIMIT 1`,
      [id]
    );

    if (cekGame.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game gak ketemu bre!' },
        { status: 404 }
      );
    }

    const [cekKode] = await db.query(
      `SELECT id FROM games WHERE kode_game = ? AND id != ? LIMIT 1`,
      [kode_game, id]
    );

    if (cekKode.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode game udah dipakai game lain bre!' },
        { status: 400 }
      );
    }

    await db.query(
  `UPDATE games
   SET nama = ?,
       publisher = ?,
       gambar = ?,
       zone_id = ?,
       server_game = ?,
       kode_game = ?,
       status_game = ?
   WHERE id = ?`,
  [nama, publisher, gambar, zone_id, server_game, kode_game, status_game, id]
);

    return NextResponse.json({
      sukses: true,
      pesan: 'Game berhasil diedit bre!'
    });
  } catch (error) {
    console.error('Edit game error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur edit game meledak bre!' },
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
        { sukses: false, pesan: 'ID game wajib dikirim bre!' },
        { status: 400 }
      );
    }

    const [cekGame] = await db.query(
      `SELECT id, nama FROM games WHERE id = ? LIMIT 1`,
      [id]
    );

    if (cekGame.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game gak ketemu bre!' },
        { status: 404 }
      );
    }

    const [cekProduk] = await db.query(
      `SELECT COUNT(*) AS total FROM produk WHERE game_id = ?`,
      [id]
    );

    if (cekProduk[0].total > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game ini masih punya produk bre! Hapus produk-produknya dulu.' },
        { status: 400 }
      );
    }

    await db.query(
      `DELETE FROM games WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Game berhasil dihapus dari etalase!'
    });
  } catch (error) {
    console.error('Gagal hapus game:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur hapus game meledak bre!' },
      { status: 500 }
    );
  }
}