async function req(url, opts) {
  const res = await fetch(url, opts);
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
