import s from '../styles/Portal.module.css';
import { BANNER } from '../utils.js';

const DEFAULT_TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'members', label: 'Members' },
];

// Banner + tabs shared by the student, teacher and admin class detail pages.
export default function DetailFrame({ cls, onBack, topAction, extra, tab, setTab, tabs = DEFAULT_TABS, showTabs = true, children }) {
  return (
    <div>
      <div className={s.detailBanner} style={{ background: BANNER[cls.color] || BANNER.blue }}>
        <div className={s.detailTopRow}>
          <a className={s.backLink} onClick={onBack}>← All classes</a>
          {topAction}
        </div>
        <h2>{cls.subject}</h2>
        <p>{cls.section || 'No section set'}</p>
        <div className={s.classChip}>Class code <strong>{cls.code}</strong></div>
        {extra && <p className={s.bannerExtra}>{extra}</p>}
      </div>
      <div className={s.detailBody}>
        {showTabs && (
          <div className={s.tabs}>
            {tabs.map((t) => (
              <button key={t.key} className={`${s.tabBtn} ${tab === t.key ? s.active : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}