import Rings from '../components/Rings.jsx';

export default function Celebration({ gam, onClose }) {
  return (
    <div className="body">
      <div className="celebrate">
        <div style={{ fontSize: 46 }}>🎉</div>
        <b style={{ fontSize: 18 }}>All rings closed!</b>
        <div className="small" style={{ opacity: 0.9, marginTop: 3 }}>{gam.streak}-day streak going strong</div>
        <div className="ringbox" style={{ margin: '14px auto' }}><Rings rings={gam.rings} /></div>
        <span className="pill" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>+50 bonus pts</span>
      </div>

      <div className="sectitle">Badges</div>
      <div className="row" style={{ gap: 9 }}>
        <div className="badge"><b>🔋</b><span>E-waste hero</span></div>
        <div className="badge"><b>🥬</b><span>Compost pro</span></div>
        <div className="badge" style={{ opacity: 0.45 }}><b>🔒</b><span>30-day club</span></div>
      </div>

      <button className="btn" style={{ marginTop: 16 }} onClick={onClose}>Back to home</button>
    </div>
  );
}
