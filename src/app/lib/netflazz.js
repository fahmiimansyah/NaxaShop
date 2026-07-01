function bersihinText(value) {
  return String(value || '').trim();
}

function fieldDariEnv(envName, fallback = '') {
  const raw = bersihinText(process.env[envName]);
  const lowered = raw.toLowerCase();

  // Pakai nilai ini kalau field tertentu memang tidak boleh dikirim ke provider.
  if (['-', 'none', 'null', 'false', '0', 'off'].includes(lowered)) {
    return '';
  }

  return raw || fallback;
}

function getConfig() {
  const baseUrl = bersihinText(process.env.NETFLAZZ_BASE_URL);
  const apiKey = bersihinText(process.env.NETFLAZZ_API_KEY);
  const pin = bersihinText(process.env.NETFLAZZ_PIN);

  if (!baseUrl || !apiKey) {
    throw new Error('NETFLAZZ_BASE_URL / NETFLAZZ_API_KEY belum lengkap');
  }

  // Default di bawah ini sudah ngikut format NF22/Netflazz dari dokumentasi:
  // api_key, pin, action=pemesanan, layanan, target.
  const refField = fieldDariEnv('NETFLAZZ_REF_FIELD', '');

  return {
    baseUrl,
    apiKey,
    pin,
    apiKeyField: fieldDariEnv('NETFLAZZ_API_KEY_FIELD', 'api_key'),
    pinField: fieldDariEnv('NETFLAZZ_PIN_FIELD', 'pin'),
    actionField: fieldDariEnv('NETFLAZZ_ACTION_FIELD', 'action'),
    orderAction: bersihinText(process.env.NETFLAZZ_ORDER_ACTION) || 'pemesanan',
    statusAction: bersihinText(process.env.NETFLAZZ_STATUS_ACTION) || 'status',
    servicesAction: bersihinText(process.env.NETFLAZZ_SERVICES_ACTION) || 'layanan',
    serviceField: fieldDariEnv('NETFLAZZ_SERVICE_FIELD', 'layanan'),
    targetField: fieldDariEnv('NETFLAZZ_TARGET_FIELD', 'target'),
    zoneField: fieldDariEnv('NETFLAZZ_ZONE_FIELD', 'zone'),
    refField,
    statusRefField: fieldDariEnv('NETFLAZZ_STATUS_REF_FIELD', refField || 'id'),
    orderUrl: bersihinText(process.env.NETFLAZZ_ORDER_URL) || baseUrl,
    statusUrl: bersihinText(process.env.NETFLAZZ_STATUS_URL) || baseUrl,
    servicesUrl: bersihinText(process.env.NETFLAZZ_SERVICES_URL) || baseUrl,
    contentType: bersihinText(process.env.NETFLAZZ_CONTENT_TYPE).toLowerCase() || 'form',
    bearerToken: bersihinText(process.env.NETFLAZZ_BEARER_TOKEN),
    targetZoneSeparator: process.env.NETFLAZZ_TARGET_ZONE_SEPARATOR || ''
  };
}

function normalisasiStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function setField(payload, fieldName, value) {
  const key = bersihinText(fieldName);
  const isi = bersihinText(value);

  if (key && isi) {
    payload[key] = isi;
  }
}

function payloadTambahanDariEnv(envName) {
  const raw = bersihinText(process.env[envName]);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function debugNetflazzAktif() {
  if (process.env.NETFLAZZ_DEBUG !== '1') return false;

  // Biar production gak kebanjiran payload provider kalau NETFLAZZ_DEBUG kelupaan dimatiin.
  return process.env.NODE_ENV !== 'production' || process.env.NETFLAZZ_DEBUG_PRODUCTION === '1';
}

function kunciSensitif(key = '') {
  const k = String(key || '').toLowerCase();

  return (
    k.includes('api_key') ||
    k === 'apikey' ||
    k === 'key' ||
    k.includes('secret') ||
    k.includes('token') ||
    k.includes('pin') ||
    k.includes('password') ||
    k.includes('authorization')
  );
}

function sensorPayload(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sensorPayload(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, isi]) => [
        key,
        kunciSensitif(key) ? '***' : sensorPayload(isi)
      ])
    );
  }

  return value;
}

