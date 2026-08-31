import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import dns from 'node:dns';

// Some networks (flaky/unsupported IPv6 on home routers, mainly) make Node's
// built-in fetch fail DNS lookups it tries over IPv6 first, even though the
// same host resolves fine over IPv4 (e.g. via curl or a browser). Prefer
// IPv4 results so outbound calls (Supabase, OpenAI) don't hit that.
dns.setDefaultResultOrder('ipv4first');
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { detectItems } from './detect.js';
import { binFor } from './scoring.js';
import { effectiveMap, getRules } from './rules.js';
import { upsertProfile, recordPoints, joinChallenge, leaveChallenge, leaderboard, getUserPoints, getProfile } from './leaderboards.js';
import { createRedemption, lookupRedemption, confirmRedemption } from './redemptions.js';
import { getRewards } from './rewards.js';
import { getPointValues } from './points.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // Render/Cloudflare sit in front — trust X-Forwarded-For for real client IP.

// Only allow our own front-end (and local dev) to call the API. Comma-separated
// list in ALLOWED_ORIGINS overrides the defaults in production.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://trashsmart.ai,https://app.trashsmart.ai,http://localhost:5174,http://localhost:8788')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '20mb' }));

// Reject API calls whose Origin isn't ours (blocks other sites / casual scripts
// from hammering the endpoint). Browsers always send Origin on cross-site POSTs.
function sameOriginOnly(req, res, next) {
  const origin = req.get('origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ status: 'forbidden', message: 'Not allowed.' });
  }
  next();
}

// Tiny in-memory per-IP rate limiter (no external deps). Resets each window.
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const rec = hits.get(ip);
    if (!rec || now > rec.reset) {
      hits.set(ip, { count: 1, reset: now + windowMs });
    } else if (rec.count >= max) {
      const retry = Math.ceil((rec.reset - now) / 1000);
      res.set('Retry-After', String(retry));
      return res.status(429).json({ status: 'rate_limited', message: 'Too many scans — give it a moment and try again.' });
    } else {
      rec.count++;
    }
    if (hits.size > 5000) { for (const [k, v] of hits) if (now > v.reset) hits.delete(k); }
    next();
  };
}
const scanLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 }); // 20 scans / IP / minute
const redeemLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 }); // 30 code checks / IP / minute — cheap defense against code-guessing

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/rules', async (_req, res) => res.json(await getRules()));
app.get('/api/rewards', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json({ rewards: await getRewards() }); }
  catch (e) { res.json({ rewards: [] }); }
});
app.get('/api/points', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json({ points: await getPointValues() }); }
  catch (e) { res.json({ points: {} }); }
});

// ---- Profiles & leaderboards ----
app.post('/api/profile', async (req, res) => { try { await upsertProfile(req.body || {}); } catch (e) { /* ignore */ } res.json({ ok: true }); });
app.get('/api/profile/:id', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json({ profile: await getProfile(req.params.id) }); }
  catch (e) { res.json({ profile: null }); }
});
app.get('/api/profile/:id/points', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json({ points: await getUserPoints(req.params.id) }); }
  catch (e) { res.json({ points: 0 }); }
});
app.post('/api/challenges/:id/join', async (req, res) => { try { await joinChallenge(req.body?.user_id, req.params.id); } catch (e) { /* ignore */ } res.json({ ok: true }); });
app.post('/api/challenges/:id/leave', async (req, res) => { try { await leaveChallenge(req.body?.user_id, req.params.id); } catch (e) { /* ignore */ } res.json({ ok: true }); });
app.get('/api/challenges/:id/leaderboard', async (req, res) => {
  try { res.json(await leaderboard(req.params.id, req.query.user_id, req.query.school)); }
  catch (e) {
    console.error('[GET /api/challenges/:id/leaderboard] error:', e?.message || e);
    res.json({ live: false, rows: [], members: null });
  }
});

