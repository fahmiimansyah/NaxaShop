import db from './db';

const SETTING_KEY = 'global_maintenance';

export const MAINTENANCE_MODES = ['off', 'banner', 'checkout', 'full'];

export const DEFAULT_MAINTENANCE_SETTING = {
  enabled: false,
  mode: 'off',
  title: 'NaXaShop sedang maintenance',
  message:
    'Beberapa layanan sedang dirapikan. Kamu masih bisa cek pesanan, tapi checkout mungkin sementara ditutup.',
  badge: 'Maintenance',
  estimated_until: '',
  updated_by: '',
  updated_at: null,
};

function boolValue(value) {
  if (value === true || value === 1 || value === '1') return true;
  if (String(value).toLowerCase() === 'true') return true;
  if (String(value).toLowerCase() === 'on') return true;
  return false;
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function safeJsonParse(value) {
  try {
    if (!value) return null;
    if (typeof value === 'object') return value;
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function normalizeMaintenanceSetting(input = {}) {
  const payload = input && typeof input === 'object' ? input : {};
  const modeRaw = cleanText(payload.mode, 'off').toLowerCase();
  const mode = MAINTENANCE_MODES.includes(modeRaw) ? modeRaw : 'off';
  const enabled = mode === 'off' ? false : boolValue(payload.enabled ?? true);

  return {
    ...DEFAULT_MAINTENANCE_SETTING,
    enabled,
    mode: enabled ? mode : 'off',
    title: cleanText(payload.title, DEFAULT_MAINTENANCE_SETTING.title).slice(0, 120),
    message: cleanText(payload.message, DEFAULT_MAINTENANCE_SETTING.message).slice(0, 500),
    badge: cleanText(payload.badge, DEFAULT_MAINTENANCE_SETTING.badge).slice(0, 40),
    estimated_until: cleanText(payload.estimated_until, '').slice(0, 80),
    updated_by: cleanText(payload.updated_by, '').slice(0, 120),
    updated_at: payload.updated_at || null,
  };
}

export function publicMaintenancePayload(setting = DEFAULT_MAINTENANCE_SETTING) {
  const normalized = normalizeMaintenanceSetting(setting);
  const blockCheckout =
    normalized.enabled && ['checkout', 'full'].includes(normalized.mode);
  const fullMaintenance = normalized.enabled && normalized.mode === 'full';

  return {
    enabled: normalized.enabled,
    mode: normalized.mode,
    title: normalized.title,
    message: normalized.message,
    badge: normalized.badge,
    estimated_until: normalized.estimated_until,
    block_checkout: blockCheckout,
    full_maintenance: fullMaintenance,
    updated_at: normalized.updated_at,
  };
}

export async function ensureMaintenanceSchema(dbClient = db) {
  await dbClient.query(
    `CREATE TABLE IF NOT EXISTS site_settings (
       setting_key VARCHAR(100) NOT NULL,
       setting_value TEXT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       PRIMARY KEY (setting_key)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

export async function getMaintenanceSetting(dbClient = db) {
  try {
    await ensureMaintenanceSchema(dbClient);

    const [rows] = await dbClient.query(
      `SELECT setting_value, updated_at
       FROM site_settings
       WHERE setting_key = ?
       LIMIT 1`,
      [SETTING_KEY]
    );

    if (rows.length === 0) return DEFAULT_MAINTENANCE_SETTING;

    const parsed = safeJsonParse(rows[0].setting_value) || {};

    return normalizeMaintenanceSetting({
      ...parsed,
      updated_at: rows[0].updated_at || parsed.updated_at || null,
    });
  } catch (error) {
    // Kalau tabel belum ada / DB lagi gangguan, jangan matiin toko karena gagal baca setting.
    console.warn('Maintenance setting fallback default:', error?.message || error);
    return DEFAULT_MAINTENANCE_SETTING;
  }
}

export async function saveMaintenanceSetting(payload = {}, dbClient = db) {
  await ensureMaintenanceSchema(dbClient);

  const normalized = normalizeMaintenanceSetting({
    ...payload,
    updated_at: new Date().toISOString(),
  });

  await dbClient.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_at = CURRENT_TIMESTAMP`,
    [SETTING_KEY, JSON.stringify(normalized)]
  );

  return normalized;
}

export async function checkCheckoutMaintenance(dbClient = db) {
  const setting = await getMaintenanceSetting(dbClient);
  const data = publicMaintenancePayload(setting);

  if (!data.block_checkout) {
    return {
      blocked: false,
      data,
      pesan: '',
    };
  }

  const pesanTambahan = data.estimated_until
    ? ` Estimasi normal: ${data.estimated_until}.`
    : '';

  return {
    blocked: true,
    data,
    pesan: `${data.title}. ${data.message}${pesanTambahan}`,
  };
}
