import { useState, useEffect } from 'react';
import { getLeaderboard } from '../api.js';

const AV_COLORS = ['#1f9d55', '#378add', '#ef9f27', '#e24b4a', '#7c5cdb', '#1d9e75', '#d4537e'];
function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
function initials(name) {
  const parts = name.replace(/[^A-Za-z ]/g, '').trim().split(' ').filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}
function Avatar({ name, size = 34, cls = 'av' }) {
  return <span className={cls} style={{ width: size, height: size, background: colorFor(name) }}>{initials(name)}</span>;
}
function daysLeftInMonth() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, Math.ceil((end - now) / 86400000));
}

export default function Challenges({ challenges, joined, user, gam, onJoin, onLeave }) {
  const [openId, setOpenId] = useState(null);
  const [liveRows, setLiveRows] = useState(null);
  const [liveMembers, setLiveMembers] = useState(null);
  const named = challenges.map((c) => (c.type === 'school' ? { ...c, name: user?.org || 'Your school' } : c));
  const open = named.find((c) => c.id === openId);

  // Pull the real board (and real member count) from Supabase when
  // available; otherwise fall back to the seeded demo data.
  useEffect(() => {
    setLiveRows(null);
    setLiveMembers(null);
    if (!openId) return;
    let cancelled = false;
    getLeaderboard(openId, user?.id, user?.org)
      .then((r) => {
        if (cancelled || !r.live) return;
        if (r.rows.length) setLiveRows(r.rows);
        if (typeof r.members === 'number') setLiveMembers(r.members);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [openId, user]);

  if (open) {
    let board;
    if (liveRows) {
      board = liveRows.map((b) => ({ ...b }));
    } else {
      board = open.board.map((b) => ({ ...b }));
      if (open.type === 'community' && !board.some((b) => b.you)) board.push({ name: 'You', pts: gam.points, you: true });
      if (open.type === 'school' && user?.org && !board.some((b) => b.name === user.org)) board.push({ name: user.org, pts: 38000 + gam.points, you: true });
    }
    board.sort((a, b) => b.pts - a.pts);

    const youIdx = board.findIndex((b) => b.you);
    const rank = youIdx >= 0 ? youIdx + 1 : null;
    const gap = youIdx > 0 ? board[youIdx - 1].pts - board[youIdx].pts : 0;
    const podium = board.slice(0, 3);
    const rest = board.slice(3);
    const podOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
    const medals = { 0: '🥇', 1: '🥈', 2: '🥉' };
    // Real member count when we have one from Supabase; otherwise the
    // seeded placeholder from data.js.
    const memberCount = liveMembers != null ? liveMembers : open.members;

    return (
      <div className="body">
        <button className="jbtn" style={{ padding: '5px 10px' }} onClick={() => setOpenId(null)}>‹ Challenges</button>

        <div className="lbhead" style={{ marginTop: 10 }}>
          <div className="small" style={{ opacity: 0.9 }}>{open.emoji} {open.name}</div>
          {rank ? (
            <>
              <div className="rank">You're #{rank}</div>
              <div className="small" style={{ opacity: 0.95 }}>{gap > 0 ? `${gap.toLocaleString()} pts to #${rank - 1}` : 'Top of the board! 🏆'}</div>
            </>
          ) : <div className="rank">Join to rank</div>}
          <div className="tiny" style={{ opacity: 0.85, marginTop: 6 }}>{memberCount.toLocaleString()} members · season ends in {daysLeftInMonth()} days</div>
        </div>

        <div className="podium">
          {podOrder.map((p) => {
            const place = board.indexOf(p);
            return (
              <div className={'pod pod' + (place + 1)} key={p.name}>
                <div className="medal">{medals[place]}</div>
                <Avatar name={p.name} size={place === 0 ? 52 : 44} cls="podav" />
                <div className="pname">{p.you ? 'You' : p.name}</div>
                <div className="ppts">{p.pts.toLocaleString()}</div>
                <div className="podbar" style={{ background: colorFor(p.name), opacity: 0.85 }} />
              </div>
            );
          })}
        </div>

        {rest.length > 0 && (
          <div className="card" style={{ padding: '4px 12px' }}>
            {rest.map((row, i) => (
              <div className="lbrow" key={row.name} style={row.you ? { background: 'var(--green-l)', borderRadius: 10 } : {}}>
                <span className="lbrank">{i + 4}</span>
                <Avatar name={row.name} />
                <b className="small" style={{ flex: 1 }}>{row.you ? 'You' : row.name}</b>
                {row.move != null && <span className={'move ' + (row.move > 0 ? 'up' : row.move < 0 ? 'down' : 'flat')}>{row.move > 0 ? `▲${row.move}` : row.move < 0 ? `▼${-row.move}` : '–'}</span>}
                <span className="small" style={{ fontWeight: 800, minWidth: 54, textAlign: 'right' }}>{row.pts.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {joined.includes(open.id)
          ? <button className="btn sec" style={{ marginTop: 14 }} onClick={() => onLeave(open.id)}>Leave challenge</button>
          : <button className="btn" style={{ marginTop: 14 }} onClick={() => onJoin(open.id)}>Join &amp; contribute</button>}
        <div className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>Every correct scan adds points to the challenges you've joined.</div>
      </div>
    );
  }

  const school = named.find((c) => c.type === 'school');
  const community = named.filter((c) => c.type === 'community');

  return (
    <div className="body">
      <b style={{ fontSize: 17 }}>Challenges</b>
      <div className="small muted" style={{ marginBottom: 12 }}>Join a team and climb the leaderboard together.</div>

      <div className="sectitle" style={{ marginTop: 0 }}>Your school</div>
      <button className="card challenge" onClick={() => setOpenId(school.id)}>
        <span className="chemoji">🎓</span>
        <div style={{ flex: 1 }}>
          <b className="small">{school.name}</b>
          <div className="tiny muted">{school.members} students · season ends in {daysLeftInMonth()} days</div>
        </div>
        {joined.includes('school') ? <span className="pill green">Joined</span> : <span className="pill gray">Join</span>}
      </button>

      <div className="sectitle">Community challenges</div>
      {community.map((c) => (
        <button key={c.id} className="card challenge" onClick={() => setOpenId(c.id)}>
          <span className="chemoji">{c.emoji}</span>
          <div style={{ flex: 1 }}>
            <b className="small">{c.name}</b>
            <div className="tiny muted">{c.members.toLocaleString()} members</div>
          </div>
          {joined.includes(c.id) ? <span className="pill green">Joined</span> : <span className="pill gray">Join</span>}
        </button>
      ))}
    </div>
  );
}
