const { pool, queryOne, withTransaction } = require('../config/db');

const findForLogin = (email) =>
  queryOne('SELECT id, first_name, email, password FROM students WHERE email = ?', [email]);

const findIdByEmail = (email) => queryOne('SELECT id FROM students WHERE email = ?', [email]);

const findIdByStudentNumber = (num) =>
  queryOne('SELECT id FROM students WHERE student_id_number = ?', [num]);

const findContactById = (id) =>
  queryOne('SELECT first_name, last_name, parent_email FROM students WHERE id = ?', [id]);

const findById = (id) => queryOne('SELECT id FROM students WHERE id = ?', [id]);

async function create({ studentIdNumber, firstName, middleName, lastName, email, hashedPassword, parentEmail }) {
  const [result] = await pool.query(
    `INSERT INTO students (student_id_number, first_name, middle_name, last_name, email, password, parent_email)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [studentIdNumber, firstName, middleName, lastName, email, hashedPassword, parentEmail]
  );
  return result.insertId;
}

const updatePasswordByEmail = (email, hashedPassword) =>
  pool.query('UPDATE students SET password = ? WHERE email = ?', [hashedPassword, email]);

async function listAll() {
  const [rows] = await pool.query(
    `SELECT id, student_id_number, first_name, middle_name, last_name, email, parent_email, created_at
     FROM students ORDER BY created_at DESC`
  );
  return rows;
}

async function count() {
  const row = await queryOne('SELECT COUNT(*) AS n FROM students');
  return row.n;
}

const deleteCascade = (id) =>
  withTransaction(async (conn) => {
    await conn.query('DELETE FROM attendance_records WHERE student_id = ?', [id]);
    await conn.query('DELETE FROM class_students WHERE student_id = ?', [id]);
    await conn.query('DELETE FROM students WHERE id = ?', [id]);
  });

module.exports = {
  findForLogin, findIdByEmail, findIdByStudentNumber, findContactById, findById,
  create, updatePasswordByEmail, listAll, count, deleteCascade,
};
