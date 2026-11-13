export const mapClass = (c) => ({
  id: c.id, subject: c.subject_name, section: c.section, code: c.class_code, color: c.color,
  archived: !!c.archived, teacherFirstName: c.teacher_first_name, teacherEmail: c.teacher_email,
});

export const statusClass = (st, styles) =>
  st === 'Present' ? styles.recordStatusPresent : st === 'Late' ? styles.recordStatusLate : st === 'Absent' ? styles.recordStatusAbsent : styles.recordStatusPending;

export const rateClass = (r, styles) => (r === null ? '' : r >= 85 ? styles.rateGood : r >= 75 ? styles.rateWarn : styles.rateLow);

// Pick only the logged-in student's own row (backend already filters; this is a second guard).
export const ownRecord = (data, userId) =>
  data && data.success ? (data.records || []).find((r) => String(r.student_id) === String(userId)) || null : null;
