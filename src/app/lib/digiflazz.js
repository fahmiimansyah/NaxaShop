import crypto from 'crypto';

function getConfig() {
  const username = process.env.DIGIFLAZZ_USERNAME;
  const mode = process.env.DIGIFLAZZ_MODE || 'development';

  const apiKey =
    mode === 'production'
      ? process.env.DIGIFLAZZ_PROD_KEY
      : process.env.DIGIFLAZZ_DEV_KEY;

  if (!username || !apiKey) {
    throw new Error('DIGIFLAZZ_USERNAME / DIGIFLAZZ API KEY belum lengkap');
  }

  return {
    username,
    apiKey,
    mode
  };
}

function bikinSign({ username, apiKey, refId }) {
  return crypto
    .createHash('md5')
    .update(username + apiKey + refId)
    .digest('hex');
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

export function ambilStatusDigiflazz(response) {
  return response?.data?.status || response?.status || '';
}

export function digiflazzSukses(response) {
  const status = normalisasiStatus(ambilStatusDigiflazz(response));
  return status === 'sukses' || status === 'success';
}

export function digiflazzGagal(response) {
  const status = normalisasiStatus(ambilStatusDigiflazz(response));
  return status === 'gagal' || status === 'failed' || status === 'fail';
}

export function digiflazzPending(response) {
  const status = normalisasiStatus(ambilStatusDigiflazz(response));
  return status === 'pending' || status === 'proses' || status === 'processing';
}

export async function transaksiDigiflazz({
  refId,
  buyerSkuCode,
  customerNo,
  testing
}) {
  const { username, apiKey, mode } = getConfig();

  if (!refId || !buyerSkuCode || !customerNo) {
    throw new Error('refId, buyerSkuCode, dan customerNo wajib diisi');
  }

  const sign = bikinSign({
    username,
    apiKey,
    refId
  });

  const body = {
    username,
    buyer_sku_code: buyerSkuCode,
    customer_no: customerNo,
    ref_id: refId,
    sign
  };

  // Mode development Digiflazz
  if (testing ?? mode !== 'production') {
    body.testing = true;
  }

  const response = await fetch('https://api.digiflazz.com/v1/transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    cache: 'no-store'
  });

  const raw = await response.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    data = {
      raw_response: raw
    };
  }

  return {
    ok: response.ok,
    data,
    status: ambilStatusDigiflazz(data),
    sukses: digiflazzSukses(data),
    gagal: digiflazzGagal(data),
    pending: digiflazzPending(data)
  };
}