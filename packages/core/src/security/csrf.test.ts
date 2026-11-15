/** @jest-environment node */
import { ForbiddenError } from '../http/errors';
import { assertCsrfSafe } from './csrf';

const request = (method: string, headers: Record<string, string> = {}) =>
  new Request('http://app.test/api/things', { method, headers });

describe('assertCsrfSafe', () => {
  it('lets safe methods through without the header', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) expect(() => assertCsrfSafe(request(method))).not.toThrow();
  });

  it('rejects a state-changing request without the client header (a plain form post)', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(() => assertCsrfSafe(request(method))).toThrow(ForbiddenError);
    }
    expect(() => assertCsrfSafe(request('POST', { 'x-requested-with': 'XMLHttpRequest' }))).toThrow(ForbiddenError);
  });

  it('accepts the client header, with no Origin or the same one', () => {
    expect(() => assertCsrfSafe(request('POST', { 'x-requested-with': 'devmentor' }))).not.toThrow();
    expect(() => assertCsrfSafe(request('POST', { 'x-requested-with': 'devmentor', origin: 'http://app.test' }))).not.toThrow();
  });

  it('rejects a cross-origin request even with the header', () => {
    expect(() => assertCsrfSafe(request('POST', { 'x-requested-with': 'devmentor', origin: 'https://evil.test' }))).toThrow(ForbiddenError);
  });

  it('compares the Origin with the Host the browser used, not with the internal URL', () => {
    const proxied = (headers: Record<string, string>) =>
      new Request('http://internal-host:3000/api/things', { method: 'POST', headers: { 'x-requested-with': 'devmentor', ...headers } });

    expect(() => assertCsrfSafe(proxied({ host: '127.0.0.1:8080', origin: 'http://127.0.0.1:8080' }))).not.toThrow();
    expect(() => assertCsrfSafe(proxied({ 'x-forwarded-host': 'app.example.com', origin: 'https://app.example.com' }))).not.toThrow();
    expect(() => assertCsrfSafe(proxied({ host: 'app.example.com', origin: 'https://evil.example' }))).toThrow(ForbiddenError);
  });
});
