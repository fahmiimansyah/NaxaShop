import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import db from '../../../lib/db';
import { ensureVoucherSchema, normalizeKodeVoucher } from '../../../lib/voucher';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';
const TIPE_VALID = ['nominal', 'persen'];
const STATUS_VALID = ['aktif', 'nonaktif'];

async function cekAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.email === EMAIL_CEO);
}

function angka(value, fallback = 0) {
  const hasil = Number(value);
  return Number.isFinite(hasil) ? hasil : fallback;
}

function bersihinText(value) {
  return String(value || '').trim();
}

function toMysqlDate(value) {
  const clean = bersihinText(value);
  if (!clean) return null;

  // input datetime-local biasanya: 2026-06-07T21:30
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) {
    return `${clean.replace('T', ' ')}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(clean)) {
    return `${clean}:00`;
  }

  return clean.replace('T', ' ');
}

function formatDateInput(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function validasiPayload(body, mode = 'create') {
  const kode = normalizeKodeVoucher(body.kode);
  const nama = bersihinText(body.nama);
  const tipeDiskon = bersihinText(body.tipe_diskon || 'nominal').toLowerCase();
  const nilaiDiskon = Math.max(0, Math.floor(angka(body.nilai_diskon)));
  const minimalTransaksi = Math.max(0, Math.floor(angka(body.minimal_transaksi)));
  const maksimalDiskon = Math.max(0, Math.floor(angka(body.maksimal_diskon)));
  const kuotaTotal = Math.max(0, Math.floor(angka(body.kuota_total)));
  const status = bersihinText(body.status || 'aktif').toLowerCase();
  const mulaiPada = toMysqlDate(body.mulai_pada);
  const berakhirPada = toMysqlDate(body.berakhir_pada);
  const catatan = bersihinText(body.catatan);

  if (mode === 'create' && !kode) {
    return { error: 'Kode voucher wajib diisi bre!' };
  }

  if (!/^[A-Z0-9_-]{3,40}$/.test(kode)) {
    return { error: 'Kode voucher minimal 3 karakter dan cuma boleh huruf, angka, underscore, atau strip.' };
  }

  if (!nama) {
    return { error: 'Nama voucher wajib diisi bre!' };
  }

  if (!TIPE_VALID.includes(tipeDiskon)) {
    return { error: 'Tipe diskon gak valid bre!' };
  }

  if (nilaiDiskon <= 0) {
    return { error: 'Nilai diskon harus lebih dari 0 bre!' };
  }

  if (tipeDiskon === 'persen' && nilaiDiskon > 100) {
    return { error: 'Diskon persen maksimal 100% bre!' };
  }

  if (!STATUS_VALID.includes(status)) {
    return { error: 'Status voucher gak valid bre!' };
  }

  return {
    data: {
      kode,
      nama,
      tipeDiskon,
      nilaiDiskon,
      minimalTransaksi,
      maksimalDiskon,
      kuotaTotal,
      status,
      mulaiPada,
      berakhirPada,
      catatan: catatan || null
    }
  };
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
    await ensureVoucherSchema(db);

    const [vouchers] = await db.query(
      `SELECT *
       FROM promo_voucher
       ORDER BY id DESC`
    );

    const data = vouchers.map((item) => ({
      ...item,
      mulai_pada_input: formatDateInput(item.mulai_pada),
      berakhir_pada_input: formatDateInput(item.berakhir_pada)
    }));

    return NextResponse.json({ sukses: true, data });
  } catch (error) {
    console.error('GET /api/admin/voucher error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal ambil voucher bre!' },
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
    await ensureVoucherSchema(db);

    const body = await request.json();
    const hasilValidasi = validasiPayload(body, 'create');

    if (hasilValidasi.error) {
      return NextResponse.json(
        { sukses: false, pesan: hasilValidasi.error },
        { status: 400 }
      );
    }

    const data = hasilValidasi.data;

    await db.query(
      `INSERT INTO promo_voucher
       (kode, nama, tipe_diskon, nilai_diskon, minimal_transaksi, maksimal_diskon, kuota_total, mulai_pada, berakhir_pada, status, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.kode,
        data.nama,
        data.tipeDiskon,
        data.nilaiDiskon,
        data.minimalTransaksi,
        data.maksimalDiskon,
        data.kuotaTotal,
        data.mulaiPada,
        data.berakhirPada,
        data.status,
        data.catatan
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Voucher berhasil dibuat bre!'
    });
  } catch (error) {
    console.error('POST /api/admin/voucher error:', error);

    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode voucher sudah dipakai bre!' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal simpan voucher bre!' },
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
    await ensureVoucherSchema(db);

    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID voucher gak valid bre!' },
        { status: 400 }
      );
    }

    const hasilValidasi = validasiPayload(body, 'update');

    if (hasilValidasi.error) {
      return NextResponse.json(
        { sukses: false, pesan: hasilValidasi.error },
        { status: 400 }
      );
    }

    const data = hasilValidasi.data;

    await db.query(
      `UPDATE promo_voucher
       SET kode = ?,
           nama = ?,
           tipe_diskon = ?,
           nilai_diskon = ?,
           minimal_transaksi = ?,
           maksimal_diskon = ?,
           kuota_total = ?,
           mulai_pada = ?,
           berakhir_pada = ?,
           status = ?,
           catatan = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        data.kode,
        data.nama,
        data.tipeDiskon,
        data.nilaiDiskon,
        data.minimalTransaksi,
        data.maksimalDiskon,
        data.kuotaTotal,
        data.mulaiPada,
        data.berakhirPada,
        data.status,
        data.catatan,
        id
      ]
    );

    return NextResponse.json({
      sukses: true,
      pesan: 'Voucher berhasil diupdate bre!'
    });
  } catch (error) {
    console.error('PATCH /api/admin/voucher error:', error);

    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode voucher sudah dipakai bre!' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal update voucher bre!' },
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
    await ensureVoucherSchema(db);

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'ID voucher gak valid bre!' },
        { status: 400 }
      );
    }

    await db.query(`DELETE FROM promo_voucher WHERE id = ? LIMIT 1`, [id]);

    return NextResponse.json({
      sukses: true,
      pesan: 'Voucher berhasil dihapus bre!'
    });
  } catch (error) {
    console.error('DELETE /api/admin/voucher error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal hapus voucher bre!' },
      { status: 500 }
    );
  }
}
