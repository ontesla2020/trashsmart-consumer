import { useState } from 'react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ALAMEDA_SCHOOLS } from '../schools.js';

function digits(s) { return (s || '').replace(/\D/g, ''); }

// Strip a leading US country code (1) if present, so "+1 (510) 555-0132"
// and "5105550132" both normalize to the same 10 digits.
function normalizedPhone(phone) {
  let d = digits(phone);
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d;
}

// Checks the number against libphonenumber-js's real area-code / number-range
// metadata (a lighter port of Google's own phone number library), rather than
// just checking length and NANP formatting rules — catches area codes that
// were never actually assigned, not just structurally-impossible ones.
export function isValidPhone(phone) {
  const d = normalizedPhone(phone);
  if (d.length !== 10) return false;
  return isValidPhoneNumber(d, 'US');
}

// Turns a phone number into a stable, deterministic account ID: the SAME
// phone number always hashes to the SAME id, so signing in again — same
// device or a new one — lands back on the same account instead of a fresh
// random UUID every time.
//
// Important: this is NOT identity verification. Nothing here proves the
// person typing the number actually owns it — there's no SMS/OTP check.
// It only buys account *continuity* (same input -> same account), not
// account *security* (proof of ownership). The hashing algorithm itself is
// public (it ships in this file), so it isn't hiding anything either — its
// only job is turning "5105550132" into a well-formed, collision-resistant
// UUID that fits the existing `profiles.id uuid` column in Supabase.
async function phoneToId(phone) {
  const clean = normalizedPhone(phone);
  const data = new TextEncoder().encode('trashsmart:' + clean);
  let bytes;
  try {
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    bytes = new Uint8Array(hashBuf).slice(0, 16);
  } catch {
    // crypto.subtle needs a secure context (https, or localhost in dev).
    // Fall back to a random id rather than crash — same behavior as before
    // this change, just for the rare browser/context where it's unavailable.
    return (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2);
  }
  // Stamp RFC 4122 version (5, "name-based") and variant bits so this reads
  // as a well-formed UUID rather than just 16 random-looking bytes.
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function Login({ onComplete }) {
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [query, setQuery] = useState('');
  const [showSug, setShowSug] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const phoneTouched = digits(phone).length >= 10;
  const phoneOk = isValidPhone(phone);
  const detailsOk = firstName.trim().length >= 1 && phoneOk;

  const suggestions = query.trim().length >= 2
    ? ALAMEDA_SCHOOLS.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  function pickSchool(name) { setOrg(name); setQuery(name); setShowSug(false); }

  async function submit() {
    if (!detailsOk || submitting) return;
    setSubmitting(true);
    try {
      const id = await phoneToId(phone);
      // Await onComplete (App.jsx's completeLogin) so "One sec…" covers the
      // whole flow, including the server round-trip that restores this
      // account's real point total — not just the local id hashing.
      await onComplete({ id, firstName: firstName.trim(), phone: phone.trim(), org: org.trim() });
    } finally {
      setSubmitting(false);
    }
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
        {phoneTouched && !phoneOk && (
          <div className="tiny" style={{ color: '#a32d2d', marginTop: 4 }}>That doesn't look like a real US mobile number — double-check it.</div>
        )}
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

      <button className="btn" style={{ marginTop: 6 }} disabled={!detailsOk || submitting} onClick={submit}>
        {submitting ? 'One sec…' : 'Get started'}
      </button>
      <div className="tiny muted" style={{ textAlign: 'center', marginTop: 12 }}>
        By continuing you agree to receive recycling tips and reward updates.
      </div>
    </div>
  );
}
