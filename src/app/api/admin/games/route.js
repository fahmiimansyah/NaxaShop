import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';
const STATUS_GAME_VALID = ['aktif', 'nonaktif', 'coming_soon'];
const BADGE_TIPE_VALID = ['none', 'popular', 'promo', 'fast', 'new'];

async function cekAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && session.user?.email === EMAIL_CEO);
}

function bersihinText(value) {
  return String(value || '').trim();
}

function normalisasiStatusGame(value) {
  const status = bersihinText(value).toLowerCase();
  return STATUS_GAME_VALID.includes(status) ? status : 'aktif';
}

function normalisasiBadgeTipe(value) {
  const tipe = bersihinText(value || 'none').toLowerCase();
  return BADGE_TIPE_VALID.includes(tipe) ? tipe : 'none';
}

function payloadGameDariBody(body) {
  return {
    nama: bersihinText(body.nama),
    publisher: bersihinText(body.publisher),
    gambar: bersihinText(body.gambar),
    zone_id: Number(body.zone_id) === 1 ? 1 : 0,
    server_game: bersihinText(body.server_game) || null,
    kode_game: bersihinText(body.kode_game),
    status_game: normalisasiStatusGame(body.status_game),
    badge_label: bersihinText(body.badge_label) || null,
    badge_tipe: normalisasiBadgeTipe(body.badge_tipe)
  };
}

function validasiPayloadGame(game) {
  if (!game.nama || !game.publisher || !game.gambar || !game.kode_game) {
    return 'Nama, publisher, gambar, dan kode game wajib diisi bre!';
  }

  if (
    game.nama.length > 100 ||
    game.publisher.length > 100 ||
    game.gambar.length > 255 ||
    game.kode_game.length > 100 ||
    (game.server_game && game.server_game.length > 50) ||
    (game.badge_label && game.badge_label.length > 50) ||
    game.badge_tipe.length > 30
  ) {
    return 'Ada input yang kepanjangan bre!';
  }

  return null;
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
      `SELECT id, nama, publisher, gambar, zone_id, server_game, kode_game, status_game, badge_label, badge_tipe
       FROM games
       ORDER BY id DESC`
    );

    return NextResponse.json({ sukses: true, data: games });
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
    const game = payloadGameDariBody(body);
    const pesanValidasi = validasiPayloadGame(game);

    if (pesanValidasi) {
      return NextResponse.json(
        { sukses: false, pesan: pesanValidasi },
        { status: 400 }
      );
    }

    const [gameLama] = await db.query(
      `SELECT id FROM games WHERE kode_game = ? LIMIT 1`,
      [game.kode_game]
    );

    if (gameLama.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode game udah ada bre! Pake kode lain.' },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO games
       (nama, publisher, gambar, zone_id, server_game, kode_game, status_game, badge_label, badge_tipe)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game.nama,
        game.publisher,
        game.gambar,
        game.zone_id,
        game.server_game,
        game.kode_game,
        game.status_game,
        game.badge_label,
        game.badge_tipe
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan:
        game.status_game === 'coming_soon'
          ? 'Game berhasil masuk sebagai Coming Soon! 🕒'
          : 'Game baru berhasil masuk etalase CEO! 🎮'
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
    const game = payloadGameDariBody(body);
    const pesanValidasi = validasiPayloadGame(game);

    if (!id) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID game wajib dikirim bre!' },
        { status: 400 }
      );
    }

    if (pesanValidasi) {
      return NextResponse.json(
        { sukses: false, pesan: pesanValidasi },
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
      [game.kode_game, id]
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
           status_game = ?,
           badge_label = ?,
           badge_tipe = ?
       WHERE id = ?`,
      [
        game.nama,
        game.publisher,
        game.gambar,
        game.zone_id,
        game.server_game,
        game.kode_game,
        game.status_game,
        game.badge_label,
        game.badge_tipe,
        id
      ]
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

    await db.query(`DELETE FROM games WHERE id = ?`, [id]);

    return NextResponse.json({
      sukses: true,
      pesan: 'Game berhasil dihapus dari etalase!'
    });
  } catch (error) {
    console.error('Hapus game error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur hapus game meledak bre!' },
      { status: 500 }
    );
  }
}
