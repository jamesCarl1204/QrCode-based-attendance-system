import Modal, { ModalHeader, ModalFooter } from '../../components/Modal.jsx';
import s from '../../styles/Portal.module.css';

export default function ConfirmDelete({ open, eyebrow, title, children, busy, label, onCancel, onConfirm }) {
  return (
    <Modal open={open} small onClose={onCancel}>
      <ModalHeader danger eyebrow={eyebrow} title={title} onClose={onCancel} />
      <p className={s.modalDesc}>{children}</p>
      <ModalFooter>
        <button className={`${s.btn} ${s.btnOutline}`} onClick={onCancel}>Cancel</button>
        <button className={`${s.btn} ${s.btnDanger}`} disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : label}</button>
      </ModalFooter>
    </Modal>
  );
}
