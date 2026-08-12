import { signToken, checkRateLimit } from '../_lib/humanverify.js';

export async function onRequestGet({ request, env }) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (!env.HUMAN_VERIFY_SECRET) {
    return Response.json({ error: 'Human verification is not configured on the server.' }, { status: 500, headers });
  }

  const ip = request.headers.get('CF-Connecting-IP');
  const rate = await checkRateLimit(env, ip, 30, 5 * 60 * 1000);
  if (!rate.allowed) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429, headers });
  }

  const target = 20 + Math.random() * 60;
  const token = await signToken(env.HUMAN_VERIFY_SECRET, {
    purpose: 'challenge',
    target,
    exp: Date.now() + 5 * 60 * 1000,
  });

  return Response.json({ token, target }, { headers });
}
