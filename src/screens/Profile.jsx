import { useState } from 'react';
import { ALAMEDA_SCHOOLS } from '../schools.js';

export default function Profile({ user, gam, onSignOut, onUpdateOrg }) {
  const [editingSchool, setEditingSchool] = useState(false);
  const [query, setQuery] = useState(user.org || '');
  const [showSug, setShowSug] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestions = query.trim().length >= 2
    ? ALAMEDA_SCHOOLS.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  function startEdit() {
    setQuery(user.org || '');
    setEditingSchool(true);
    setShowSug(false);
  }

  async function save(name) {
    if (saving) return;
    setSaving(true);
    try { await onUpdateOrg(name); }
    finally { setSaving(false); setEditingSchool(false); setShowSug(false); }
  }

  return (
    <div className="body">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: 22, margin: '0 auto 8px' }}>
          {(user.firstName[0] || '?').toUpperCase()}
        </div>
        <b style={{ fontSize: 17 }}>{user.firstName}</b>
        <div className="small muted">{user.phone}</div>

        {!editingSchool && (
          <div className="small muted" style={{ marginTop: 2 }}>
            {user.org || 'No school on file'}{' '}
            <button
              onClick={startEdit}
              style={{ fontSize: 12, background: 'none', border: 'none', padding: 0, color: 'var(--green)', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {user.org ? 'change' : 'add'}
            </button>
          </div>
        )}

        {editingSchool && (
          <div className="field" style={{ position: 'relative', marginTop: 10, textAlign: 'left' }}>
            <input className="ti" value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSug(true); }}
              onFocus={() => setShowSug(true)}
              placeholder="Start typing a school name…" />
            {showSug && suggestions.length > 0 && (
              <div className="suggest">
                {suggestions.map((s) => (
                  <button key={s} onMouseDown={() => save(s)}>{s}</button>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              <button className="btn" style={{ flex: 1 }} disabled={saving || !query.trim()} onClick={() => save(query.trim())}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn sec" style={{ flex: 1 }} disabled={saving} onClick={() => setEditingSchool(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <div className="stat"><b>{gam.points.toLocaleString()}</b><span>points</span></div>
        <div className="stat"><b>{gam.streak}</b><span>day streak</span></div>
        <div className="stat"><b>{gam.divertedLb}<small style={{ fontSize: 10 }}>lb</small></b><span>diverted</span></div>
      </div>

      <button className="btn sec" style={{ marginTop: 16 }} onClick={onSignOut}>Log out</button>
    </div>
  );
}
