import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';
import {
  DEFAULT_METODE_BAYAR,
  METODE_BAYAR_VALID,
  STATUS_METODE_BAYAR_VALID,
  gabungMetodeDenganDefault,
  normalisasiStatusMetode
} from '../../../lib/payment-methods';

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

function angkaAman(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.round(number);
}

async function pastikanTabelMetodeBayar() {
  await db.query(
    `CREATE TABLE IF NOT EXISTS metode_pembayaran (
       kode VARCHAR(50) NOT NULL,
       label VARCHAR(100) NOT NULL,
       grup VARCHAR(100) NOT NULL,
       deskripsi VARCHAR(255) NULL,
       logo VARCHAR(255) NULL,
       fallback VARCHAR(20) NULL,
       biaya_admin INT NOT NULL DEFAULT 0,
       minimal_transaksi INT NOT NULL DEFAULT 0,
       status_metode ENUM('aktif', 'maintenance', 'coming_soon', 'nonaktif') NOT NULL DEFAULT 'aktif',
       rekomendasi TINYINT(1) NOT NULL DEFAULT 0,
       urutan INT NOT NULL DEFAULT 0,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       PRIMARY KEY (kode)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  for (const item of DEFAULT_METODE_BAYAR) {
    await db.query(
      `INSERT IGNORE INTO metode_pembayaran
       (kode, label, grup, deskripsi, logo, fallback, biaya_admin, minimal_transaksi, status_metode, rekomendasi, urutan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.value,
        item.label,
        item.grup,
        item.desc,
        item.logo,
        item.fallback,
        item.biaya,
        item.minimal,
        item.status_metode,
        item.rekomendasi ? 1 : 0,
        item.sort_order
      ]
    );
  }
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
    await pastikanTabelMetodeBayar();

    const [rows] = await db.query(
      `SELECT
         kode,
         label,
         grup,
         deskripsi,
         logo,
         fallback,
         biaya_admin,
         minimal_transaksi,
         status_metode,
         rekomendasi,
         urutan,
         updated_at
       FROM metode_pembayaran
       ORDER BY urutan ASC, kode ASC`
    );

    return NextResponse.json({
      sukses: true,
      data: gabungMetodeDenganDefault(rows)
    });
  } catch (error) {
    console.error('Gagal ambil metode bayar admin:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ambil setting metode bayar bre!' },
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
    await pastikanTabelMetodeBayar();

    const body = await request.json();
    const kode = bersihinText(body.kode || body.value);

    if (!kode || !METODE_BAYAR_VALID.includes(kode)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode metode bayar gak valid bre!' },
        { status: 400 }
      );
    }

    const defaultItem = DEFAULT_METODE_BAYAR.find((item) => item.value === kode);
    const statusMetode = normalisasiStatusMetode(body.status_metode);

    if (!STATUS_METODE_BAYAR_VALID.includes(statusMetode)) {
      return NextResponse.json(
        { sukses: false, pesan: 'Status metode bayar gak valid bre!' },
        { status: 400 }
      );
    }

    const biayaAdmin = angkaAman(body.biaya_admin ?? body.biaya, defaultItem.biaya);
    const minimalTransaksi = angkaAman(
      body.minimal_transaksi ?? body.minimal,
      defaultItem.minimal
    );
    const urutan = angkaAman(body.urutan ?? body.sort_order, defaultItem.sort_order);
    const rekomendasi = Number(body.rekomendasi ?? defaultItem.rekomendasi) === 1 ? 1 : 0;
    const deskripsi = bersihinText(body.deskripsi || body.desc || defaultItem.desc);

    await db.query(
      `UPDATE metode_pembayaran
       SET deskripsi = ?,
           biaya_admin = ?,
           minimal_transaksi = ?,
           status_metode = ?,
           rekomendasi = ?,
           urutan = ?
       WHERE kode = ?`,
      [deskripsi, biayaAdmin, minimalTransaksi, statusMetode, rekomendasi, urutan, kode]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Setting metode bayar berhasil disimpan bre!'
    });
  } catch (error) {
    console.error('Gagal update metode bayar:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Dapur setting metode bayar meledak bre!' },
      { status: 500 }
    );
  }
}
