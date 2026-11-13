import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { timeAgo } from '../../utils.js';
import { activityIcon } from './admin.helpers.js';
import s from '../../styles/Portal.module.css';

export default function Dashboard({ goTo }) {
  const [d, setD] = useState(null);
  const [updated, setUpdated] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api('/api/admin/dashboard');
        if (alive && r.success) { setD(r); setUpdated(new Date().toLocaleTimeString()); }
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const rate = d?.today.attendanceRatePercent;
  return (
    <div className={s.adminDashboard}>
      <div className={s.statGrid}>
        {[
          ['Students', 'fa-user-graduate', s.statGreen, d?.totals.students],
          ['Teachers', 'fa-chalkboard-user', s.statIndigo, d?.totals.teachers],
          ['Ongoing Sessions', 'fa-qrcode', s.statEmerald, d?.totals.ongoingSessions],
          ["Today's Attendance", 'fa-chart-line', s.statAmber, d ? (rate !== null ? `${rate}%` : '—') : undefined],
        ].map(([label, icon, color, val]) => (
          <div key={label} className={s.panel}>
            <div className={s.statTop}><span className={s.statLabel}>{label}</span><div className={`${s.statIcon} ${color}`}><i className={`fa-solid ${icon}`} /></div></div>
            <span className={s.statValue}>{val ?? '—'}</span>
          </div>
        ))}
      </div>
      <div className={s.dashRow}>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>Recent Activity</h3>
          <p className={s.panelSub}>Latest events across the system</p>
          <div className={s.activityFeed}>
            {!d && <p className={s.mutedText}>Loading…</p>}
            {d && d.recentActivity.length === 0 && <p className={s.mutedText}>No recent activity yet.</p>}
            {d?.recentActivity.map((a, i) => {
              const [color, icon] = activityIcon(a.message, s);
              return (
                <div key={i} className={s.activityItem}>
                  <span className={`${s.activityIcon} ${color}`}><i className={`fa-solid ${icon}`} /></span>
                  <span>{a.message}</span>
                  <span className={s.activityTime}>{timeAgo(a.at)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>Today's Snapshot</h3>
          <p className={s.panelSub}>Present, late and absent</p>
          <div className={s.statusLegend}>
            <div><span>Present</span><strong className={s.cPresent}>{d?.today.present ?? 0}</strong></div>
            <div><span>Late</span><strong className={s.cLate}>{d?.today.late ?? 0}</strong></div>
            <div><span>Absent</span><strong className={s.cAbsent}>{d?.today.absent ?? 0}</strong></div>
          </div>
          <div className={s.quickActions}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => goTo('createTeacher')}><i className="fa-solid fa-plus" /> Create teacher</button>
            <button className={`${s.btn} ${s.btnOutline}`} onClick={() => goTo('classes')}>View classes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
