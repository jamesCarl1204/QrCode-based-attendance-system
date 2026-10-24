import s from '../styles/Portal.module.css';

export default function Modal({ open, onClose, small, wide, className, children }) {
  if (!open) return null;
  return (
    <div className={s.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`${s.modal} ${small ? s.modalSmall : ''} ${className || ''} `} style={wide ? { maxWidth: 720 } : undefined}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ eyebrow, title, sub, onClose, danger }) {
  return (
    <div className={s.modalHeader}>
      <div>
        {eyebrow && <p className={`${s.modalEyebrow} ${danger ? s.eyebrowDanger : ''}`}>{eyebrow}</p>}
        <h3>{title}</h3>
        {sub && <p className={s.modalSub}>{sub}</p>}
      </div>
      <button className={s.modalClose} onClick={onClose}>&times;</button>
    </div>
  );
}

export function ModalFooter({ children }) {
  return <div className={s.modalFooter}>{children}</div>;
}
