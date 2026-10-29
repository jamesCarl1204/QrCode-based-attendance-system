const { pool, queryOne, withTransaction } = require('../config/db');

const findForLogin = (email) =>
  queryOne('SELECT id, first_name, email, password, role FROM teachers WHERE email = ?', [email]);

const findIdByEmail = (email) => queryOne('SELECT id FROM teachers WHERE email = ?', [email]);

const findIdByTeacherNumber = (num) =>
  queryOne('SELECT id FROM teachers WHERE teacher_id_number = ?', [num]);

const findRoleById = (id) => queryOne('SELECT id, role FROM teachers WHERE id = ?', [id]);

const findBasicById = (id) => queryOne('SELECT first_name, email FROM teachers WHERE id = ?', [id]);

const updatePasswordByEmail = (email, hashedPassword) =>
  pool.query('UPDATE teachers SET password = ? WHERE email = ?', [hashedPassword, email]);

async function create({ teacherIdNumber, firstName, middleName, lastName, email, hashedPassword }) {
  const [result] = await pool.query(
    `INSERT INTO teachers (teacher_id_number, first_name, middle_name, last_name, email, password, role)
     VALUES (?, ?, ?, ?, ?, ?, 'teacher')`,
    [teacherIdNumber, firstName, middleName, lastName, email, hashedPassword]
  );
  return result.insertId;
}

async function listTeachers() {
  const [rows] = await pool.query(
    `SELECT id, teacher_id_number, first_name, middle_name, last_name, email, created_at
     FROM teachers WHERE role = 'teacher' ORDER BY created_at DESC`
  );
  return rows;
}

async function countTeachers() {
  const row = await queryOne("SELECT COUNT(*) AS n FROM teachers WHERE role = 'teacher'");
  return row.n;
}

async function recent(limit = 3) {
  const [rows] = await pool.query(
    `SELECT first_name, last_name, created_at FROM teachers
     WHERE role = 'teacher' ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  return rows;
}

// Deletes the teacher + all classes, sessions, records, enrollments and AI history
const deleteCascade = (teacherId) =>
  withTransaction(async (conn) => {
    const [classRows] = await conn.query('SELECT id FROM classes WHERE teacher_id = ?', [teacherId]);
    const classIds = classRows.map((c) => c.id);

    if (classIds.length > 0) {
      const [sessionRows] = await conn.query('SELECT id FROM attendance_sessions WHERE class_id IN (?)', [classIds]);
      const sessionIds = sessionRows.map((s) => s.id);
      if (sessionIds.length > 0) {
        await conn.query('DELETE FROM attendance_records WHERE session_id IN (?)', [sessionIds]);
      }
      await conn.query('DELETE FROM attendance_sessions WHERE class_id IN (?)', [classIds]);
      await conn.query('DELETE FROM class_students WHERE class_id IN (?)', [classIds]);
      await conn.query('DELETE FROM classes WHERE teacher_id = ?', [teacherId]);
    }

    await conn.query('DELETE FROM ai_messages WHERE teacher_id = ?', [teacherId]);
    await conn.query('DELETE FROM teachers WHERE id = ?', [teacherId]);
  });

module.exports = {
  findForLogin, findIdByEmail, findIdByTeacherNumber, findRoleById, findBasicById,
  updatePasswordByEmail, create, listTeachers, countTeachers, recent, deleteCascade,
};
