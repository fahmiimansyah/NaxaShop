export function normalizeKodeVoucher(value = '') {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function angkaVoucher(value, fallback = 0) {
  const angka = Number(value);
  return Number.isFinite(angka) ? angka : fallback;
}

export async function ensureVoucherSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS promo_voucher (
    id INT NOT NULL AUTO_INCREMENT,
    kode VARCHAR(40) NOT NULL,
    nama VARCHAR(120) NOT NULL,
    tipe_diskon VARCHAR(20) NOT NULL DEFAULT 'nominal',
    nilai_diskon INT NOT NULL DEFAULT 0,
    minimal_transaksi INT NOT NULL DEFAULT 0,
    maksimal_diskon INT NOT NULL DEFAULT 0,
    kuota_total INT NOT NULL DEFAULT 0,
    kuota_terpakai INT NOT NULL DEFAULT 0,
    mulai_pada DATETIME NULL,
    berakhir_pada DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aktif',
    catatan TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_kode_voucher (kode),
    KEY idx_status_voucher (status),
    KEY idx_berakhir_pada (berakhir_pada)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await safeAddColumn(db, 'transaksi', 'voucher_id', 'INT NULL');
  await safeAddColumn(db, 'transaksi', 'kode_voucher', 'VARCHAR(40) NULL');
  await safeAddColumn(db, 'transaksi', 'diskon_voucher', 'INT NOT NULL DEFAULT 0');
}

async function safeAddColumn(db, tableName, columnName, definition) {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );

    if (Number(rows?.[0]?.total || 0) > 0) return;

    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  } catch (error) {
    const pesan = String(error?.message || '');

    if (
      error?.code === 'ER_DUP_FIELDNAME' ||
      pesan.toLowerCase().includes('duplicate column') ||
      pesan.toLowerCase().includes('duplicate')
    ) {
      return;
    }

    console.error(`Gagal memastikan kolom ${tableName}.${columnName}:`, error);
    throw error;
  }
}

export function hitungDiskonVoucher(voucher, hargaProduk, biayaAdmin = 0) {
  const harga = Math.max(0, angkaVoucher(hargaProduk));
  const admin = Math.max(0, angkaVoucher(biayaAdmin));
  const tipe = String(voucher?.tipe_diskon || 'nominal').toLowerCase();
  const nilai = Math.max(0, angkaVoucher(voucher?.nilai_diskon));
  const maksimalDiskonVoucher = Math.max(0, angkaVoucher(voucher?.maksimal_diskon));

  if (!harga || !nilai) return 0;

  let diskon = 0;

  if (tipe === 'persen') {
    diskon = Math.floor((harga * nilai) / 100);

    if (maksimalDiskonVoucher > 0) {
      diskon = Math.min(diskon, maksimalDiskonVoucher);
    }
  } else {
    diskon = nilai;
  }

  // Midtrans tidak suka gross_amount 0. Kita jaga produk minimal sisa Rp1.000.
  const maksimalAman = Math.max(0, harga - 1000);

  return Math.max(0, Math.min(diskon, maksimalAman, harga + admin - 1000));
}

export async function validateVoucherForCheckout(db, { kodeVoucher, hargaProduk, biayaAdmin = 0 }) {
  const kode = normalizeKodeVoucher(kodeVoucher);

  if (!kode) {
    return {
      sukses: true,
      voucher: null,
      kode_voucher: '',
      diskon: 0,
      pesan: ''
    };
  }

  await ensureVoucherSchema(db);

  const [rows] = await db.query(
    `SELECT *
     FROM promo_voucher
     WHERE kode = ?
     LIMIT 1`,
    [kode]
  );

  if (rows.length === 0) {
    return {
      sukses: false,
      voucher: null,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Kode voucher gak ditemukan bre!'
    };
  }

  const voucher = rows[0];
  const status = String(voucher.status || '').toLowerCase();
  const now = new Date();

  if (status !== 'aktif') {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Voucher ini lagi nonaktif bre.'
    };
  }

  if (voucher.mulai_pada && new Date(voucher.mulai_pada) > now) {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Voucher ini belum mulai dipakai bre.'
    };
  }

  if (voucher.berakhir_pada && new Date(voucher.berakhir_pada) < now) {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Voucher ini sudah expired bre.'
    };
  }

  const kuotaTotal = angkaVoucher(voucher.kuota_total);
  const kuotaTerpakai = angkaVoucher(voucher.kuota_terpakai);

  if (kuotaTotal > 0 && kuotaTerpakai >= kuotaTotal) {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Kuota voucher ini sudah habis bre.'
    };
  }

  const minimalTransaksi = angkaVoucher(voucher.minimal_transaksi);
  const harga = angkaVoucher(hargaProduk);

  if (minimalTransaksi > 0 && harga < minimalTransaksi) {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: `Minimal transaksi voucher ini Rp ${minimalTransaksi.toLocaleString('id-ID')} bre.`
    };
  }

  const diskon = hitungDiskonVoucher(voucher, hargaProduk, biayaAdmin);

  if (diskon <= 0) {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Voucher valid, tapi diskonnya tidak bisa diterapkan ke produk ini bre.'
    };
  }

  return {
    sukses: true,
    voucher,
    kode_voucher: kode,
    diskon,
    pesan: `Voucher ${kode} berhasil dipakai.`
  };
}

export async function tambahPemakaianVoucher(db, voucherId) {
  if (!voucherId) return;

  await db.query(
    `UPDATE promo_voucher
     SET kuota_terpakai = kuota_terpakai + 1,
         updated_at = NOW()
     WHERE id = ?`,
    [voucherId]
  );
}
