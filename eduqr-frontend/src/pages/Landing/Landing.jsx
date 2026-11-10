import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Login from '../Login/Login.jsx';
import s from './Landing.module.css';

export const NAV = [];

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

export function SiteNav({ hideAuth = false }) {
  return (
    <header className={s.nav}>
      <div className={s.navInner}>
        <Link className={s.brand} to="/">
          <SchoolLogo />
          <span><strong>Regis Marie College</strong><small>QR Attendance System</small></span>
        </Link>
        {hideAuth && <Link to="/" className={s.btnOutline}><i className="fa-solid fa-arrow-left" /> Back to home</Link>}
      </div>
    </header>
  );
}

export default function Landing() {
  const { loading } = useAuth();

  useEffect(() => { document.documentElement.setAttribute('data-theme', 'light'); }, []);

  if (loading) return <PageLoader />;

  return (
    <div className={s.page}>
      <SiteNav />
      <main id="top" className={s.loginLanding}>
        <Login embedded />
      </main>
    </div>
  );
}
