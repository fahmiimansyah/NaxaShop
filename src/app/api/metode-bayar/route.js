import { NextResponse } from 'next/server';
import db from '../../lib/db';
import { DEFAULT_DAFTAR_METODE_BAYAR, gabungMetodeDenganDefault, groupMetodeBayar } from '../../lib/payment-methods';

export async function GET() {
  try {
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
         urutan
       FROM metode_pembayaran
       ORDER BY urutan ASC, kode ASC`
    );

    const metode = gabungMetodeDenganDefault(rows);

    return NextResponse.json({
      sukses: true,
      data: groupMetodeBayar(metode),
      flat: metode
    });
  } catch (error) {
    console.warn('Metode pembayaran pakai default karena tabel belum siap:', error?.message || error);

    return NextResponse.json({
      sukses: true,
      data: DEFAULT_DAFTAR_METODE_BAYAR,
      flat: DEFAULT_DAFTAR_METODE_BAYAR.flatMap((grup) => grup.items),
      fallback: true
    });
  }
}
