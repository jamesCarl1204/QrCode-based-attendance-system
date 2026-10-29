const { pool, queryOne, withTransaction } = require('../config/db');

async function create({ classId, sessionDate, startTime, endTime, lateAfter, attendanceCode }) {
  const [result] = await pool.query(
    `INSERT INTO attendance_sessions (class_id, session_date, class_start, class_end, late_after, attendance_code)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [classId, sessionDate, startTime, endTime, lateAfter, attendanceCode]
  );
  return result.insertId;
}

const codeExists = async (code) =>
  !!(await queryOne('SELECT id FROM attendance_sessions WHERE attendance_code = ?', [code]));

async function listByClass(classId) {
  const [rows] = await pool.query(
    `SELECT id, class_id, session_date, class_start AS start_time, class_end AS end_time,
            late_after, attendance_code, created_at
     FROM attendance_sessions WHERE class_id = ?
     ORDER BY session_date DESC, class_start DESC`,
    [classId]
  );
  return rows;
}

// Session + owning teacher (for authorization)
const findWithTeacher = (id) =>
  queryOne(
    `SELECT s.id, s.class_id, s.session_date, s.class_start AS start_time, s.class_end AS end_time,
            s.late_after, c.teacher_id
     FROM attendance_sessions s JOIN classes c ON c.id = s.class_id
     WHERE s.id = ?`,
    [id]
  );

const findByCode = (code) =>
  queryOne(
    `SELECT id, class_id, session_date, class_start AS start_time, class_end AS end_time, late_after
     FROM attendance_sessions WHERE attendance_code = ?`,
    [code]
  );

const findForDownload = (id) =>
  queryOne(
    `SELECT s.id, s.class_id, s.session_date, s.class_start AS start_time, s.class_end AS end_time,
            s.late_after, c.teacher_id, c.subject_name, c.section
     FROM attendance_sessions s JOIN classes c ON c.id = s.class_id
     WHERE s.id = ?`,
    [id]
  );

const deleteWithRecords = (id) =>
  withTransaction(async (conn) => {
    await conn.query('DELETE FROM attendance_records WHERE session_id = ?', [id]);
    await conn.query('DELETE FROM attendance_sessions WHERE id = ?', [id]);
  });

async function listByClassIds(classIds) {
  const [rows] = await pool.query(
    `SELECT id, class_id, session_date, class_start AS start_time, class_end AS end_time, late_after
     FROM attendance_sessions WHERE class_id IN (?)`,
    [classIds]
  );
  return rows;
}

async function listInRange(classIds, fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT id, class_id, session_date, class_end AS end_time FROM attendance_sessions
     WHERE class_id IN (?) AND session_date BETWEEN ? AND ?`,
    [classIds, fromDate, toDate]
  );
  return rows;
}

async function listByDate(date) {
  const [rows] = await pool.query(
    `SELECT id, class_start AS start_time, class_end AS end_time
     FROM attendance_sessions WHERE session_date = ?`,
    [date]
  );
  return rows;
}

async function enrolledCountsForSessions(sessionIds) {
  const [rows] = await pool.query(
    `SELECT s.id AS session_id, COUNT(cs.student_id) AS enrolled
     FROM attendance_sessions s JOIN class_students cs ON cs.class_id = s.class_id
     WHERE s.id IN (?) AND cs.removed_at IS NULL
     GROUP BY s.id`,
    [sessionIds]
  );
  return rows;
}

async function listAdminByClass(classId) {
  const [rows] = await pool.query(
    `SELECT id, session_date, class_start AS start_time, class_end AS end_time, late_after
     FROM attendance_sessions WHERE class_id = ?
     ORDER BY session_date DESC, class_start DESC`,
    [classId]
  );
  return rows;
}

async function listUnnotified() {
  const [rows] = await pool.query(
    `SELECT s.id, s.class_id, s.session_date, s.class_end AS end_time, c.subject_name
     FROM attendance_sessions s JOIN classes c ON c.id = s.class_id
     WHERE s.absent_notified = 0`
  );
  return rows;
}

const markNotified = (id) => pool.query('UPDATE attendance_sessions SET absent_notified = 1 WHERE id = ?', [id]);

module.exports = {
  create, codeExists, listByClass, findWithTeacher, findByCode, findForDownload, deleteWithRecords,
  listByClassIds, listInRange, listByDate, enrolledCountsForSessions, listAdminByClass,
  listUnnotified, markNotified,
};
