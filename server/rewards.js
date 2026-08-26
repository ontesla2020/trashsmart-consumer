import { createClient } from '@supabase/supabase-js';

// Reward catalog. Live when Supabase is configured (table: `rewards`),
// otherwise a fallback so local dev without a Supabase project still works
// (mirrors whatever the live table is seeded with — see
// sql/2026-08-25-rewards-and-points.sql).
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
export const usingSupabase = !!sb;

const FALLBACK_REWARDS = [
  { id: 'coffee', vendor: 'Inklings Coffee & Tea', reward: 'Free 12oz coffee', emoji: '☕', cost: 1600, distance: '0.4 mi' },
  { id: 'deli', vendor: 'First St. Deli', reward: '$3 off any sandwich', emoji: '🥪', cost: 1200, distance: '0.6 mi' },
  { id: 'gelato', vendor: 'Gelato Mio', reward: 'Free single scoop', emoji: '🍦', cost: 2000, distance: '0.9 mi' },
  { id: 'tree', vendor: 'Donate to StopWaste', reward: 'Plant a tree locally', emoji: '🌱', cost: 50, distance: '—' }
];

// All active rewards, cheapest first — for display in the app.
export async function getRewards() {
  if (!sb) return FALLBACK_REWARDS;
  const { data, error } = await sb.from('rewards')
    .select('id, vendor, reward, emoji, cost, distance')
    .eq('active', true)
    .order('cost', { ascending: true });
  if (error) { console.error('[getRewards] Supabase error:', error.message || error); return FALLBACK_REWARDS; }
  return data && data.length ? data : FALLBACK_REWARDS;
}

// One reward by id — the server-authoritative source used during
// redemption, so a tampered client request can never claim a cost that
// isn't actually on file (never trust cost/vendor/name sent from the app).
export async function getReward(id) {
  if (!sb) return FALLBACK_REWARDS.find((r) => r.id === id) || null;
  const { data, error } = await sb.from('rewards')
    .select('id, vendor, reward, emoji, cost, distance')
    .eq('id', id).eq('active', true).maybeSingle();
  if (error) { console.error('[getReward] Supabase error:', error.message || error); return null; }
  return data || null;
}
