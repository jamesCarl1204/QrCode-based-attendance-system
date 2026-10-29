const GENERIC = 'Something went wrong. Please try again.';

const fail = (res, status, generalError) => res.status(status).json({ success: false, generalError });
const fieldErrors = (res, status, errors) => res.status(status).json({ success: false, errors });

function serverError(res, label, err, message = GENERIC) {
  console.error(`${label}:`, err);
  return res.status(500).json({ success: false, generalError: message });
}

module.exports = { fail, fieldErrors, serverError };
