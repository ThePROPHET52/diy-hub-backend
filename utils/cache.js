const NodeCache = require('node-cache');
const crypto = require('crypto');

// Initialize cache with 7-day TTL
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 604800, // 7 days
  checkperiod: 86400, // Check for expired keys every 24 hours
  maxKeys: 1000, // Limit to 1000 entries
});

/**
 * Generate a consistent cache key from material data
 * @param {Object} materialData - Material information
 * @returns {string} SHA256 hash of key components
 */
function generateCacheKey(materialData) {
  const { name, category, specification } = materialData;

  // Normalize inputs
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedCategory = (category || '').toLowerCase().trim();
  const normalizedSpec = (specification || 'no-spec').toLowerCase().trim();

  // Version for cache invalidation when prompt changes
  const version = 'v1';

  // Create composite key
  const compositeKey = `${normalizedName}_${normalizedCategory}_${normalizedSpec}_${version}`;

  // Hash for consistent key length
  return crypto.createHash('sha256').update(compositeKey).digest('hex');
}

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Object|null} Cached value or null
 */
function getCached(key) {
  const value = cache.get(key);
  if (value) {
    console.log(`[Cache] HIT: ${key}`);
    return value;
  }
  console.log(`[Cache] MISS: ${key}`);
  return null;
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {Object} value - Value to cache
 * @param {number} ttl - Optional TTL override in seconds
 */
function setCached(key, value, ttl) {
  const success = cache.set(key, value, ttl);
  if (success) {
    console.log(`[Cache] SET: ${key} (TTL: ${ttl || 'default'})`);
  } else {
    console.error(`[Cache] FAILED to set: ${key}`);
  }
  return success;
}

/**
 * Clear all cached values
 */
function clearCache() {
  cache.flushAll();
  console.log('[Cache] Cleared all entries');
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize,
  };
}

module.exports = {
  generateCacheKey,
  getCached,
  setCached,
  clearCache,
  getCacheStats,
};
