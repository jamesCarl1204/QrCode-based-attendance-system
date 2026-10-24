import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import s from '../../styles/Portal.module.css';

const rateClass = (r) => (r === null ? '' : r >= 85 ? s.rateGood : r >= 75 ? s.rateWarn : s.rateLow);

export default function StudentDashboard({ onOpenClass }) {
  const [d, setD] = useState(null); // null = loading, false = error

  useEffect(() => {
    let alive = true;
    api('/api/student/dashboard')
      .then((r) => { if (alive) setD(r.success ? r : false); })
      .catch(() => { if (alive) setD(false); });
    return () => { alive = false; };
  }, []);

  const o = d?.overall;
  const dash = (v) => (v === undefined || v === null ? '—' : v);

  return (
    <div className={s.studentDashboard}>
      <div className={s.sectionHeader}>
        <h2>Dashboard Overview</h2>
        <p>Your attendance across all your active classes.</p>
      </div>

      {d === false && <p className={s.mutedText}>Could not load your dashboard. Please try again.</p>}

      {d !== false && (
        <>
          <div className={s.statGrid}>
            {[
              ['Overall Rate', 'fa-chart-line', s.statEmerald, o && o.rate !== null ? `${o.rate}%` : o ? '—' : undefined],
              ['Total Absences', 'fa-circle-xmark', s.statAmber, o?.absent],
              ['Times Late', 'fa-clock', s.statIndigo, o?.late],
              ['Active Classes', 'fa-book', s.statGreen, d?.classes.length],
            ].map(([label, icon, color, val]) => (
              <div key={label} className={s.panel}>
                <div className={s.statTop}>
                  <span className={s.statLabel}>{label}</span>
                  <div className={`${s.statIcon} ${color}`}><i className={`fa-solid ${icon}`} /></div>
                </div>
                <span className={s.statValue}>{dash(val)}</span>
              </div>
            ))}
          </div>

          {o && o.rate !== null && o.rate < 75 && (
            <div className={s.panel} style={{ marginBottom: 20, borderColor: 'rgba(244,63,94,0.4)' }}>
              <p className={s.fieldError} style={{ margin: 0 }}>
                <i className="fa-solid fa-triangle-exclamation" /> Your overall attendance is below 75%. Please talk to your teachers.
              </p>
            </div>
          )}

          <div className={s.panel}>
            <h3 className={s.panelTitle}>Attendance per Class</h3>
            <p className={s.panelSub}>Rate = (Present + Late) ÷ ended sessions. Click a class to see details.</p>
            {!d && <p className={s.mutedText}>Loading…</p>}
            {d && d.classes.length === 0 && <p className={s.mutedText}>No active classes yet. Join a class to see your attendance here.</p>}
            {d?.classes.map((c) => (
              <div key={c.id} className={`${s.sessionCard} ${s.clickable}`} onClick={() => onOpenClass(c.id)}>
                <div>
                  <div className={s.sessionDate}>{c.subject_name}</div>
                  <div className={s.sessionTime}>
                    {c.section || 'No section set'} · Present {c.present} · Late {c.late} · Absent {c.absent}
                  </div>
                </div>
                <span className={rateClass(c.rate)} style={{ fontWeight: 700 }}>
                  {c.rate !== null ? `${c.rate}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}