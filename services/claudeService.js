const Anthropic = require('@anthropic-ai/sdk');
const {
  buildEnhancementPrompt,
  buildProjectGenerationPrompt,
  buildStepExplanationPrompt,
} = require('../utils/promptBuilder');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-3-haiku-20240307';
const MAX_TOKENS = 1000;
const TEMPERATURE = 0.3;

/**
 * Call Claude API to get product recommendation
 * @param {Object} materialData - Material information
 * @returns {Promise<Object>} Parsed recommendation object
 */
async function getProductRecommendation(materialData) {
  try {
    const prompt = buildEnhancementPrompt(materialData);

    console.log(`[Claude] Requesting recommendation for: ${materialData.name}`);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: prompt.system,
      messages: prompt.messages,
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Parse JSON response
    let recommendation;
    try {
      // Sometimes Claude wraps JSON in markdown code blocks, try to extract it
      let jsonText = textContent.text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      recommendation = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Claude] Failed to parse JSON. Raw response:', textContent.text);
      console.error('[Claude] Parse error:', parseError.message);
      throw new Error('Invalid JSON response from Claude API');
    }

    // Validate response structure
    const validation = validateRecommendation(recommendation);
    if (!validation.valid) {
      throw new Error(`Invalid recommendation structure: ${validation.error}`);
    }

    console.log(`[Claude] Successfully got recommendation for: ${materialData.name}`);
    return recommendation;
  } catch (error) {
    console.error('[Claude] Error getting recommendation:', error.message);

    // Enhance error with more context
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded on Claude API');
    } else if (error.status >= 500) {
      throw new Error('Claude API server error');
    }

    throw error;
  }
}

/**
 * Call Claude API with retry logic
 * @param {Object} materialData - Material information
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<Object>} Parsed recommendation object
 */
