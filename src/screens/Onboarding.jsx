import { useState } from 'react';

const SLIDES = [
  { emoji: '🗑️', bg: '#FBEAE4', title: 'We make a lot of trash', text: 'The average person throws away about 4.4 lbs of trash every single day.' },
  { emoji: '♻️', bg: '#E6F1FB', title: 'And recycling gets contaminated', text: 'Up to 1 in 4 items in the recycling bin doesn’t belong — and can spoil the whole batch.' },
  { emoji: '🏆', bg: '#E7F6EE', title: 'Sort it right, earn rewards', text: 'Scan an item, get the right bin in seconds, and earn points toward rewards at local spots.' }
];

export default function Onboarding({ onDone }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <div className="onboard">
      <div className="onboard-top">
        <div className="onboard-ill" style={{ background: s.bg }}>{s.emoji}</div>
        <h2>{s.title}</h2>
        <p>{s.text}</p>
        <div className="dots">
          {SLIDES.map((_, idx) => <span key={idx} className={'dot2' + (idx === i ? ' on' : '')} />)}
        </div>
      </div>
      <div className="onboard-bottom">
        <button className="skip" onClick={onDone}>Skip</button>
        <button className="nextbtn" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
