import { useState, useEffect } from 'react';
import Onboarding from './screens/Onboarding.jsx';
import Login from './screens/Login.jsx';
import Profile from './screens/Profile.jsx';
import Home from './screens/Home.jsx';
import Capture from './screens/Capture.jsx';
import Analyzing from './screens/Analyzing.jsx';
import Result from './screens/Result.jsx';
import Disambiguate from './screens/Disambiguate.jsx';
import Rewards from './screens/Rewards.jsx';
import Redeem from './screens/Redeem.jsx';
import Challenges from './screens/Challenges.jsx';
import CityPicker from './screens/CityPicker.jsx';
import Celebration from './screens/Celebration.jsx';
import Nav from './components/Nav.jsx';
import * as api from './api.js';
import { BIN_LABEL } from './lib.js';
import { resolveLocation, slugify } from './geo.js';
import { INITIAL_GAM, REWARDS, CHALLENGES } from './data.js';

const TAB_SCREENS = ['home', 'challenges', 'rewards', 'profile'];

function newId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
}
function loadCity() {
  try { const c = JSON.parse(localStorage.getItem('ts_city') || 'null'); return c || { id: 'livermore', name: 'Livermore', known: true }; }
  catch { return { id: 'livermore', name: 'Livermore', known: true }; }
}
function loadUser() {
  try {
    const u = JSON.parse(localStorage.getItem('ts_user') || 'null');
    if (u && !u.id) { u.id = newId(); localStorage.setItem('ts_user', JSON.stringify(u)); }
    return u;
  } catch { return null; }
}
// Local calendar-day key (not UTC) — matches the weekday row in Home.jsx,
// which also uses local time (`new Date().getDay()`), so "today" means the
// same thing in both places.
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadGam() {
  try {
    const s = JSON.parse(localStorage.getItem('ts_gam2') || 'null');
    if (!s) return { ...INITIAL_GAM, ringDay: todayKey() };
    // A new calendar day since the last save (or a first-ever save, which
    // has no ringDay yet) means the rings start over at 0 — no history is
    // kept, this just re-zeroes the count. Goals the user customized carry
    // over; only the done count resets.
    const isNewDay = s.ringDay !== todayKey();
    const rings = {};
    for (const k of Object.keys(INITIAL_GAM.rings)) {
      const base = INITIAL_GAM.rings[k];
      const saved = s.rings && s.rings[k];
      rings[k] = {
        ...base,
        done: isNewDay ? 0 : (saved?.done ?? base.done),
        goal: saved?.goal ?? base.goal
      };
    }
    return { ...INITIAL_GAM, ...s, rings, ringDay: todayKey() };
  } catch { return { ...INITIAL_GAM, ringDay: todayKey() }; }
}

