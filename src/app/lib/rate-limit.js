const globalForRateLimit = globalThis;

if (!globalForRateLimit.__rateLimitStore) {
  globalForRateLimit.__rateLimitStore = new Map();
}

const store = globalForRateLimit.__rateLimitStore;

function getIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return 'unknown-ip';
}

export function rateLimit(request, options = {}) {
  const {
    key = 'global',
    limit = 10,
    windowMs = 60_000
  } = options;

  const ip = getIp(request);
  const now = Date.now();
  const rateKey = `${key}:${ip}`;

  const current = store.get(rateKey);

  if (!current || current.resetAt <= now) {
    store.set(rateKey, {
      count: 1,
      resetAt: now + windowMs
    });

    return {
      allowed: true,
      remaining: limit - 1,
      retryAfter: 0
    };
  }

  if (current.count >= limit) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfter
    };
  }

  current.count += 1;
  store.set(rateKey, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    retryAfter: 0
  };
}