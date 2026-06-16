import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { ambilLayananVipReseller } from '../../../../lib/vipreseller';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && session.user?.email === EMAIL_CEO);
}

function angka(value) {
  return Number(value || 0);
}

function ambilHargaModal(price) {
  if (!price || typeof price !== 'object') return 0;

  const levelHarga = String(process.env.VIPRESELLER_PRICE_LEVEL || 'basic')
    .trim()
    .toLowerCase();

  const hargaSesuaiLevel = price[levelHarga];

  return angka(
    hargaSesuaiLevel ||
      price.basic ||
      price.premium ||
      price.special ||
      0
  );
}

function hitungHargaJual(hargaModal) {
  if (!hargaModal) return 0;

  const markupPersen = 10;
  const hargaDenganMarkup = hargaModal + hargaModal * (markupPersen / 100);

  return Math.ceil(hargaDenganMarkup / 100) * 100;
}

function mapStatusProduk(statusProvider) {
  const status = String(statusProvider || '').toLowerCase();

  if (status === 'available') return 'aktif';
  if (status === 'empty') return 'gangguan';

  return 'nonaktif';
}

function mapProdukVip(item, index) {
  const hargaModal = ambilHargaModal(item?.price);
  const hargaJual = hitungHargaJual(hargaModal);

  return {
    no: index + 1,
    provider: 'vipreseller',
    kode_produk_provider: String(item?.code || '').trim(),
    game_provider: String(item?.game || '').trim(),
    nama_produk_provider: String(item?.name || '').trim(),
    deskripsi_provider: String(item?.description || '').trim(),
    harga_modal: hargaModal,
    harga_jual: hargaJual,
    server_required: String(item?.server || '0') === '1',
    status_provider: String(item?.status || '').trim(),
    status_final: mapStatusProduk(item?.status),
    raw: item
  };
}

export async function POST(request) {
  try {
    const isAdmin = await cekAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Akses ditolak. Khusus admin utama NaXaShop.'
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const filterGame = String(body?.filter_game || '').trim();
    const filterStatus = String(body?.filter_status || '').trim();

    const hasilVip = await ambilLayananVipReseller({
      filterGame,
      filterStatus
    });

    const dataVip = hasilVip?.data || {};

    if (!hasilVip.ok || dataVip?.result === false) {
      return NextResponse.json(
        {
          sukses: false,
          pesan: dataVip?.message || 'Gagal mengambil layanan VIPReseller.',
          raw: dataVip
        },
        { status: hasilVip.status || 400 }
      );
    }

    const daftarLayanan = Array.isArray(dataVip?.data) ? dataVip.data : [];
    const data = daftarLayanan.map((item, index) => mapProdukVip(item, index));

    return NextResponse.json({
      sukses: true,
      pesan: 'Produk VIPReseller berhasil ditarik.',
      ringkasan: {
        total_produk: data.length,
        total_aktif: data.filter((item) => item.status_final === 'aktif').length,
        total_nonaktif: data.filter((item) => item.status_final !== 'aktif').length
      },
      data
    });
  } catch (error) {
    console.error('ERROR SYNC SERVICES VIPRESELLER:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: error?.message || 'Server gagal tarik produk VIPReseller.'
      },
      { status: 500 }
    );
  }
}
