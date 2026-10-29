const buckets = new Map();

function bucketKey(key, scope) {
  return `${scope}:${key || "anonymous"}`;
}

export function checkRateLimit({ key, scope, max, windowMs }) {
  const now = Date.now();
  const id = bucketKey(key, scope);
  const record = buckets.get(id);

  if (!record || record.resetAt <= now) {
    buckets.set(id, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: max - 1,
      resetAt: now + windowMs,
    };
  }

  if (record.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  buckets.set(id, record);

  return {
    allowed: true,
    remaining: max - record.count,
    resetAt: record.resetAt,
  };
}
