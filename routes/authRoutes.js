const router = require('express').Router();
const auth = require('../controllers/authController');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiters');

router.post('/register/student', registerLimiter, auth.registerStudent);
router.post('/login/student', loginLimiter, auth.loginStudent);
router.post('/login/teacher', loginLimiter, auth.loginTeacher);
router.post('/forgot-password/student', forgotPasswordLimiter, auth.forgotPasswordStudent);
router.post('/forgot-password/teacher', forgotPasswordLimiter, auth.forgotPasswordTeacher);
router.post('/logout', auth.logout);
router.get('/me', auth.me);

module.exports = router;
