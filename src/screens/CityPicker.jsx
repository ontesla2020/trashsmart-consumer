import { useState } from 'react';
import { zipToCity, slugify } from '../geo.js';

export default function CityPicker({ cities, current, onPick, onUseLocation }) {
  const [zip, setZip] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const list = Object.entries(cities || {})
    .map(([id, c]) => ({ id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  function resolve(name) {
    const id = slugify(name);
    return { id, name: cities[id]?.name || name, known: !!cities[id] };
  }

  async function findZip() {
    if (zip.length < 5) return;
    setBusy(true); setNote('');
    const r = await zipToCity(zip.trim());
    setBusy(false);
    if (!r) { setNote("Couldn't find that ZIP. Try picking your city below."); return; }
    onPick(resolve(r.city));
  }

  return (
    <div className="body">
      <b style={{ fontSize: 17, display: 'block', margin: '0 0 4px' }}>Your location</b>
      <div className="small muted" style={{ marginBottom: 12 }}>We use this to load your city's sorting rules.</div>

      <button className="btn" onClick={onUseLocation}>📍 Use my current location</button>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Or enter your ZIP code</label>
        <div className="row" style={{ gap: 8 }}>
          <input className="ti" inputMode="numeric" maxLength={5} value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 94550" />
          <button className="btn" style={{ width: 'auto', padding: '12px 18px' }} disabled={zip.length < 5 || busy} onClick={findZip}>
            {busy ? '…' : 'Find'}
          </button>
        </div>
        {note && <div className="tiny" style={{ color: '#a32d2d', marginTop: 6 }}>{note}</div>}
      </div>

      <div className="sectitle">Or pick your city</div>
      <div className="card" style={{ padding: '4px 14px' }}>
        {list.map((c) => (
          <button key={c.id} className="stoprow" onClick={() => onPick({ id: c.id, name: c.name, known: true })}>
            <span style={{ flex: 1, fontWeight: c.id === current ? 700 : 500, fontSize: 14 }}>{c.name}</span>
            {c.id === current && <span className="pill green">Current</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
