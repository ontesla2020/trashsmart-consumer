export default function Redeem({ reward, gam, onConfirm, onCancel }) {
  const afford = gam.points >= reward.cost;
  const after = gam.points - reward.cost;

  return (
    <div className="body">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className={'rlogo ' + reward.bg} style={{ margin: '0 auto 8px', width: 54, height: 54, fontSize: 26 }}>{reward.emoji}</div>
        <b>{reward.vendor}</b>
        <div className="small muted">{reward.reward}</div>
        <div className="qr" style={{ marginTop: 14 }} />
        <div className="small muted" style={{ marginTop: 10 }}>Show this at the register</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, marginTop: 4 }}>TS-{reward.id.slice(0, 4).toUpperCase()}9</div>
        <span className="pill amber" style={{ marginTop: 8 }}>⏱ Expires in 14:58</span>
      </div>

      {afford ? (
        <button className="btn" style={{ marginTop: 13 }} onClick={() => onConfirm(reward)}>Confirm — spend {reward.cost.toLocaleString()} pts</button>
      ) : (
        <button className="btn" style={{ marginTop: 13 }} disabled>Need {(reward.cost - gam.points).toLocaleString()} more pts</button>
      )}
      <button className="btn sec" style={{ marginTop: 10 }} onClick={onCancel}>Cancel</button>
      {afford && <div className="small muted" style={{ textAlign: 'center', marginTop: 9 }}>Balance after: {after.toLocaleString()} pts</div>}
    </div>
  );
}
