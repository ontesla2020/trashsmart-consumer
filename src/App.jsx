// Base URL the API is reached at. Leave VITE_API_URL unset for local dev and
// for web/PWA deployments, where the frontend and API are served from the
// same origin (Express serves both in production) — relative paths just work.
// Set VITE_API_URL when the frontend can't rely on that: e.g. wrapped in a
// native app shell (Capacitor), where there's no "same origin" to fall back
// on and every request needs the full API host.
const BASE = import.meta.env.VITE_API_URL || '';

async function req(path, opts) {
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    let msg = `Something went wrong (${res.status}). Please try again.`;
    let status;
    try { const b = await res.json(); if (b.message) msg = b.message; status = b.status; } catch { /* ignore */ }
    const e = new Error(msg);
    e.kind = status;
    throw e;
  }
  return res.json();
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function scan({ image, city = 'livermore', user_id }) {
  return req('/api/scan', json('POST', { image, city, user_id }));
}

export function getRules() {
  return req('/api/rules');
}

// Live reward catalog (Supabase-backed on the server) — lets shops/prices
// change without an app update.
export async function getRewards() {
  const r = await req('/api/rewards');
  return r.rewards || [];
}

// Live points-per-category map, as an array shaped for display (highest
// points first) — same source of truth the server uses to award points.
export async function getPointsGuide() {
  const r = await req('/api/points');
  const map = r.points || {};
  const EMOJI = { ewaste_dropoff: '🔌', hazardous_dropoff: '⚠️', recycle: '♻️', organics: '🥬', landfill: '🗑️' };
  return Object.entries(map)
    .map(([bin, v]) => ({ label: v.name, points: v.points, emoji: EMOJI[bin] || '♻️' }))
    .sort((a, b) => b.points - a.points);
}

export function saveProfile(user) {
  return req('/api/profile', json('POST', user));
}

// Real, server-side point total for this user (from the ledger) — used to
// restore progress on login instead of always starting a fresh account.
export function getUserPoints(id) {
  return req(`/api/profile/${id}/points`);
}

// Look up an existing profile by id — null if no account exists yet.
// Powers the "Welcome back" screen so returning users skip re-entering name/school.
export async function getProfile(id) {
  const r = await req(`/api/profile/${id}`);
  return r.profile || null;
}

// Spends points server-side and returns a one-time redemption code to show
// at the register, or { ok:false, reason } if it can't (not enough points,
// unknown reward, etc).
//
// NOTE: this deliberately does NOT use req() above. req() throws on any
// non-2xx response and only looks at a `message` field — but the redeem
// endpoint returns 400/503 on purpose *with* a useful `{ ok:false, reason }`
// body (e.g. reason: 'insufficient_points'), and that body has no `message`
// field. Routing through req() meant every failed redemption threw req()'s
// generic "Something went wrong (400)" before App.jsx ever got to look at
// `reason`, so the friendlier "You don't have enough points for that yet"
// text could never actually show. Reading the body directly regardless of
// status code restores that.
export async function redeemReward(userId, rewardId) {
  const res = await fetch(BASE + '/api/rewards/redeem', json('POST', { user_id: userId, reward_id: rewardId }));
  try {
    return await res.json();
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export function joinChallengeApi(id, user_id) {
  return req(`/api/challenges/${id}/join`, json('POST', { user_id }));
}

export function leaveChallengeApi(id, user_id) {
  return req(`/api/challenges/${id}/leave`, json('POST', { user_id }));
}

export function getLeaderboard(id, user_id, school) {
  const q = new URLSearchParams({ user_id: user_id || '', school: school || '' });
  return req(`/api/challenges/${id}/leaderboard?${q}`);
}
