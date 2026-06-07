const isProd = process.env.NODE_ENV === 'production';

function errorHandler(err, req, res, next) {
  // Log message only; include stack in non-production for debugging
  if (isProd) {
    console.error(`[Error] ${err.message || 'Unknown error'}`);
  } else {
    console.error('[Error]', err.message, '\n', err.stack);
  }

  const errorResponse = {
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again.',
  };

  if (err.message) {
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
    if (err.message.includes('validation') || err.message.includes('Invalid project plan')) {
      errorResponse.error = 'Validation error';
      errorResponse.message = err.message;
      return res.status(400).json(errorResponse);
    }
  }

  res.status(500).json(errorResponse);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'Endpoint not found.',
  });
}

module.exports = { errorHandler, notFoundHandler };
