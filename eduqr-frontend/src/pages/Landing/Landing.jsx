import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { homeFor } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Login from '../Login/Login.jsx';
import s from './Landing.module.css';

// Fill this in if you want contact info in the footer. Empty values are hidden.
const CONTACT = { email: '', location: '' };

const FEATURES = [
  { icon: 'fa-qrcode', title: 'QR code attendance',
    text: 'Students scan the class QR code with their phone camera. Present or Late is decided automatically.' },
  { icon: 'fa-clock', title: 'Session time windows',
    text: 'Teachers set the class start, end, and late cutoff. Scans outside the window are rejected, and each student can only scan once.' },
  { icon: 'fa-chart-line', title: 'Live dashboards',
    text: 'Teacher and admin dashboards refresh on their own, so you see scans, rates, and recent activity as they happen.' },
  { icon: 'fa-envelope', title: 'Parent email alerts',
    text: "Parents get an email when their child scans in, and a final status (Present, Late, or Absent) when the class ends." },
  { icon: 'fa-list-check', title: 'Summaries and records',
    text: "See each student\u2019s attendance rate, flag anyone below 75%, mark attendance manually, and download a session as CSV." },
  { icon: 'fa-robot', title: 'AI attendance assistant',
    text: 'Teachers can ask in plain language who was absent, who was late, or which students have low attendance.' },
];

const STEPS = [
  { icon: 'fa-user-gear', title: 'Set up',
    text: "The admin creates teacher accounts. Students register with their parent\u2019s email and join a class using its code." },
  { icon: 'fa-calendar-plus', title: 'Open a session',
    text: 'The teacher opens an attendance session for the class and shows its QR code.' },
  { icon: 'fa-camera', title: 'Scan to check in',
    text: 'Students scan the QR code in the Student Portal. Their time in and status are recorded instantly.' },
  { icon: 'fa-bell', title: 'Monitor and notify',
    text: 'Teachers and admins track attendance live while parents receive automatic emails.' },
];

const BENEFITS = [
  { icon: 'fa-bolt', title: 'Faster attendance',
    text: 'No roll call. A whole class can check in within seconds.' },
  { icon: 'fa-bullseye', title: 'Accurate records',
    text: 'Only enrolled students can scan, inside the session window, once per session.' },
  { icon: 'fa-envelope-open-text', title: 'Better parent communication',
    text: 'Parents are informed automatically, without teachers sending anything.' },
  { icon: 'fa-cloud', title: 'Convenient digital management',
    text: 'Classes, sessions, and records live in one place and work on desktop or phone.' },
];

const PORTALS = [
  { icon: 'fa-user-graduate', name: 'Student',
    items: ['Join classes with a code', 'Scan the QR code to check in', 'View your own attendance rate'] },
  { icon: 'fa-chalkboard-user', name: 'Teacher',
    items: ['Create classes and sessions', 'Monitor and mark attendance', 'Ask the AI assistant'] },
  { icon: 'fa-user-shield', name: 'Admin',
    items: ['Manage students and teachers', 'Browse every class and record', 'Watch system-wide activity'] },
];

const SAMPLE = [
  { name: 'Maria Santos', status: 'Present', time: '7:58 AM', cls: 'present' },
  { name: 'Juan Dela Cruz', status: 'Late', time: '8:14 AM', cls: 'late' },
  { name: 'Ana Reyes', status: 'Absent', time: '\u2014', cls: 'absent' },
];

function useReveal(rootRef, ready) {
  useEffect(() => {
    if (!ready) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    const els = root.querySelectorAll('[data-reveal]');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.setAttribute('data-in', ''));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, ready]);
}

