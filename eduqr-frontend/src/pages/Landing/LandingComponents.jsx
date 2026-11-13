import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { homeFor } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { NAV } from './landing.constants.js';
import s from './Landing.module.css';

function DemoCard() {
  return (
    <div className={s.heroVisual} aria-hidden="true">
      <div className={s.heroPhoto} />
      <div className={`${s.floatCard} ${s.floatScan}`}>
        <span className={`${s.floatIcon} ${s.floatIconGreen}`}><i className="fa-solid fa-qrcode" /></span>
        <div>
          <strong className={s.floatTitle}><span className={s.liveDotG} /> Live QR Scan</strong>
          <small className={s.floatSub}>Maria Santos scanned</small>
        </div>
      </div>
      <div className={`${s.floatCard} ${s.floatRate}`}>
        <span className={`${s.floatIcon} ${s.floatIconBlue}`}><i className="fa-solid fa-bolt" /></span>
        <div>
          <small className={s.rateLabel}>ATTENDANCE RATE</small>
          <div className={s.rateValue}>98.4% <em><i className="fa-solid fa-arrow-trend-up" /> Real-time</em></div>
        </div>
      </div>
      <div className={`${s.floatCard} ${s.floatVerified}`}>
        <span className={s.checkCircle}><i className="fa-solid fa-check" /></span> Verified &amp; Synced
      </div>
    </div>
  );
}

function SchoolLogo({ small }) {
  const [ok, setOk] = useState(true);
  return ok
    ? <img src="/100.png" alt="Regis Marie College logo" className={`${s.logoImg} ${small ? s.logoSm : ''}`} onError={() => setOk(false)} />
    : <span className={`${s.logoFallback} ${small ? s.logoSm : ''}`}><i className="fa-solid fa-graduation-cap" /></span>;
}

export function PageLoader() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className={s.loader} role="status" aria-live="polite">
      <div className={s.loaderLogo}><SchoolLogo /></div>
      <p className={s.loaderName}>Regis Marie College</p>
      <div className={s.loaderBar} />
      <p className={s.loaderMsg}>{slow ? 'Waking up the server. This can take up to a minute on the first visit.' : 'Loading…'}</p>
    </div>
  );
}

export function SiteNav({ onSection, hideAuth = false }) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loggedIn = !!user;
  const ctaTo = loggedIn ? homeFor(user.role) : '/login';
  const ctaLabel = loggedIn ? 'Open dashboard' : 'Get started';

  const item = (n) => (onSection
    ? <button key={n.id} onClick={() => { setMenu(false); onSection(n.id); }}>{n.label}</button>
    : <Link key={n.id} to={`/#${n.id}`} onClick={() => setMenu(false)}>{n.label}</Link>);

  const actions = hideAuth
    ? <Link to="/" className={s.btnOutline}><i className="fa-solid fa-arrow-left" /> Back to home</Link>
    : (
      <>
        {!loggedIn && <Link to="/login" className={s.btnGhost}>Log in</Link>}
        <Link to={ctaTo} className={s.btnPrimary}>{ctaLabel}</Link>
      </>
    );

  const brandInner = (
    <>
      <SchoolLogo />
      <span><strong>Regis Marie College</strong><small>QR Attendance System</small></span>
    </>
  );

  return (
    <header className={`${s.nav} ${scrolled ? s.navScrolled : ''}`}>
      <div className={s.navInner}>
        {onSection
          ? <a className={s.brand} href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{brandInner}</a>
          : <Link className={s.brand} to="/">{brandInner}</Link>}
        <nav className={s.links} aria-label="Primary">{NAV.map(item)}</nav>
        <div className={s.navCta}>{actions}</div>
        <button className={s.burger} onClick={() => setMenu((m) => !m)} aria-label="Toggle menu" aria-expanded={menu}>
          <i className={`fa-solid ${menu ? 'fa-xmark' : 'fa-bars'}`} />
        </button>
      </div>
      {menu && (
        <div className={s.mobileMenu}>
          {NAV.map(item)}
          <div className={s.mobileCta}>{actions}</div>
        </div>
      )}
    </header>
  );
}

export { DemoCard, SchoolLogo };