// ---- Reward redemption ----
// 1. Consumer app calls this to spend points and get a one-time code.
app.post('/api/rewards/redeem', sameOriginOnly, async (req, res) => {
  const { user_id, reward_id } = req.body || {};
  if (!user_id || !reward_id) return res.status(400).json({ ok: false, reason: 'missing_fields' });
  try {
    const result = await createRedemption(user_id, reward_id);
    res.status(result.ok ? 200 : (result.reason === 'insufficient_points' ? 400 : 503)).json(result);
  } catch (e) {
    res.status(503).json({ ok: false, reason: 'unavailable' });
  }
});
// 2. The public store-facing verification page (public/redeem.html) checks a
// code here — read-only, no side effects, safe with no auth.
app.get('/api/redeem/:code', redeemLimiter, async (req, res) => {
  try { res.json(await lookupRedemption(req.params.code)); }
  catch (e) { res.json({ status: 'not_found' }); }
});
// 3. Same page's "Mark as redeemed" button — the one-time-use gate.
app.post('/api/redeem/:code/confirm', redeemLimiter, async (req, res) => {
  try { res.json(await confirmRedemption(req.params.code)); }
  catch (e) { res.status(503).json({ status: 'not_found' }); }
});

const WAKING = [
  'Our sorting bot is still rubbing its eyes ☕ — give it a few seconds and tap scan again.',
  'Warming up the recycling brain… try that scan again in a moment.',
  'Booting up — even AIs need a coffee first. Try again shortly.'
];

const BIN_MAP = { recycle: 'recycle', organic: 'organics', trash: 'landfill', ewaste: 'ewaste_dropoff' };
const CONF = { high: 0.95, medium: 0.7, low: 0.4 };
const SCENE_Q = { good: 'ok', poor_lighting: 'too_dark', cluttered: 'cluttered', partial_view: 'blurry' };

app.post('/api/scan', sameOriginOnly, scanLimiter, async (req, res) => {
  const { image, city = 'livermore', user_id } = req.body || {};
  if (!image) return res.status(400).json({ error: 'image required' });

  // Livermore rules are the prompt default; other cities supply exception overrides.
  const rules = await getRules();
  const cityInfo = rules.cities[city];
  const cityName = cityInfo?.name || 'Livermore';
  const overrides = city === 'livermore' ? [] : (cityInfo?.exceptions || []);

  const det = await detectItems(image, overrides);
  if (det.error === 'not_ready') {
    return res.status(503).json({ status: 'waking', message: WAKING[Math.floor(Math.random() * WAKING.length)] });
  }
  if (det.error === 'failed') {
    return res.status(502).json({ status: 'error', message: 'Hmm, our scanner hiccuped. Please try that photo again.' });
  }

  // Translate the Livermore prompt's JSON into our existing response shape.
  const items = det.items.map((it, i) => ({
    item_id: String(i + 1),
    label: it.name || 'Unknown item',
    category: 'unknown',
    bin: BIN_MAP[it.bin] || 'landfill',
    soiled: !!it.soiled,
    confidence: CONF[it.confidence] || 0.7,
    tip: it.tip || ''
  }));

  const image_quality = SCENE_Q[det.scene_quality] || 'ok';
  const minConf = items.length ? Math.min(...items.map((i) => i.confidence)) : 0;
  const needs_disambiguation = items.length === 0
    || det.scene_quality === 'poor_lighting'
    || det.scene_quality === 'partial_view'
    || (items.length > 0 && items.every((i) => i.confidence <= 0.4));

  const pointValues = await getPointValues();
  const recommendations = items.map((it) => {
    const info = pointValues[it.bin] || pointValues.landfill;
    return { item_id: it.item_id, label: it.label, bin: it.bin, action: info.action, reasoning: it.tip || info.why };
  });

  const points_awarded = needs_disambiguation ? 0
    : recommendations.reduce((a, r) => a + (pointValues[r.bin]?.points || 0), 0);

  const overall = items.length > 1
    ? 'Multiple items — sort each into its bin below.'
    : (recommendations[0] ? `${recommendations[0].action}.` : '');

  if (points_awarded) { try { await recordPoints(user_id, points_awarded, items[0]?.bin); } catch (e) { /* ignore */ } }

  res.json({
    scan_id: Math.random().toString(36).slice(2, 10),
    mode: 'consumer',
    location: { city: cityName, city_id: city },
    items,
    recommendations,
    overall_guidance: overall,
    needs_disambiguation,
    points_awarded,
    detection_source: det.source,
    image_quality,
    confidence_overall: minConf
  });
});

// Serve built frontend in production (single service).
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => console.log(`TrashSmart Consumer listening on http://localhost:${PORT}`));
