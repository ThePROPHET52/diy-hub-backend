require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimiter = require('./middleware/rateLimiter');
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

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Apply rate limiting to all /api routes
app.use('/api', rateLimiter);

// Routes
app.use('/api', apiRoutes);
app.use('/api', generateRoutes);
app.use('/api', explainStepRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HomeProjectPro.AI Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      enhance: 'POST /api/enhance-material',
      generate: 'POST /api/generate-project',
      cacheStats: 'GET /api/cache-stats',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`[Server] HomeProjectPro.AI Backend listening on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Rate limit: ${process.env.RATE_LIMIT_MAX || 100} requests per hour`);
  console.log(`[Server] Cache TTL: ${process.env.CACHE_TTL_SECONDS || 604800} seconds`);
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
