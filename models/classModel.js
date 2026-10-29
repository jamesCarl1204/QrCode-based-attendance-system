const { pool, queryOne, withTransaction } = require('../config/db');

/* ---------- classes ---------- */
async function create({ teacherId, subjectName, section, classCode, color }) {
  const [result] = await pool.query(
    `INSERT INTO classes (teacher_id, subject_name, section, class_code, color) VALUES (?, ?, ?, ?, ?)`,
    [teacherId, subjectName, section, classCode, color]
  );
  return result.insertId;
}

const codeExists = async (code) => !!(await queryOne('SELECT id FROM classes WHERE class_code = ?', [code]));

async function listByTeacher(teacherId) {
  const [rows] = await pool.query(
    `SELECT id, subject_name, section, class_code, color, created_at, archived
     FROM classes WHERE teacher_id = ? ORDER BY created_at DESC`,
    [teacherId]
  );
  return rows;
}

async function listForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.created_at, c.archived,
            t.first_name AS teacher_first_name, t.email AS teacher_email
     FROM classes c
     JOIN class_students cs ON cs.class_id = c.id
     JOIN teachers t ON t.id = c.teacher_id
     WHERE cs.student_id = ? AND cs.removed_at IS NULL
     ORDER BY cs.joined_at DESC`,
    [studentId]
  );
  return rows;
}

const findById = (id) => queryOne('SELECT id, teacher_id FROM classes WHERE id = ?', [id]);

const findOwned = (classId, teacherId) =>
  queryOne('SELECT id, archived FROM classes WHERE id = ? AND teacher_id = ?', [classId, teacherId]);

const setArchived = (id, archived) =>
  pool.query('UPDATE classes SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);

const getSubjectName = async (id) => {
  const row = await queryOne('SELECT subject_name FROM classes WHERE id = ?', [id]);
  return row ? row.subject_name : '';
};

const findByCodeWithTeacher = (code) =>
  queryOne(
    `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.archived,
            t.first_name AS teacher_first_name, t.email AS teacher_email
     FROM classes c
     JOIN teachers t ON t.id = c.teacher_id
     WHERE c.class_code = ?`,
    [code]
  );

async function countSessions(classId) {
  const row = await queryOne('SELECT COUNT(*) AS n FROM attendance_sessions WHERE class_id = ?', [classId]);
  return row.n;
}

// Used by teacher delete (class has no sessions / students)
const deleteEmpty = (classId) =>
  withTransaction(async (conn) => {
    await conn.query('DELETE FROM class_students WHERE class_id = ?', [classId]);
    await conn.query('DELETE FROM classes WHERE id = ?', [classId]);
  });

// Used by admin delete (removes everything)
const deleteCascade = (classId) =>
  withTransaction(async (conn) => {
    const [sessionRows] = await conn.query('SELECT id FROM attendance_sessions WHERE class_id = ?', [classId]);
    const sessionIds = sessionRows.map((s) => s.id);
    if (sessionIds.length > 0) {
      await conn.query('DELETE FROM attendance_records WHERE session_id IN (?)', [sessionIds]);
    }
    await conn.query('DELETE FROM attendance_sessions WHERE class_id = ?', [classId]);
    await conn.query('DELETE FROM class_students WHERE class_id = ?', [classId]);
    await conn.query('DELETE FROM classes WHERE id = ?', [classId]);
  });

async function recent(limit = 3) {
  const [rows] = await pool.query('SELECT subject_name, created_at FROM classes ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows;
}

/* ---------- enrollment ---------- */
const findEnrollment = (classId, studentId) =>
  queryOne('SELECT id, removed_at FROM class_students WHERE class_id = ? AND student_id = ?', [classId, studentId]);

const isEnrolled = async (classId, studentId) =>
  !!(await queryOne(
    'SELECT id FROM class_students WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
    [classId, studentId]
  ));

const enroll = (classId, studentId) =>
  pool.query('INSERT INTO class_students (class_id, student_id) VALUES (?, ?)', [classId, studentId]);

const reenroll = (enrollmentId) =>
  pool.query('UPDATE class_students SET removed_at = NULL, joined_at = NOW() WHERE id = ?', [enrollmentId]);

const leave = (classId, studentId) =>
  pool.query(
    'UPDATE class_students SET removed_at = NOW() WHERE class_id = ? AND student_id = ? AND removed_at IS NULL',
    [classId, studentId]
  );

const removeStudent = (classId, studentId) =>
  pool.query('UPDATE class_students SET removed_at = NOW() WHERE class_id = ? AND student_id = ?', [classId, studentId]);

async function countActiveStudents(classId) {
  const row = await queryOne(
    'SELECT COUNT(*) AS n FROM class_students WHERE class_id = ? AND removed_at IS NULL',
    [classId]
  );
  return row.n;
}

async function listMembers(classId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, s.email, cs.joined_at
     FROM class_students cs JOIN students s ON s.id = cs.student_id
     WHERE cs.class_id = ? AND cs.removed_at IS NULL
     ORDER BY cs.joined_at ASC`,
    [classId]
  );
  return rows;
}

