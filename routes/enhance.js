const express = require('express');
const router = express.Router();
const { getProductRecommendationWithRetry } = require('../services/claudeService');
const { validateMaterialData } = require('../utils/promptBuilder');
const { generateCacheKey, getCached, setCached } = require('../utils/cache');

/**
 * POST /api/enhance-material
 * Enhance a generic material with AI-powered product recommendations
 */
router.post('/enhance-material', async (req, res, next) => {
  try {
    const materialData = req.body;

    // Validate input
    const validation = validateMaterialData(materialData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error,
      });
    }

    // Check cache
    const cacheKey = generateCacheKey(materialData);
    const cachedRecommendation = getCached(cacheKey);

    if (cachedRecommendation) {
      return res.json({
        success: true,
        data: {
          recommendation: cachedRecommendation,
        },
        cached: true,
      });
    }

    // Call Claude API
    console.log(`[API] Processing request for: ${materialData.name}`);
    const recommendation = await getProductRecommendationWithRetry(materialData);

    // Cache the result
    setCached(cacheKey, recommendation);

    // Return recommendation
    res.json({
      success: true,
      data: {
        recommendation,
      },
      cached: false,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'diy-hub-backend',
  });
});

/**
 * GET /api/cache-stats
 * Get cache statistics (for debugging)
 */
router.get('/cache-stats', (req, res) => {
  const { getCacheStats } = require('../utils/cache');
  const stats = getCacheStats();

  res.json({
    success: true,
    data: {
      cacheStats: stats,
    },
  });
});

module.exports = router;
