import crypto from 'crypto';

const VIPRESELLER_BASE_URL =
  process.env.VIPRESELLER_BASE_URL ||
  'https://vip-reseller.co.id/api/game-feature';

const VIP_PROXY_URL = process.env.VIP_PROXY_URL || '';
const VIP_PROXY_SECRET = process.env.VIP_PROXY_SECRET || '';

function ambilEnvVipReseller() {
  const apiId =
    process.env.VIPRESELLER_API_ID ||
    process.env.VIPAYMENT_API_ID;

  const apiKey =
    process.env.VIPRESELLER_API_KEY ||
    process.env.VIPAYMENT_API_KEY;

  if (!apiId || !apiKey) {
    throw new Error('Konfigurasi VIPReseller belum lengkap');
  }

  return { apiId, apiKey };
}

function bikinSignVipReseller(apiId, apiKey) {
  return crypto
    .createHash('md5')
    .update(`${apiId}${apiKey}`)
    .digest('hex');
}

function pakaiProxyVipReseller() {
  return Boolean(VIP_PROXY_URL && VIP_PROXY_SECRET);
}

function rapihinProxyUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

async function fetchVipResellerLangsung(payload, timeoutMs = 15000) {
  const { apiId, apiKey } = ambilEnvVipReseller();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const body = new URLSearchParams({
    key: apiKey,
    sign: bikinSignVipReseller(apiId, apiKey),
    ...payload
  });

  try {
    const response = await fetch(VIPRESELLER_BASE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body,
      signal: controller.signal,
      cache: 'no-store'
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw_response: raw };
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchVipResellerViaProxy(payload, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = rapihinProxyUrl(VIP_PROXY_URL);

    const response = await fetch(`${baseUrl}/vipreseller/api/game-feature`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-proxy-secret': VIP_PROXY_SECRET
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store'
    });

    const raw = await response.text();

    let hasilProxy;
    try {
      hasilProxy = JSON.parse(raw);
    } catch {
      hasilProxy = { raw_response: raw };
    }

    return {
      ok: response.ok && hasilProxy?.sukses !== false,
      status: response.status,
      data: hasilProxy?.data || hasilProxy
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchVipReseller(payload, timeoutMs = 15000) {
  if (pakaiProxyVipReseller()) {
    return fetchVipResellerViaProxy(payload, timeoutMs);
  }

  return fetchVipResellerLangsung(payload, timeoutMs);
}

export function ambilVipResellerTrxIdDariResponse(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return ambilVipResellerTrxIdDariResponse(JSON.parse(value));
    } catch {
      return null;
    }
  }

  if (Array.isArray(value?.data)) {
    return (
      value.data[0]?.trxid ||
      value.data[0]?.trx_id ||
      value.data[0]?.id ||
      null
    );
  }

  return (
    value?.data?.trxid ||
    value?.data?.trx_id ||
    value?.data?.id ||
    value?.trxid ||
    value?.trx_id ||
    value?.id ||
    null
  );
}

export async function orderVipReseller({
  kodeProduk,
  idPlayer,
  zonePlayer = '',
  additionalData = ''
}) {
  if (!kodeProduk || !idPlayer) {
    return {
      ok: false,
      status: 400,
      data: {
        result: false,
        message: 'Data order top-up belum lengkap.'
      }
    };
  }

  const payload = {
    type: 'order',
    service: String(kodeProduk).trim(),
    data_no: String(idPlayer).trim()
  };

  if (zonePlayer) {
    payload.data_zone = String(zonePlayer).trim();
  }

  if (additionalData) {
    payload.post_additional_data = String(additionalData).trim();
  }

  return fetchVipReseller(payload);
}

export async function cekStatusVipReseller({ trxid, limit = 1 } = {}) {
  const payload = {
    type: 'status'
  };

  if (trxid) {
    payload.trxid = String(trxid).trim();
  } else {
    payload.limit = String(limit || 1);
  }

  return fetchVipReseller(payload);
}

export async function cekNicknameVipReseller({
  kodeGame,
  target,
  additionalTarget = ''
}) {
  if (!kodeGame || !target) {
    return {
      ok: false,
      status: 400,
      data: {
        result: false,
        message: 'Data cek username belum lengkap.'
      }
    };
  }

  const payload = {
    type: 'get-nickname',
    code: String(kodeGame).trim(),
    target: String(target).trim()
  };

  if (additionalTarget) {
    payload.additional_target = String(additionalTarget).trim();
  }

  return fetchVipReseller(payload);
}