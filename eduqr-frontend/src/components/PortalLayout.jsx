import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Modal, { ModalHeader, ModalFooter } from './Modal.jsx';
import s from '../styles/Portal.module.css';

export default function PortalLayout({ role, brand, links, active, onSelect, title, headerAction, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('eduqr_theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-portal', role);
    try { localStorage.setItem('eduqr_theme', theme); } catch { /* ignore */ }
  }, [theme, role]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const closeDrawer = () => { if (window.innerWidth <= 768) setCollapsed(false); };
  const name = user?.firstName || user?.email || role;

  const doLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <>
      <header className={s.navbar}>
        <div className={s.navbarLeft}>
          <button className={s.toggleBtn} onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            <i className="fa-solid fa-bars" />
          </button>
          <h1 className={s.pageTitle}>{title}</h1>
        </div>
        <div className={s.navbarRight}>
          <button className={s.themeBtn} onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme">
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} style={{ color: theme === 'dark' ? '#f59e0b' : '#6366f1' }} />
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div className={s.navClock} title="Philippine time">
            <i className="fa-regular fa-clock" /> <span>{clock || '--:--:-- --'}</span>
          </div>
          {headerAction}
          <button className={`${s.btn} ${s.btnOutline} ${s.logoutBtn}`} onClick={() => setLogoutOpen(true)}>Log out</button>
        </div>
      </header>

      <div className={s.appShell}>
        <nav className={`${s.sidebar} ${collapsed ? s.collapsed : ''}`}>
          <div className={s.sidebarBrand}>
            <div className={s.brandIcon}><i className="fa-solid fa-qrcode" /></div>
            <div>
              <span className={s.brandName}>{brand}</span>
              <span className={s.brandSub}>Attendance System</span>
            </div>
          </div>
          <div className={s.sidebarLinks}>
            {links.map((l) => (
              <button
                key={l.key}
                className={`${s.sidebarLink} ${active === l.key ? s.active : ''}`}
                onClick={() => { onSelect(l.key); closeDrawer(); }}
              >
                <span className={s.linkIcon}><i className={`fa-solid ${l.icon}`} /></span>
                {l.label}
                {l.tag && <span className={s.sidebarTag}>{l.tag}</span>}
              </button>
            ))}
          </div>
          <div className={s.sidebarProfile}>
            <div className={s.profileAvatar}>{name.trim().charAt(0).toUpperCase()}</div>
            <div className={s.profileMeta}>
              <p className={s.profileName}>{name}</p>
              <p className={s.profileEmail}>{user?.email || '\u00a0'}</p>
            </div>
          </div>
        </nav>
        <main className={s.mainContent} onClick={closeDrawer}>{children}</main>
      </div>

      <Modal open={logoutOpen} small onClose={() => setLogoutOpen(false)}>
        <ModalHeader danger eyebrow="LOG OUT" title="Are you sure you want to log out?" onClose={() => setLogoutOpen(false)} />
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setLogoutOpen(false)}>Cancel</button>
          <button className={`${s.btn} ${s.btnDanger}`} disabled={loggingOut} onClick={doLogout}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
