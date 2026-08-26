import { createClient } from '@supabase/supabase-js';
import { recordPoints, getUserPoints } from './leaderboards.js';
import { getReward } from './rewards.js';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

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
  // Always looked up server-side (rewards.js -> Supabase `rewards` table) —
  // cost/vendor/name here can NEVER come from what the client sent, so a
  // tampered request can't claim a different reward than what's on file.
  const item = await getReward(rewardId);
  if (!item) return { ok: false, reason: 'unknown_reward' };
  if (!sb || !userId) return { ok: false, reason: 'unavailable' };

  const balance = await getUserPoints(userId);
  if (balance < item.cost) return { ok: false, reason: 'insufficient_points' };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { error } = await sb.from('redemptions').insert({
      code, user_id: userId, reward_id: rewardId,
      reward_name: item.reward, vendor: item.vendor, cost: item.cost, emoji: item.emoji || null
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
  // reward_name/vendor/emoji/cost were snapshotted at redemption time, so
  // this stays accurate even if the catalog changes (a price bump or a
  // renamed reward) after the fact — a redeemed code always shows exactly
  // what the person actually redeemed.
  const reward = { reward: data.reward_name, vendor: data.vendor, emoji: data.emoji || '🎁' };
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
