const { pool, queryOne } = require('../config/db');

// Every enrolled student of the class + their record for the session (LEFT JOIN).
// Pass studentId to restrict to one student.
async function listForSession(sessionId, classId, studentId = null) {
  const params = [sessionId, classId];
  if (studentId) params.push(studentId);
  const [rows] = await pool.query(
    `SELECT s.id AS student_id, s.first_name, s.last_name, ar.time_in, ar.status
     FROM class_students cs
     JOIN students s ON s.id = cs.student_id
     LEFT JOIN attendance_records ar ON ar.session_id = ? AND ar.student_id = s.id
     WHERE cs.class_id = ? AND cs.removed_at IS NULL
     ${studentId ? 'AND s.id = ?' : ''}
     ORDER BY s.first_name ASC`,
    params
  );
  return rows;
}

const findOne = (sessionId, studentId) =>
  queryOne('SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?', [sessionId, studentId]);

const insert = (sessionId, studentId, timeIn, status) =>
  pool.query('INSERT INTO attendance_records (session_id, student_id, time_in, status) VALUES (?, ?, ?, ?)',
    [sessionId, studentId, timeIn, status]);

const update = (id, status, timeIn) =>
  pool.query('UPDATE attendance_records SET status = ?, time_in = ? WHERE id = ?', [status, timeIn, id]);

// Insert or update (manual attendance by teacher)
async function upsert(sessionId, studentId, status, timeIn) {
  const existing = await findOne(sessionId, studentId);
  if (existing) return update(existing.id, status, timeIn);
  return insert(sessionId, studentId, timeIn, status);
}

async function listBySessionIds(sessionIds) {
  if (!sessionIds.length) return [];
  const [rows] = await pool.query(
    'SELECT session_id, student_id, time_in, status FROM attendance_records WHERE session_id IN (?)',
    [sessionIds]
  );
  return rows;
}

async function listForStudent(studentId, sessionIds) {
  if (!sessionIds.length) return [];
  const [rows] = await pool.query(
    'SELECT session_id, status FROM attendance_records WHERE student_id = ? AND session_id IN (?)',
    [studentId, sessionIds]
  );
  return rows;
}

async function listWithNames(sessionIds) {
  if (!sessionIds.length) return [];
  const [rows] = await pool.query(
    `SELECT ar.session_id, ar.student_id, ar.time_in, ar.status, s.first_name, s.last_name
     FROM attendance_records ar JOIN students s ON s.id = ar.student_id
     WHERE ar.session_id IN (?)`,
    [sessionIds]
  );
  return rows;
}

async function recentByTeacher(teacherId, limit = 8) {
  const [rows] = await pool.query(
    `SELECT ar.time_in, ar.status, ar.created_at, s.first_name, s.last_name, c.subject_name
     FROM attendance_records ar
     JOIN students s ON s.id = ar.student_id
     JOIN attendance_sessions sess ON sess.id = ar.session_id
     JOIN classes c ON c.id = sess.class_id
     WHERE c.teacher_id = ?
     ORDER BY ar.created_at DESC LIMIT ?`,
    [teacherId, limit]
  );
  return rows;
}

async function recentAll(limit = 8) {
  const [rows] = await pool.query(
    `SELECT ar.time_in, ar.status, ar.created_at, s.first_name, s.last_name, c.subject_name
     FROM attendance_records ar
     JOIN students s ON s.id = ar.student_id
     JOIN attendance_sessions sess ON sess.id = ar.session_id
     JOIN classes c ON c.id = sess.class_id
     ORDER BY ar.created_at DESC LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = {
  listForSession, findOne, insert, update, upsert,
  listBySessionIds, listForStudent, listWithNames, recentByTeacher, recentAll,
};
