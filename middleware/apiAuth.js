/**
 * API key authentication middleware.
 * Protects all /api routes except /api/health.
 * Set API_SECRET_KEY in Railway env to enforce; leave unset to bypass (dev mode).
 */
function apiAuth(req, res, next) {
  if (req.path === '/health') return next();

  const expectedKey = process.env.API_SECRET_KEY;
  if (!expectedKey) return next();

  const providedKey = req.headers['x-api-key'];
  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Valid API key required.',
    });
  }
  next();
}

module.exports = apiAuth;
