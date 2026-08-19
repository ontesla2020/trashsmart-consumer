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

export function saveProfile(user) {
  return req('/api/profile', json('POST', user));
}

// Real, server-side point total for this user (from the ledger) — used to
// restore progress on login instead of always starting a fresh account.
export function getUserPoints(id) {
  return req(`/api/profile/${id}/points`);
}

// Spends points server-side and returns a one-time redemption code to show
// at the register, or { ok:false, reason } if it can't (not enough points,
// unknown reward, etc).
export function redeemReward(userId, rewardId) {
  return req('/api/rewards/redeem', json('POST', { user_id: userId, reward_id: rewardId }));
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
