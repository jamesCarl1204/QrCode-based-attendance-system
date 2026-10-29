const rateLimit = require('express-rate-limit');

const make = (windowMs, max, generalError) =>
  rateLimit({
    windowMs, max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, generalError },
  });

module.exports = {
  loginLimiter: make(15 * 60 * 1000, 10, 'Too many attempts. Please try again later.'),
  registerLimiter: make(60 * 60 * 1000, 10, 'Too many registration attempts. Please try again later.'),
  scanLimiter: make(5 * 60 * 1000, 30, 'Too many scan attempts. Please slow down and try again.'),
  forgotPasswordLimiter: make(15 * 60 * 1000, 10, 'Too many attempts. Please try again later.'),
};
