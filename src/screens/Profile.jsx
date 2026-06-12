export default function Profile({ user, gam, onSignOut }) {
  return (
    <div className="body">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: 22, margin: '0 auto 8px' }}>
          {(user.firstName[0] || '?').toUpperCase()}
        </div>
        <b style={{ fontSize: 17 }}>{user.firstName}</b>
        <div className="small muted">{user.phone}</div>
        {user.org && <div className="small muted">{user.org}</div>}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <div className="stat"><b>{gam.points.toLocaleString()}</b><span>points</span></div>
        <div className="stat"><b>{gam.streak}</b><span>day streak</span></div>
        <div className="stat"><b>{gam.divertedLb}<small style={{ fontSize: 10 }}>lb</small></b><span>diverted</span></div>
      </div>

      <button className="btn sec" style={{ marginTop: 16 }} onClick={onSignOut}>Sign out</button>
    </div>
  );
}
