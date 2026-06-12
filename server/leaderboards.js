import { createClient } from '@supabase/supabase-js';

// Leaderboard + points store. Live when Supabase is configured, otherwise a no-op
// fallback (the client keeps showing its seeded boards + your local points).
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
export const usingSupabase = !!sb;

function seasonStart() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
}

export async function upsertProfile(p) {
  if (!sb || !p?.id) return;
  await sb.from('profiles').upsert({
    id: p.id,
    first_name: p.firstName || p.first_name || null,
    phone: p.phone || null,
    school: p.org || p.school || null,
    city: p.city || 'livermore'
  }, { onConflict: 'id' });
}

export async function recordPoints(userId, points, category) {
  if (!sb || !userId || !points) return;
  await sb.from('ledger').insert({ user_id: userId, points, category: category || null });
}

export async function joinChallenge(userId, cid) {
  if (!sb || !userId) return;
  await sb.from('memberships').upsert({ user_id: userId, challenge_id: cid }, { onConflict: 'user_id,challenge_id' });
}

export async function leaveChallenge(userId, cid) {
  if (!sb || !userId) return;
  await sb.from('memberships').delete().eq('user_id', userId).eq('challenge_id', cid);
}

// Returns { live, rows:[{ name, pts, you }] }. live=false → client uses its seeded board.
export async function leaderboard(cid, userId, userSchool) {
  if (!sb) return { live: false, rows: [] };
  const since = seasonStart();
  if (cid === 'school') {
    const { data } = await sb.rpc('school_leaderboard', { since });
    const rows = (data || []).map((r) => ({ name: r.school, pts: Number(r.per_capita) || 0, you: !!(userSchool && r.school === userSchool) }));
    return { live: true, rows };
  }
  const { data } = await sb.rpc('challenge_leaderboard', { cid, since });
  const rows = (data || []).map((r) => ({ name: r.name || 'Player', pts: Number(r.pts) || 0, you: !!(userId && r.user_id === userId) }));
  return { live: true, rows };
}