export default function App() {
  const [user, setUser] = useState(loadUser);
  const [onboarded, setOnboarded] = useState(() => {
    try { return localStorage.getItem('ts_onboarded') === '1'; } catch { return false; }
  });
  const [screen, setScreen] = useState('home');
  const [gam, setGam] = useState(loadGam);
  const [active, setActive] = useState(null);
  const [redeemReward, setRedeemReward] = useState(null);
  const [error, setError] = useState(null);
  const [city, setCity] = useState(loadCity);
  const [citiesMap, setCitiesMap] = useState({});

  useEffect(() => { try { localStorage.setItem('ts_gam2', JSON.stringify(gam)); } catch (e) { /* ignore */ } }, [gam]);

  // The rings' "done" counts are meant to reset at midnight, but loadGam()
  // above only checks the date once, at page load. If the app is left open
  // (or just backgrounded, which is the common case for a home-screen PWA)
  // across midnight, that check never re-runs on its own — so also re-check
  // whenever the app comes back to the foreground.
  useEffect(() => {
    function checkDayRollover() {
      const today = todayKey();
      setGam((g) => {
        if (g.ringDay === today) return g;
        const rings = {};
        for (const k of Object.keys(g.rings)) rings[k] = { ...g.rings[k], done: 0 };
        return { ...g, rings, ringDay: today };
      });
    }
    function onVisible() { if (document.visibilityState === 'visible') checkDayRollover(); }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', checkDayRollover);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', checkDayRollover);
    };
  }, []);

  // Load the list of cities (for the picker) and auto-detect once (unless the
  // user has manually chosen a city — that choice is persisted).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.getRules().then((r) => { if (!cancelled) setCitiesMap(r.cities || {}); }).catch(() => {});
    if (!localStorage.getItem('ts_city')) {
      (async () => {
        const loc = await resolveLocation();
        if (cancelled || !loc?.city) return;
        const id = slugify(loc.city);
        let known = false;
        try { const r = await api.getRules(); known = !!(r.cities && r.cities[id]); } catch (e) { /* ignore */ }
        setCity({ id, name: loc.city, known });
      })();
    }
    return () => { cancelled = true; };
  }, [user]);

  function pickCity(c) {
    try { localStorage.setItem('ts_city', JSON.stringify(c)); } catch (e) { /* ignore */ }
    setCity(c);
    setScreen('home');
  }
  async function useMyLocation() {
    try { localStorage.removeItem('ts_city'); } catch (e) { /* ignore */ }
    const loc = await resolveLocation();
    if (!loc?.city) { setError('Location unavailable — pick your city instead.'); return; }
    const id = slugify(loc.city);
    setCity({ id, name: loc.city, known: !!citiesMap[id] });
    setScreen('home');
  }

  function finishOnboarding() {
    try { localStorage.setItem('ts_onboarded', '1'); } catch (e) { /* ignore */ }
    setOnboarded(true);
  }
  async function completeLogin(u) {
    try { localStorage.setItem('ts_user', JSON.stringify(u)); } catch (e) { /* ignore */ }
    api.saveProfile(u).catch(() => {});
    // Restore the real point total from the server (the ledger is the
    // source of truth) instead of always starting fresh — this is what
    // makes "same phone number logs back into the same account" actually
    // mean something. Rings / streak / diverted-lb aren't tracked
    // server-side yet, so those still reset to their defaults for now.
    let restoredPoints = 0;
    try { const r = await api.getUserPoints(u.id); restoredPoints = r?.points || 0; } catch (e) { /* ignore, defaults to 0 */ }
    const fresh = JSON.parse(JSON.stringify(INITIAL_GAM));
    fresh.points = restoredPoints;
    fresh.ringDay = todayKey();
    // Rings always start at 0 done — INITIAL_GAM's non-zero ring values
    // (2/4, 1/3, 1/2) are just seeded "looks populated" demo numbers, not a
    // real starting point for an actual login. Goals stay at the defaults
    // since per-user goal customization isn't tracked server-side either.
    for (const k of Object.keys(fresh.rings)) fresh.rings[k].done = 0;
    setGam(fresh);
    setUser(u);
    setScreen('home');
  }
  function signOut() {
    try { localStorage.removeItem('ts_user'); } catch (e) { /* ignore */ }
    setUser(null);
    setScreen('home');
  }

  // Updates just the saved school/org — used from the Profile tab so a
  // change there never touches name/phone, and login never has to.
  async function updateOrg(newOrg) {
    const u = { ...user, org: newOrg };
    try { localStorage.setItem('ts_user', JSON.stringify(u)); } catch (e) { /* ignore */ }
    setUser(u);
    try { await api.saveProfile(u); } catch (e) { /* ignore */ }
  }

  const nextReward = [...REWARDS].sort((a, b) => a.cost - b.cost).find((r) => r.cost > gam.points) || null;

  async function handleScan(image) {
    setError(null);
    setScreen('analyzing');
    const started = Date.now();
    try {
      const result = await api.scan({ image, user_id: user?.id, city: city.id });
      const wait = Math.max(0, 1000 - (Date.now() - started));
      setTimeout(() => {
        setActive(result);
        setScreen(result.needs_disambiguation ? 'disambiguate' : 'result');
      }, wait);
    } catch (e) {
      setError(e.message);
      setScreen('capture');
    }
  }

  function finishScan() {
    const recs = active.recommendations || [];
    const keys = ['recycle', 'organics', 'landfill'];
    const closedBefore = keys.every((k) => gam.rings[k].done >= gam.rings[k].goal);

    const rings = JSON.parse(JSON.stringify(gam.rings));
    let recN = 0, orgN = 0, lanN = 0;
    recs.forEach((r) => {
      if (r.bin === 'recycle' || r.bin === 'ewaste_dropoff') recN++;
      else if (r.bin === 'organics') orgN++;
      else lanN++;
    });
    rings.recycle.done = Math.min(rings.recycle.goal, rings.recycle.done + recN);
    rings.organics.done = Math.min(rings.organics.goal, rings.organics.done + orgN);
    rings.landfill.done = Math.min(rings.landfill.goal, rings.landfill.done + lanN);

    const first = recs[0];
    setGam({
      ...gam,
      points: gam.points + (active.points_awarded || 0),
      rings,
      divertedLb: (gam.divertedLb || 0) + (recN + orgN > 0 ? 1 : 0),
      lastScan: first ? `${active.items[0].label} → ${BIN_LABEL[first.bin]}` : gam.lastScan
    });

    const closedNow = keys.every((k) => rings[k].done >= rings[k].goal);
    setActive(null);
    setScreen(!closedBefore && closedNow ? 'celebration' : 'home');
  }

  function setGoal(key, delta) {
    setGam((g) => {
      const goal = Math.max(1, Math.min(20, g.rings[key].goal + delta));
      return { ...g, rings: { ...g.rings, [key]: { ...g.rings[key], goal } } };
    });
  }

  function joinChallenge(id) {
    api.joinChallengeApi(id, user?.id).catch(() => {});
    setGam((g) => ({ ...g, joined: [...new Set([...(g.joined || []), id])] }));
  }
  function leaveChallenge(id) {
    api.leaveChallengeApi(id, user?.id).catch(() => {});
    setGam((g) => ({ ...g, joined: (g.joined || []).filter((x) => x !== id) }));
  }

  // Spends points server-side and returns the redemption ticket (code +
  // expiry) for Redeem.jsx to display, or null on failure (Redeem.jsx shows
  // its own error in that case). Does NOT change screens here — the ticket
  // stays on the redeem screen until the user taps "Done".
  async function confirmRedeem(reward) {
    try {
      const result = await api.redeemReward(user.id, reward.id);
      if (!result.ok) {
        setError(result.reason === 'insufficient_points'
          ? "You don't have enough points for that yet."
          : "That didn't go through — try again.");
        return null;
      }
      // Real deduction already happened server-side; reflecting it locally
      // now is safe because we know it actually succeeded.
      setGam((g) => ({ ...g, points: g.points - reward.cost }));
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }

  const showNav = TAB_SCREENS.includes(screen);
  const navActive = TAB_SCREENS.includes(screen) ? screen : null;
  const showBack = ['capture', 'result', 'disambiguate', 'redeem'].includes(screen);

  if (!user && !onboarded) return <Onboarding onDone={finishOnboarding} />;
  if (!user) return <Login onComplete={completeLogin} />;

  return (
    <div className={'app' + (showNav ? ' has-nav' : '')}>
      <div className="appbar">
        <div className="brand">
          {showBack
            ? <button className="navi" style={{ flex: 'none', fontSize: 20, color: 'var(--ink)' }} onClick={() => setScreen(screen === 'redeem' ? 'rewards' : 'home')}>‹</button>
            : <img className="logo" src="/logo-icon.svg" alt="" />}
          TrashSmart
        </div>
        <button className="loc locbtn" onClick={() => setScreen('citypicker')}>📍 {city.name}{city.known === false ? ' · general' : ''} ▾</button>
      </div>

      {error && (
        <div className="banner" style={{ margin: '12px 16px 0', color: '#a32d2d', borderColor: '#f0c1c1' }}>{error}</div>
      )}

      {screen === 'home' && <Home gam={gam} firstName={user.firstName} nextReward={nextReward} onScan={() => setScreen('capture')} onSetGoal={setGoal} cityName={city.name} cityRules={(citiesMap[city.id] && citiesMap[city.id].exceptions) || []} />}
      {screen === 'challenges' && <Challenges challenges={CHALLENGES} joined={gam.joined || []} user={user} gam={gam} onJoin={joinChallenge} onLeave={leaveChallenge} />}
      {screen === 'profile' && <Profile user={user} gam={gam} onSignOut={signOut} onUpdateOrg={updateOrg} />}
      {screen === 'citypicker' && <CityPicker cities={citiesMap} current={city.id} onPick={pickCity} onUseLocation={useMyLocation} onBack={() => setScreen('home')} />}
      {screen === 'capture' && <Capture onCapture={handleScan} />}
      {screen === 'analyzing' && <Analyzing />}
      {screen === 'result' && active && <Result result={active} onDone={finishScan} />}
      {screen === 'disambiguate' && active && (
        <Disambiguate result={active} onRetake={() => setScreen('capture')} onProceed={() => setScreen('result')} />
      )}
      {screen === 'rewards' && (
        <Rewards gam={gam} rewards={REWARDS} nextReward={nextReward} onRedeem={(r) => { setRedeemReward(r); setScreen('redeem'); }} />
      )}
      {screen === 'redeem' && redeemReward && (
        <Redeem reward={redeemReward} gam={gam} onConfirm={confirmRedeem} onCancel={() => setScreen('rewards')} />
      )}
      {screen === 'celebration' && <Celebration gam={gam} onClose={() => setScreen('home')} />}

      {showNav && <Nav active={navActive} onNav={setScreen} onScan={() => setScreen('capture')} />}
    </div>
  );
}
