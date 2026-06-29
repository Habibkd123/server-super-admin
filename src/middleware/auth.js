// ─── src/middleware/auth.js ───────────────────────────────────────────────────
// JWT verification middleware for all JWT-protected routes
// Validates token + checks role === 'superadmin'

const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Ensure Authorization header exists and is Bearer format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authorization token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify and decode the JWT using either the local secret or fallback access secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      if (process.env.JWT_ACCESS_SECRET) {
        decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      } else {
        throw e;
      }
    }

    // SECURITY: Only superadmin or super_admin roles can access protected routes
    if (decoded.role !== 'superadmin' && decoded.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Super Admin access required.',
      });
    }

    // Attach decoded payload to request for downstream controllers
    req.admin = decoded;
    next();
  } catch (err) {
    // Do not expose specific JWT error messages to client
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
    });
  }
};

module.exports = { authMiddleware };
