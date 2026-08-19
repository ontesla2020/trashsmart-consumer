import { useState } from 'react';

export default function Redeem({ reward, gam, onConfirm, onCancel }) {
  const afford = gam.points >= reward.cost;
  const after = gam.points - reward.cost;
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [ticket, setTicket] = useState(null); // { code } once redeemed

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setErr(null);
    const result = await onConfirm(reward);
    setSubmitting(false);
    if (!result) { setErr("That didn't go through — check your points and try again."); return; }
    setTicket(result);
  }

  if (ticket) {
    return (
      <div className="body">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className={'rlogo ' + reward.bg} style={{ margin: '0 auto 8px', width: 54, height: 54, fontSize: 26 }}>{reward.emoji}</div>
          <b>{reward.vendor}</b>
          <div className="small muted">{reward.reward}</div>
          <div className="small muted" style={{ marginTop: 14 }}>Show this code at the register</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 3, marginTop: 6 }}>{ticket.code}</div>
        </div>
        <button className="btn" style={{ marginTop: 13 }} onClick={onCancel}>Done</button>
      </div>
    );
  }

  return (
    <div className="body">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className={'rlogo ' + reward.bg} style={{ margin: '0 auto 8px', width: 54, height: 54, fontSize: 26 }}>{reward.emoji}</div>
        <b>{reward.vendor}</b>
        <div className="small muted">{reward.reward}</div>
      </div>

      {err && <div className="banner" style={{ marginTop: 10, color: '#a32d2d', borderColor: '#f0c1c1' }}>{err}</div>}

      {afford ? (
        <button className="btn" style={{ marginTop: 13 }} disabled={submitting} onClick={confirm}>
          {submitting ? 'One sec…' : `Confirm — spend ${reward.cost.toLocaleString()} pts`}
        </button>
      ) : (
        <button className="btn" style={{ marginTop: 13 }} disabled>Need {(reward.cost - gam.points).toLocaleString()} more pts</button>
      )}
      <button className="btn sec" style={{ marginTop: 10 }} onClick={onCancel} disabled={submitting}>Cancel</button>
      {afford && <div className="small muted" style={{ textAlign: 'center', marginTop: 9 }}>Balance after: {after.toLocaleString()} pts</div>}
    </div>
  );
}
