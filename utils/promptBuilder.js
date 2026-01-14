/**
 * Constructs prompts for Claude API to generate product recommendations
 */

/**
 * System message that sets the context for Claude
 * @returns {string} System message
 */
function getSystemMessage() {
  return `You are an expert DIY product recommender for first-time homeowners.
Your goal is to suggest specific, readily-available products from major retailers (Home Depot, Lowe's, Ace Hardware) for generic DIY materials.

Guidelines:
- Recommend well-known, trusted brands
- Prioritize mid-range quality/price (avoid ultra-cheap and ultra-premium)
- Consider safety and ease of use for beginners
- Provide specific model names/numbers when possible
- Include practical buying tips
- Return response as JSON only, no extra text

Response Format:
{
  "primaryBrand": "Brand name",
  "primaryModel": "Model or product line",
  "specification": "Clear description with key specs",
  "reasoning": "Why this is good for beginners (1-2 sentences)",
  "alternatives": [
    {
      "brand": "Alternative brand",
      "model": "Alternative model",
      "note": "Why consider this"
    }
  ],
  "buyingTips": "Practical advice (coverage, sizing, compatibility)",
  "quantitySuggestion": "Is the requested quantity appropriate?"
}`;
}

/**
 * Build user message with material details and project context
 * @param {Object} materialData - Material information
 * @returns {string} User message
 */
function buildUserMessage(materialData) {
  const {
    name,
    category,
    quantity,
    unit,
    specification,
    projectContext,
  } = materialData;

  const projectTitle = projectContext?.projectTitle || 'Unknown Project';
  const projectCategory = projectContext?.projectCategory || 'General';

  return `Material: ${name}
Category: ${category || 'Other'}
Quantity: ${quantity} ${unit || 'count'}
Current Specification: ${specification || 'none'}

Project Context:
- Project: ${projectTitle}
- Project Category: ${projectCategory}

Please recommend a specific product for this material. If the material is ambiguous (e.g., "Paint" could be interior/exterior), make reasonable assumptions based on the project context and note those assumptions in your reasoning.`;
}

/**
 * Build complete prompt structure for Claude API
 * @param {Object} materialData - Material information
 * @returns {Object} Prompt structure with system and messages
 */
function buildEnhancementPrompt(materialData) {
  return {
    system: getSystemMessage(),
    messages: [
      {
        role: 'user',
        content: buildUserMessage(materialData),
      },
    ],
  };
}

/**
 * Validate material data has required fields
 * @param {Object} materialData - Material information
 * @returns {Object} { valid: boolean, error: string }
 */
function validateMaterialData(materialData) {
  if (!materialData) {
    return { valid: false, error: 'Material data is required' };
  }

  if (!materialData.name || typeof materialData.name !== 'string') {
    return { valid: false, error: 'Material name is required and must be a string' };
  }

  if (!materialData.quantity || typeof materialData.quantity !== 'number') {
    return { valid: false, error: 'Material quantity is required and must be a number' };
  }

  return { valid: true };
}

/**
 * System message for project generation
 * @returns {string} System message
 */
function getProjectGenerationSystemMessage() {
  return `You are an expert DIY project planner for first-time homeowners.
Given a problem or project description, generate a detailed, actionable project plan.

Guidelines:
- Break down complex tasks into clear, sequential steps
- Provide specific, beginner-friendly instructions
- List all required materials with quantities and specifications
- Include safety warnings and tips
- Estimate realistic time and costs for beginners
- Consider skill level and typical DIY constraints
- Return response as JSON only, no extra text

Response Format:
{
  "title": "Clear, concise project title",
  "description": "1-2 sentence project description",
  "category": "Plumbing|Electrical|Painting|Carpentry|Other",
  "difficulty": "Beginner|Intermediate|Advanced",
  "estimatedTime": "X hours or X days",
  "steps": [
    {
      "order": 1,
      "title": "Step title",
      "instructions": "Detailed step-by-step instructions",
      "tips": "Helpful tips for beginners",
      "warnings": "Safety warnings if applicable"
    }
  ],
  "materials": [
    {
      "name": "Material name",
      "quantity": 1,
      "unit": "count|feet|gallons|etc",
      "category": "Hardware|Paint|Plumbing|Electrical|Other",
      "specification": "Specific details, brand suggestions",
      "notes": "Where to find, alternatives, etc"
    }
  ],
  "tools": [
    {
      "name": "Tool name",
      "required": true,
      "alternatives": "Alternative tool if applicable"
    }
  ],
  "safetyTips": [
    "Important safety tip 1",
    "Important safety tip 2"
  ],
  "estimatedCost": "$XX-XX",
  "commonMistakes": [
    "Common mistake to avoid"
  ]
}`;
}

/**
 * Build user message for project generation
 * @param {Object} projectData - Project request information
 * @returns {string} User message
 */
function buildProjectGenerationUserMessage(projectData) {
  const { description, context } = projectData;
  const homeType = context?.homeType || 'Unknown';
  const experienceLevel = context?.experienceLevel || 'Beginner';
  const budget = context?.budget || 'Moderate';

  return `Problem/Project Description: ${description}

Context:
- Home Type: ${homeType}
- Experience Level: ${experienceLevel}
- Budget Preference: ${budget}

Generate a complete DIY project plan that a ${experienceLevel.toLowerCase()} can follow. Be specific about materials (with brands when helpful), include clear step-by-step instructions, and prioritize safety.`;
}

/**
 * Build complete prompt structure for project generation
 * @param {Object} projectData - Project request information
 * @returns {Object} Prompt structure with system and messages
 */
function buildProjectGenerationPrompt(projectData) {
  return {
    system: getProjectGenerationSystemMessage(),
    messages: [
      {
        role: 'user',
        content: buildProjectGenerationUserMessage(projectData),
      },
    ],
  };
}

/**
 * Validate project generation request data
 * @param {Object} projectData - Project request information
 * @returns {Object} { valid: boolean, error: string }
 */
function validateProjectData(projectData) {
  if (!projectData) {
    return { valid: false, error: 'Project data is required' };
  }

  if (!projectData.description || typeof projectData.description !== 'string') {
    return { valid: false, error: 'Project description is required and must be a string' };
  }

  if (projectData.description.length < 10) {
    return { valid: false, error: 'Project description must be at least 10 characters' };
  }

  return { valid: true };
}

module.exports = {
  // Material enhancement
  getSystemMessage,
  buildUserMessage,
  buildEnhancementPrompt,
  validateMaterialData,

  // Project generation
  getProjectGenerationSystemMessage,
  buildProjectGenerationUserMessage,
  buildProjectGenerationPrompt,
  validateProjectData,
};
