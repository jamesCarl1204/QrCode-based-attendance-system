const sessionModel = require('../models/sessionModel');
const classModel = require('../models/classModel');
const attendanceModel = require('../models/attendanceModel');
const { sendClassEndedNotification } = require('./emailService');
const { toPHDate } = require('../utils/helpers');

let running = false; // prevents overlapping runs

// Emails parents once per ended session (absent_notified flag)
async function checkAndNotifySessionEnd() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const sessions = await sessionModel.listUnnotified();

    for (const session of sessions) {
      if (now <= toPHDate(session.session_date, session.end_time)) continue;

      const students = await classModel.listStudentsWithParent(session.class_id);
      const records = await attendanceModel.listBySessionIds([session.id]);
      const recordMap = {};
      records.forEach((r) => { recordMap[r.student_id] = r; });

      for (const st of students) {
        const record = recordMap[st.id];
        sendClassEndedNotification({
          parentEmail: st.parent_email,
          studentFirstName: st.first_name,
          studentLastName: st.last_name,
          subjectName: session.subject_name,
          status: record ? record.status : 'Absent',
          timeIn: record ? record.time_in : null,
          sessionDate: session.session_date,
        }).catch((err) => console.error('Class ended notify email error:', err));
      }

      await sessionModel.markNotified(session.id);
    }
  } catch (err) {
    console.error('Session end notification check error:', err);
  } finally {
    running = false;
  }
}

function startSessionEndJob() {
  return setInterval(checkAndNotifySessionEnd, 60 * 1000);
}

module.exports = { startSessionEndJob, checkAndNotifySessionEnd };
