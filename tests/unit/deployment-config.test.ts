import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static-host response policy', () => {
  it('keeps hashed assets immutable and protects the PWA response surface', async () => {
    const config = JSON.parse(await readFile(new URL('../../public/staticwebapp.config.json', import.meta.url), 'utf8')) as {
      globalHeaders: Record<string, string>;
      routes: Array<{ route: string; headers: Record<string, string> }>;
    };
    const assets = config.routes.find((route) => route.route === '/assets/*');
    const manifest = config.routes.find((route) => route.route === '/manifest.webmanifest');

    expect(assets?.headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(manifest?.headers['Content-Type']).toBe('application/manifest+json; charset=utf-8');
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('microphone=(self)');
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
  });
});
