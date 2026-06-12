import { createClient } from '@supabase/supabase-js';
import { UNIVERSAL_DEFAULTS, CATEGORIES, CATEGORY_LABEL, BINS, BIN_LABEL } from './ruleset.js';

// Shared rules store. When SUPABASE_URL + key are set, rules live in Supabase
// (single source of truth across the consumer + inspector apps). Otherwise an
// in-memory copy is used so the apps still run for local demos.
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const sb = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
export const usingSupabase = !!sb;

function slug(n) { return n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
const AC_CITIES = ['Livermore', 'Oakland', 'Dublin', 'Pleasanton', 'Fremont', 'Hayward', 'Berkeley',
  'Alameda', 'Albany', 'Emeryville', 'Piedmont', 'Newark', 'Union City', 'San Leandro', 'San Lorenzo', 'Castro Valley'];
const seedCities = {};
AC_CITIES.forEach((n) => { seedCities[slug(n)] = { name: n, county: 'Alameda', overrides: {}, exceptions: [] }; });
seedCities.livermore.exceptions = ['Pizza boxes go in Organics even if greasy.'];

const mem = {
  universal: { ...UNIVERSAL_DEFAULTS },
  cities: seedCities
};

function meta() {
  return {
    categories: CATEGORIES.map((id) => ({ id, label: CATEGORY_LABEL[id] })),
    bins: BINS.map((id) => ({ id, label: BIN_LABEL[id] }))
  };
}

function withDefaults(map) {
  const out = { ...map };
  for (const c of CATEGORIES) if (!(c in out)) out[c] = UNIVERSAL_DEFAULTS[c];
  return out;
}

export async function getRules() {
  if (!sb) {
    return {
      universal: { category_bin_map: withDefaults(mem.universal), notes: ['Separate food from its packaging; sort each part independently.'] },
      cities: mem.cities,
      meta: meta()
    };
  }
  const [{ data: cities }, { data: rules }, { data: exc }] = await Promise.all([
    sb.from('cities').select('*'),
    sb.from('rules').select('*'),
    sb.from('exceptions').select('*')
  ]);
  const universal = {};
  const cityMap = {};
  (cities || []).forEach((c) => { cityMap[c.id] = { name: c.name, county: c.county || '', overrides: {}, exceptions: [] }; });
  (rules || []).forEach((r) => {
    if (!r.city_id) universal[r.category] = r.bin;
    else if (cityMap[r.city_id]) cityMap[r.city_id].overrides[r.category] = r.bin;
  });
  (exc || []).forEach((e) => { if (cityMap[e.city_id]) cityMap[e.city_id].exceptions.push(e.note); });
  return { universal: { category_bin_map: withDefaults(universal), notes: [] }, cities: cityMap, meta: meta() };
}

export async function effectiveMap(cityId) {
  if (!sb) return withDefaults({ ...mem.universal, ...(mem.cities[cityId]?.overrides || {}) });
  const { data: rules } = await sb.from('rules').select('category,bin,city_id').or(`city_id.eq.,city_id.eq.${cityId}`);
  const universal = {};
  const over = {};
  (rules || []).forEach((r) => { if (!r.city_id) universal[r.category] = r.bin; else over[r.category] = r.bin; });
  return withDefaults({ ...universal, ...over });
}

export async function setUniversalRule(category, bin) {
  if (!CATEGORIES.includes(category) || !BINS.includes(bin)) return false;
  if (!sb) { mem.universal[category] = bin; return true; }
  const { error } = await sb.from('rules').upsert({ city_id: '', category, bin }, { onConflict: 'city_id,category' });
  return !error;
}

export async function setCityRule(cityId, category, bin) {
  if (!CATEGORIES.includes(category)) return false;
  if (!sb) {
    const c = mem.cities[cityId];
    if (!c) return false;
    if (!bin || bin === 'inherit') delete c.overrides[category];
    else { if (!BINS.includes(bin)) return false; c.overrides[category] = bin; }
    return true;
  }
  if (!bin || bin === 'inherit') {
    const { error } = await sb.from('rules').delete().eq('city_id', cityId).eq('category', category);
    return !error;
  }
  if (!BINS.includes(bin)) return false;
  const { error } = await sb.from('rules').upsert({ city_id: cityId, category, bin }, { onConflict: 'city_id,category' });
  return !error;
}

export async function setCityExceptions(cityId, list) {
  if (!Array.isArray(list)) return false;
  const clean = list.filter((e) => typeof e === 'string' && e.trim()).map((e) => e.trim());
  if (!sb) { if (!mem.cities[cityId]) return false; mem.cities[cityId].exceptions = clean; return true; }
  await sb.from('exceptions').delete().eq('city_id', cityId);
  if (clean.length) await sb.from('exceptions').insert(clean.map((note) => ({ city_id: cityId, note })));
  return true;
}

export async function addCity({ name, county }) {
  if (!name || !name.trim()) return null;
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!sb) { if (!mem.cities[id]) mem.cities[id] = { name: name.trim(), county: (county || '').trim(), overrides: {}, exceptions: [] }; return id; }
  await sb.from('cities').upsert({ id, name: name.trim(), county: (county || '').trim() }, { onConflict: 'id' });
  return id;
}
