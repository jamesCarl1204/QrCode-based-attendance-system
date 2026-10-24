import s from '../styles/Portal.module.css';
import { BANNER } from '../utils.js';

// Banner + tabs shared by the student and teacher class detail pages.
export default function DetailFrame({ cls, onBack, topAction, extra, tab, setTab, showTabs = true, children }) {
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
            <button className={`${s.tabBtn} ${tab === 'attendance' ? s.active : ''}`} onClick={() => setTab('attendance')}>Attendance</button>
            <button className={`${s.tabBtn} ${tab === 'members' ? s.active : ''}`} onClick={() => setTab('members')}>Members</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
