type RateLimitConfig = {
  key: string;
  max: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const store = globalThis as typeof globalThis & {
  dogecordRateLimitStore?: Map<string, RateLimitRecord>;
};

const getStore = () => {
  if (!store.dogecordRateLimitStore) {
    store.dogecordRateLimitStore = new Map<string, RateLimitRecord>();
  }

  return store.dogecordRateLimitStore;
};

export const rateLimit = ({ key, max, windowMs }: RateLimitConfig) => {
  const now = Date.now();
  const rateLimitStore = getStore();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      limited: false,
      retryAfter: 0,
    };
  }

  if (existing.count >= max) {
    return {
      limited: true,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    limited: false,
    retryAfter: 0,
  };
};

export const rateLimitKey = (...parts: Array<string | number | null | undefined>) => {
  return parts.filter((part) => part !== null && part !== undefined && part !== "").join(":");
};
