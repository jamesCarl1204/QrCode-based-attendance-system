import { useState } from 'react';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import { api } from '../../api.js';
import { timeAgo } from '../../utils.js';
import { useToast } from '../../context/ToastContext.jsx';
import s from '../../styles/Portal.module.css';

export default function Announcements() {
  const toast = useToast();
  const [f, setF] = useState({ title: '', message: '', toStudents: true, toParents: true });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sent, setSent] = useState([]); // temporary list, resets on refresh

  const validate = () => {
    const e = {};
    if (!f.title.trim()) e.title = 'Title is required.';
    else if (f.title.trim().length > 150) e.title = 'Title is too long (max 150).';
    if (!f.message.trim()) e.message = 'Message is required.';
    else if (f.message.trim().length > 2000) e.message = 'Message is too long (max 2000).';
    if (!f.toStudents && !f.toParents) e.recipients = 'Select at least one recipient.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openConfirm = () => { if (validate()) setConfirmOpen(true); };

  const send = async () => {
    setBusy(true);
    const body = { title: f.title.trim(), message: f.message.trim(), toStudents: f.toStudents, toParents: f.toParents };
    try {
      const d = await api('/api/admin/announcements', { method: 'POST', body });
      if (!d.success) { toast(d.generalError || 'Could not send announcement.', 'error'); return; }
      toast(`Announcement is being sent to ${d.recipients} recipient(s).`);
      setSent((p) => [{ ...body, at: new Date().toISOString() }, ...p]);
      setF({ title: '', message: '', toStudents: true, toParents: true });
      setConfirmOpen(false);
    } catch { toast('Something went wrong. Please try again.', 'error'); } finally { setBusy(false); }
  };

  const who = [f.toStudents && 'all students', f.toParents && 'their parents'].filter(Boolean).join(' and ');

  return (
    <>
      <div className={s.sectionHeader}><h2>Announcements</h2><p>Send an email announcement to students and their parents</p></div>
      <div className={`${s.panel} ${s.createCard}`}>
        <div className={s.ctHeader}>
          <div className={s.ctHeaderIcon}><i className="fa-solid fa-bullhorn" /></div>
          <div><h3>New Announcement</h3><p>This will be emailed to the recipients you select.</p></div>
        </div>

        <div className={s.inputGroup}>
          <label>Title *</label>
          <input placeholder="e.g. No classes on Friday" maxLength={150} value={f.title}
            onChange={(e) => { setF({ ...f, title: e.target.value }); setErrors((p) => ({ ...p, title: '' })); }} />
          <p className={s.fieldError}>{errors.title}</p>
        </div>

        <div className={s.inputGroup}>
          <label>Message *</label>
          <textarea rows={6} placeholder="Write your announcement…" maxLength={2000} value={f.message}
            onChange={(e) => { setF({ ...f, message: e.target.value }); setErrors((p) => ({ ...p, message: '' })); }} />
          <p className={s.fieldError}>{errors.message}</p>
          <p className={s.hint}>{f.message.length}/2000</p>
        </div>

        <p className={s.ctLabel} style={{ marginTop: 14 }}>Send to</p>
        <div className={s.checkRow}>
          <label><input type="checkbox" checked={f.toStudents} onChange={(e) => { setF({ ...f, toStudents: e.target.checked }); setErrors((p) => ({ ...p, recipients: '' })); }} /> Students</label>
          <label><input type="checkbox" checked={f.toParents} onChange={(e) => { setF({ ...f, toParents: e.target.checked }); setErrors((p) => ({ ...p, recipients: '' })); }} /> Parents</label>
        </div>
        <p className={s.fieldError}>{errors.recipients}</p>

        <button className={`${s.btn} ${s.btnPrimary} ${s.submitBtn}`} onClick={openConfirm}>
          <i className="fa-solid fa-paper-plane" /> Review &amp; Send
        </button>
      </div>

      {sent.length > 0 && (
        <div className={s.panel} style={{ marginTop: 18, maxWidth: 760 }}>
          <h3 className={s.panelTitle}>Sent this session</h3>
          <p className={s.panelSub}>Temporary list. This will be replaced with real history once it is saved in the database.</p>
          {sent.map((a, i) => (
            <div key={i} className={s.activityItem}>
              <span><strong>{a.title}</strong> · {[a.toStudents && 'Students', a.toParents && 'Parents'].filter(Boolean).join(' + ')}</span>
              <span className={s.activityTime}>{timeAgo(a.at)}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => !busy && setConfirmOpen(false)}>
        <ModalHeader eyebrow="CONFIRM" title="Send this announcement?" onClose={() => !busy && setConfirmOpen(false)} />
        <p className={s.modalDesc}>This will be emailed to <strong>{who}</strong>. Emails cannot be recalled once they are sent.</p>
        <div className={s.announcePreview}>
          <strong>{f.title.trim()}</strong>
          <p>{f.message.trim()}</p>
        </div>
        <ModalFooter>
          <button className={`${s.btn} ${s.btnOutline}`} disabled={busy} onClick={() => setConfirmOpen(false)}>Cancel</button>
          <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send now'}</button>
        </ModalFooter>
      </Modal>
    </>
  );
}
