import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { detectItems } from './detect.js';
import { binFor } from './scoring.js';
import { effectiveMap, getRules } from './rules.js';
import { upsertProfile, recordPoints, joinChallenge, leaveChallenge, leaderboard } from './leaderboards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Friendly, action-oriented guidance per destination bin.
// Points are per item and match the in-app "Points per item" guide.
const BIN_INFO = {
  organics: { name: 'Organics', action: 'Compost it', why: 'Food and plant scraps are composted here.', points: 15 },
  recycle: { name: 'Recycle', action: 'Rinse & recycle', why: 'Empty and rinse, then place in the blue cart.', points: 20 },
  landfill: { name: 'Landfill', action: 'Trash it', why: "This isn't recyclable or compostable locally.", points: 5 },
  ewaste_dropoff: { name: 'E-waste drop-off', action: 'Take to drop-off', why: 'Electronics need a special drop-off — never the curb.', points: 30 },
  hazardous_dropoff: { name: 'Hazardous drop-off', action: 'Take to drop-off', why: 'Hazardous material needs a designated facility.', points: 30 }
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/rules', async (_req, res) => res.json(await getRules()));

// ---- Profiles & leaderboards ----
app.post('/api/profile', async (req, res) => { try { await upsertProfile(req.body || {}); } catch (e) { /* ignore */ } res.json({ ok: true }); });
app.post('/api/challenges/:id/join', async (req, res) => { try { await joinChallenge(req.body?.user_id, req.params.id); } catch (e) { /* ignore */ } res.json({ ok: true }); });
app.post('/api/challenges/:id/leave', async (req, res) => { try { await leaveChallenge(req.body?.user_id, req.params.id); } catch (e) { /* ignore */ } res.json({ ok: true }); });
app.get('/api/challenges/:id/leaderboard', async (req, res) => {
  try { res.json(await leaderboard(req.params.id, req.query.user_id, req.query.school)); }
  catch (e) { res.json({ live: false, rows: [] }); }
});

const WAKING = [
  'Our sorting bot is still rubbing its eyes ☕ — give it a few seconds and tap scan again.',
  'Warming up the recycling brain… try that scan again in a moment.',
  'Booting up — even AIs need a coffee first. Try again shortly.'
];

app.post('/api/scan', async (req, res) => {
  const { image, city = 'livermore', user_id } = req.body || {};
  if (!image) return res.status(400).json({ error: 'image required' });

  const det = await detectItems(image);
  if (det.error === 'not_ready') {
    return res.status(503).json({ status: 'waking', message: WAKING[Math.floor(Math.random() * WAKING.length)] });
  }
  if (det.error === 'failed') {
    return res.status(502).json({ status: 'error', message: 'Hmm, our scanner hiccuped. Please try that photo again.' });
  }
  const map = await effectiveMap(city);
  const cities = (await getRules()).cities;
  const cityName = cities[city]?.name || 'Livermore';

  const items = det.items.map((it, i) => ({ ...it, item_id: String(i + 1) }));

  // Low confidence / bad photo → ask before guessing.
  const minConf = items.length ? Math.min(...items.map((i) => (typeof i.confidence === 'number' ? i.confidence : 1))) : 0;
  const needs_disambiguation = items.length === 0 || (det.image_quality && det.image_quality !== 'ok') || minConf < 0.6;

  const recommendations = items.map((it) => {
    const bin = binFor(it.category, map);
    const info = BIN_INFO[bin] || BIN_INFO.landfill;
    return { item_id: it.item_id, label: it.label, bin, action: info.action, reasoning: info.why };
  });

  const multi = items.length > 1;
  // Points per item, matching the in-app "Points per item" guide.
  const points_awarded = needs_disambiguation ? 0
    : recommendations.reduce((a, r) => a + (BIN_INFO[r.bin]?.points || 0), 0);

  const overall = multi
    ? 'Two things in one — separate them: empty the contents, then sort the packaging.'
    : recommendations[0]?.action ? `${recommendations[0].action}.` : '';

  if (points_awarded) { try { await recordPoints(user_id, points_awarded, items[0]?.category); } catch (e) { /* ignore */ } }

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
    image_quality: det.image_quality,
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