/* ---------- Demo card: class is always shown open with records ---------- */
function DemoCard() {
  return (
    <div className={s.demoWrap} aria-hidden="true">
      <div className={s.demoCard}>
        {/* Class card header */}
        <div className={s.demoHeader}>
          <span className={s.demoIcon}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <div>
            <h3>Mathematics</h3>
            <p className={s.demoSub}>Grade 10 &ndash; Section A</p>
          </div>
        </div>
        <p className={s.demoCode}>Code: <span>MAT-7K2QP</span></p>

        {/* Static open status; records are visible by default */}
        <div className={s.demoOpenBtn}>
          <i className="fa-solid fa-circle-check" /> Class is open
        </div>

        {/* Always-visible session records */}
        <div className={s.demoRecords}>
          <div className={s.demoRecordsInner}>
            <div className={s.demoStatRow}>
              {[['Present', '1', 'present'], ['Late', '1', 'late'], ['Absent', '1', 'absent']].map(([label, val, cls]) => (
                <div key={label} className={`${s.demoStatBox} ${s[cls]}`}>
                  <strong>{val}</strong><small>{label}</small>
                </div>
              ))}
            </div>
            <p className={s.demoRecLabel}>Session records</p>
            {SAMPLE.map((r) => (
              <div key={r.name} className={s.pvRow}>
                <span className={s.pvAvatar}>{r.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                <span className={s.pvName}>{r.name}<small>{r.time}</small></span>
                <span className={`${s.badge} ${s[r.cls]}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${s.chip} ${s.chipDemo}`}><i className="fa-solid fa-circle-check" /> Maria Santos marked Present</div>
      <div className={`${s.chip} ${s.chipDemo2}`}><i className="fa-solid fa-envelope" /> Parent email sent</div>
    </div>
  );
}

export const NAV = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'about', label: 'About' },
];

// Uses /100.png (same as the login page); falls back to a graduation-cap icon.
function SchoolLogo({ small }) {
  const [ok, setOk] = useState(true);
  return ok
    ? <img src="/100.png" alt="Regis Marie College logo" className={`${s.logoImg} ${small ? s.logoSm : ''}`} onError={() => setOk(false)} />
    : <span className={`${s.logoFallback} ${small ? s.logoSm : ''}`}><i className="fa-solid fa-graduation-cap" /></span>;
}

// Full-screen loading state. After a few seconds it explains the delay
// (free hosting on Render can take a while to wake the server).
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
      <p className={s.loaderMsg}>{slow ? 'Waking up the server. This can take up to a minute on the first visit.' : 'Loading\u2026'}</p>
    </div>
  );
}

// onSection(id): pass it on the landing page to smooth-scroll in place.
// Without it (e.g. login page) the links go to /#section on the landing page.
// hideAuth: shows a single "Back to home" button instead of the login actions.
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
  const ctaLabel = loggedIn ? 'Open dashboard' : 'Log in';

  const item = (n) => (onSection
    ? <button key={n.id} onClick={() => { setMenu(false); onSection(n.id); }}>{n.label}</button>
    : <Link key={n.id} to={`/#${n.id}`} onClick={() => setMenu(false)}>{n.label}</Link>);

  const actions = hideAuth
    ? <Link to="/" className={s.btnOutline}><i className="fa-solid fa-arrow-left" /> Back to home</Link>
    : <Link to={loggedIn ? ctaTo : '#login-card'} onClick={(e) => { if (!loggedIn) { e.preventDefault(); onSection ? onSection('login-card') : window.location.assign('/#login-card'); } }} className={s.btnPrimary}>{ctaLabel}</Link>;

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

