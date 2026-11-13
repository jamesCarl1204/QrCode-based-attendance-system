import InfoModal from './InfoModal.jsx';
import ConfirmDelete from './ConfirmDelete.jsx';

export default function AdminModals({
  viewStudent,
  viewTeacher,
  delStudent,
  delTeacher,
  delClass,
  busy,
  onCloseStudent,
  onCloseTeacher,
  onCancelDeleteStudent,
  onConfirmDeleteStudent,
  onCancelDeleteTeacher,
  onConfirmDeleteTeacher,
  onCancelDeleteClass,
  onConfirmDeleteClass,
}) {
  return (
    <>
      <InfoModal item={viewStudent} eyebrow="STUDENT INFORMATION" idLabel="Student ID" idKey="studentIdNumber" onClose={onCloseStudent} />
      <InfoModal item={viewTeacher} eyebrow="TEACHER INFORMATION" idLabel="Teacher ID" idKey="teacherIdNumber" onClose={onCloseTeacher} />

      <ConfirmDelete open={!!delStudent} eyebrow="DELETE STUDENT" title="Delete this student?" label="Delete student" busy={busy}
        onCancel={onCancelDeleteStudent}
        onConfirm={onConfirmDeleteStudent}>
        You're about to permanently delete <strong>{delStudent?.name}</strong> and all of their attendance records. This cannot be undone.
      </ConfirmDelete>

      <ConfirmDelete open={!!delTeacher} eyebrow="DELETE TEACHER" title="Delete this teacher?" label="Delete teacher" busy={busy}
        onCancel={onCancelDeleteTeacher}
        onConfirm={onConfirmDeleteTeacher}>
        You're about to permanently delete <strong>{delTeacher?.name}</strong> along with all of their classes, sessions, and attendance records. This cannot be undone.
      </ConfirmDelete>

      <ConfirmDelete open={!!delClass} eyebrow="DELETE CLASS" title="Delete this class?" label="Delete class" busy={busy}
        onCancel={onCancelDeleteClass}
        onConfirm={onConfirmDeleteClass}>
        You're about to permanently delete <strong>{delClass?.subject_name}</strong>, including all of its sessions and attendance records. This cannot be undone.
      </ConfirmDelete>
    </>
  );
}
