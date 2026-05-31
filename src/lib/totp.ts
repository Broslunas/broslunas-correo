import crypto from 'crypto';

/**
 * Decodes a Base32 string into a Uint8Array.
 * Standard Base32 alphabet is A-Z and 2-7.
 */
export function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.replace(/=+$/, '').toUpperCase();
  const len = clean.length;
  const buf = new Uint8Array(Math.floor((len * 5) / 8));
  
  let val = 0;
  let bits = 0;
  let index = 0;

  for (let i = 0; i < len; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${clean[i]}`);
    }
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      buf[index++] = (val >> bits) & 0xff;
    }
  }
  return buf;
}

/**
 * Generates a random Base32 secret for TOTP.
 * 20 bytes = 160 bits (standard key length for SHA-1 TOTP).
 * Generates a 32-character Base32 string.
 */
export function generate2FASecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(32);
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += alphabet[bytes[i] % 32];
  }
  return secret;
}

/**
 * Generates a 6-digit TOTP code for a secret and a specific counter value.
 */
function generateTOTPAt(secret: string, counter: number): string {
  const key = base32Decode(secret);
  
  // Convert counter to 8-byte big-endian buffer
  const buffer = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  // HMAC-SHA1 signature
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const code = binary % 1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Generates the current 6-digit TOTP code for a secret.
 */
export function generateTOTP(secret: string, timeStep = 30): string {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  return generateTOTPAt(secret, counter);
}

/**
 * Verifies a TOTP token against a secret.
 * Allows a window of 1 time-step before/after (30 seconds deviation) to accommodate clock drift.
 */
export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  const cleanToken = token.replace(/\s+/g, '');
  if (cleanToken.length !== 6 || isNaN(Number(cleanToken))) {
    return false;
  }

  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);

  // Check current counter and +/- window steps for clock drift
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTPAt(secret, counter + i);
    if (expected === cleanToken) {
      return true;
    }
  }
  return false;
}
