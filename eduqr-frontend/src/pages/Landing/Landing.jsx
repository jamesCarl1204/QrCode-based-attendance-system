import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { homeFor } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import s from './Landing.module.css';
import { CONTACT, FEATURES, STEPS, BENEFITS, PORTALS, NAV } from './landing.constants.js';
import { useReveal } from './landing.hooks.js';
import { SchoolLogo, PageLoader, SiteNav } from './LandingComponents.jsx';

export { PageLoader, SiteNav, NAV };

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
  const ctaLabel = loggedIn ? 'Open dashboard' : 'Get started';

  return (
    <div className={s.page} ref={rootRef}>
      <SiteNav onSection={go} />

      <main id="top">
        {/* ---------- Hero ---------- */}
        <section className={s.hero}>
          <div className={s.heroGrid}>
            <div className={s.heroText}>
              <p className={s.pill}><span className={s.pillDot} /> Built for Regis Marie College</p>
              <h1>Smarter <span className={s.heroAccent}>attendance.</span><br /><span className={s.heroAccent}>Better school connections.</span></h1>
              <p className={s.lead}>
                Students scan a QR code to check in. Teachers see attendance live, and parents get an email automatically.
              </p>
              <div className={s.heroBtns}>
                <Link to={ctaTo} className={`${s.btnPrimary} ${s.btnLg}`}>{ctaLabel} <i className="fa-solid fa-arrow-right" /></Link>
                <button className={`${s.btnOutline} ${s.btnLg}`} onClick={() => go('features')}>Learn more</button>
              </div>
              <ul className={s.heroFacts}>
                <li><i className="fa-solid fa-users" /> Student, teacher, and admin portals</li>
                <li><i className="fa-solid fa-envelope" /> Automatic parent emails</li>
                <li><i className="fa-solid fa-mobile-screen" /> Works on phones and desktops</li>
              </ul>
            </div>
          </div>
        </section>

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

        {/* ---------- CTA ---------- */}
        <section className={s.ctaSection}>
          <div className={s.ctaBox} data-reveal>
            <h2>Ready to take attendance in seconds?</h2>
            <p>Log in to your portal, or create a student account to join your classes.</p>
            <Link to={ctaTo} className={`${s.btnWhite} ${s.btnLg}`}>{ctaLabel} <i className="fa-solid fa-arrow-right" /></Link>
          </div>
        </section>
      </main>

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