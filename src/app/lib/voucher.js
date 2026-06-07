import crypto from 'crypto';
import { kirimEmailVoucherOrderPertama } from './mailer';

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

  // Kolom tambahan buat voucher personal / reward member.
  // Aman buat voucher public lama karena default-nya tetap public dan owner null.
  await safeAddColumn(db, 'promo_voucher', 'jenis', "VARCHAR(40) NOT NULL DEFAULT 'public'");
  await safeAddColumn(db, 'promo_voucher', 'owner_email', 'VARCHAR(190) NULL');
  await safeAddColumn(db, 'promo_voucher', 'sumber_order_id', 'VARCHAR(80) NULL');

  await safeAddIndex(db, 'promo_voucher', 'idx_voucher_owner_email', 'KEY idx_voucher_owner_email (owner_email)');
  await safeAddIndex(db, 'promo_voucher', 'idx_voucher_jenis', 'KEY idx_voucher_jenis (jenis)');
  await safeAddIndex(db, 'promo_voucher', 'idx_voucher_sumber_order', 'KEY idx_voucher_sumber_order (sumber_order_id)');
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


async function safeAddIndex(db, tableName, indexName, definition) {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND INDEX_NAME = ?`,
      [tableName, indexName]
    );

    if (Number(rows?.[0]?.total || 0) > 0) return;

    await db.query(`ALTER TABLE ${tableName} ADD ${definition}`);
  } catch (error) {
    const pesan = String(error?.message || '').toLowerCase();

    if (
      error?.code === 'ER_DUP_KEYNAME' ||
      pesan.includes('duplicate key name') ||
      pesan.includes('duplicate')
    ) {
      return;
    }

    console.error(`Gagal memastikan index ${tableName}.${indexName}:`, error);
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

export async function validateVoucherForCheckout(db, { kodeVoucher, hargaProduk, biayaAdmin = 0, userEmail = '' }) {
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
  const ownerEmail = normalizeEmail(voucher.owner_email);
  const emailLogin = normalizeEmail(userEmail);

  if (ownerEmail && !emailLogin) {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Voucher ini khusus member. Login dulu buat pakai voucher ini bre.'
    };
  }

  if (ownerEmail && ownerEmail !== emailLogin) {
    return {
      sukses: false,
      voucher,
      kode_voucher: kode,
      diskon: 0,
      pesan: 'Voucher ini khusus akun tertentu bre.'
    };
  }

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


function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function getFirstOrderVoucherConfig() {
  return {
    enabled: process.env.FIRST_ORDER_VOUCHER_ENABLED !== 'false',
    minOrder: Math.max(0, angkaVoucher(process.env.FIRST_ORDER_VOUCHER_MIN_ORDER || 50000)),
    type: String(process.env.FIRST_ORDER_VOUCHER_TYPE || 'nominal').toLowerCase() === 'persen'
      ? 'persen'
      : 'nominal',
    value: Math.max(0, angkaVoucher(process.env.FIRST_ORDER_VOUCHER_VALUE || 3000)),
    minTransaction: Math.max(0, angkaVoucher(process.env.FIRST_ORDER_VOUCHER_MIN_TRANSACTION || 15000)),
    maxDiscount: Math.max(0, angkaVoucher(process.env.FIRST_ORDER_VOUCHER_MAX_DISCOUNT || 0)),
    expiredDays: Math.max(1, angkaVoucher(process.env.FIRST_ORDER_VOUCHER_EXPIRED_DAYS || 7)),
  };
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}

function toMysqlDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function bikinKodeVoucherMakasih() {
  return `THANKS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function ambilTransaksiLengkap(db, trxOrOrderId) {
  const orderId = typeof trxOrOrderId === 'string'
    ? trxOrOrderId
    : String(trxOrOrderId?.order_id || '').trim();

  if (!orderId) return null;

  const [rows] = await db.query(
    `SELECT
       t.*,
       p.nama_produk,
       g.nama AS nama_game
     FROM transaksi t
     LEFT JOIN produk p ON t.produk_id = p.id
     LEFT JOIN games g ON t.game_id = g.id
     WHERE t.order_id = ?
     LIMIT 1`,
    [orderId]
  );

  return rows?.[0] || null;
}

async function generateKodeVoucherUnik(db) {
  for (let i = 0; i < 8; i += 1) {
    const kode = bikinKodeVoucherMakasih();
    const [rows] = await db.query(
      `SELECT id FROM promo_voucher WHERE kode = ? LIMIT 1`,
      [kode]
    );

    if (rows.length === 0) return kode;
  }

  return `THANKS-${Date.now().toString(36).toUpperCase()}`;
}

export async function prosesVoucherMakasihOrderPertama(db, trxOrOrderId) {
  try {
    const config = getFirstOrderVoucherConfig();

    if (!config.enabled) {
      return { sukses: true, dibuat: false, alasan: 'FIRST_ORDER_VOUCHER_DISABLED' };
    }

    if (config.value <= 0) {
      return { sukses: true, dibuat: false, alasan: 'FIRST_ORDER_VOUCHER_VALUE_EMPTY' };
    }

    await ensureVoucherSchema(db);

    const trx = await ambilTransaksiLengkap(db, trxOrOrderId);

    if (!trx?.order_id) {
      return { sukses: true, dibuat: false, alasan: 'TRANSAKSI_TIDAK_DITEMUKAN' };
    }

    const statusBayar = String(trx.status_bayar || '').toLowerCase();
    const statusTopup = String(trx.status_topup || '').toLowerCase();

    if (statusBayar !== 'sukses' || statusTopup !== 'sukses') {
      return { sukses: true, dibuat: false, alasan: 'TRANSAKSI_BELUM_SUKSES' };
    }

    const ownerEmail = normalizeEmail(trx.user_email);

    // Reward ini khusus member login. Kalau checkout tanpa login, tidak dapat voucher.
    if (!ownerEmail) {
      return { sukses: true, dibuat: false, alasan: 'USER_TIDAK_LOGIN' };
    }

    const hargaProduk = angkaVoucher(trx.harga_produk || trx.harga);

    if (hargaProduk < config.minOrder) {
      return { sukses: true, dibuat: false, alasan: 'ORDER_DI_BAWAH_MINIMAL' };
    }

    const [voucherSudahAda] = await db.query(
      `SELECT *
       FROM promo_voucher
       WHERE jenis = 'first_order_reward'
         AND LOWER(TRIM(owner_email)) = ?
       ORDER BY id ASC
       LIMIT 1`,
      [ownerEmail]
    );

    if (voucherSudahAda.length > 0) {
      return {
        sukses: true,
        dibuat: false,
        alasan: 'USER_SUDAH_PUNYA_REWARD',
        voucher: voucherSudahAda[0]
      };
    }

    const [jumlahOrderSuksesLain] = await db.query(
      `SELECT COUNT(*) AS total
       FROM transaksi
       WHERE LOWER(TRIM(COALESCE(user_email, ''))) = ?
         AND status_bayar = 'sukses'
         AND status_topup = 'sukses'
         AND order_id <> ?`,
      [ownerEmail, trx.order_id]
    );

    if (Number(jumlahOrderSuksesLain?.[0]?.total || 0) > 0) {
      return { sukses: true, dibuat: false, alasan: 'BUKAN_ORDER_SUKSES_PERTAMA' };
    }

    const kode = await generateKodeVoucherUnik(db);
    const now = new Date();
    const expiredAt = addDays(now, config.expiredDays);
    const namaVoucher = 'Voucher Makasih Order Pertama';

    const [hasilInsert] = await db.query(
      `INSERT INTO promo_voucher
       (
         kode,
         nama,
         tipe_diskon,
         nilai_diskon,
         minimal_transaksi,
         maksimal_diskon,
         kuota_total,
         kuota_terpakai,
         mulai_pada,
         berakhir_pada,
         status,
         catatan,
         jenis,
         owner_email,
         sumber_order_id
       )
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, NOW(), ?, 'aktif', ?, 'first_order_reward', ?, ?)`,
      [
        kode,
        namaVoucher,
        config.type,
        config.value,
        config.minTransaction,
        config.maxDiscount,
        toMysqlDateTime(expiredAt),
        `Otomatis dari order pertama minimal Rp ${config.minOrder.toLocaleString('id-ID')} (${trx.order_id}).`,
        ownerEmail,
        trx.order_id
      ]
    );

    const voucher = {
      id: hasilInsert.insertId,
      kode,
      nama: namaVoucher,
      tipe_diskon: config.type,
      nilai_diskon: config.value,
      minimal_transaksi: config.minTransaction,
      maksimal_diskon: config.maxDiscount,
      berakhir_pada: expiredAt,
      owner_email: ownerEmail,
      sumber_order_id: trx.order_id,
    };

    try {
      await kirimEmailVoucherOrderPertama({
        to: ownerEmail,
        orderId: trx.order_id,
        kodeVoucher: kode,
        tipeDiskon: config.type,
        nilaiDiskon: config.value,
        minimalTransaksi: config.minTransaction,
        maksimalDiskon: config.maxDiscount,
        expiredAt,
        namaProduk: trx.nama_produk || trx.kode_produk,
      });
    } catch (emailError) {
      console.error('Voucher makasih order pertama berhasil dibuat, tapi email gagal:', emailError);
    }

    return {
      sukses: true,
      dibuat: true,
      voucher
    };
  } catch (error) {
    console.error('Gagal proses voucher makasih order pertama:', error);

    // Jangan bikin webhook / callback gagal cuma karena bonus voucher error.
    return {
      sukses: false,
      dibuat: false,
      alasan: 'ERROR',
      error: error?.message || String(error)
    };
  }
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
