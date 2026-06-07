export const DEFAULT_METODE_BAYAR = [
  {
    value: 'qris',
    label: 'QRIS',
    grup: 'QR & E-Wallet',
    desc: 'GoPay, OVO, DANA lewat scan QR',
    logo: '/payment/qris.png',
    fallback: 'QR',
    biaya: 0,
    minimal: 0,
    status_metode: 'aktif',
    rekomendasi: true,
    sort_order: 10
  },
  {
    value: 'gopay',
    label: 'GoPay',
    grup: 'QR & E-Wallet',
    desc: 'QR / deeplink GoPay',
    logo: '/payment/gopay.png',
    fallback: 'GP',
    biaya: 0,
    minimal: 0,
    status_metode: 'aktif',
    rekomendasi: false,
    sort_order: 20
  },
  {
    value: 'shopeepay',
    label: 'ShopeePay',
    grup: 'QR & E-Wallet',
    desc: 'Lagi aktivasi, segera hadir',
    logo: '/payment/shopeepay.png',
    fallback: 'SP',
    biaya: 0,
    minimal: 0,
    status_metode: 'coming_soon',
    rekomendasi: false,
    sort_order: 30
  },
  {
    value: 'dana',
    label: 'DANA',
    grup: 'QR & E-Wallet',
    desc: 'Lagi disiapkan buat launch berikutnya',
    logo: '/payment/dana.png',
    fallback: 'DNA',
    biaya: 0,
    minimal: 0,
    status_metode: 'coming_soon',
    rekomendasi: false,
    sort_order: 40
  },
  {
    value: 'bca_va',
    label: 'BCA VA',
    grup: 'Virtual Account',
    desc: 'Virtual Account BCA',
    logo: '/payment/bca.svg',
    fallback: 'BCA',
    biaya: 4000,
    minimal: 20000,
    status_metode: 'coming_soon',
    rekomendasi: false,
    sort_order: 50
  },
  {
    value: 'bni_va',
    label: 'BNI VA',
    grup: 'Virtual Account',
    desc: 'Virtual Account BNI',
    logo: '/payment/bni.png',
    fallback: 'BNI',
    biaya: 4000,
    minimal: 20000,
    status_metode: 'aktif',
    rekomendasi: false,
    sort_order: 60
  },
  {
    value: 'bri_va',
    label: 'BRI VA',
    grup: 'Virtual Account',
    desc: 'Virtual Account BRI',
    logo: '/payment/bri.png',
    fallback: 'BRI',
    biaya: 4000,
    minimal: 20000,
    status_metode: 'aktif',
    rekomendasi: false,
    sort_order: 70
  },
  {
    value: 'cimb_va',
    label: 'CIMB VA',
    grup: 'Virtual Account',
    desc: 'Virtual Account CIMB',
    logo: '/payment/cimb.png',
    fallback: 'CIMB',
    biaya: 4000,
    minimal: 20000,
    status_metode: 'aktif',
    rekomendasi: false,
    sort_order: 80
  },
  {
    value: 'permata_va',
    label: 'Permata VA',
    grup: 'Virtual Account',
    desc: 'Virtual Account Permata',
    logo: '/payment/permata.png',
    fallback: 'PRMT',
    biaya: 4000,
    minimal: 20000,
    status_metode: 'aktif',
    rekomendasi: false,
    sort_order: 90
  },
  {
    value: 'mandiri_bill',
    label: 'Mandiri Bill',
    grup: 'Virtual Account',
    desc: 'Mandiri Bill Payment',
    logo: '/payment/mandiri.png',
    fallback: 'MDR',
    biaya: 4000,
    minimal: 20000,
    status_metode: 'aktif',
    rekomendasi: false,
    sort_order: 100
  },
  {
    value: 'seabank',
    label: 'SeaBank',
    grup: 'Virtual Account',
    desc: 'Lagi aktivasi, segera hadir',
    logo: '/payment/seabank.png',
    fallback: 'SEA',
    biaya: 0,
    minimal: 0,
    status_metode: 'coming_soon',
    rekomendasi: false,
    sort_order: 110
  },
  {
    value: 'alfamart',
    label: 'Alfamart',
    grup: 'Minimarket',
    desc: 'Bayar di kasir Alfamart',
    logo: '/payment/alfa.png',
    fallback: 'ALFA',
    biaya: 5000,
    minimal: 50000,
    status_metode: 'coming_soon',
    rekomendasi: false,
    sort_order: 120
  },
  {
    value: 'indomaret',
    label: 'Indomaret',
    grup: 'Minimarket',
    desc: 'Bayar di kasir Indomaret',
    logo: '/payment/indomaret.png',
    fallback: 'INDO',
    biaya: 5000,
    minimal: 50000,
    status_metode: 'coming_soon',
    rekomendasi: false,
    sort_order: 130
  }
];

