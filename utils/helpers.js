const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length) {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function generateClassCode(subjectName) {
  const prefix = (subjectName || '').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'CLS';
  return `${prefix}-${randomCode(5)}`;
}

const generateAttendanceCode = () => randomCode(6);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Build a Date from PH-local date + time strings
function toPHDate(dateStr, timeStr) {
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${t}+08:00`);
}

// "14:05:09"
const phTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hourCycle: 'h23' });
// "2026-10-29"
const phDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const calcRate = (attended, total) => (total > 0 ? Math.round((attended / total) * 100) : null);

module.exports = {
  generateClassCode, generateAttendanceCode, isValidEmail,
  toPHDate, phTime, phDate, pad, ymd, calcRate,
};
