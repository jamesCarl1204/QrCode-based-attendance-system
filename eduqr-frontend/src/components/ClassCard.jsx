import s from '../styles/Portal.module.css';
import { colorClass } from '../utils.js';

export const BookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export default function ClassCard({ cls, onOpen, corner, footer, showCode = true, children }) {
  return (
    <div className={`${s.subjectCard} ${colorClass(s, cls.color)}`} onClick={onOpen}>
      {corner || <div className={s.cardIcon}><BookIcon /></div>}
      <div>
        <h3>{cls.subject}</h3>
        <p className={s.sectionLabel}>{cls.section || 'No section set'}{cls.archived ? ' · Archived' : ''}</p>
        {children}
      </div>
      {showCode && <p className={s.cardCodeRow}>Code: <span>{cls.code}</span></p>}
      <div className={s.cardFooter}>
        {footer}
        <a className={s.openLink}>{footer ? 'View class record' : 'Open class'} <span>›</span></a>
      </div>
    </div>
  );
}
