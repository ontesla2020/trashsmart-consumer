// Regenerates src/schools.js from the official CDE "California Public Schools"
// ArcGIS feature service, filtered to Alameda County schools serving grades 6-12
// (middle, high, and K-12 combinations; elementary-only excluded).
//
// Run from the trashsmart-consumer folder:
//   node scripts/fetch-schools.mjs
//
// Requires Node 18+ (global fetch). Overwrites src/schools.js.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = 'https://services3.arcgis.com/fdvHcZVgB2QSRNkL/arcgis/rest/services/SchoolSites2425/FeatureServer/0/query';

const GRADE = { P: 0, PK: 0, TK: 0, K: 0, N: 0, A: 0 };
function gradeNum(tok) {
  if (tok == null) return null;
  const t = String(tok).trim().toUpperCase();
  if (t in GRADE) return GRADE[t];
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}
// True if the school serves any grade in 6-12 (i.e. not elementary-only).
function servesSecondary(attrs, gradeField, levelField) {
  if (gradeField && attrs[gradeField]) {
    const parts = String(attrs[gradeField]).split('-');
    const high = gradeNum(parts[parts.length - 1]);
    if (high != null) return high >= 6;
  }
  if (levelField && attrs[levelField]) {
    const lvl = String(attrs[levelField]).toLowerCase();
    if (/element|primary/.test(lvl) && !/high|middle|intermediate|secondary|combin/.test(lvl)) return false;
    return /middle|intermediate|high|secondary|combin|k-?12/.test(lvl);
  }
  return false;
}

function pick(keys, patterns) {
  for (const p of patterns) {
    const hit = keys.find((k) => p.test(k));
    if (hit) return hit;
  }
  return null;
}

async function q(params) {
  const url = BASE + '?' + new URLSearchParams({ f: 'json', returnGeometry: 'false', ...params });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ArcGIS ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j;
}

async function main() {
  // 1) read one record to discover field names
  const sample = await q({ where: '1=1', outFields: '*', resultRecordCount: '1' });
  const keys = Object.keys(sample.features?.[0]?.attributes || {});
  if (!keys.length) throw new Error('no fields returned');

  const countyField = pick(keys, [/^countyname$/i, /county/i]);
  const nameField = pick(keys, [/^schoolname$/i, /school.*name/i, /^school$/i, /^sch_name$/i]);
  const gradeField = pick(keys, [/gsoffered/i, /gsserved/i, /grade.*off/i, /grades/i]);
  const levelField = pick(keys, [/schoollevel/i, /eilname/i, /^level$/i]);
  if (!countyField || !nameField) throw new Error(`could not detect fields. Got: ${keys.join(', ')}`);

  // 2) page through Alameda County
  const out = new Set();
  let offset = 0;
  const page = 1000;
  for (;;) {
    const j = await q({
      where: `${countyField}='Alameda'`,
      outFields: [nameField, gradeField, levelField].filter(Boolean).join(','),
      resultRecordCount: String(page),
      resultOffset: String(offset)
    });
    const feats = j.features || [];
    for (const f of feats) {
      const a = f.attributes;
      const name = (a[nameField] || '').trim();
      if (name && servesSecondary(a, gradeField, levelField)) out.add(name);
    }
    if (feats.length < page && !j.exceededTransferLimit) break;
    offset += feats.length || page;
    if (offset > 20000) break;
  }

  const list = [...out].sort((a, b) => a.localeCompare(b));
  const body =
    '// Auto-generated from the CDE California Public Schools directory (Alameda County,\n' +
    '// schools serving grades 6-12). Regenerate with: node scripts/fetch-schools.mjs\n' +
    `export const ALAMEDA_SCHOOLS = ${JSON.stringify(list, null, 2)};\n`;

  const dest = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'schools.js');
  writeFileSync(dest, body);
  console.log(`Wrote ${list.length} schools to src/schools.js`);
  console.log(`(fields used — county: ${countyField}, name: ${nameField}, grade: ${gradeField}, level: ${levelField})`);
}

main().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
