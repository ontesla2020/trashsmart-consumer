import { CATEGORY_EMOJI } from '../lib.js';

export default function Disambiguate({ result, onRetake, onProceed }) {
  const top = result.items[0];
  const conf = Math.round((result.confidence_overall || 0) * 100);
  const empty = result.items.length === 0;

  return (
    <div className="body">
      <div className="card" style={{ background: 'var(--amber-l)', borderColor: '#eccb8b' }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤔</span>
          <div>
            <b className="small">{empty ? "We couldn't make it out" : "We're not fully sure"}</b>
            <div className="small" style={{ color: '#8a5a08' }}>
              {empty ? 'Try again with the item filling the frame.' : `Confidence ${conf}% — blurry or mixed materials.`}
            </div>
          </div>
        </div>
      </div>

      {!empty && top && (
        <>
          <div className="sectitle">Our best guess</div>
          <div className="card">
            <div className="row"><span style={{ fontSize: 22 }}>{CATEGORY_EMOJI[top.category] || '❓'}</span>
              <div><b className="small">{top.label}</b><div className="tiny muted">Tap below to confirm or retake.</div></div>
            </div>
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={onProceed}>Yes, that's right →</button>
        </>
      )}

      <button className="btn sec" style={{ marginTop: 10 }} onClick={onRetake}>📷 Retake — better lighting</button>
      <div className="card" style={{ marginTop: 12, background: '#f7faf8' }}>
        <div className="small muted">Your answer teaches the app — next time it'll recognize this faster.</div>
      </div>
    </div>
  );
}
