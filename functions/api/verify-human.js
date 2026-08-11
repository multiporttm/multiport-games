import { verifyToken, signToken } from '../_lib/humanverify.js';

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  try {
    const { challengeToken, finalPos, moveCount, elapsedMs } = await request.json();

    const result = await verifyToken(env.HUMAN_VERIFY_SECRET, challengeToken);
    if (!result.valid || result.payload.purpose !== 'challenge') {
      return Response.json({ error: 'Verification expired. Please try the puzzle again.' }, { status: 400, headers });
    }

    const withinTolerance = typeof finalPos === 'number' && Math.abs(finalPos - result.payload.target) <= 4;
    const humanLike = typeof elapsedMs === 'number' && elapsedMs >= 300 && elapsedMs <= 15000
      && typeof moveCount === 'number' && moveCount >= 5;

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
