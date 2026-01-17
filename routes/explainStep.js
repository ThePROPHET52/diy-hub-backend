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

    // Pass to error handler middleware
    next(error);
  }
});

module.exports = router;
