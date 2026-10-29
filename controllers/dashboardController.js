const classModel = require('../models/classModel');
const sessionModel = require('../models/sessionModel');
const attendanceModel = require('../models/attendanceModel');
const studentModel = require('../models/studentModel');
const teacherModel = require('../models/teacherModel');
const { toPHDate, phDate, ymd, calcRate } = require('../utils/helpers');
const { serverError } = require('../utils/response');

/* GET /student/dashboard */
async function studentDashboard(req, res) {
  try {
    const studentId = req.session.user.id;
    const classes = await classModel.listActiveForStudent(studentId);
    if (classes.length === 0) {
      return res.json({ success: true, overall: { present: 0, late: 0, absent: 0, rate: null }, classes: [] });
    }

    const sessions = await sessionModel.listByClassIds(classes.map((c) => c.id));
    const records = await attendanceModel.listForStudent(studentId, sessions.map((s) => s.id));
    const recMap = {};
    records.forEach((r) => { recMap[r.session_id] = r.status; });

    const now = new Date();
    const rate = (p, l, a) => calcRate(p + l, p + l + a);

    let tp = 0, tl = 0, ta = 0;
    const classesOut = classes.map((c) => {
      let present = 0, late = 0, absent = 0;
      sessions.filter((s) => s.class_id === c.id).forEach((s) => {
        const st = recMap[s.id];
        const ended = now > toPHDate(s.session_date, s.end_time);
        if (st === 'Present') present++;
        else if (st === 'Late') late++;
        else if (st === 'Absent') absent++;
        else if (ended) absent++;
      });
      tp += present; tl += late; ta += absent;
      return { ...c, present, late, absent, rate: rate(present, late, absent) };
    });

    return res.json({
      success: true,
      overall: { present: tp, late: tl, absent: ta, rate: rate(tp, tl, ta) },
      classes: classesOut,
    });
  } catch (err) {
    return serverError(res, 'Student dashboard error', err);
  }
}

/* GET /teacher/dashboard */
async function teacherDashboard(req, res) {
  try {
    const teacherId = req.session.user.id;

    // Philippine time (Render server runs in UTC)
    const nowPH = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const todayStr = ymd(nowPH);
    const mon = new Date(nowPH);
    mon.setDate(nowPH.getDate() - ((nowPH.getDay() + 6) % 7)); // Monday of this week
    const weekDays = [0, 1, 2, 3, 4].map((i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i); return ymd(d);
    });
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const weekEnd = ymd(sun);

    const empty = { students: 0, todayRate: null, todayScans: 0, weekly: [null, null, null, null, null], status: [0, 0, 0], recent: [] };

    const classIds = await classModel.listActiveIdsByTeacher(teacherId);
    if (!classIds.length) return res.json({ success: true, stats: empty });

    const total = await classModel.countDistinctStudents(classIds);
    const enrolled = await classModel.enrolledCounts(classIds);
    const sessions = await sessionModel.listInRange(classIds, weekDays[0], weekEnd);
    const records = await attendanceModel.listBySessionIds(sessions.map((s) => s.id));

    const now = new Date();
    const perDay = {};
    let present = 0, late = 0, absent = 0, todayScans = 0;

    sessions.forEach((s) => {
      const recs = records.filter((r) => r.session_id === s.id);
      const p = recs.filter((r) => r.status === 'Present').length;
      const l = recs.filter((r) => r.status === 'Late').length;
      const abs = recs.filter((r) => r.status === 'Absent').length;
      const ended = now > toPHDate(s.session_date, s.end_time);
      const exp = enrolled[s.class_id] || 0;

      if (s.session_date === todayStr) todayScans += p + l;
      present += p;
      late += l;
      absent += abs;                                        // manual Absent counts right away
      if (ended) absent += Math.max(0, exp - p - l - abs);  // no scan + session over = absent

      if (ended) {
        const d = (perDay[s.session_date] ||= { attended: 0, expected: 0 });
        d.attended += p + l;
        d.expected += exp;
      }
    });

    const weekly = weekDays.map((d) => (perDay[d]?.expected ? calcRate(perDay[d].attended, perDay[d].expected) : null));
    const t = perDay[todayStr];
    const todayRate = t?.expected ? calcRate(t.attended, t.expected) : null;

    const recent = await attendanceModel.recentByTeacher(teacherId, 8);

    return res.json({
      success: true,
      stats: { students: total, todayRate, todayScans, weekly, status: [present, late, absent], recent },
    });
  } catch (err) {
    return serverError(res, 'Teacher dashboard error', err);
  }
}

/* GET /admin/dashboard */
async function adminDashboard(req, res) {
  try {
    const studentCount = await studentModel.count();
    const teacherCount = await teacherModel.countTeachers();

    const todayStr = phDate();
    const todaySessions = await sessionModel.listByDate(todayStr);

    const now = new Date();
    let ongoingSessions = 0;
    const endedIds = [];
    const overdue = [];

    todaySessions.forEach((s) => {
      const start = toPHDate(todayStr, s.start_time);
      const end = toPHDate(todayStr, s.end_time);
      if (now >= start && now <= end) ongoingSessions++;
      if (now > end) {
        endedIds.push(s.id);
        if (now - end < 1000 * 60 * 60 * 3) overdue.push(s.id);
      }
    });

    let present = 0, late = 0, absent = 0;
    if (todaySessions.length > 0) {
      const records = await attendanceModel.listBySessionIds(todaySessions.map((s) => s.id));
      records.forEach((r) => {
        if (r.status === 'Present') present++;
        else if (r.status === 'Late') late++;
      });

      if (endedIds.length > 0) {
        const enrolledCounts = await sessionModel.enrolledCountsForSessions(endedIds);
        const recordedPerSession = {};
        records.forEach((r) => {
          if (endedIds.includes(r.session_id)) {
            recordedPerSession[r.session_id] = (recordedPerSession[r.session_id] || 0) + 1;
          }
        });
        enrolledCounts.forEach((row) => {
          absent += Math.max(0, row.enrolled - (recordedPerSession[row.session_id] || 0));
        });
      }
    }

    const attendanceRatePercent = calcRate(present + late, present + late + absent);

    const alerts = [];
    if (overdue.length > 0) {
      alerts.push({
        severity: 'warning',
        message: `${overdue.length} session${overdue.length === 1 ? '' : 's'} still open past end time.`,
      });
    }

    const [recentScans, recentClasses, recentTeachers] = await Promise.all([
      attendanceModel.recentAll(8),
      classModel.recent(3),
      teacherModel.recent(3),
    ]);

    const recentActivity = [
      ...recentScans.map((r) => ({ message: `${r.first_name} ${r.last_name} marked ${r.status} for ${r.subject_name}`, at: r.created_at })),
      ...recentClasses.map((c) => ({ message: `${c.subject_name} class was created`, at: c.created_at })),
      ...recentTeachers.map((t) => ({ message: `New teacher account: ${t.first_name} ${t.last_name}`, at: t.created_at })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);

    return res.json({
      success: true,
      totals: { students: studentCount, teachers: teacherCount, ongoingSessions },
      today: { present, late, absent, attendanceRatePercent },
      alerts,
      recentActivity,
    });
  } catch (err) {
    return serverError(res, 'Admin dashboard error', err);
  }
}

module.exports = { studentDashboard, teacherDashboard, adminDashboard };
