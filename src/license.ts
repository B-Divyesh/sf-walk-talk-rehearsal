const SLUG = 'walk-talk-rehearsal';
const API = 'https://api.sociobot.in/api/v1';
const TOKEN_KEY = `sb_license:${SLUG}`;
const CACHE_KEY = `sb_license_verdict:${SLUG}`;
const DAY = 86_400_000;

interface Verdict { valid: boolean; checkedAt: number; reason?: string }

export function captureLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(CACHE_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function storeLicense(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(CACHE_KEY);
}

export function cachedUnlock(): boolean {
  if (!localStorage.getItem(TOKEN_KEY)) return false;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Verdict | null;
    return cached?.valid === true;
  } catch { return false; }
}

export async function verifyLicense(force = false): Promise<Verdict | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const raw = localStorage.getItem(CACHE_KEY);
  if (!force && raw) {
    try {
      const saved = JSON.parse(raw) as Verdict;
      if (Date.now() - saved.checkedAt < DAY) return saved;
    } catch { /* re-check malformed cache */ }
  }
  const response = await fetch(`${API}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('License check is temporarily unavailable.');
  const body = await response.json() as { valid: boolean; reason?: string };
  const verdict = { valid: body.valid, reason: body.reason, checkedAt: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(verdict));
  return verdict;
}

export const checkoutUrl = `${API}/products/${SLUG}/checkout`;