function statusFieldPakaiTrxid(fieldName) {
  const field = normalisasiStatus(fieldName);

  return (
    ['id', 'trxid', 'trx_id', 'transaction_id', 'id_transaksi'].includes(field) ||
    field.includes('trx') ||
    field.includes('transaction')
  );
}

async function fetchNetflazz(payload, { url, timeoutMs = 20000 } = {}) {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const finalPayload = {
    [config.apiKeyField]: config.apiKey,
    ...(config.pin && config.pinField ? { [config.pinField]: config.pin } : {}),
    ...payload
  };

  if (debugNetflazzAktif()) {
    console.log('[NETFLAZZ] request', {
      url: url || config.baseUrl,
      contentType: config.contentType,
      payload: sensorPayload(finalPayload)
    });
  }

  const headers = {
    Accept: 'application/json'
  };

  if (config.bearerToken) {
    headers.Authorization = `Bearer ${config.bearerToken}`;
  }

  let body;

  if (config.contentType === 'form' || config.contentType === 'urlencoded') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(finalPayload);
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(finalPayload);
  }

  try {
    const response = await fetch(url || config.baseUrl, {
      method: 'POST',
      headers,
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

    if (debugNetflazzAktif()) {
      console.log('[NETFLAZZ] response', {
        httpStatus: response.status,
        ok: response.ok,
        data: sensorPayload(data)
      });
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

function ambilObjekUtama(response) {
  if (!response) return null;

  if (typeof response === 'string') {
    try {
      return ambilObjekUtama(JSON.parse(response));
    } catch {
      return null;
    }
  }

  if (Array.isArray(response?.data)) return response.data[0] || null;
  if (Array.isArray(response?.result)) return response.result[0] || null;

  if (response?.data && typeof response.data === 'object') return response.data;
  if (response?.result && typeof response.result === 'object') return response.result;

  return response;
}

function ambilFieldAda(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return undefined;

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      return obj[field];
    }
  }

  return undefined;
}

export function ambilStatusNetflazz(response) {
  const utama = ambilObjekUtama(response);

  const statusUtama = ambilFieldAda(utama, [
    'status',
    'status_transaksi',
    'transaction_status',
    'status_order',
    'state',
    'message',
    'pesan'
  ]);

  if (statusUtama !== undefined && statusUtama !== null && statusUtama !== '') {
    return statusUtama;
  }

  const statusResponse = ambilFieldAda(response, ['status', 'message', 'pesan']);

  if (statusResponse !== undefined && statusResponse !== null && statusResponse !== '') {
    return statusResponse;
  }

  return '';
}

export function ambilNetflazzTrxIdDariResponse(response) {
  const utama = ambilObjekUtama(response);

  return (
    utama?.trxid ||
    utama?.trx_id ||
    utama?.transaction_id ||
    utama?.id_transaksi ||
    utama?.id ||
    response?.trxid ||
    response?.trx_id ||
    response?.transaction_id ||
    response?.id ||
    null
  );
}

export function netflazzSukses(response) {
  const status = normalisasiStatus(ambilStatusNetflazz(response));

  // Boolean success/result dari API biasanya cuma berarti request diterima.
  // Status top-up baru dianggap final sukses kalau field status-nya eksplisit sukses.
  return ['sukses', 'success', 'berhasil', 'completed', 'complete', 'done'].includes(status);
}

export function netflazzGagal(response) {
  const utama = ambilObjekUtama(response);
  const status = normalisasiStatus(ambilStatusNetflazz(response));

  return (
    utama?.status === false ||
    utama?.success === false ||
    utama?.sukses === false ||
    utama?.result === false ||
    response?.status === false ||
    response?.success === false ||
    response?.sukses === false ||
    response?.result === false ||
    ['false', 'gagal', 'failed', 'fail', 'error', 'cancel', 'canceled', 'cancelled', 'refunded'].includes(status)
  );
}

export function netflazzPending(response) {
  const status = normalisasiStatus(ambilStatusNetflazz(response));

  return [
    '',
    'pending',
    'proses',
    'process',
    'processing',
    'waiting',
    'in progress',
    'validasi provider',
    'validasi_provider',
    'accepted',
    'diterima',
    'true'
  ].includes(status);
}

function bikinTarget({ idPlayer, zonePlayer, separator }) {
  const id = bersihinText(idPlayer);
  const zone = bersihinText(zonePlayer);

  if (separator && zone) {
    return `${id}${separator}${zone}`;
  }

  return id;
}

export async function orderNetflazz({
  refId,
  kodeProduk,
  idPlayer,
  zonePlayer = '',
  additionalData = ''
}) {
  if (!refId || !kodeProduk || !idPlayer) {
    return {
      ok: false,
      status: 400,
      data: {
        success: false,
        message: 'Data order Netflazz belum lengkap.'
      }
    };
  }

  const config = getConfig();
  const payload = {
    ...payloadTambahanDariEnv('NETFLAZZ_ORDER_EXTRA_JSON')
  };

  setField(payload, config.actionField, config.orderAction);
  setField(payload, config.serviceField, kodeProduk);
  setField(
    payload,
    config.targetField,
    bikinTarget({
      idPlayer,
      zonePlayer,
      separator: config.targetZoneSeparator
    })
  );
  setField(payload, config.refField, refId);

  if (zonePlayer && !config.targetZoneSeparator) {
    setField(payload, config.zoneField, zonePlayer);
  }

  if (additionalData) {
    setField(
      payload,
      bersihinText(process.env.NETFLAZZ_ADDITIONAL_FIELD) || 'additional_data',
      additionalData
    );
  }

  return fetchNetflazz(payload, {
    url: config.orderUrl,
    timeoutMs: 20000
  });
}

export async function cekStatusNetflazz({ refId, trxid } = {}) {
  const config = getConfig();
  const statusField = config.statusRefField;
  const pakaiTrxid = statusFieldPakaiTrxid(statusField);
  const allowRefFallback = process.env.NETFLAZZ_STATUS_ALLOW_REF_FALLBACK === 'true';
  const identifier = pakaiTrxid
    ? (trxid || (allowRefFallback ? refId : ''))
    : (refId || trxid);

  if (!identifier) {
    return {
      ok: false,
      status: 400,
      data: {
        success: false,
        message: pakaiTrxid
          ? 'ID transaksi Netflazz belum tersimpan, status belum bisa dicek.'
          : 'refId/trxid Netflazz wajib diisi.'
      }
    };
  }

  const payload = {
    ...payloadTambahanDariEnv('NETFLAZZ_STATUS_EXTRA_JSON')
  };

  setField(payload, config.actionField, config.statusAction);
  setField(payload, statusField, identifier);

  return fetchNetflazz(payload, {
    url: config.statusUrl,
    timeoutMs: 20000
  });
}

export async function ambilLayananNetflazz({ filterGame = '', filterStatus = '' } = {}) {
  const config = getConfig();
  const payload = {
    ...payloadTambahanDariEnv('NETFLAZZ_SERVICES_EXTRA_JSON')
  };

  setField(payload, config.actionField, config.servicesAction);

  // Default-nya filter gak dikirim ke Netflazz karena nama field filter di panel beda-beda.
  // Kalau dokumentasi Netflazz lu support filter, tinggal aktifin lewat ENV ini.
  setField(
    payload,
    fieldDariEnv('NETFLAZZ_SERVICES_GAME_FIELD', ''),
    filterGame
  );
  setField(
    payload,
    fieldDariEnv('NETFLAZZ_SERVICES_STATUS_FIELD', ''),
    filterStatus
  );

  return fetchNetflazz(payload, {
    url: config.servicesUrl,
    timeoutMs: 25000
  });
}
