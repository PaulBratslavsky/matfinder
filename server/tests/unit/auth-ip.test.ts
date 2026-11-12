import { getIP } from 'better-auth/api';
import { describe, expect, it } from 'vitest';
import { ipAddressOptions } from '../../src/lib/auth-ip';

const UNRESOLVED = '127.0.0.1'; // tests only; production gets null → the shared "no-trusted-ip" bucket
const req = (headers: Record<string, string>) => new Request('http://localhost/api/auth/sign-in/email', { headers });
const ip = (headers: Record<string, string>, env: Record<string, string> = {}) =>
  getIP(req(headers), { advanced: { ipAddress: ipAddressOptions(env) } } as never);

describe('the client IP for rate limits (B-9)', () => {
  it('reads nothing from empty settings, and lower-cases and trims the lists', () => {
    expect(ipAddressOptions({})).toEqual({});
    expect(ipAddressOptions({ AUTH_IP_HEADERS: ' X-Vercel-Forwarded-For , x-forwarded-for,', AUTH_TRUSTED_PROXIES: '76.76.21.0/24' })).toEqual({
      ipAddressHeaders: ['x-vercel-forwarded-for', 'x-forwarded-for'],
      trustedProxies: ['76.76.21.0/24'],
    });
  });

  it('by default, a forwarded chain resolves to no IP (the shared bucket)', () => {
    expect(ip({ 'x-forwarded-for': '203.0.113.7' })).toBe('203.0.113.7');
    expect(ip({ 'x-forwarded-for': '203.0.113.7, 76.76.21.21' })).toBe(UNRESOLVED);
  });

  it('reads a configured single-value header first', () => {
    const env = { AUTH_IP_HEADERS: 'x-vercel-forwarded-for,x-forwarded-for' };
    expect(ip({ 'x-vercel-forwarded-for': '203.0.113.7', 'x-forwarded-for': '203.0.113.7, 76.76.21.21' }, env)).toBe('203.0.113.7');
    expect(ip({ 'x-forwarded-for': '198.51.100.9' }, env)).toBe('198.51.100.9'); // the native path, no Vercel header
  });

  it('with trusted proxies, takes the first untrusted address from the right', () => {
    expect(ip({ 'x-forwarded-for': '203.0.113.7, 76.76.21.21' }, { AUTH_TRUSTED_PROXIES: '76.76.21.0/24' })).toBe('203.0.113.7');
  });
});
