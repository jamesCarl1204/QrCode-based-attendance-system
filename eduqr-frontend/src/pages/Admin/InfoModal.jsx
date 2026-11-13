import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import s from '../../styles/Portal.module.css';

export default function InfoModal({ item, eyebrow, idLabel, idKey, onClose }) {
  return (
    <Modal open={!!item} onClose={onClose}>
      {item && (
        <>
          <ModalHeader eyebrow={eyebrow} title={item.name} onClose={onClose} />
          <p style={{ marginBottom: 10 }}><strong>{idLabel}:</strong> {item[idKey] || '—'}</p>
          <p style={{ marginBottom: 10 }}><strong>Email:</strong> {item.email}</p>
          {item.parentEmail !== undefined && <p style={{ marginBottom: 10 }}><strong>Parent's Email:</strong> {item.parentEmail || '—'}</p>}
          <p><strong>Registered:</strong> {item.createdAt || '—'}</p>
          <ModalFooter><button className={`${s.btn} ${s.btnOutline}`} onClick={onClose}>Close</button></ModalFooter>
        </>
      )}
    </Modal>
  );
}
