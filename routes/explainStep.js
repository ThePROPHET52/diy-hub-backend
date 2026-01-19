/**
 * Step Explanation API Routes
 * Handles AI-powered explanations of individual project steps
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { buildStepExplanationPrompt, validateStepData } = require('../utils/promptBuilder');
const { explainStepWithRetry } = require('../services/claudeService');
const { getCached, setCached } = require('../utils/cache');

/**
 * POST /api/explain-step
 * Get a detailed AI explanation of a project step
 */
router.post('/explain-step', async (req, res, next) => {
  try {
    const stepData = req.body;

    // Validate request
    const validation = validateStepData(stepData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error,
      });
    }

    // Check cache first (based on step title + project title hash)
    const cacheContent = `${stepData.stepTitle}_${stepData.projectTitle || ''}`;
    const stepHash = crypto
      .createHash('sha256')
      .update(cacheContent.toLowerCase().trim())
      .digest('hex');
    const cacheKey = `step_${stepHash}`;
    const cached = getCached(cacheKey);

    if (cached) {
      console.log('[explain-step] Cache hit for step explanation');
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    console.log('[explain-step] Cache miss, calling Claude API for step explanation');

    // Call Claude API with retry logic
    const explanation = await explainStepWithRetry(stepData);

    // Validate the response has required fields
    if (!explanation || typeof explanation !== 'object') {
      console.error('[explain-step] Invalid explanation response:', explanation);
      return res.status(500).json({
        success: false,
        error: 'Invalid response',
        message: 'AI returned invalid response format',
      });
    }

    // Check for required fields
    const requiredFields = ['explanation', 'keyPoints', 'visualCues', 'estimatedTime', 'commonMistakes'];
    const missingFields = requiredFields.filter(field => !explanation[field]);
    if (missingFields.length > 0) {
      console.error('[explain-step] Missing required fields:', missingFields);
      return res.status(500).json({
        success: false,
        error: 'Incomplete response',
        message: `AI response missing fields: ${missingFields.join(', ')}`,
      });
    }

    // Cache the response
    setCached(cacheKey, explanation);

    // Return success
    res.json({
      success: true,
      data: explanation,
      cached: false,
    });
  } catch (error) {
    console.error('[explain-step] Error explaining step:', error);
    console.error('[explain-step] Error stack:', error.stack);

    // Return proper error response instead of passing to middleware
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message || 'Failed to generate explanation',
    });
  }
});

module.exports = router;
