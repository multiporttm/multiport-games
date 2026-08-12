import { verifyToken, signToken, checkRateLimit } from '../_lib/humanverify.js';

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  try {
    const ip = request.headers.get('CF-Connecting-IP');
    const rate = await checkRateLimit(env, ip, 30, 5 * 60 * 1000);
    if (!rate.allowed) {
      return Response.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429, headers });
    }

    const { challengeToken, finalPos, moveCount, elapsedMs, moveVariance, webdriver } = await request.json();

    const result = await verifyToken(env.HUMAN_VERIFY_SECRET, challengeToken);
    if (!result.valid || result.payload.purpose !== 'challenge') {
      return Response.json({ error: 'Verification expired. Please try the puzzle again.' }, { status: 400, headers });
    }

    // navigator.webdriver defaults to true in most out-of-the-box automation
    // tools (Selenium/Puppeteer/Playwright) unless a bot deliberately hides
    // it — this catches naive automation, nothing more.
    if (webdriver === true) {
      return Response.json({ error: 'Verification failed. Please try the puzzle again.' }, { status: 400, headers });
    }

    const withinTolerance = typeof finalPos === 'number' && Math.abs(finalPos - result.payload.target) <= 4;
    const humanLike = typeof elapsedMs === 'number' && elapsedMs >= 300 && elapsedMs <= 15000
      && typeof moveCount === 'number' && moveCount >= 5
      && typeof moveVariance === 'number' && moveVariance > 0.01;

    if (!withinTolerance || !humanLike) {
      return Response.json({ error: 'Verification failed. Please try the puzzle again.' }, { status: 400, headers });
    }

    const verifiedToken = await signToken(env.HUMAN_VERIFY_SECRET, {
      purpose: 'human-verified',
      exp: Date.now() + 10 * 60 * 1000,
    });

    return Response.json({ verifiedToken }, { headers });
  } catch (e) {
    return Response.json({ error: 'Server error, please try again.' }, { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
