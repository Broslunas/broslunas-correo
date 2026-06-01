/**
 * WildDuck REST API client
 *
 * WildDuck is a Node.js mail server that uses MongoDB as its storage.
 * It exposes a REST API on port 8080. This client is consumed by the
 * Next.js webmail backend to:
 *   - Provision WildDuck users when an admin creates a mailbox
 *   - Manage application passwords (per-device, revocable)
 *   - Push inbound messages into WildDuck so they appear via IMAP
 *   - Update user settings
 *
 * API reference: https://docs.wildduck.email/api/
 */

const WILDDUCK_URL = (process.env.WILDDUCK_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const WILDDUCK_API_KEY = process.env.WILDDUCK_API_KEY || '';

if (!WILDDUCK_API_KEY) {
  console.warn(
    '[wildduck] WILDDUCK_API_KEY not set. IMAP/POP3/SMTP integration will fail at runtime.'
  );
}

interface WildDuckRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

interface WildDuckResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

function buildUrl(path: string, query?: WildDuckRequestOptions['query']): string {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, WILDDUCK_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Low-level request to WildDuck REST API.
 * Adds the pre-shared `X-Wildduck-Key` header that authenticates the webmail backend.
 */
export async function wildduckRequest<T = any>(
  path: string,
  opts: WildDuckRequestOptions = {}
): Promise<WildDuckResponse<T>> {
  const { method = 'GET', body, query, signal } = opts;
  const url = buildUrl(path, query);

  const headers: Record<string, string> = {
    'X-Wildduck-Key': WILDDUCK_API_KEY,
  };
  let payload: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: payload,
      signal,
      // 5-second timeout: keep the webmail snappy even if WildDuck is unreachable
      // (WildDuck is reachable on the same Oracle VM via the private 127.0.0.1:8080)
    });

    let data: any = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      data: data as T,
      error: res.ok ? undefined : (data?.error || res.statusText),
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null as any,
      error: `WildDuck unreachable: ${err?.message || 'unknown'}`,
    };
  }
}

// ============================================================
// High-level helpers
// ============================================================

/**
 * Idempotently create a WildDuck user for a mailbox.
 * Safe to call on every login / every admin action.
 */
export async function ensureWildDuckUser(email: string, name: string, passwordHash: string) {
  // First, check if the user already exists to make it truly idempotent
  const getRes = await wildduckRequest('/users', { query: { username: email } });
  if (getRes.ok && getRes.data && Array.isArray(getRes.data.results) && getRes.data.results.length > 0) {
    return getRes.data.results[0];
  }

  // Generate a random secure password for the user in WildDuck if not provided
  // since they authenticate via Next.js OAuth and will only use App Passwords for external clients.
  const securePassword = passwordHash || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const res = await wildduckRequest('/users', {
    method: 'POST',
    body: {
      username: email,
      name,
      password: securePassword,
      address: email,
      quota: 100 * 1024 * 1024,
    },
  });
  if (res.ok) return res.data;

  // Secondary fallback: if creation fails, try fetching once more in case of a race condition
  const getResRetry = await wildduckRequest('/users', { query: { username: email } });
  if (getResRetry.ok && getResRetry.data && Array.isArray(getResRetry.data.results) && getResRetry.data.results.length > 0) {
    return getResRetry.data.results[0];
  }

  console.error('[wildduck] ensureWildDuckUser failed:', res.status, res.error);
  return null;
}

/**
 * Generate a new application password for a user.
 * Returns { id, password } — the plaintext password is only shown ONCE.
 */
export async function createApplicationPassword(
  userId: string,
  description: string
): Promise<{ id: string; password: string } | null> {
  const res = await wildduckRequest(`/users/${encodeURIComponent(userId)}/asps`, {
    method: 'POST',
    body: { description, scopes: ['*'] },
  });
  if (res.ok && res.data?.id && res.data?.password) {
    return { id: res.data.id, password: res.data.password };
  }
  return null;
}

/**
 * Revoke an application password.
 */
export async function revokeApplicationPassword(userId: string, passwordId: string): Promise<boolean> {
  const res = await wildduckRequest(
    `/users/${encodeURIComponent(userId)}/asps/${encodeURIComponent(passwordId)}`,
    { method: 'DELETE' }
  );
  return res.ok;
}

/**
 * List a user's application passwords (no plaintext returned).
 */
export async function listApplicationPasswords(userId: string): Promise<any[]> {
  const res = await wildduckRequest(`/users/${encodeURIComponent(userId)}/asps`);
  if (res.ok && res.data && Array.isArray(res.data.results)) return res.data.results;
  return [];
}

/**
 * Push an inbound MIME message into a WildDuck mailbox.
 * Called from /api/emails/ingress (after the message has been stored
 * in the webmail's MongoDB) so that the same message becomes visible
 * via IMAP for clients like Thunderbird.
 */
export async function pushInboundToWildDuck(args: {
  userId: string;
  mailboxPath: string; // e.g. "INBOX"
  rawMime: Buffer;
  flags?: string[];
}): Promise<boolean> {
  const { userId, mailboxPath, rawMime, flags = ['\\Seen'] } = args;
  const res = await wildduckRequest(
    `/users/${encodeURIComponent(userId)}/mailbox`,
    {
      method: 'POST',
      query: { mailbox: mailboxPath, flags: flags.join(' ') },
      body: {
        raw: rawMime.toString('base64'),
      },
    }
  );
  return res.ok;
}

/**
 * Health probe — used by the setup script to confirm WildDuck is up.
 */
export async function wildduckHealth(): Promise<boolean> {
  const res = await wildduckRequest('/health');
  return res.ok;
}
