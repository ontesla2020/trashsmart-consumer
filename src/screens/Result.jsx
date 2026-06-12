import { useState } from 'react';
import { BIN_STYLE, BIN_LABEL } from '../lib.js';

export default function Result({ result, onDone }) {
  const [feedback, setFeedback] = useState(null);
  const recs = result.recommendations || [];
  const multi = recs.length > 1;

  return (
    <div className="body">
      <div className="row sp">
        <b style={{ fontSize: 16 }}>{multi ? 'Two steps' : 'Sort it'}</b>
        <span className="pill green">+{result.points_awarded} pts</span>
      </div>
      <div className="small muted" style={{ margin: '2px 0 12px' }}>
        Detected: {result.items.map((i) => i.label).join(' + ')}
      </div>

      {recs.map((r, idx) => {
        const st = BIN_STYLE[r.bin] || BIN_STYLE.landfill;
        return (
          <div className={'bin ' + st.cls} key={r.item_id}>
            <div className="binicon">{st.emoji}</div>
            <div style={{ flex: 1 }}>
              <div className="row sp">
                <b className="small">{r.label} → {BIN_LABEL[r.bin]}</b>
                {multi && <span className={'pill ' + st.cls}>Step {idx + 1}</span>}
              </div>
              <div className="small" style={{ marginTop: 2 }}>{r.action}. {r.reasoning}</div>
            </div>
          </div>
        );
      })}

      {result.overall_guidance && (
        <div className="card" style={{ marginTop: 4, background: '#f7faf8' }}>
          <div className="row" style={{ gap: 7 }}><span>🧠</span><b className="small">Why</b></div>
          <div className="small muted" style={{ marginTop: 4 }}>{result.overall_guidance}</div>
        </div>
      )}

      <div className="sectitle">Was this helpful?</div>
      <div className="row" style={{ gap: 9 }}>
        <button className={'btn ghost' + (feedback === 'up' ? '' : '')} style={{ flex: 1, opacity: feedback && feedback !== 'up' ? 0.5 : 1 }} onClick={() => setFeedback('up')}>👍 Yes</button>
        <button className="btn ghost" style={{ flex: 1, opacity: feedback && feedback !== 'down' ? 0.5 : 1 }} onClick={() => setFeedback('down')}>👎 No</button>
        <button className="btn ghost" style={{ flex: 1, opacity: feedback && feedback !== 'fix' ? 0.5 : 1 }} onClick={() => setFeedback('fix')}>✏️ Fix</button>
      </div>
      {feedback && <div className="small muted" style={{ textAlign: 'center', marginTop: 7 }}>Thanks — noted for future learning.</div>}

      {result.detection_source && (
        <div className="banner">Detection: <span className="src">{result.detection_source}</span></div>
      )}

      <button className="btn" style={{ marginTop: 12 }} onClick={onDone}>✓ Done · +{result.points_awarded} pts</button>
    </div>
  );
}
