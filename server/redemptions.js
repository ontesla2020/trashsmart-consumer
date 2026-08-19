import { createClient } from '@supabase/supabase-js';
import { recordPoints, getUserPoints } from './leaderboards.js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

// Authoritative reward catalog — mirrors src/data.js's REWARDS array, but
// lives here too so a redemption's cost/name/vendor always comes from the
// server, never from whatever the client happens to send. Without this, a
// tampered request could claim an expensive reward for 0 points.
const REWARDS_CATALOG = {
  coffee: { vendor: 'Inklings Coffee & Tea', reward: 'Free 12oz coffee', emoji: '☕', cost: 1600 },
  deli: { vendor: 'First St. Deli', reward: '$3 off any sandwich', emoji: '🥪', cost: 1200 },
  gelato: { vendor: 'Gelato Mio', reward: 'Free single scoop', emoji: '🍦', cost: 2000 },
  tree: { vendor: 'Donate to StopWaste', reward: 'Plant a tree locally', emoji: '🌱', cost: 50 }
};

// No 0/O/1/I/L — avoids characters that look alike when read aloud or typed
// in by a cashier from a phone screen.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode() {
  let out = '';
  for (let i = 0; i < 8; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

// Returns { ok:true, code, reward } or { ok:false, reason }.
export async function createRedemption(userId, rewardId) {
  const item = REWARDS_CATALOG[rewardId];
  if (!item) return { ok: false, reason: 'unknown_reward' };
  if (!sb || !userId) return { ok: false, reason: 'unavailable' };

  const balance = await getUserPoints(userId);
  if (balance < item.cost) return { ok: false, reason: 'insufficient_points' };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { error } = await sb.from('redemptions').insert({
      code, user_id: userId, reward_id: rewardId,
      reward_name: item.reward, vendor: item.vendor, cost: item.cost
    });
    if (!error) {
      // Deduct via the same append-only ledger everything else uses — a
      // negative entry, same as a positive one from a scan.
      await recordPoints(userId, -item.cost, `redeem:${rewardId}`);
      return { ok: true, code, reward: { vendor: item.vendor, reward: item.reward, emoji: item.emoji } };
    }
    // Unique-constraint collision on `code` (astronomically unlikely with an
    // 8-char code) — just try again with a fresh one.
  }
  return { ok: false, reason: 'unavailable' };
}

// Returns { status: 'valid'|'used'|'not_found', reward?, redeemedAt? }
// No expiry — a code is good until it's redeemed once, then it's done.
export async function lookupRedemption(code) {
  if (!sb || !code) return { status: 'not_found' };
  const { data } = await sb.from('redemptions').select('*').eq('code', String(code).toUpperCase()).maybeSingle();
  if (!data) return { status: 'not_found' };
  const reward = { reward: data.reward_name, vendor: data.vendor, emoji: REWARDS_CATALOG[data.reward_id]?.emoji || '🎁' };
  if (data.redeemed_at) return { status: 'used', reward, redeemedAt: data.redeemed_at };
  return { status: 'valid', reward };
}

// Marks a code as redeemed if (and only if) it's currently valid — this is
// the one-time-use gate. Returns the state AFTER the attempt, so a second
// call (someone trying to reuse a screenshot) just reports "used" again.
export async function confirmRedemption(code) {
  const state = await lookupRedemption(code);
  if (state.status !== 'valid') return state;
  await sb.from('redemptions').update({ redeemed_at: new Date().toISOString() })
    .eq('code', String(code).toUpperCase()).is('redeemed_at', null);
  return lookupRedemption(code);
}
