import { useId, useState, useEffect } from 'react';
import { ringPct } from '../lib.js';

function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function toHex(a) { return '#' + a.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join(''); }
function mix(hex, target, f) { const a = hexToRgb(hex), b = hexToRgb(target); return toHex(a.map((x, i) => x + (b[i] - x) * f)); }
const lighten = (h, f) => mix(h, 'ffffff', f);
const darken = (h, f) => mix(h, '000000', f);

// Modern concentric rings: thick, rounded, gradient sheen, soft shadow, tip highlight.
export default function Rings({ rings, order, size = 120, center, centerSub }) {
  const keys = order || Object.keys(rings);
  const uid = useId().replace(/:/g, '');
  const sw = 11, baseR = 52, step = 15;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 118 118">
      <defs>
        {keys.map((key) => (
          <linearGradient id={`${uid}-${key}`} key={key} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={lighten(rings[key].color, 0.18)} />
            <stop offset="1" stopColor={darken(rings[key].color, 0.12)} />
          </linearGradient>
        ))}
        <filter id={`${uid}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.3" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>

      {keys.map((key, i) => (
        <circle key={'t' + key} cx="59" cy="59" r={baseR - i * step} fill="none" stroke={rings[key].color} strokeOpacity="0.15" strokeWidth={sw} />
      ))}

      <g filter={`url(#${uid}-sh)`}>
        {keys.map((key, i) => {
          const r = baseR - i * step;
          const C = 2 * Math.PI * r;
          const pct = ringPct(rings[key].done, rings[key].goal);
          const offset = shown ? C * (1 - pct) : C;
          return (
            <circle
              key={'p' + key} cx="59" cy="59" r={r} fill="none" stroke={`url(#${uid}-${key})`}
              strokeWidth={sw} strokeLinecap="round" strokeDasharray={C.toFixed(1)} strokeDashoffset={offset.toFixed(1)}
              transform="rotate(-90 59 59)"
              style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.34,.12,.22,1)', transitionDelay: `${i * 0.09}s` }}
            />
          );
        })}
      </g>

      {keys.map((key, i) => {
        const r = baseR - i * step;
        const pct = ringPct(rings[key].done, rings[key].goal);
        if (!shown || pct <= 0.02) return null;
        const t = (-90 + 360 * pct) * Math.PI / 180;
        return <circle key={'d' + key} cx={(59 + r * Math.cos(t)).toFixed(1)} cy={(59 + r * Math.sin(t)).toFixed(1)} r="2.1" fill="#fff" style={{ animation: 'fadein .3s ease .9s both' }} />;
      })}

      {center != null && (
        <>
          <text x="59" y={centerSub ? 57 : 63} textAnchor="middle" fontSize="15.5" fontWeight="800" fill="#1b211d">{center}</text>
          {centerSub && <text x="59" y="68" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#6b7670" letterSpacing="0.3">{centerSub}</text>}
        </>
      )}
    </svg>
  );
}
