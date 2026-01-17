/**
 * Constructs prompts for Claude API to generate product recommendations
 */

/**
 * System message that sets the context for Claude
 * @returns {string} System message
 */
function getSystemMessage() {
  return `You are a helpful assistant for first-time homeowners working on DIY projects.
Your goal is to provide specific, beginner-friendly product recommendations for DIY materials.

IMPORTANT GUIDELINES:

1. **Prioritize beginner-friendly products**:
   - Choose brands and products known for ease of use for first-timers
   - Look for features that help beginners (e.g., paint + primer combos, self-leveling formulas)
   - Prefer products with clear instructions and forgiving application
   - Consider availability at major retailers (Home Depot, Lowe's, Ace Hardware)

2. **Consider the project context**:
   - Match product formulation to the project type (interior vs exterior, etc.)
   - For painting projects, suggest paint + primer combinations
   - For plumbing, suggest compression fittings over soldering when appropriate
   - Use the project category to make context-aware recommendations

3. **Explain the "why"**:
   - In your reasoning, clearly explain WHY this specific product is ideal for their project
   - Explain WHY it's particularly suitable for beginners
   - Highlight what makes it better than generic alternatives

4. **Quantity guidance**:
   - Verify the requested quantity makes sense for the typical project
   - If adjustment needed, suggest the correct amount with clear explanation
   - Explain coverage rates or usage amounts (e.g., "2 gallons covers 800 sq ft")

5. **Be price-conscious**:
   - Primary recommendation should be mid-range (not cheapest, not most expensive)
   - Include one budget-friendly alternative for cost-conscious users
   - Include one premium alternative with clear explanation of added value

6. **Provide actionable buying tips**:
   - Specify where to find the product in the store (e.g., "Paint aisle, interior section")
   - What to look for on the label or packaging
   - Common purchasing mistakes to avoid
   - Seasonal considerations if applicable (e.g., "Avoid buying in winter")

Response Format (JSON only, no extra text):
{
  "primaryBrand": "Brand name",
  "primaryModel": "Specific product line or model",
  "specification": "Detailed specs formatted for storage (size, finish, key features)",
  "reasoning": "2-3 sentences explaining why this is ideal for their project and skill level",
  "alternatives": [
    {
      "brand": "Alternative brand",
      "model": "Product line",
      "note": "When to choose this option (e.g., 'Budget-friendly option at $X less' or 'Premium choice for added durability')"
    }
  ],
  "buyingTips": "3-4 practical, specific tips for purchasing this material",
  "quantitySuggestion": "Confirmation or adjustment of quantity with clear explanation"
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
  return `You are a helpful assistant for first-time homeowners working on DIY projects.
Given a problem or project description, generate a detailed, beginner-friendly project plan.

CRITICAL GUIDELINES FOR STEPS:

1. **Assume ZERO prior knowledge**:
   - Explain every step as if the user has never done this before
   - Define technical terms inline (e.g., "Turn off the water supply valve (usually located under the sink)")
   - Specify which tools to use for each step

2. **Each step should have 3 parts**:
   - **What to do**: The action (e.g., "Remove the old faucet")
   - **How to do it**: Detailed instructions (e.g., "Use the basin wrench to reach up behind the sink and turn the mounting nuts counterclockwise")
   - **Why it matters**: Brief explanation (e.g., "This prevents water damage when you disconnect the supply lines")

3. **Include validation checks**:
   - After important steps, tell the user how to verify it was done correctly
   - Example: "Test for leaks. Turn the water back on slowly and check all connections. You should see no drips."

4. **Warn about common beginner mistakes**:
   - For steps where beginners often make errors, add a specific warning
   - Example: "⚠️ Common mistake: Over-tightening can crack plastic fittings. Hand-tight plus 1/4 turn is enough."

5. **Provide timing expectations**:
   - Give realistic time estimates per step
   - Example: "This step takes about 15-20 minutes. Take your time - rushing leads to mistakes."

6. **Break down complex steps**:
   - If a step involves multiple distinct actions, break it into substeps
   - Each substep should be a single, clear action
   - Use clear numbering (e.g., step 6 has substeps 6a, 6b, 6c)

Tool Selection Guidelines:
- For each tool, consider if there are practical alternatives:
  * Power tools vs manual tools (e.g., power drill vs hand drill)
  * Budget-friendly vs premium options
  * Specialized vs multi-purpose tools
- For EACH alternative, provide:
  * name: Specific tool name
  * specification: What makes this tool suitable for the project
  * tradeoff: Why a user might prefer this over the primary option
- Only mark tools as "required: true" if they're absolutely essential
- Include "usage" field to explain when/how the tool is used in the project

IMPORTANT:
- Steps should be thorough enough that someone could follow them WITHOUT watching a video
- Use specific measurements and directions (e.g., "turn clockwise" not just "turn it")
- Include sensory cues when helpful (e.g., "You'll hear a click when it's properly seated")
- If the project is truly dangerous for beginners, say so clearly in the description

Response Format (JSON only, no extra text):
{
  "title": "Clear, concise project title",
  "description": "1-2 sentence project description",
  "category": "Plumbing|Electrical|Painting|Carpentry|Other",
  "difficulty": "Beginner|Intermediate|Advanced",
  "estimatedTime": "X hours or X days",
  "steps": [
    {
      "stepNumber": 1,
      "title": "ONE concise sentence describing the action (e.g., 'Turn off the water supply')",
      "instruction": "Detailed multi-sentence explanation following the 3-part format:\n- What to do: Clear description of the action\n- How to do it: Step-by-step instructions with specific techniques\n- Why it matters: Explanation of importance\n\nThis should be 3-5 sentences that provide complete guidance for someone who has never done this before.",
      "estimatedTime": "Realistic time estimate for this specific step (e.g., '10-15 minutes')",
      "warning": "Optional: Specific warning about common mistakes for this step (e.g., '⚠️ Don't over-tighten - hand-tight plus 1/4 turn only')"
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
      "name": "Primary tool name",
      "specification": "Detailed description of this specific tool option",
      "required": true,
      "alternatives": [
        {
          "name": "Alternative tool name",
          "specification": "Detailed description of this alternative",
          "tradeoff": "Why a user might choose this instead (e.g., 'Cheaper but requires more physical effort', 'More precise but costs more')"
        }
      ],
      "usage": "When and how this tool will be used in the project"
    }
  ],
  "safetyTips": [
    "Important safety tip 1",
    "Important safety tip 2"
  ],
  "estimatedCost": "$XX-XX",
  "commonMistakes": [
    "Specific mistake beginners make on this type of project with actionable advice to avoid it"
  ],
  "successCriteria": "How to know the project is completed correctly. Should describe measurable, observable outcomes (e.g., 'No water leaks after 24 hours of use' not just 'works correctly')"
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

/**
 * Build prompt for explaining a specific project step
 * @param {Object} stepData - Step information
 * @returns {Object} Prompt structure
 */
function buildStepExplanationPrompt(stepData) {
  const { stepTitle, projectTitle, projectCategory } = stepData;

  const systemMessage = `You are a helpful assistant for first-time homeowners working on DIY projects.
Your role is to provide clear, detailed explanations of project steps for complete beginners.

Guidelines:
1. **Be extremely detailed** - Assume the user has never done this before
2. **Use simple language** - Define all technical terms
3. **Include visual cues** - Describe what things should look like
4. **Provide context** - Explain why this step matters in the bigger picture
5. **Warn about pitfalls** - Mention common mistakes beginners make
6. **Be encouraging** - Reassure that this is doable for beginners

Response Format (JSON only):
{
  "explanation": "3-5 paragraph detailed explanation covering: (1) What this step means, (2) How to do it with specific techniques, (3) What to look for/expect, (4) Common mistakes to avoid",
  "keyPoints": [
    "Important point 1",
    "Important point 2",
    "Important point 3"
  ],
  "visualCues": "Description of what the user should see/hear/feel at this stage (e.g., 'You should hear a click', 'The connection should feel hand-tight')",
  "estimatedTime": "Realistic time estimate for this step",
  "commonMistakes": [
    "Specific mistake 1 and how to avoid it",
    "Specific mistake 2 and how to avoid it"
  ]
}`;

  const userMessage = `Step: "${stepTitle}"
Project: ${projectTitle}
Project Category: ${projectCategory || 'General DIY'}

Please provide a detailed explanation of how to complete this step. Remember, the user is a beginner doing this for the first time.`;

  return {
    system: systemMessage,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  };
}

/**
 * Validate step explanation request
 * @param {Object} stepData - Step information
 * @returns {Object} { valid: boolean, error: string }
 */
function validateStepData(stepData) {
  if (!stepData) {
    return { valid: false, error: 'Step data is required' };
  }

  if (!stepData.stepTitle || typeof stepData.stepTitle !== 'string') {
    return { valid: false, error: 'Step title is required and must be a string' };
  }

  if (stepData.stepTitle.length < 3) {
    return { valid: false, error: 'Step title must be at least 3 characters' };
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

  // Step explanation
  buildStepExplanationPrompt,
  validateStepData,
};
