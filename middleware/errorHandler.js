function notFound(req, res) {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, generalError: 'Route not found.' });
  }
  return res.status(404).json({ success: false, message: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, generalError: 'Origin not allowed.' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, generalError: 'Invalid JSON body.' });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ success: false, generalError: 'Something went wrong. Please try again.' });
}

module.exports = { notFound, errorHandler };
