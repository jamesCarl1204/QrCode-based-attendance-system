import { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../../api.js';
import { fmt12 } from '../../utils.js';
import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import s from '../../styles/Portal.module.css';

function ScanModal({ open, onClose, onDone }) {
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setErr(''); setStatus('');
    const sc = new Html5Qrcode('qrReader');
    let busy = false;
    let cancelled = false;

    const start = () =>
      sc.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, onScan, () => {})
        .catch(() => setErr('Could not access camera. Please allow camera permission.'));

    async function onScan(text) {
      if (busy || cancelled) return;
      busy = true;
      await sc.stop().catch(() => {});
      setStatus('Marking attendance…');
      try {
        const d = await api('/api/attend/scan', { method: 'POST', body: { code: text } });
        if (!d.success) {
          setErr(d.generalError || 'Could not mark attendance.'); setStatus('');
          busy = false; start(); return;
        }
        setStatus(`Marked as ${d.status}${d.subject_name ? ` for ${d.subject_name}` : ''} at ${fmt12(d.time_in)}`);
        onDone(d);
        setTimeout(onClose, 1500);
      } catch {
        setErr('Something went wrong. Please try again.'); setStatus('');
        busy = false; start();
      }
    }

    start();
    return () => { cancelled = true; sc.stop().then(() => sc.clear()).catch(() => {}); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="Scan Attendance QR" onClose={onClose} />
      <div className={s.modalBody}>
        <div id="qrReader" style={{ width: '100%' }} />
        <p className={s.fieldError}>{err}</p>
        <p className={s.modalDesc}>{status}</p>
      </div>
      <ModalFooter><button className={`${s.btn} ${s.btnOutline}`} onClick={onClose}>Cancel</button></ModalFooter>
    </Modal>
  );
}

export default ScanModal;
