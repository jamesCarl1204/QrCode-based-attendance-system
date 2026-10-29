const classModel = require('../models/classModel');
const sessionModel = require('../models/sessionModel');
const attendanceModel = require('../models/attendanceModel');
const { toPHDate } = require('../utils/helpers');

// Builds the JSON snapshot of ONE teacher's classes that is sent to the AI
async function buildTeacherAIContext(teacherId) {
  const classes = await classModel.listForAI(teacherId);
  if (classes.length === 0) return { classes: [] };

  const classIds = classes.map((c) => c.id);
  const students = await classModel.listActiveStudentsForClasses(classIds);
  const sessions = await sessionModel.listByClassIds(classIds);
  const records = await attendanceModel.listBySessionIds(sessions.map((s) => s.id));

  const now = new Date();

  return {
    classes: classes.map((cls) => {
      const clsStudents = students.filter((s) => s.class_id === cls.id);
      const clsSessions = sessions.filter((s) => s.class_id === cls.id);

      const sessionsOut = clsSessions.map((sess) => {
        const ended = now > toPHDate(sess.session_date, sess.end_time);
        const recsForSession = records.filter((r) => r.session_id === sess.id);

        const attendance = clsStudents.map((st) => {
          const rec = recsForSession.find((r) => r.student_id === st.student_id);
          let status;
          if (rec) status = rec.status;
          else status = ended ? 'Absent' : 'Not yet (session ongoing or upcoming)';
          return { student: `${st.first_name} ${st.last_name}`, status };
        });

        return {
          session_date: sess.session_date,
          start_time: sess.start_time,
          end_time: sess.end_time,
          late_after: sess.late_after,
          ended,
          attendance,
        };
      });

      const endedSessions = sessionsOut.filter((s) => s.ended);
      const studentSummary = clsStudents.map((st) => {
        const name = `${st.first_name} ${st.last_name}`;
        let present = 0, late = 0, absent = 0;
        endedSessions.forEach((sess) => {
          const a = sess.attendance.find((x) => x.student === name);
          if (a?.status === 'Present') present++;
          else if (a?.status === 'Late') late++;
          else if (a?.status === 'Absent') absent++;
        });
        const totalCounted = present + late + absent;
        return {
          student: name, present, late, absent,
          totalSessionsCounted: totalCounted,
          attendanceRatePercent: totalCounted > 0 ? Math.round(((present + late) / totalCounted) * 100) : null,
        };
      });

      // What the AI actually sees: present / late / absent are separate lists
      const sessionsForAI = sessionsOut.map((s) => ({
        session_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        late_after: s.late_after,
        ended: s.ended,
        present: s.attendance.filter((a) => a.status === 'Present').map((a) => a.student),
        late: s.attendance.filter((a) => a.status === 'Late').map((a) => a.student),
        absent: s.attendance.filter((a) => a.status === 'Absent').map((a) => a.student),
        not_yet_recorded: s.attendance.filter((a) => a.status.startsWith('Not yet')).map((a) => a.student),
      }));

      return {
        subject_name: cls.subject_name,
        section: cls.section,
        class_code: cls.class_code,
        archived: !!cls.archived,
        students: clsStudents.map((s) => `${s.first_name} ${s.last_name}`),
        sessions: sessionsForAI,
        studentSummary,
      };
    }),
  };
}

module.exports = { buildTeacherAIContext };
