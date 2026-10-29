const { pool } = require('../config/db');

async function history(teacherId, limit = 100) {
  const [rows] = await pool.query(
    `SELECT role, content, created_at FROM (
       SELECT id, role, content, created_at FROM ai_messages
       WHERE teacher_id = ? ORDER BY id DESC LIMIT ?
     ) t ORDER BY id ASC`,
    [teacherId, limit]
  );
  return rows;
}

async function recent(teacherId, limit = 20) {
  const [rows] = await pool.query(
    `SELECT role, content FROM (
       SELECT id, role, content FROM ai_messages
       WHERE teacher_id = ? ORDER BY id DESC LIMIT ?
     ) t ORDER BY id ASC`,
    [teacherId, limit]
  );
  return rows;
}

// One INSERT so the question always has a lower id than the answer
const saveExchange = (teacherId, question, answer) =>
  pool.query(
    'INSERT INTO ai_messages (teacher_id, role, content) VALUES (?, ?, ?), (?, ?, ?)',
    [teacherId, 'user', question, teacherId, 'assistant', answer]
  );

const clear = (teacherId) => pool.query('DELETE FROM ai_messages WHERE teacher_id = ?', [teacherId]);

module.exports = { history, recent, saveExchange, clear };
