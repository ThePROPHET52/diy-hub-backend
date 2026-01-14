/**
 * Centralized error handling middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  // Default error response
  const errorResponse = {
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again.',
  };

  // Customize response based on error type
  if (err.message) {
    // Check for known error patterns
    if (err.message.includes('API key')) {
      errorResponse.error = 'Configuration error';
      errorResponse.message = 'Server configuration issue. Please contact support.';
      return res.status(500).json(errorResponse);
    }

    if (err.message.includes('Rate limit')) {
      errorResponse.error = 'Rate limit exceeded';
      errorResponse.message = 'Too many requests. Please try again later.';
      return res.status(429).json(errorResponse);
    }

    if (err.message.includes('Invalid JSON')) {
      errorResponse.error = 'Invalid response';
      errorResponse.message = 'Received invalid response from AI service. Please try again.';
      return res.status(500).json(errorResponse);
    }

    if (err.message.includes('validation')) {
      errorResponse.error = 'Validation error';
      errorResponse.message = err.message;
      return res.status(400).json(errorResponse);
    }
  }

  // Send generic error response
  res.status(500).json(errorResponse);
}

/**
 * Handle 404 errors
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