async function listStudentsWithParent(classId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, s.parent_email
     FROM class_students cs JOIN students s ON s.id = cs.student_id
     WHERE cs.class_id = ? AND cs.removed_at IS NULL`,
    [classId]
  );
  return rows;
}

/* ---------- dashboards / AI ---------- */
async function listActiveForStudent(studentId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.subject_name, c.section, c.color
     FROM classes c JOIN class_students cs ON cs.class_id = c.id
     WHERE cs.student_id = ? AND cs.removed_at IS NULL AND c.archived = 0
     ORDER BY cs.joined_at DESC`,
    [studentId]
  );
  return rows;
}

async function listActiveIdsByTeacher(teacherId) {
  const [rows] = await pool.query('SELECT id FROM classes WHERE teacher_id = ? AND archived = 0', [teacherId]);
  return rows.map((r) => r.id);
}

async function countDistinctStudents(classIds) {
  const row = await queryOne(
    'SELECT COUNT(DISTINCT student_id) AS total FROM class_students WHERE class_id IN (?) AND removed_at IS NULL',
    [classIds]
  );
  return row.total;
}

async function enrolledCounts(classIds) {
  const [rows] = await pool.query(
    `SELECT class_id, COUNT(*) AS n FROM class_students
     WHERE class_id IN (?) AND removed_at IS NULL GROUP BY class_id`,
    [classIds]
  );
  const map = {};
  rows.forEach((r) => { map[r.class_id] = r.n; });
  return map;
}

async function listForAI(teacherId) {
  const [rows] = await pool.query(
    'SELECT id, subject_name, section, class_code, archived FROM classes WHERE teacher_id = ?',
    [teacherId]
  );
  return rows;
}

async function listActiveStudentsForClasses(classIds) {
  const [rows] = await pool.query(
    `SELECT cs.class_id, s.id AS student_id, s.first_name, s.last_name
     FROM class_students cs JOIN students s ON s.id = cs.student_id
     WHERE cs.class_id IN (?) AND cs.removed_at IS NULL`,
    [classIds]
  );
  return rows;
}

/* ---------- admin ---------- */
async function adminListAll() {
  const [rows] = await pool.query(
    `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.archived, c.created_at,
            t.id AS teacher_id, t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.email AS teacher_email,
            (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id AND cs.removed_at IS NULL) AS total_students,
            (SELECT COUNT(*) FROM attendance_sessions s WHERE s.class_id = c.id) AS total_sessions
     FROM classes c JOIN teachers t ON t.id = c.teacher_id
     ORDER BY c.created_at DESC`
  );
  return rows;
}

const adminFindById = (id) =>
  queryOne(
    `SELECT c.id, c.subject_name, c.section, c.class_code, c.color, c.archived, c.created_at,
            t.id AS teacher_id, t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.email AS teacher_email
     FROM classes c JOIN teachers t ON t.id = c.teacher_id
     WHERE c.id = ?`,
    [id]
  );

async function adminListStudents(classId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, s.email
     FROM class_students cs JOIN students s ON s.id = cs.student_id
     WHERE cs.class_id = ? AND cs.removed_at IS NULL
     ORDER BY s.first_name ASC`,
    [classId]
  );
  return rows;
}

module.exports = {
  create, codeExists, listByTeacher, listForStudent, findById, findOwned, setArchived, getSubjectName,
  findByCodeWithTeacher, countSessions, deleteEmpty, deleteCascade, recent,
  findEnrollment, isEnrolled, enroll, reenroll, leave, removeStudent, countActiveStudents,
  listMembers, listStudentsWithParent,
  listActiveForStudent, listActiveIdsByTeacher, countDistinctStudents, enrolledCounts,
  listForAI, listActiveStudentsForClasses,
  adminListAll, adminFindById, adminListStudents,
};
