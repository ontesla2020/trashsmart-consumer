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

// Real member count for a challenge — replaces the hardcoded placeholder
// numbers that used to live in data.js (e.g. "312 members"). For the school
// challenge, this counts real profiles whose saved school matches the
// current user's school. For community challenges, it counts rows in the
// memberships table for that challenge id. Returns null (not 0) when we
// can't compute a real number, so the caller knows to keep showing the
// seeded fallback rather than a false "0 members".
export async function memberCount(cid, userSchool) {
  if (!sb) return null;
  if (cid === 'school') {
    if (!userSchool) return null;
    const { count, error } = await sb
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('school', userSchool);
    if (error) { console.error('[memberCount:school] Supabase error:', error.message || error); return null; }
    return count ?? null;
  }
  const { count, error } = await sb
    .from('memberships')
    .select('user_id', { count: 'exact', head: true })
    .eq('challenge_id', cid);
  if (error) { console.error('[memberCount:challenge] Supabase error:', error.message || error); return null; }
  return count ?? null;
}

// Real list of challenge ids this user has actually joined (from the
// memberships table) — lets the client correct its local Join/Leave button
// state to what the server actually recorded, instead of trusting whatever
// this device's local storage happens to remember (which drifts across
// devices/browsers, or if storage is ever cleared).
export async function getJoinedChallenges(userId) {
  if (!sb || !userId) return [];
  const { data, error } = await sb.from('memberships').select('challenge_id').eq('user_id', userId);
  if (error) { console.error('[getJoinedChallenges] Supabase error:', error.message || error); return []; }
  return (data || []).map((r) => r.challenge_id);
}

// The community challenge ids known to the app (mirrors src/data.js's
// CHALLENGES list — kept here too since the members endpoint below needs to
// know what to count before a challenge is ever opened).
const COMMUNITY_CHALLENGE_IDS = ['livermore', 'dublin', 'pleasanton', 'oakland'];

// Real member counts for every challenge at once — powers the Challenges
// list screen, so it shows live numbers instead of data.js's seeded
// placeholders (e.g. "312 students") before anything has even been opened.
// Returns { school: n|null, livermore: n|null, dublin: n|null, ... }.
export async function allMemberCounts(userSchool) {
  const entries = await Promise.all([
    memberCount('school', userSchool).then((n) => ['school', n]),
    ...COMMUNITY_CHALLENGE_IDS.map((id) => memberCount(id, userSchool).then((n) => [id, n]))
  ]);
  return Object.fromEntries(entries);
}

// Returns { live, rows:[{ name, pts, you }], members }. live=false → client
// uses its seeded board (and its seeded member count) instead.
export async function leaderboard(cid, userId, userSchool) {
  if (!sb) return { live: false, rows: [], members: null };
  const since = seasonStart();

  if (cid === 'school') {
    const { data, error } = await sb.rpc('school_leaderboard', { since });
    if (error) console.error('[leaderboard:school] Supabase error:', error.message || error);
    // pts is each school's real combined total, not the per-student average
    // (school_leaderboard still computes per_capita too, just no longer
    // what ranks schools or what the app displays).
    const rows = (data || []).map((r) => ({ name: r.school, pts: Number(r.total) || 0, you: !!(userSchool && r.school === userSchool) }));
    const members = await memberCount('school', userSchool);
    return { live: true, rows, members };
  }

  const { data, error } = await sb.rpc('challenge_leaderboard', { cid, since });
  if (error) console.error('[leaderboard:challenge] Supabase error:', error.message || error);
  const rows = (data || []).map((r) => ({ name: r.name || 'Player', pts: Number(r.pts) || 0, you: !!(userId && r.user_id === userId) }));
  const members = await memberCount(cid, userSchool);
  return { live: true, rows, members };
}
