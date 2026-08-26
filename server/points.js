import { createClient } from '@supabase/supabase-js';

// Points-per-category (per bin). Live when Supabase is configured (table:
// `point_values`), otherwise a fallback matching the old hardcoded values —
// see sql/2026-08-25-rewards-and-points.sql for the seed data.
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
export const usingSupabase = !!sb;

const FALLBACK_POINTS = {
  organics: { name: 'Organics', action: 'Compost it', why: 'Food and plant scraps are composted here.', points: 15 },
  recycle: { name: 'Recycle', action: 'Rinse & recycle', why: 'Empty and rinse, then place in the blue cart.', points: 20 },
  landfill: { name: 'Landfill', action: 'Trash it', why: "This isn't recyclable or compostable locally.", points: 5 },
  ewaste_dropoff: { name: 'E-waste drop-off', action: 'Take to drop-off', why: 'Electronics need a special drop-off — never the curb.', points: 30 },
  hazardous_dropoff: { name: 'Hazardous drop-off', action: 'Take to drop-off', why: 'Hazardous material needs a designated facility.', points: 30 }
};

// { bin_id: { name, action, why, points } } — same shape the scan handler
// used to get from the old hardcoded BIN_INFO, just editable now without a
// redeploy.
export async function getPointValues() {
  if (!sb) return FALLBACK_POINTS;
  const { data, error } = await sb.from('point_values').select('bin, name, action, why, points');
  if (error) { console.error('[getPointValues] Supabase error:', error.message || error); return FALLBACK_POINTS; }
  if (!data || !data.length) return FALLBACK_POINTS;
  const map = {};
  data.forEach((r) => { map[r.bin] = { name: r.name, action: r.action, why: r.why, points: r.points }; });
  return map;
}
