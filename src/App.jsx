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
function loadGam() {
  try {
    const s = JSON.parse(localStorage.getItem('ts_gam2') || 'null');
    if (!s) return INITIAL_GAM;
    // Restore only progress (done/goal) — labels/colors always come from current defaults.
    const rings = {};
    for (const k of Object.keys(INITIAL_GAM.rings)) {
      const base = INITIAL_GAM.rings[k];
      const saved = s.rings && s.rings[k];
      rings[k] = { ...base, done: saved?.done ?? base.done, goal: saved?.goal ?? base.goal };
    }
    return { ...INITIAL_GAM, ...s, rings };
  } catch { return INITIAL_GAM; }
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
  function completeLogin(u) {
    try { localStorage.setItem('ts_user', JSON.stringify(u)); } catch (e) { /* ignore */ }
    api.saveProfile(u).catch(() => {});
    // Fresh account starts at the welcome bonus with preset rings.
    setGam(JSON.parse(JSON.stringify(INITIAL_GAM)));
    setUser(u);
    setScreen('home');
  }
  function signOut() {
    try { localStorage.removeItem('ts_user'); } catch (e) { /* ignore */ }
    setUser(null);
    setScreen('home');
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

  function confirmRedeem(reward) {
    setGam((g) => ({ ...g, points: g.points - reward.cost }));
    setScreen('rewards');
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

      {screen === 'home' && <Home gam={gam} firstName={user.firstName} nextReward={nextReward} onScan={() => setScreen('capture')} onSetGoal={setGoal} />}
      {screen === 'challenges' && <Challenges challenges={CHALLENGES} joined={gam.joined || []} user={user} gam={gam} onJoin={joinChallenge} onLeave={leaveChallenge} />}
      {screen === 'profile' && <Profile user={user} gam={gam} onSignOut={signOut} />}
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
