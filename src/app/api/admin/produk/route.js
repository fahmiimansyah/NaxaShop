import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

const STATUS_PRODUK_VALID = ['aktif', 'gangguan', 'nonaktif', 'coming_soon'];
const PROVIDER_VALID = ['apigames', 'digiflazz', 'mock', 'vipreseller'];

async function cekAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && session.user?.email === EMAIL_CEO);
}

function bersihinText(value) {
  return String(value || '').trim();
}

function normalisasiStatusProduk(value) {
  const status = bersihinText(value).toLowerCase();
  return STATUS_PRODUK_VALID.includes(status) ? status : 'aktif';
}

function normalisasiProvider(value) {
  const provider = bersihinText(value || 'apigames').toLowerCase();
  return PROVIDER_VALID.includes(provider) ? provider : '';
}

function validasiHarga(value) {
  const harga = Number(value);

  if (Number.isNaN(harga) || harga <= 0) {
    return null;
  }

  return harga;
}

function validasiHargaModal(value) {
  const hargaModal = Number(value || 0);

  if (Number.isNaN(hargaModal) || hargaModal < 0) {
    return null;
  }

  return hargaModal;
}

function validasiHargaCoret(value) {
  const hargaCoret = Number(value || 0);

  if (Number.isNaN(hargaCoret) || hargaCoret < 0) {
    return null;
  }

  return hargaCoret;
}

function payloadProdukDariBody(body) {
  const kode_produk = bersihinText(body.kode_produk);

  return {
    game_id: body.game_id,
    kode_produk,
    nama_produk: bersihinText(body.nama_produk),
    gambar_produk: bersihinText(body.gambar_produk),
    harga: validasiHarga(body.harga),
    harga_coret: validasiHargaCoret(body.harga_coret),
    harga_modal: validasiHargaModal(body.harga_modal),
    status_produk: normalisasiStatusProduk(body.status_produk),
    provider: normalisasiProvider(body.provider),
    kode_produk_provider: bersihinText(body.kode_produk_provider || kode_produk)
  };
}

function validasiPayloadProduk(produk, wajibId = false, id = null) {
  if (wajibId && !id) return 'ID produk wajib dikirim bre!';

  if (
    !produk.game_id ||
    !produk.kode_produk ||
    !produk.nama_produk ||
    !produk.harga ||
    produk.harga_modal === null ||
    produk.harga_coret === null
  ) {
    return 'Data produk belum lengkap bre!';
  }

  if (produk.harga_modal > produk.harga) {
    return 'Harga modal gak boleh lebih gede dari harga jual bre!';
  }

  if (produk.harga_coret > 0 && produk.harga_coret <= produk.harga) {
    return 'Harga coret harus lebih besar dari harga jual bre!';
  }

  if (!produk.provider) {
    return 'Provider produk gak valid bre!';
  }

  if (!produk.kode_produk_provider) {
    return 'Kode produk provider wajib diisi bre!';
  }

  if (
    produk.kode_produk.length > 100 ||
    produk.nama_produk.length > 150 ||
    produk.kode_produk_provider.length > 100
  ) {
    return 'Ada input produk yang kepanjangan bre!';
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
    const [daftarProduk] = await db.query(
      `SELECT
         id,
         kode_produk,
         nama_produk,
         gambar_produk,
         harga,
         harga_modal,
         harga_coret,
         game_id,
         status_produk,
         provider,
         COALESCE(kode_produk_provider, kode_produk) AS kode_produk_provider
       FROM produk
       ORDER BY id DESC`
    );

    return NextResponse.json({ sukses: true, data: daftarProduk });
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
    const body = await request.json();
    const produk = payloadProdukDariBody(body);
    const pesanValidasi = validasiPayloadProduk(produk);

    if (pesanValidasi) {
      return NextResponse.json(
        { sukses: false, pesan: pesanValidasi },
        { status: 400 }
      );
    }

    const [cekGame] = await db.query(
      `SELECT id FROM games WHERE id = ? LIMIT 1`,
      [produk.game_id]
    );

    if (cekGame.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game buat produk ini gak ketemu bre!' },
        { status: 400 }
      );
    }

    const [cekKode] = await db.query(
      `SELECT id FROM produk WHERE kode_produk = ? LIMIT 1`,
      [produk.kode_produk]
    );

    if (cekKode.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode Produk udah ada bre! Pake kode lain.' },
        { status: 400 }
      );
    }

    await db.query(
      `INSERT INTO produk
       (
         kode_produk,
         nama_produk,
         gambar_produk,
         harga,
         harga_coret,
         harga_modal,
         game_id,
         status_produk,
         provider,
         kode_produk_provider
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        produk.kode_produk,
        produk.nama_produk,
        produk.gambar_produk,
        produk.harga,
        produk.harga_coret,
        produk.harga_modal,
        produk.game_id,
        produk.status_produk,
        produk.provider,
        produk.kode_produk_provider
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan:
        produk.status_produk === 'coming_soon'
          ? 'Produk berhasil disimpan sebagai Coming Soon! 🕒'
          : 'Berhasil nambahin produk ke etalase!'
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
    const produk = payloadProdukDariBody(body);
    const pesanValidasi = validasiPayloadProduk(produk, true, id);

    if (pesanValidasi) {
      return NextResponse.json(
        { sukses: false, pesan: pesanValidasi },
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
      [produk.game_id]
    );

    if (cekGame.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Game buat produk ini gak ketemu bre!' },
        { status: 400 }
      );
    }

    const [cekKode] = await db.query(
      `SELECT id FROM produk WHERE kode_produk = ? AND id != ? LIMIT 1`,
      [produk.kode_produk, id]
    );

    if (cekKode.length > 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode Produk udah dipakai produk lain bre!' },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE produk
       SET kode_produk = ?,
           nama_produk = ?,
           gambar_produk = ?,
           harga = ?,
           harga_coret = ?,
           harga_modal = ?,
           game_id = ?,
           status_produk = ?,
           provider = ?,
           kode_produk_provider = ?
       WHERE id = ?`,
      [
        produk.kode_produk,
        produk.nama_produk,
        produk.gambar_produk,
        produk.harga,
        produk.harga_coret,
        produk.harga_modal,
        produk.game_id,
        produk.status_produk,
        produk.provider,
        produk.kode_produk_provider,
        id
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Produk berhasil diupdate bre!'
    });
  } catch (error) {
    console.error('Dapur update produk meledak:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur update produk meledak!' },
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

    await db.query(`DELETE FROM produk WHERE id = ?`, [id]);

    return NextResponse.json({
      sukses: true,
      pesan: 'Produk berhasil dihapus bre!'
    });
  } catch (error) {
    console.error('Dapur hapus produk meledak:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur hapus produk meledak!' },
      { status: 500 }
    );
  }
}
