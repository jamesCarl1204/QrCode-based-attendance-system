import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import s from '../../styles/Portal.module.css';
import { timeAgo } from '../../utils.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip);

const GRID = 'rgba(148,163,184,0.15)';
const TICK = '#94a3b8';

// NOTE: the original dashboard had empty chart shells (no backend endpoint yet).
// Pass real numbers via the `stats` prop once you add that endpoint.
export default function Dashboard({ classes, onGoClasses, stats = {} }) {
  const active = classes.filter((c) => !c.archived).length;
  const dash = (v) => (v === undefined || v === null ? '—' : v);

  return (
    <div className={s.teacherDashboard}>
      <div className={s.sectionHeader}><h2>Dashboard Overview</h2><p>Summary of your classes and attendance.</p></div>

      <div className={s.statGrid}>
        {[
          ['Total Active Classes', 'fa-book', s.statGreen, active],
          ['Total Students', 'fa-user-graduate', s.statIndigo, stats.students],
          ["Today's Rate", 'fa-chart-line', s.statEmerald, stats.todayRate],
          ["Today's Scans", 'fa-qrcode', s.statAmber, stats.todayScans],
        ].map(([label, icon, color, val]) => (
          <div key={label} className={`${s.panel}`}>
            <div className={s.statTop}><span className={s.statLabel}>{label}</span><div className={`${s.statIcon} ${color}`}><i className={`fa-solid ${icon}`} /></div></div>
            <span className={s.statValue}>{dash(val)}</span>
          </div>
        ))}
      </div>

      <div className={s.dashRow}>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>Weekly Attendance Trends</h3>
          <p className={s.panelSub}>Average check-in performance over the past week</p>
          <div className={s.chartBox}>
            <Line
              data={{ labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], datasets: [{ data: stats.weekly || [], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#22c55e' }] }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100, grid: { color: GRID }, ticks: { color: TICK } }, x: { grid: { display: false }, ticks: { color: TICK } } } }} />
          </div>
        </div>
        <div className={s.panel}>
          <h3 className={s.panelTitle}>Status Breakdown</h3>
          <p className={s.panelSub}>Present, late and absent</p>
          <div className={`${s.chartBox} ${s.chartBoxSm}`}>
            <Doughnut data={{ labels: ['Present', 'Late', 'Absent'], datasets: [{ data: stats.status || [], backgroundColor: ['#22c55e', '#f59e0b', '#f43f5e'], borderWidth: 0 }] }}
              options={{ responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }} />
          </div>
          <div className={s.statusLegend}>
            <div><span>Present</span><strong className={s.cPresent}>{dash(stats.status?.[0])}</strong></div>
            <div><span>Late</span><strong className={s.cLate}>{dash(stats.status?.[1])}</strong></div>
            <div><span>Absent</span><strong className={s.cAbsent}>{dash(stats.status?.[2])}</strong></div>
          </div>
        </div>
      </div>

      <div className={s.dashRow}>
       <div className={s.panel}>
     <h3 className={s.panelTitle}>Recent Check-In Activity</h3>
      <p className={s.panelSub}>Latest student scans across your classes</p>
      <div className={s.activityFeed}>
      {(!stats.recent || stats.recent.length === 0) && (
       <p className={s.mutedText} style={{ padding: '24px 0', textAlign: 'center' }}>No check-ins to show yet.</p>
      )}
      {stats.recent?.map((r, i) => (
       <div key={i} className={s.activityItem}>
        <span>
          <strong>{r.first_name} {r.last_name}</strong> · {r.status} · {r.subject_name}
        </span>
        <span className={s.activityTime}>{timeAgo(r.created_at)}</span>
       </div>
       ))}
     </div>
     </div>
        <div className={`${s.panel} ${s.panelCta}`}>
          <div className={s.ctaIcon}><i className="fa-solid fa-qrcode" /></div>
          <h3 className={s.panelTitle}>Start Attendance</h3>
          <p className={s.panelSub}>Open a class, then tap <strong>Create Attendance</strong> to generate the QR code for your students.</p>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={onGoClasses}>Go to My Classes</button>
        </div>
      </div>
    </div>
  );
}