async function getProductRecommendationWithRetry(materialData, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await getProductRecommendation(materialData);
    } catch (error) {
      lastError = error;
      console.error(`[Claude] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on client errors (400-499) except rate limits
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`[Claude] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Validate recommendation response structure
 * @param {Object} recommendation - Recommendation object from Claude
 * @returns {Object} { valid: boolean, error: string }
 */
function validateRecommendation(recommendation) {
  if (!recommendation || typeof recommendation !== 'object') {
    return { valid: false, error: 'Recommendation must be an object' };
  }

  const requiredFields = [
    'primaryBrand',
    'primaryModel',
    'specification',
    'reasoning',
    'alternatives',
    'buyingTips',
    'quantitySuggestion',
  ];

  for (const field of requiredFields) {
    if (!(field in recommendation)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate alternatives array
  if (!Array.isArray(recommendation.alternatives)) {
    return { valid: false, error: 'alternatives must be an array' };
  }

  // Validate each alternative has required fields
  for (const alt of recommendation.alternatives) {
    if (!alt.brand || !alt.model || !alt.note) {
      return { valid: false, error: 'Each alternative must have brand, model, and note' };
    }
  }

  return { valid: true };
}

/**
 * Call Claude API to generate a project plan
 * @param {Object} projectData - Project request information
 * @returns {Promise<Object>} Parsed project plan object
 */
async function generateProjectPlan(projectData) {
  try {
    const prompt = buildProjectGenerationPrompt(projectData);

    console.log(`[Claude] Requesting project plan for: ${projectData.description}`);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000, // Project plans are longer than product recommendations
      temperature: TEMPERATURE,
      system: prompt.system,
      messages: prompt.messages,
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Parse JSON response
    let projectPlan;
    try {
      // Sometimes Claude wraps JSON in markdown code blocks, try to extract it
      let jsonText = textContent.text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      projectPlan = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Claude] Failed to parse JSON. Raw response:', textContent.text);
      console.error('[Claude] Parse error:', parseError.message);
      throw new Error('Invalid JSON response from Claude API');
    }

    // Normalize tool structure (ensure alternatives is an array)
    if (projectPlan.tools && Array.isArray(projectPlan.tools)) {
      projectPlan.tools = projectPlan.tools.map(tool => {
        // If alternatives is a string, convert to empty array
        if (typeof tool.alternatives === 'string') {
          console.warn('[Claude] Tool has string alternatives, converting to array:', tool.name);
          tool.alternatives = [];
        }

        // Ensure alternatives is an array
        if (!Array.isArray(tool.alternatives)) {
          tool.alternatives = [];
        }

        // Validate each alternative has required fields
        tool.alternatives = tool.alternatives.filter(alt => {
          if (!alt.name || !alt.specification) {
            console.warn('[Claude] Filtering out invalid alternative:', alt);
            return false;
          }
          return true;
        });

        // Ensure tool has all expected fields
        return {
          name: tool.name || 'Unknown Tool',
          specification: tool.specification || '',
          required: tool.required ?? true,
          alternatives: tool.alternatives,
          usage: tool.usage || ''
        };
      });
    }

    // Validate response structure
    const validation = validateProjectPlan(projectPlan);
    if (!validation.valid) {
      throw new Error(`Invalid project plan structure: ${validation.error}`);
    }

    console.log(`[Claude] Successfully generated project plan: ${projectPlan.title}`);
    return projectPlan;
  } catch (error) {
    console.error('[Claude] Error generating project plan:', error.message);

    // Enhance error with more context
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded on Claude API');
    } else if (error.status >= 500) {
      throw new Error('Claude API server error');
    }

    throw error;
  }
}

/**
 * Call Claude API with retry logic for project generation
 * @param {Object} projectData - Project request information
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<Object>} Parsed project plan object
 */
async function generateProjectPlanWithRetry(projectData, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateProjectPlan(projectData);
    } catch (error) {
      lastError = error;
      console.error(`[Claude] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on client errors (400-499) except rate limits
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`[Claude] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Validate project plan response structure
 * @param {Object} projectPlan - Project plan object from Claude
 * @returns {Object} { valid: boolean, error: string }
 */
function validateProjectPlan(projectPlan) {
  if (!projectPlan || typeof projectPlan !== 'object') {
    return { valid: false, error: 'Project plan must be an object' };
  }

  const requiredFields = [
    'title',
    'description',
    'category',
    'difficulty',
    'estimatedTime',
    'steps',
    'materials',
    'tools',
    'safetyTips',
    'estimatedCost',
    'commonMistakes',
    // Note: successCriteria is optional for backward compatibility
  ];

  for (const field of requiredFields) {
    if (!(field in projectPlan)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate steps array
  if (!Array.isArray(projectPlan.steps) || projectPlan.steps.length === 0) {
    return { valid: false, error: 'steps must be a non-empty array' };
  }

  // Validate each step has required fields (support both old and new formats)
  for (const step of projectPlan.steps) {
    // New format: stepNumber, title, instruction
    // Old format: order, title, instructions
    const hasStepNumber = step.stepNumber || step.order;
    const hasInstruction = step.instruction || step.instructions;

    if (!hasStepNumber || !step.title || !hasInstruction) {
      return { valid: false, error: 'Each step must have stepNumber/order, title, and instruction/instructions' };
    }
  }

  // Validate materials array
  if (!Array.isArray(projectPlan.materials)) {
    return { valid: false, error: 'materials must be an array' };
  }

  // Validate tools array
  if (!Array.isArray(projectPlan.tools)) {
    return { valid: false, error: 'tools must be an array' };
  }

  // Validate safety tips array
  if (!Array.isArray(projectPlan.safetyTips)) {
    return { valid: false, error: 'safetyTips must be an array' };
  }

  // Validate common mistakes array
  if (!Array.isArray(projectPlan.commonMistakes)) {
    return { valid: false, error: 'commonMistakes must be an array' };
  }

  return { valid: true };
}

/**
 * Call Claude API to explain a project step
 * @param {Object} stepData - Step information
 * @returns {Promise<Object>} Parsed step explanation object
 */
async function explainStep(stepData) {
  try {
    const prompt = buildStepExplanationPrompt(stepData);

    console.log(`[Claude] Requesting step explanation for: ${stepData.stepTitle}`);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500, // Step explanations need more tokens
      temperature: TEMPERATURE,
      system: prompt.system,
      messages: prompt.messages,
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent) {
      throw new Error('No text content in Claude response');
    }

    // Parse JSON response
    let explanation;
    try {
      // Sometimes Claude wraps JSON in markdown code blocks, try to extract it
      let jsonText = textContent.text.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      explanation = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Claude] Failed to parse JSON. Raw response:', textContent.text);
      console.error('[Claude] Parse error:', parseError.message);
      throw new Error('Invalid JSON response from Claude API');
    }

    console.log(`[Claude] Successfully explained step: ${stepData.stepTitle}`);
    return explanation;
  } catch (error) {
    console.error('[Claude] Error explaining step:', error.message);

    // Enhance error with more context
    if (error.status === 401) {
      throw new Error('Invalid Anthropic API key');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded on Claude API');
    } else if (error.status >= 500) {
      throw new Error('Claude API server error');
    }

    throw error;
  }
}

/**
 * Call Claude API with retry logic for step explanation
 * @param {Object} stepData - Step information
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<Object>} Parsed step explanation object
 */
async function explainStepWithRetry(stepData, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await explainStep(stepData);
    } catch (error) {
      lastError = error;
      console.error(`[Claude] Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on client errors (400-499) except rate limits
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.log(`[Claude] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

module.exports = {
  getProductRecommendation,
  getProductRecommendationWithRetry,
  validateRecommendation,
  generateProjectPlan,
  generateProjectPlanWithRetry,
  validateProjectPlan,
  explainStep,
  explainStepWithRetry,
};
