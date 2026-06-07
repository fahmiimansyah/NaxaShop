import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import {
  normalizeKodeVoucher,
  validateVoucherForCheckout
} from '../../../lib/voucher';

const ATURAN_METODE_BAYAR = {
  qris: { biaya: 0 },
  gopay: { biaya: 0 },
  shopeepay: { biaya: 0 },
  dana: { biaya: 0 },
  seabank: { biaya: 0 },
  bca_va: { biaya: 4000 },
  bni_va: { biaya: 4000 },
  bri_va: { biaya: 4000 },
  cimb_va: { biaya: 4000 },
  permata_va: { biaya: 4000 },
  mandiri_bill: { biaya: 4000 },
  alfamart: { biaya: 5000 },
  indomaret: { biaya: 5000 }
};

function getBiayaAdmin(metodeBayar) {
  return Number(ATURAN_METODE_BAYAR[metodeBayar]?.biaya || 0);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const kodeVoucher = normalizeKodeVoucher(body.kode_voucher || body.kode);
    const produkId = Number(body.produk_id);
    const metodeBayar = String(body.metode_bayar || '').trim();

    if (!kodeVoucher) {
      return NextResponse.json(
        { sukses: false, pesan: 'Kode voucher wajib diisi bre!' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(produkId) || produkId <= 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Pilih produk dulu sebelum pakai voucher bre!' },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT id, nama_produk, harga
       FROM produk
       WHERE id = ?
         AND status_produk = 'aktif'
       LIMIT 1`,
      [produkId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { sukses: false, pesan: 'Produk gak tersedia buat voucher ini bre!' },
        { status: 400 }
      );
    }

    const produk = rows[0];
    const hargaProduk = Number(produk.harga || 0);
    const biayaAdmin = getBiayaAdmin(metodeBayar);

    const hasil = await validateVoucherForCheckout(db, {
      kodeVoucher,
      hargaProduk,
      biayaAdmin
    });

    if (!hasil.sukses) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: hasil.pesan,
          kode_voucher: kodeVoucher
        },
        { status: 400 }
      );
    }

    const hargaSebelumDiskon = hargaProduk + biayaAdmin;
    const hargaTotal = hargaSebelumDiskon - hasil.diskon;

    return NextResponse.json({
      sukses: true,
      pesan: hasil.pesan,
      data: {
        id: hasil.voucher.id,
        kode: hasil.kode_voucher,
        nama: hasil.voucher.nama,
        tipe_diskon: hasil.voucher.tipe_diskon,
        nilai_diskon: Number(hasil.voucher.nilai_diskon || 0),
        diskon: hasil.diskon,
        harga_produk: hargaProduk,
        biaya_admin: biayaAdmin,
        harga_sebelum_diskon: hargaSebelumDiskon,
        harga_total: hargaTotal
      }
    });
  } catch (error) {
    console.error('POST /api/voucher/cek error:', error);

    return NextResponse.json(
      { sukses: false, pesan: 'Gagal cek voucher bre!' },
      { status: 500 }
    );
  }
}
