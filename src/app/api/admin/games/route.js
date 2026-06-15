import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';
import {
  DEFAULT_GAME_CATEGORY,
  ensureGameCategoryColumns,
  normalizeKategoriGame,
} from '../../../lib/game-categories';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';
const STATUS_GAME_VALID = ['aktif', 'gangguan', 'nonaktif', 'coming_soon'];
const BADGE_TIPE_VALID = ['none', 'popular', 'promo', 'fast', 'new', 'comingsoon'];

async function cekAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && session.user?.email === EMAIL_CEO);
}

function bersihinText(value) {
  return String(value || '').trim();
}

function bikinSlug(value) {
  return bersihinText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function normalisasiSlug(value, fallbackNama = '') {
  return bikinSlug(value || fallbackNama);
}

function normalisasiStatusGame(value) {
  const status = bersihinText(value).toLowerCase();
  return STATUS_GAME_VALID.includes(status) ? status : 'aktif';
}

function normalisasiBadgeTipe(value) {
  const tipe = bersihinText(value || 'none').toLowerCase();
  return BADGE_TIPE_VALID.includes(tipe) ? tipe : 'none';
}

function payloadGameDariBody(body, existingGame = {}) {
  const adaKategoriDiBody = Object.prototype.hasOwnProperty.call(body, 'kategori_game');
  const adaSortOrderDiBody = Object.prototype.hasOwnProperty.call(body, 'sort_order');

  return {
    nama: bersihinText(body.nama),
    slug: normalisasiSlug(body.slug, body.nama || existingGame.nama || existingGame.slug),
    publisher: bersihinText(body.publisher),
    gambar: bersihinText(body.gambar),
    zone_id: Number(body.zone_id) === 1 ? 1 : 0,
    server_game: bersihinText(body.server_game) || null,
    kode_game: bersihinText(body.kode_game),
    status_game: normalisasiStatusGame(body.status_game),
    kategori_game: normalizeKategoriGame(
      adaKategoriDiBody ? body.kategori_game : existingGame.kategori_game || DEFAULT_GAME_CATEGORY
    ),
    sort_order: adaSortOrderDiBody && Number.isFinite(Number(body.sort_order))
      ? Number(body.sort_order)
      : Number(existingGame.sort_order || 0),
    badge_label: bersihinText(body.badge_label) || null,
    badge_tipe: normalisasiBadgeTipe(body.badge_tipe)
  };
}

function validasiPayloadGame(game) {
  if (!game.nama || !game.slug || !game.publisher || !game.gambar || !game.kode_game) {
    return 'Nama, slug, publisher, gambar, dan kode game wajib diisi bre!';
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug)) {
    return 'Slug cuma boleh huruf kecil, angka, dan strip bre!';
  }

  if (
    game.nama.length > 100 ||
    game.slug.length > 100 ||
    game.publisher.length > 100 ||
    game.gambar.length > 255 ||
    game.kode_game.length > 100 ||
    game.kategori_game.length > 50 ||
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
    await ensureGameCategoryColumns(db);

    const [games] = await db.query(
      `SELECT id, slug, nama, publisher, gambar, zone_id, server_game, kode_game, status_game, kategori_game, sort_order, badge_label, badge_tipe
       FROM games
       ORDER BY sort_order ASC, id DESC`
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
    await ensureGameCategoryColumns(db);

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

    const [slugLama] = await db.query(
      `SELECT id FROM games WHERE slug = ? LIMIT 1`,
      [game.slug]
    );

    if (slugLama.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Slug game udah dipakai bre! Ubah nama atau slug-nya.' },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO games
       (nama, slug, publisher, gambar, zone_id, server_game, kode_game, status_game, kategori_game, sort_order, badge_label, badge_tipe)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        game.nama,
        game.slug,
        game.publisher,
        game.gambar,
        game.zone_id,
        game.server_game,
        game.kode_game,
        game.status_game,
        game.kategori_game,
        game.sort_order,
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
    await ensureGameCategoryColumns(db);

    const body = await request.json();
    const id = body.id;

    if (!id) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID game wajib dikirim bre!' },
        { status: 400 }
      );
    }

    const [cekGame] = await db.query(
      `SELECT id, nama, slug, kategori_game, sort_order FROM games WHERE id = ? LIMIT 1`,
      [id]
    );

    if (cekGame.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game gak ketemu bre!' },
        { status: 404 }
      );
    }

    const game = payloadGameDariBody(body, cekGame[0]);
    const pesanValidasi = validasiPayloadGame(game);

    if (pesanValidasi) {
      return NextResponse.json(
        { sukses: false, pesan: pesanValidasi },
        { status: 400 }
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

    const [cekSlug] = await db.query(
      `SELECT id FROM games WHERE slug = ? AND id != ? LIMIT 1`,
      [game.slug, id]
    );

    if (cekSlug.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Slug game udah dipakai game lain bre!' },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE games
       SET nama = ?,
           slug = ?,
           publisher = ?,
           gambar = ?,
           zone_id = ?,
           server_game = ?,
           kode_game = ?,
           status_game = ?,
           kategori_game = ?,
           sort_order = ?,
           badge_label = ?,
           badge_tipe = ?
       WHERE id = ?`,
      [
        game.nama,
        game.slug,
        game.publisher,
        game.gambar,
        game.zone_id,
        game.server_game,
        game.kode_game,
        game.status_game,
        game.kategori_game,
        game.sort_order,
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
    await ensureGameCategoryColumns(db);

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
