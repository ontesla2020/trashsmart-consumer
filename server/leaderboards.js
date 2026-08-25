import { createClient } from '@supabase/supabase-js';

// Leaderboard + points store. Live when Supabase is configured, otherwise a no-op
// fallback (the client keeps showing its seeded boards + your local points).
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
export const usingSupabase = !!sb;

if (!usingSupabase) {
  console.warn('[leaderboards] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — running in no-op mode (points/profile will not persist).');
} else {
  console.log('[leaderboards] Supabase configured — profile/points persistence is live.');
}

function seasonStart() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString();
}

export async function upsertProfile(p) {
  if (!sb || !p?.id) return;
  const { error } = await sb.from('profiles').upsert({
    id: p.id,
    first_name: p.firstName || p.first_name || null,
    phone: p.phone || null,
    school: p.org || p.school || null,
    city: p.city || 'livermore'
  }, { onConflict: 'id' });
  if (error) console.error('[upsertProfile] Supabase error:', error.message || error);
}

export async function recordPoints(userId, points, category) {
  if (!sb || !userId || !points) return;
  const { error } = await sb.from('ledger').insert({ user_id: userId, points, category: category || null });
  if (error) console.error('[recordPoints] Supabase error:', error.message || error);
}

// All-time point total for one user, straight from the ledger (the same
// source of truth the leaderboards read from) — used to restore a returning
// user's real points on login instead of starting them back at zero.
export async function getUserPoints(userId) {
  if (!sb || !userId) return 0;
  const { data, error } = await sb.from('ledger').select('points').eq('user_id', userId);
  if (error) console.error('[getUserPoints] Supabase error:', error.message || error);
  return (data || []).reduce((sum, row) => sum + (row.points || 0), 0);
}

// Fetch an existing profile by id — powers the "Welcome back" screen so
// returning users aren't re-asked for name/school on every login.
export async function getProfile(userId) {
  if (!sb || !userId) return null;
  const { data, error } = await sb.from('profiles').select('id, first_name, school, city').eq('id', userId).maybeSingle();
  if (error) console.error('[getProfile] Supabase error:', error.message || error);
  return data || null;
}

export async function joinChallenge(userId, cid) {
  if (!sb || !userId) return;
  const { error } = await sb.from('memberships').upsert({ user_id: userId, challenge_id: cid }, { onConflict: 'user_id,challenge_id' });
  if (error) console.error('[joinChallenge] Supabase error:', error.message || error);
}

export async function leaveChallenge(userId, cid) {
  if (!sb || !userId) return;
  const { error } = await sb.from('memberships').delete().eq('user_id', userId).eq('challenge_id', cid);
  if (error) console.error('[leaveChallenge] Supabase error:', error.message || error);
}

// Returns { live, rows:[{ name, pts, you }] }. live=false → client uses its seeded board.
export async function leaderboard(cid, userId, userSchool) {
  if (!sb) return { live: false, rows: [] };
  const since = seasonStart();
  if (cid === 'school') {
    const { data, error } = await sb.rpc('school_leaderboard', { since });
    if (error) console.error('[leaderboard:school] Supabase error:', error.message || error);
    const rows = (data || []).map((r) => ({ name: r.school, pts: Number(r.per_capita) || 0, you: !!(userSchool && r.school === userSchool) }));
    return { live: true, rows };
  }
  const { data, error } = await sb.rpc('challenge_leaderboard', { cid, since });
  if (error) console.error('[leaderboard:challenge] Supabase error:', error.message || error);
  const rows = (data || []).map((r) => ({ name: r.name || 'Player', pts: Number(r.pts) || 0, you: !!(userId && r.user_id === userId) }));
  return { live: true, rows };
}
