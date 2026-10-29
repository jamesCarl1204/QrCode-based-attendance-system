// requireRole()          -> any logged-in user
// requireRole('teacher') -> only that role
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session && req.session.user;
    if (!user || (roles.length && !roles.includes(user.role))) {
      return res.status(401).json({ success: false, generalError: 'Not authorized.' });
    }
    next();
  };
}

module.exports = {
  requireAuth: requireRole(),
  requireTeacher: requireRole('teacher'),
  requireStudent: requireRole('student'),
  requireAdmin: requireRole('admin'),
};
