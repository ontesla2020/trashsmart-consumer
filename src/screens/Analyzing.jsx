import { useState, useEffect } from 'react';

const STEPS = [
  ['Looking at your photo', 'Identifying the item(s)'],
  ['Found your location', 'Livermore · Alameda County'],
  ['Checking city rules', 'Mapping each item to a bin'],
  ['Building your guidance', 'With the reasoning behind it']
];

export default function Analyzing() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, STEPS.length - 1)), 650);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="body">
      <div className="card" style={{ textAlign: 'center', padding: 18 }}>
        <div className="spin" style={{ margin: '0 auto 10px' }} />
        <b>Sorting it out…</b>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="track">
          {STEPS.map((s, i) => {
            const done = i < active, now = i === active;
            return (
              <div className="tstep" key={i}>
                <div className="tline">
                  <div className={'tnode' + (done ? ' done' : now ? ' now' : '')}>{done ? '✓' : now ? '⚙' : i + 1}</div>
                  {i < STEPS.length - 1 && <div className={'tbar' + (done ? ' done' : '')} />}
                </div>
                <div className="tcont"><h4>{s[0]}</h4><p>{s[1]}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
