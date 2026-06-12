function Icon({ name }) {
  const paths = {
    home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10v9h11v-9" /><path d="M10 19v-4.5h4V19" /></>,
    challenges: (
      <>
        <path d="M7 4.5h10V8a5 5 0 0 1-10 0z" />
        <path d="M7 6H4.8v.8A3.2 3.2 0 0 0 8 10" />
        <path d="M17 6h2.2v.8A3.2 3.2 0 0 1 16 10" />
        <path d="M12 13v3" />
        <path d="M9.2 19.5h5.6l-.7-3h-4.2z" />
      </>
    ),
    rewards: (
      <>
        <path d="M4.5 11.5h15V20h-15z" />
        <path d="M3.5 7.5h17v4h-17z" />
        <path d="M12 7.5V20" />
        <path d="M12 7.5C12 7.5 11 4 8.9 4.6 7.4 5 8 7.5 12 7.5z" />
        <path d="M12 7.5C12 7.5 13 4 15.1 4.6 16.6 5 16 7.5 12 7.5z" />
      </>
    ),
    profile: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>
  };
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Nav({ active, onNav, onScan }) {
  const tab = (id, label, icon) => (
    <button className={'navi' + (active === id ? ' on' : '')} onClick={() => onNav(id)}>
      <span className="navicon"><Icon name={icon} /></span>
      {label}
    </button>
  );
  return (
    <nav className="bottomnav">
      {tab('home', 'Home', 'home')}
      {tab('challenges', 'Challenges', 'challenges')}
      <button className="navscan" aria-label="Scan an item" onClick={onScan}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M9 4l-1.2 2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2.8L15 4H9zm3 12.6a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2z" />
        </svg>
      </button>
      {tab('rewards', 'Rewards', 'rewards')}
      {tab('profile', 'You', 'profile')}
    </nav>
  );
}
