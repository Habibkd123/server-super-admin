// ─── src/middleware/errorHandler.js ──────────────────────────────────────────
// Global error handler — catches all unhandled errors from controllers
// Rules 30, 31: Fail safely — NEVER expose stack traces, DB schema, or file paths to client

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const errorHandler = (err, req, res, next) => {
  // Always log full error server-side for debugging — never to client
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message);
  if (!IS_PRODUCTION) {
    console.error(err.stack);
  }

  // ── Mongoose Validation Error (schema constraint failures) ──────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({
      success: false,
      message: messages.join('. '),
    });
  }

  // ── Mongoose Duplicate Key Error (e.g. duplicate projectId) ────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      // Rule 31: Do not expose collection names or DB schema in the message
      message: `A record with this ${field} already exists. Please use a different value.`,
    });
  }

  // ── Mongoose Cast Error (invalid ObjectId format) ──────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid identifier format.',
    });
  }

  // ── JWT Errors ─────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please login again.',
    });
  }

  // ── CORS Errors ────────────────────────────────────────────────────────────
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This origin is not allowed.',
    });
  }

  // ── Payload Too Large ──────────────────────────────────────────────────────
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large.',
    });
  }

  // ── Default: Generic 500 ───────────────────────────────────────────────────
  // Rule 31: NEVER expose err.message in production — it may leak DB schema or file paths
  return res.status(err.status || 500).json({
    success: false,
    // In development: show message for easier debugging
    // In production: always use generic message to prevent data leakage
    message: IS_PRODUCTION
      ? 'An internal server error occurred. Please try again later.'
      : (err.message || 'An internal server error occurred.'),
  });
};

module.exports = { errorHandler };
