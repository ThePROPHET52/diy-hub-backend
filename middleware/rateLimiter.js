const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200, // requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded rate limit`);
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'You have exceeded the request limit. Please try again later.',
    });
  },
});

module.exports = limiter;
