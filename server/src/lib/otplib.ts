import crypto from 'crypto';

/**
 * Minimal TOTP implementation for MFA.
 * In production, use the otplib or speakeasy npm package.
 * This is a zero-dependency implementation for the MVP.
 */
export const authenticator = {
  generateSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  },

  keyuri(accountName: string, issuer: string, secret: string): string {
    const encodedAccount = encodeURIComponent(accountName);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  },

  verify(opts: { token: string; secret: string }): boolean {
    const { token, secret } = opts;
    if (!token || token.length !== 6) return false;
    const expected = generateTOTP(secret);
    return token === expected;
  },
};

function generateTOTP(secret: string): string {
  const epoch = Math.floor(Date.now() / 1000);
  let timeStep = Math.floor(epoch / 30);
  const counter = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counter[i] = timeStep & 0xff;
    timeStep >>= 8;
  }
  const key = Buffer.from(secret, 'hex');
  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code = ((hmac[offset]! & 0x7f) << 24) | ((hmac[offset + 1]! & 0xff) << 16) | ((hmac[offset + 2]! & 0xff) << 8) | (hmac[offset + 3]! & 0xff);
  const digits = code % 1000000;
  return digits.toString().padStart(6, '0');
}
