require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimiter = require('./middleware/rateLimiter');
const apiAuth = require('./middleware/apiAuth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/enhance');
const generateRoutes = require('./routes/generate');
const explainStepRoutes = require('./routes/explainStep');

// Validate environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[ERROR] ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Railway/production deployment
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — no credentials since we're not using cookies
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
}));

// Body parsers with size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request timeout: abort and respond after 35 seconds
app.use((req, res, next) => {
  req.setTimeout(35000, () => {
    res.status(503).json({
      success: false,
      error: 'Request timeout',
      message: 'The request took too long. Please try again.',
    });
  });
  next();
});

// Request logging (path only — no body, no headers)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rate limiting + auth on all /api routes
app.use('/api', rateLimiter);
app.use('/api', apiAuth);

// Routes
app.use('/api', apiRoutes);
app.use('/api', generateRoutes);
app.use('/api', explainStepRoutes);

// Root endpoint — minimal info
app.get('/', (req, res) => {
  res.json({ success: true, service: 'HomeProjectPro.AI Backend' });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  const authEnabled = !!process.env.API_SECRET_KEY;
  console.log(`[Server] HomeProjectPro.AI Backend listening on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] API key auth: ${authEnabled ? 'ENABLED' : 'disabled (set API_SECRET_KEY to enable)'}`);
  console.log(`[Server] Rate limit: ${process.env.RATE_LIMIT_MAX || 200} requests per hour`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  process.exit(0);
});
