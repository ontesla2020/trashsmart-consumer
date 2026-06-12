import { useState } from 'react';
import { ALAMEDA_SCHOOLS } from '../schools.js';

function digits(s) { return (s || '').replace(/\D/g, ''); }

export default function Login({ onComplete }) {
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [query, setQuery] = useState('');
  const [showSug, setShowSug] = useState(false);

  const phoneOk = digits(phone).length >= 10;
  const detailsOk = firstName.trim().length >= 1 && phoneOk;

  const suggestions = query.trim().length >= 2
    ? ALAMEDA_SCHOOLS.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  function pickSchool(name) { setOrg(name); setQuery(name); setShowSug(false); }

  function submit() {
    if (!detailsOk) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
    onComplete({ id, firstName: firstName.trim(), phone: phone.trim(), org: org.trim() });
  }

  return (
    <div className="loginwrap">
      <div className="loginhero">
        <img className="logo" src="/logo-icon.svg" alt="TrashSmart" />
        <h2 style={{ fontSize: 22 }}>Welcome to TrashSmart</h2>
        <div className="small muted">Scan, sort it right, earn rewards. No password needed.</div>
      </div>

      <div className="field">
        <label>First name <span className="req">*</span></label>
        <input className="ti" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your first name" />
      </div>

      <div className="field">
        <label>Mobile number <span className="req">*</span></label>
        <input className="ti" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your mobile number" />
      </div>

      <div className="field" style={{ position: 'relative' }}>
        <label>School or company <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <input className="ti" value={query}
          onChange={(e) => { setQuery(e.target.value); setOrg(e.target.value); setShowSug(true); }}
          onFocus={() => setShowSug(true)}
          placeholder="Start typing a school name…" />
        {showSug && suggestions.length > 0 && (
          <div className="suggest">
            {suggestions.map((s) => (
              <button key={s} onMouseDown={() => pickSchool(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>

      <button className="btn" style={{ marginTop: 6 }} disabled={!detailsOk} onClick={submit}>
        Get started
      </button>
      <div className="tiny muted" style={{ textAlign: 'center', marginTop: 12 }}>
        By continuing you agree to receive recycling tips and reward updates.
      </div>
    </div>
  );
}
