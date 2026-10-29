const router = require('express').Router();
const admin = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

router.use('/admin', requireAdmin); // every /api/admin/* route needs admin (dashboard is in dashboardRoutes)

router.get('/admin/students', admin.listStudents);
router.delete('/admin/students/:id', admin.deleteStudent);

router.get('/admin/teachers', admin.listTeachers);
router.post('/admin/teachers', admin.createTeacher);
router.delete('/admin/teachers/:id', admin.deleteTeacher);

router.get('/admin/classes', admin.listClasses);
router.get('/admin/classes/:id', admin.classDetail);
router.delete('/admin/classes/:id', admin.deleteClass);

module.exports = router;
