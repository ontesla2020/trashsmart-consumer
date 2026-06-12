export default function Rewards({ gam, rewards, nextReward, onRedeem }) {
  const toNext = nextReward ? Math.max(0, nextReward.cost - gam.points) : 0;
  const pct = nextReward ? Math.min(100, Math.round((gam.points / nextReward.cost) * 100)) : 100;

  return (
    <div className="body">
      <div className="row sp"><b style={{ fontSize: 17 }}>Rewards</b><span className="pill green">{gam.points.toLocaleString()} pts</span></div>

      {nextReward && (
        <div className="hero" style={{ marginTop: 12, background: 'linear-gradient(135deg,#378add,#185fa5)' }}>
          <div className="small" style={{ opacity: 0.9 }}>Next reward</div>
          <div className="row sp" style={{ marginTop: 3 }}><b>{nextReward.reward}</b><span className="small">{nextReward.cost.toLocaleString()} pts</span></div>
          <div className="progressbar" style={{ marginTop: 8 }}><span style={{ width: pct + '%' }} /></div>
          <div className="tiny" style={{ opacity: 0.9, marginTop: 5 }}>{toNext} pts to go</div>
        </div>
      )}

      <div className="sectitle">Redeem near you · Livermore</div>
      {rewards.map((r) => {
        const afford = gam.points >= r.cost;
        return (
          <button key={r.id} className="reward" onClick={() => onRedeem(r)}>
            <div className={'rlogo ' + r.bg}>{r.emoji}</div>
            <div style={{ flex: 1 }}>
              <b className="small">{r.vendor}</b>
              <div className="tiny muted">{r.reward}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={'pill ' + (afford ? 'green' : 'gray')}>{r.cost.toLocaleString()}</div>
              <div className="tiny muted" style={{ marginTop: 3 }}>{r.distance}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
