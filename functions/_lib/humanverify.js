// Lightweight signed-token helper used by the site's own human-verification
// widget (a slide-to-verify puzzle) in place of a third-party CAPTCHA
// service. Tokens are HMAC-SHA256 signed so they can't be forged or altered
// client-side, but this offers nowhere near the bot-detection strength of a
// service like Cloudflare Turnstile (no device fingerprinting, no threat
// intelligence network) — it mainly filters out naive/scripted bots.

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toB64url(bytes) {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function signToken(secret, payload) {
  const payloadB64 = toB64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toB64url(sig)}`;
}

export async function verifyToken(secret, token) {
  if (!secret) return { valid: false, reason: 'not-configured' };
  if (!token || typeof token !== 'string' || !token.includes('.')) return { valid: false, reason: 'malformed' };

  const [payloadB64, sigB64] = token.split('.');
  try {
    const key = await getKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, fromB64url(sigB64), new TextEncoder().encode(payloadB64));
    if (!ok) return { valid: false, reason: 'bad-signature' };
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(payloadB64)));
    if (payload.exp && Date.now() > payload.exp) return { valid: false, reason: 'expired' };
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'malformed' };
  }
}
