/**
 * Project Generation API Routes
 * Handles AI-powered project generation from user descriptions
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  buildProjectGenerationPrompt,
  validateProjectData,
} = require('../utils/promptBuilder');
const { generateProjectPlanWithRetry } = require('../services/claudeService');
const { getCached, setCached } = require('../utils/cache');

/**
 * POST /api/generate-project
 * Generate a complete DIY project plan from a description
 */
router.post('/generate-project', async (req, res, next) => {
  try {
    const projectData = req.body;

    // Validate request
    const validation = validateProjectData(projectData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error,
      });
    }

    // Check cache first (based on description hash)
    const descriptionHash = crypto
      .createHash('sha256')
      .update(projectData.description.toLowerCase().trim())
      .digest('hex');
    const cacheKey = `project_${descriptionHash}`;
    const cached = getCached(cacheKey);

    if (cached) {
      console.log('[generate] Cache hit for project generation');
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    console.log('[generate] Cache miss, calling Claude API for project generation');

    // Build prompt
    const prompt = buildProjectGenerationPrompt(projectData);

    // Call Claude API with retry logic
    const projectPlan = await generateProjectPlanWithRetry(projectData);

    // Cache the response
    setCached(cacheKey, projectPlan);

    // Return success
    res.json({
      success: true,
      data: projectPlan,
      cached: false,
    });
  } catch (error) {
    console.error('[generate] Error generating project:', error);

    // Pass to error handler middleware
    next(error);
  }
});

module.exports = router;