export default function Landing() {
  const { user, loading } = useAuth();
  const { hash } = useLocation();
  const rootRef = useRef(null);

  useReveal(rootRef, !loading);

  // Landing is always light (same approach as the Login page).
  useEffect(() => { document.documentElement.setAttribute('data-theme', 'light'); }, []);

  // Arriving from another page via /#features, /#about, etc.
  useEffect(() => {
    if (loading || !hash) return undefined;
    const el = document.getElementById(hash.slice(1));
    if (!el) return undefined;
    const id = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    return () => clearTimeout(id);
  }, [hash, loading]);

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loading) return <PageLoader />;

  const loggedIn = !!user;
  const ctaTo = loggedIn ? homeFor(user.role) : '/login';
  const ctaLabel = loggedIn ? 'Open dashboard' : 'Log in';

  const loggedIn = !!user;
  const ctaTo = loggedIn ? homeFor(user.role) : '/login';
  const ctaLabel = loggedIn ? 'Open dashboard' : 'Get started';

  return (
    <div className={s.page} ref={rootRef}>
      <SiteNav onSection={go} />

      <main id="top">
        <section id="login-card" className={s.loginLanding}><Login embedded /></section>

        {/* ---------- Features ---------- */}
        <section id="features" className={s.section}>
          <div className={s.container}>
            <div className={s.head} data-reveal>
              <h2>Everything you need to run attendance</h2>
              <p>From the first scan to the parent's inbox, the whole process is handled in one system.</p>
            </div>

            <div className={s.featureGrid}>
              {FEATURES.map((f, i) => (
                <article key={f.title} className={s.card} data-reveal style={{ '--d': `${(i % 3) * 70}ms` }}>
                  <span className={s.icon}><i className={`fa-solid ${f.icon}`} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>

            <div className={s.portals} data-reveal>
              <div className={s.portalsHead}>
                <h3>A separate portal for every role</h3>
                <p>Each user only sees what they need.</p>
              </div>
              <div className={s.portalGrid}>
                {PORTALS.map((p) => (
                  <div key={p.name} className={s.portal}>
                    <div className={s.portalTitle}>
                      <span className={s.iconSm}><i className={`fa-solid ${p.icon}`} /></span>
                      <strong>{p.name}</strong>
                    </div>
                    <ul>{p.items.map((t) => <li key={t}><i className="fa-solid fa-check" /> {t}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how-it-works" className={`${s.section} ${s.tint}`}>
          <div className={s.container}>
            <div className={s.head} data-reveal>
              <h2>How it works</h2>
              <p>Four steps from setup to parent notification.</p>
            </div>
            <ol className={s.steps}>
              {STEPS.map((st, i) => (
                <li key={st.title} className={s.step} data-reveal style={{ '--d': `${i * 80}ms` }}>
                  <span className={s.stepNum}>{i + 1}</span>
                  <span className={s.icon}><i className={`fa-solid ${st.icon}`} /></span>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Benefits ---------- */}
        <section id="benefits" className={s.section}>
          <div className={`${s.container} ${s.benefitGrid}`}>
            <div data-reveal>
              <h2 className={s.h2Left}>Less paperwork, clearer records</h2>
              <p className={s.sideText}>
                Replacing the paper roll call with QR check-in saves class time and gives teachers, admins, and parents the same accurate picture.
              </p>
              <Link to={ctaTo} className={`${s.btnPrimary} ${s.btnLg}`}>{ctaLabel}</Link>
            </div>
            <div className={s.benefitCards}>
              {BENEFITS.map((b, i) => (
                <article key={b.title} className={s.benefit} data-reveal style={{ '--d': `${(i % 2) * 70}ms` }}>
                  <span className={s.iconSm}><i className={`fa-solid ${b.icon}`} /></span>
                  <div>
                    <h3>{b.title}</h3>
                    <p>{b.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- About ---------- */}
        <section id="about" className={`${s.section} ${s.tint}`}>
          <div className={`${s.container} ${s.about}`} data-reveal>
            <SchoolLogo />
            <h2>About the system</h2>
            <p>
              The QR Code-Based Attendance Monitoring System helps Regis Marie College move attendance from paper to a simple digital
              process. Teachers open a session, students scan in, and everyone involved, including parents, stays informed without
              extra work.
            </p>
          </div>
        </section>

      {/* ---------- Footer ---------- */}
      <footer className={s.footer}>
        <div className={`${s.container} ${s.footGrid}`}>
          <div>
            <div className={s.footBrand}><SchoolLogo small /> <strong>Regis Marie College</strong></div>
            <p>QR Code-Based Attendance Monitoring System with automatic parent notifications.</p>
          </div>
          <div>
            <h4>Explore</h4>
            {NAV.map((n) => <button key={n.id} onClick={() => go(n.id)}>{n.label}</button>)}
          </div>
          <div>
            <h4>Access</h4>
            <Link to="/login">Log in</Link>
            <Link to="/login">Register as a student</Link>
            {CONTACT.email && <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>}
            {CONTACT.location && <span>{CONTACT.location}</span>}
          </div>
        </div>
        <div className={`${s.container} ${s.footBottom}`}>
          <span>&copy; 2026 Regis Marie College. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}