export const STATUS_METODE_BAYAR_VALID = ['aktif', 'maintenance', 'coming_soon', 'nonaktif'];
export const METODE_BAYAR_VALID = DEFAULT_METODE_BAYAR.map((item) => item.value);

export const BANK_TRANSFER_MAP = {
  bca_va: 'bca',
  bni_va: 'bni',
  bri_va: 'bri',
  cimb_va: 'cimb'
};

export const LABEL_METODE_BAYAR = DEFAULT_METODE_BAYAR.reduce((hasil, item) => {
  hasil[item.value] = item.label;
  return hasil;
}, {});

export const DEFAULT_METODE_MAP = DEFAULT_METODE_BAYAR.reduce((hasil, item) => {
  hasil[item.value] = item;
  return hasil;
}, {});

export function normalisasiStatusMetode(value) {
  const status = String(value || '').trim().toLowerCase();
  return STATUS_METODE_BAYAR_VALID.includes(status) ? status : 'aktif';
}

export function labelStatusMetode(value) {
  const status = normalisasiStatusMetode(value);

  if (status === 'aktif') return 'Aktif';
  if (status === 'maintenance') return 'Maintenance';
  if (status === 'coming_soon') return 'Coming Soon';
  if (status === 'nonaktif') return 'Nonaktif';

  return 'Aktif';
}

export function normalisasiMetodeBayar(item = {}) {
  const value = String(item.value || item.kode || '').trim();
  const fallback = DEFAULT_METODE_MAP[value] || {};
  const statusMetode = normalisasiStatusMetode(
    item.status_metode || item.status || fallback.status_metode || 'aktif'
  );

  return {
    value,
    label: item.label || fallback.label || value,
    grup: item.grup || fallback.grup || 'Lainnya',
    desc: item.desc || item.deskripsi || fallback.desc || '',
    logo: item.logo || fallback.logo || '',
    fallback: item.fallback || fallback.fallback || value.slice(0, 4).toUpperCase(),
    biaya: Number(item.biaya ?? item.biaya_admin ?? fallback.biaya ?? 0),
    minimal: Number(item.minimal ?? item.minimal_transaksi ?? fallback.minimal ?? 0),
    status_metode: statusMetode,
    status_label: labelStatusMetode(statusMetode),
    comingSoon: statusMetode !== 'aktif',
    disabled: statusMetode !== 'aktif',
    rekomendasi: Boolean(Number(item.rekomendasi ?? fallback.rekomendasi ?? 0)),
    sort_order: Number(item.sort_order ?? item.urutan ?? fallback.sort_order ?? 0)
  };
}

export function gabungMetodeDenganDefault(rows = []) {
  const dbMap = rows.reduce((hasil, row) => {
    const kode = String(row.kode || row.value || '').trim();
    if (kode) hasil[kode] = row;
    return hasil;
  }, {});

  return DEFAULT_METODE_BAYAR.map((item) => {
    const dbItem = dbMap[item.value];

    if (!dbItem) return normalisasiMetodeBayar(item);

    return normalisasiMetodeBayar({
      ...item,
      ...dbItem,
      value: item.value,
      label: dbItem.label || item.label,
      grup: dbItem.grup || item.grup,
      desc: dbItem.deskripsi || dbItem.desc || item.desc,
      biaya: dbItem.biaya_admin ?? dbItem.biaya ?? item.biaya,
      minimal: dbItem.minimal_transaksi ?? dbItem.minimal ?? item.minimal,
      sort_order: dbItem.urutan ?? dbItem.sort_order ?? item.sort_order
    });
  }).sort((a, b) => a.sort_order - b.sort_order);
}

export function groupMetodeBayar(items = DEFAULT_METODE_BAYAR) {
  const grupMap = new Map();

  items.map(normalisasiMetodeBayar).forEach((item) => {
    if (!grupMap.has(item.grup)) {
      grupMap.set(item.grup, []);
    }

    grupMap.get(item.grup).push(item);
  });

  return Array.from(grupMap.entries()).map(([grup, grupItems]) => ({
    grup,
    items: grupItems.sort((a, b) => a.sort_order - b.sort_order)
  }));
}

export const DEFAULT_DAFTAR_METODE_BAYAR = groupMetodeBayar(DEFAULT_METODE_BAYAR);
