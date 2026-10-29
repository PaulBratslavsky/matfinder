/**
 * Where Better Auth reads the client IP for its rate limits (B-9). Unset means Better Auth's default: x-forwarded-for,
 * trusted only when it holds a single address. Behind a proxy chain no IP resolves, and every request then shares one
 * rate-limit bucket.
 *   AUTH_IP_HEADERS       comma list, tried in order (for example x-vercel-forwarded-for,x-forwarded-for)
 *   AUTH_TRUSTED_PROXIES  comma list of proxy IPs or CIDR ranges, skipped from the right of a chain
 */
export type IpAddressOptions = { ipAddressHeaders?: string[]; trustedProxies?: string[] };

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function ipAddressOptions(env: Record<string, string | undefined> = process.env): IpAddressOptions {
  const headers = list(env.AUTH_IP_HEADERS);
  const proxies = list(env.AUTH_TRUSTED_PROXIES);
  return { ...(headers.length ? { ipAddressHeaders: headers } : {}), ...(proxies.length ? { trustedProxies: proxies } : {}) };
}
