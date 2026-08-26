import { useState } from 'react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ALAMEDA_SCHOOLS } from '../schools.js';
import * as api from '../api.js';

function digits(s) { return (s || '').replace(/\D/g, ''); }

// Formats digits as the user types into 555-123-4567, capped at 10 digits
// (a leading US country code, if pasted in, gets stripped elsewhere before
// validation/hashing — this is purely a display convenience).
function formatPhoneDisplay(raw) {
  const d = digits(raw).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

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
  // 'phone'    -> just asking for a mobile number
  // 'welcome'  -> recognized number, confirming the saved account
  // 'register' -> unrecognized number (or lookup failed), collecting name + school
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [org, setOrg] = useState('');
  const [query, setQuery] = useState('');
  const [showSug, setShowSug] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState(null); // { id, firstName, org }
  const [lookupFailed, setLookupFailed] = useState(false);

  const phoneTouched = digits(phone).length >= 10;
  const phoneOk = isValidPhone(phone);
  const detailsOk = firstName.trim().length >= 1 && phoneOk;

  const suggestions = query.trim().length >= 2
    ? ALAMEDA_SCHOOLS.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  function pickSchool(name) { setOrg(name); setQuery(name); setShowSug(false); }

  // Step 1 -> 2: look up whether this phone number already has an account,
  // so we only ever ask for name/school once, ever, per phone number.
  // If the lookup itself fails (offline, server hiccup), fall through to
  // registration rather than stranding the person — worst case they
  // re-enter info they'd already given us once.
  async function checkPhone() {
    if (!phoneOk || submitting) return;
    setSubmitting(true);
    setLookupFailed(false);
    try {
      const id = await phoneToId(phone);
      const profile = await api.getProfile(id);
      if (profile) {
        setExisting({ id, firstName: profile.first_name || '', org: profile.school || '' });
        setStep('welcome');
      } else {
        setStep('register');
      }
    } catch {
      setLookupFailed(true);
      setStep('register');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmWelcome() {
    if (!existing || submitting) return;
    setSubmitting(true);
    try {
      // Sign in with exactly what's saved — never anything re-typed here,
      // so a returning login can't silently overwrite the stored school.
      await onComplete({ id: existing.id, firstName: existing.firstName, phone: phone.trim(), org: existing.org });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRegister() {
    if (!detailsOk || submitting) return;
    setSubmitting(true);
    try {
      const id = await phoneToId(phone);
      await onComplete({ id, firstName: firstName.trim(), phone: phone.trim(), org: org.trim() });
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'phone') {
    return (
      <div className="loginwrap">
        <div className="loginhero">
          <img className="logo" src="/logo-icon.svg" alt="TrashSmart" />
          <h2 style={{ fontSize: 22 }}>Welcome to TrashSmart</h2>
          <div className="small muted">Scan, sort it right, earn rewards. No password needed.</div>
        </div>

        <div className="field">
          <label>Mobile number <span className="req">*</span></label>
          <input className="ti" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))} placeholder="555-123-4567" />
          {phoneTouched && !phoneOk && (
            <div className="tiny" style={{ color: '#a32d2d', marginTop: 4 }}>That doesn't look like a real US mobile number — double-check it.</div>
          )}
        </div>

        <button className="btn" style={{ marginTop: 6 }} disabled={!phoneOk || submitting} onClick={checkPhone}>
          {submitting ? 'One sec…' : 'Continue'}
        </button>
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <div className="loginwrap">
        <div className="loginhero">
          <img className="logo" src="/logo-icon.svg" alt="TrashSmart" />
          <h2 style={{ fontSize: 22 }}>Welcome back, {existing.firstName || 'there'}!</h2>
          <div className="small muted">{existing.org || 'No school on file yet'}</div>
        </div>

        <button className="btn" style={{ marginTop: 6 }} disabled={submitting} onClick={confirmWelcome}>
          {submitting ? 'One sec…' : 'Continue'}
        </button>
        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 12 }}>
          Wrong school? Update it anytime from your Profile tab.
        </div>
      </div>
    );
  }

  // step === 'register'
  return (
    <div className="loginwrap">
      <div className="loginhero">
        <img className="logo" src="/logo-icon.svg" alt="TrashSmart" />
        <h2 style={{ fontSize: 22 }}>Let's get you set up</h2>
        <div className="small muted">
          {lookupFailed ? "Couldn't check for an existing account — let's set one up." : 'First time here — tell us a bit about you.'}
        </div>
      </div>

      <div className="field">
        <label>First name <span className="req">*</span></label>
        <input className="ti" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your first name" />
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

      <button className="btn" style={{ marginTop: 6 }} disabled={!detailsOk || submitting} onClick={submitRegister}>
        {submitting ? 'One sec…' : 'Get started'}
      </button>
      <div className="tiny muted" style={{ textAlign: 'center', marginTop: 12 }}>
        By continuing you agree to receive recycling tips and reward updates.
      </div>
    </div>
  );
}
