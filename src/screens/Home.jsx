import { useState } from 'react';
import Rings from '../components/Rings.jsx';
import { POINTS_GUIDE } from '../data.js';

export default function Home({ gam, firstName, onScan, onSetGoal, nextReward, cityName, cityRules = [], pointsGuide = POINTS_GUIDE }) {
  const { rings } = gam;
  const order = ['recycle', 'organics', 'landfill'];
  const [goalKey, setGoalKey] = useState('recycle');
  const closed = order.filter((k) => rings[k].done >= rings[k].goal).length;
  const toNext = nextReward ? Math.max(0, nextReward.cost - gam.points) : 0;
  const today = new Date().getDay();

  return (
    <div className="body">
      <div className="hero">
        <div className="row sp">
          <div className="small" style={{ opacity: 0.9 }}>Hi {firstName} 👋</div>
          <span className="pill" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>🔥 {gam.streak}-day streak</span>
        </div>
        <div className="pts">{gam.points.toLocaleString()} pts</div>
        <div className="small" style={{ opacity: 0.9 }}>
          {nextReward ? `${toNext} pts to ${nextReward.reward}` : 'Keep scanning to earn rewards'}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row sp"><b className="small">Today's goals</b><span className="small muted">{closed} of 3 done</span></div>
        <div className="rings" style={{ marginTop: 12 }}>
          <Rings rings={rings} order={order} size={150} />
          <div className="ringlbl">
            {order.map((k) => {
              const r = rings[k];
              const done = r.done >= r.goal;
              return (
                <div className="rl" key={k}>
                  <span className="dot" style={{ background: r.color }} />
                  <div>
                    <div className="tiny muted" style={{ lineHeight: 1.15 }}>{r.label}</div>
                    <b className="rlnum">{r.done}/{r.goal}{done ? ' ✓' : ''}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="row sp" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="small">Daily goal</span>
            <select className="goalsel" value={goalKey} onChange={(e) => setGoalKey(e.target.value)}>
              {order.map((k) => <option key={k} value={k}>{rings[k].label}</option>)}
            </select>
          </div>
          <div className="stepper">
            <button aria-label="decrease" onClick={() => onSetGoal(goalKey, -1)}>−</button>
            <span>{rings[goalKey].goal}</span>
            <button aria-label="increase" onClick={() => onSetGoal(goalKey, 1)}>+</button>
          </div>
        </div>
      </div>

      <div className="card streakcard" style={{ marginTop: 12 }}>
        <div className="row" style={{ gap: 8 }}><span style={{ fontSize: 18 }}>🔥</span><b>Keep the streak!</b><span style={{ marginLeft: 'auto', opacity: 0.9, fontSize: 13 }}>{gam.streak}-day</span></div>
        <div className="weekrow">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => {
            const done = idx <= today && today - idx < gam.streak;
            return (
              <div className="daycol" key={idx}>
                <span style={{ opacity: 0.85 }}>{d}</span>
                <span className={'daydot' + (done ? ' done' : '') + (idx === today ? ' today' : '')}>{done ? '✓' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row sp"><b className="small">Points per item</b><span className="tiny muted">scan to earn</span></div>
        <div style={{ marginTop: 8 }}>
          {pointsGuide.map((g) => (
            <div className="row sp" key={g.label} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="small"><span style={{ marginRight: 8 }}>{g.emoji}</span>{g.label}</span>
              <span className="pill green">+{g.points}</span>
            </div>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Bonus for correct sorting · contamination earns nothing.</div>
      </div>

      {cityRules.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row sp"><b className="small">{cityName} sorting rules</b><span className="tiny muted">via StopWaste</span></div>
          <div style={{ marginTop: 6 }}>
            {cityRules.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < cityRules.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span style={{ color: 'var(--green)' }}>•</span>
                <span className="small muted">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn" style={{ marginTop: 14 }} onClick={onScan}><span style={{ fontSize: 17 }}>📷</span> Scan an item</button>
      {gam.lastScan && <div className="small muted" style={{ textAlign: 'center', marginTop: 8 }}>Last: {gam.lastScan}</div>}
    </div>
  );
}
