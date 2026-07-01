import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { ambilLayananNetflazz } from '../../../../lib/netflazz';

const EMAIL_CEO = 'fahmiimansyah28@gmail.com';

async function cekAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && session.user?.email === EMAIL_CEO);
}

function bersihinText(value) {
  return String(value || '').trim();
}

function normalisasi(value) {
  return bersihinText(value).toLowerCase();
}

function angka(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^0-9,.-]/g, '');
  if (!cleaned) return 0;

  // Format Indonesia: 1.000 / 1.000.000 / 1.000,50
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }

  // Format internasional: 1,000 / 1,000,000 / 1,000.50
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned.replace(/,/g, '')) || 0;
  }

  return Number(cleaned.replace(',', '.')) || 0;
}

function hitungHargaJual(hargaModal) {
  if (!hargaModal) return 0;

  const markupPersen = Number(process.env.PROVIDER_SYNC_MARKUP_PERCENT || 10);
  const markupValid = Number.isFinite(markupPersen) && markupPersen >= 0 ? markupPersen : 10;
  const hargaDenganMarkup = hargaModal + hargaModal * (markupValid / 100);

  return Math.ceil(hargaDenganMarkup / 100) * 100;
}

function ambilField(item, fields = []) {
  if (!item || typeof item !== 'object') return '';

  const lowerKeyMap = Object.keys(item).reduce((acc, key) => {
    acc[String(key).toLowerCase()] = key;
    return acc;
  }, {});

  for (const field of fields) {
    const exactKey = field;
    const lowerKey = lowerKeyMap[String(field).toLowerCase()];
    const key = Object.prototype.hasOwnProperty.call(item, exactKey) ? exactKey : lowerKey;

    if (key && Object.prototype.hasOwnProperty.call(item, key)) {
      const value = item[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
  }

  return '';
}

function dataArrayDariResponse(responseData) {
  if (Array.isArray(responseData)) return responseData;

  const candidates = [
    responseData?.data,
    responseData?.result,
    responseData?.layanan,
    responseData?.services,
    responseData?.produk,
    responseData?.products,
    responseData?.list
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === 'object') {
      const nested = [
        candidate.data,
        candidate.result,
        candidate.layanan,
        candidate.services,
        candidate.produk,
        candidate.products,
        candidate.list
      ];

      for (const item of nested) {
        if (Array.isArray(item)) return item;
      }

      const values = Object.values(candidate);
      if (values.length && values.every((item) => item && typeof item === 'object')) {
        return values;
      }
    }
  }

  return [];
}

function pesanErrorProvider(responseData, fallback) {
  return (
    responseData?.message ||
    responseData?.pesan ||
    responseData?.error ||
    responseData?.data?.message ||
    responseData?.data?.pesan ||
    responseData?.data?.error ||
    fallback
  );
}

function mapStatusProdukNetflazz(statusProvider, item = {}) {
  if (statusProvider === true || item.status === true || item.active === true || item.aktif === true) {
    return 'aktif';
  }

  if (statusProvider === false || item.status === false || item.active === false || item.aktif === false) {
    return 'gangguan';
  }

  const status = normalisasi(statusProvider || item.status || item.status_produk || item.status_layanan);

  if (
    [
      'aktif',
      'available',
      'normal',
      'ready',
      'tersedia',
      'on',
      'online',
      '1',
      'true',
      'yes',
      'open'
    ].includes(status)
  ) {
    return 'aktif';
  }

  if (
    [
      'empty',
      'gangguan',
      'maintenance',
      'off',
      'offline',
      'nonaktif',
      'kosong',
      'habis',
      'closed',
      '0',
      'false',
      'no'
    ].includes(status)
  ) {
    return 'gangguan';
  }

  // Kalau Netflazz gak kirim status tapi harga dan kode ada, preview-in sebagai aktif dulu biar admin bisa review manual.
  return 'aktif';
}

function serverRequired(value) {
  const raw = normalisasi(value);
  return ['1', 'true', 'yes', 'ya', 'y', 'wajib', 'required', 'zone', 'server'].includes(raw);
}

function mapProdukNetflazz(item, index) {
  // NF22/Netflazz biasanya kirim kode layanan di field `serviceid`,
  // sedangkan field `layanan` berisi nama produk. Jangan pakai `layanan`
  // sebagai kode produk provider, nanti order malah nembak nama produk.
  const kodeProvider = bersihinText(
    ambilField(item, [
      'serviceid',
      'service_id',
      'serviceId',
      'serviceID',
      'id_layanan',
      'idlayanan',
      'id_produk',
      'idproduk',
      'product_id',
      'produk_id',
      'kode_layanan',
      'kodelayanan',
      'kode_produk',
      'kodeproduk',
      'kode',
      'code',
      'sku',
      'id'
    ])
  );

  const namaProvider = bersihinText(
    ambilField(item, [
      'layanan',
      'nama_layanan',
      'nama_produk',
      'produk',
      'product',
      'name',
      'service_name',
      'service',
      'paket',
      'nominal',
      'nama'
    ])
  );

  const gameProvider = bersihinText(
    ambilField(item, [
      'game',
      'games',
      'kategori',
      'category',
      'brand',
      'operator',
      'tipe',
      'jenis'
    ])
  );

  const statusProvider = ambilField(item, [
    'status',
    'status_layanan',
    'status_produk',
    'keterangan_status',
    'active',
    'aktif'
  ]);

  const hargaModal = angka(
    ambilField(item, [
      'harga',
      'price',
      'harga_modal',
      'modal',
      'cost',
      'basic',
      'harga_reseller'
    ])
  );

  const hargaJual = hitungHargaJual(hargaModal);
  const statusFinal = mapStatusProdukNetflazz(statusProvider, item);

  return {
    no: index + 1,
    provider: 'netflazz',
    kode_produk_provider: kodeProvider,
    game_provider: gameProvider,
    nama_produk_provider: namaProvider || kodeProvider,
    deskripsi_provider: bersihinText(ambilField(item, ['deskripsi', 'description', 'note', 'catatan', 'keterangan'])),
    harga_modal: hargaModal,
    harga_jual: hargaJual,
    server_required: serverRequired(ambilField(item, ['server', 'zone', 'zona', 'server_required', 'butuh_server'])),
    status_provider: bersihinText(statusProvider || statusFinal),
    status_final: statusFinal,
    raw: item
  };
}

function cocokFilterGame(item, filterGame) {
  const keyword = normalisasi(filterGame);
  if (!keyword) return true;

  return normalisasi(
    `${item.kode_produk_provider || ''} ${item.game_provider || ''} ${item.nama_produk_provider || ''} ${item.deskripsi_provider || ''}`
  ).includes(keyword);
}

function cocokFilterStatus(item, filterStatus) {
  const status = normalisasi(filterStatus);
  if (!status) return true;

  if (['available', 'aktif', 'normal', 'ready'].includes(status)) {
    return item.status_final === 'aktif';
  }

  if (['empty', 'gangguan', 'nonaktif', 'maintenance'].includes(status)) {
    return item.status_final !== 'aktif';
  }

  return normalisasi(`${item.status_provider || ''} ${item.status_final || ''}`).includes(status);
}

function ringkasanDariData(data) {
  return {
    total_produk: data.length,
    total_aktif: data.filter((item) => item.status_final === 'aktif').length,
    total_nonaktif: data.filter((item) => item.status_final !== 'aktif').length
  };
}

async function tarikProdukNetflazz({ filterGame, filterStatus }) {
  const hasilNetflazz = await ambilLayananNetflazz({
    filterGame,
    filterStatus
  });

  const dataNetflazz = hasilNetflazz?.data || {};

  if (!hasilNetflazz.ok || dataNetflazz?.result === false || dataNetflazz?.status === false) {
    return NextResponse.json(
      {
        sukses: false,
        provider: 'netflazz',
        pesan: pesanErrorProvider(dataNetflazz, 'Gagal mengambil layanan Netflazz.'),
        raw: dataNetflazz
      },
      { status: hasilNetflazz.status || 400 }
    );
  }

  const daftarLayanan = dataArrayDariResponse(dataNetflazz);
  const dataMentah = daftarLayanan.map((item, index) => mapProdukNetflazz(item, index));
  const data = dataMentah.filter((item) =>
    item.kode_produk_provider &&
    cocokFilterGame(item, filterGame) &&
    cocokFilterStatus(item, filterStatus)
  );

  return NextResponse.json({
    sukses: true,
    provider: 'netflazz',
    pesan: 'Produk Netflazz berhasil ditarik.',
    ringkasan: ringkasanDariData(data),
    data
  });
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
    const provider = normalisasi(body?.provider || 'netflazz');
    const filterGame = bersihinText(body?.filter_game);
    const filterStatus = bersihinText(body?.filter_status);

    if (provider === 'vipreseller') {
      return NextResponse.json(
        {
          sukses: false,
          provider: 'vipreseller',
          pesan: 'VIPReseller pakai endpoint /api/admin/sync-vipreseller/services, bukan /api/admin/sync-provider/services.'
        },
        { status: 400 }
      );
    }

    if (provider !== 'netflazz') {
      return NextResponse.json(
        {
          sukses: false,
          pesan: 'Provider sync belum didukung bre.'
        },
        { status: 400 }
      );
    }

    return tarikProdukNetflazz({ filterGame, filterStatus });
  } catch (error) {
    console.error('ERROR SYNC SERVICES NETFLAZZ:', error);

    return NextResponse.json(
      {
        sukses: false,
        pesan: error?.message || 'Server gagal tarik produk Netflazz.'
      },
      { status: 500 }
    );
  }
}
