// ─── index.js ─────────────────────────────────────────────────────────────────
// Theme Management Server — Express entry point
// Rules 26, 27, 28, 29, 32, 33, 35: Security headers, sanitisation, CORS, rate limiting

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./src/utils/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const { sanitizeObject } = require('./src/utils/validators');

// Route imports
const authRoutes = require('./src/routes/auth');
const projectRoutes = require('./src/routes/projects');
const themeRoutes = require('./src/routes/themes');
const layoutRoutes = require('./src/routes/layout');
const auditRoutes = require('./src/routes/audit');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Security Headers (Rule 27) ───────────────────────────────────────────────
// Helmet sets X-Frame-Options, X-XSS-Protection, Content-Security-Policy, etc.
app.use(
  helmet({
    contentSecurityPolicy: IS_PRODUCTION, // Only enforce CSP in production
    crossOriginEmbedderPolicy: false,     // Allow embedding in admin UIs
  })
);

// ─── CORS Configuration (Rule 28) ────────────────────────────────────────────
// Allow only registered origins — prevents unauthorized frontend access
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests with no origin (Next.js SSR, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-project-domain'],
    credentials: true,
  })
);

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── NoSQL Injection Sanitiser (Rule 27) ─────────────────────────────────────
// Strips MongoDB operator keys ($) from request bodies, params, and query strings
// This prevents injection attacks like { "projectId": { "$ne": null } }
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
});

// ─── Structured Request Logger (Rule 35) ─────────────────────────────────────
// Logs method, path, status, and duration for every request
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(
      `[${level}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms) | IP: ${req.ip}`
    );
  });
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'theme-server',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/layout', layoutRoutes);
app.use('/api/audit', auditRoutes);   // Rule 23: Audit log query endpoint

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`\n🚀 Theme Server running on http://localhost:${PORT}`);
    console.log(`   Mode:    ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   Origins: ${allowedOrigins.join(', ') || 'none configured (all server-to-server allowed)'}\n`);
  });
};

startServer();
