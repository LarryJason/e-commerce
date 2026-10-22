// Limiteur en mémoire (fenêtre fixe) pour freiner le bruteforce sur la
// connexion. Suffisant pour une instance unique ; en production multi-instance,
// le remplacer par un stockage partagé (Redis, table SQL…).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { allowed: false, retryAfterMs: bucket.resetAt - now };
  return { allowed: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
