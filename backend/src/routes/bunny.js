const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

// Cache for daily responses (to avoid hitting rate limits)
// Key: date string (YYYY-MM-DD), Value: cached response
const dailyCache = {};

// Track rate-limited models (reset daily)
// Key: model name, Value: timestamp when rate limited
const rateLimitedModels = {};

// List of models to try in order (most capable first, then fallbacks)
const MODEL_FALLBACKS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash-001"
];

// Check if a model was rate limited today
function isModelRateLimited(modelName) {
  if (!rateLimitedModels[modelName]) return false;
  
  // Check if rate limit was today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rateLimitDate = new Date(rateLimitedModels[modelName]);
  rateLimitDate.setHours(0, 0, 0, 0);
  
  // If rate limit was today, skip this model
  return rateLimitDate.getTime() === today.getTime();
}

// Mark a model as rate limited
function markModelRateLimited(modelName) {
  rateLimitedModels[modelName] = new Date().toISOString();
  console.warn(`⚠ Model ${modelName} rate limited, will skip until tomorrow`);
}

// Clean up old rate limit records (older than 1 day)
function cleanupRateLimitCache() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  Object.keys(rateLimitedModels).forEach(modelName => {
    if (new Date(rateLimitedModels[modelName]) < yesterday) {
      delete rateLimitedModels[modelName];
    }
  });
}

// Initialize Gemini AI (only if API key is provided)
// The client needs the API key to be explicitly passed or in GEMINI_API_KEY env var
let ai = null;

// Check for API key
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  try {
    // Explicitly pass the API key to the constructor
    ai = new GoogleGenAI({
      apiKey: apiKey
    });
    console.log('✓ Gemini AI initialized with API key');
    console.log(`  API Key length: ${apiKey.length} characters`);
    console.log(`  API Key starts with: ${apiKey.substring(0, 10)}...`);
  } catch (error) {
    console.error('⚠ Gemini AI initialization failed:', error.message);
    console.error('  Error details:', error);
  }
} else {
  console.warn('⚠ GEMINI_API_KEY not found in environment variables');
  console.warn('  Make sure you have a .env file in the backend directory with:');
  console.warn('  GEMINI_API_KEY=your_api_key_here');
}

/**
 * Build comprehensive prompt for Luna bunny assistant
 * @param {Object} phaseInfo - Current phase information from detectCurrentPhase
 * @param {Object} todayData - Today's data including temperature, trend, etc.
 * @returns {String} - Formatted prompt for Gemini
 */
function buildBunnyPrompt(phaseInfo, todayData) {
  const phaseDescriptions = {
    'pre-ovulation': {
      name: 'Pre-Ovulation Phase',
      characteristics: 'lower basal body temperature, rising estrogen, increasing energy',
      typicalDuration: '7-10 days',
      hormoneFocus: 'Estrogen is rising, preparing your body for ovulation'
    },
    'ovulation': {
      name: 'Ovulation',
      characteristics: 'temperature rise detected, peak fertility, highest energy',
      typicalDuration: '1 day (with 3-5 day fertile window)',
      hormoneFocus: 'Peak estrogen and LH surge, egg release'
    },
    'luteal': {
      name: 'Luteal Phase',
      characteristics: 'elevated temperature, high progesterone, energy may fluctuate',
      typicalDuration: '12-14 days after ovulation',
      hormoneFocus: 'Progesterone is high, supporting potential pregnancy'
    },
    'pre-menstrual': {
      name: 'Pre-Menstrual Phase',
      characteristics: 'elevated temperature, period approaching, body preparing to shed',
      typicalDuration: '1-3 days before period starts',
      hormoneFocus: 'Hormones dropping, body preparing for menstruation'
    },
    'insufficient-data': {
      name: 'Building Baseline',
      characteristics: 'not enough data yet to detect patterns',
      typicalDuration: 'until we have 6+ days of tracking',
      hormoneFocus: 'Tracking daily to understand your unique patterns'
    },
    'transition': {
      name: 'Transition Phase',
      characteristics: 'temperature pattern suggests approaching ovulation',
      typicalDuration: 'variable',
      hormoneFocus: 'Watch for sustained temperature rise'
    }
  };

  const phase = phaseDescriptions[phaseInfo.phase] || phaseDescriptions['insufficient-data'];
  const currentBBT = todayData.temperature || phaseInfo.temperature || 'not recorded yet';
  const trend = phaseInfo.trend || 'stable';
  const daysSinceOv = phaseInfo.daysSinceOvulation !== null ? phaseInfo.daysSinceOvulation : 'unknown';
  const avgBBT = phaseInfo.avgBBT ? phaseInfo.avgBBT.toFixed(2) : 'not available';

  // Get time of day for personalized greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Hello';
  if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
  else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17 && hour < 21) timeGreeting = 'Good evening';
  else timeGreeting = 'Good night';

  const prompt = `You are Luna, a friendly, warm, and supportive animated bunny character who helps people understand their menstrual cycle through body literacy. You speak in a gentle, encouraging, and body-positive way. You're knowledgeable about cycle phases but never medical - always supportive and educational.

${timeGreeting}! Today's cycle context:

**Current Phase:** ${phase.name}
- Characteristics: ${phase.characteristics}
- Hormone Focus: ${phase.hormoneFocus}
- Today's BBT: ${currentBBT}°C
- Temperature Trend: ${trend}
- Days Since Ovulation: ${daysSinceOv}
- Average BBT: ${avgBBT}°C

${phaseInfo.ovulation && phaseInfo.ovulation.detected ? 
  `- Ovulation was detected on ${new Date(phaseInfo.ovulation.date).toLocaleDateString()} with ${phaseInfo.ovulation.temperatureRise}°C temperature rise` : 
  '- Ovulation not yet detected (need more tracking data)'}

${phaseInfo.periodPrediction && phaseInfo.periodPrediction.daysUntilMostLikely !== null ?
  `- Period expected in approximately ${phaseInfo.periodPrediction.daysUntilMostLikely} days` : ''}

**Your task:** Provide a warm, personalized daily message that includes:

1. **Phase Explanation** (2-3 sentences): Briefly explain what phase they're in today in a friendly, encouraging way. Use the bunny's voice - warm and supportive.

2. **Food Focus** (3-5 specific recommendations): Suggest specific foods, meals, or nutrients that support this phase. Be practical and specific (e.g., "Try adding iron-rich spinach to your morning smoothie" not just "eat iron"). Consider:
   - Pre-ovulation: Foods that support rising energy and estrogen
   - Ovulation: Nutrient-dense foods for peak performance
   - Luteal: Foods that support progesterone and stable energy (complex carbs, healthy fats)
   - Pre-menstrual: Iron-rich foods, magnesium, anti-inflammatory foods

3. **Exercise Guidance** (1-2 sentences): Recommend exercise type and intensity appropriate for this phase:
   - Pre-ovulation: Higher intensity, strength training, cardio
   - Ovulation: Peak performance activities
   - Luteal: Moderate intensity, gentle movement, yoga, walking
   - Pre-menstrual: Restorative movement, gentle stretching, rest

4. **Social Capacity** (1-2 sentences): Guide them on social energy and boundaries:
   - Pre-ovulation: Often higher social energy, good for networking
   - Ovulation: Peak social confidence
   - Luteal: May need more alone time, smaller gatherings
   - Pre-menstrual: Honor need for rest, set boundaries

**Tone Guidelines:**
- Warm and friendly like a caring friend
- Body-positive and non-judgmental
- Encouraging but not pushy
- Educational but not clinical
- Use "you" and "your body" language
- Include gentle reminders to listen to their body
- Keep it conversational, not preachy

**Format your response as JSON:**
{
  "greeting": "${timeGreeting}! [warm greeting with bunny personality]",
  "phaseExplanation": "[2-3 sentences explaining their phase today]",
  "food": {
    "focus": "[brief 1-sentence summary]",
    "recommendations": ["specific food 1", "specific food 2", "specific food 3", "specific food 4"]
  },
  "exercise": {
    "type": "[exercise type]",
    "intensity": "[low/moderate/high]",
    "guidance": "[1-2 sentences with specific suggestions]"
  },
  "social": {
    "capacity": "[high/medium/low]",
    "guidance": "[1-2 sentences about social energy and boundaries]"
  },
  "closing": "[encouraging closing message, 1 sentence]"
}

Remember: You're Luna the bunny - be warm, supportive, and make them feel understood and cared for.`;

  return prompt;
}

/**
 * GET /bunny - Get personalized daily guidance from Luna bunny via Gemini AI
 */
router.get('/', async (req, res) => {
  try {
    // Get dependencies from req (passed from server.js)
    const { temperatureReadings, detectCurrentPhase } = req.app.locals;

    // Get today's date string for caching
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Check cache first - return cached response if available for today
    if (dailyCache[todayStr]) {
      console.log('✓ Returning cached bunny response for', todayStr);
      return res.json(dailyCache[todayStr]);
    }

    // Check if Gemini is available
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI not available',
        message: 'GEMINI_API_KEY not configured. Please add it to your .env file.',
        fallback: true
      });
    }

    // Get current phase and today's data
    const phaseInfo = detectCurrentPhase(temperatureReadings);
    
    const todayReading = temperatureReadings.find(r => {
      const readingDate = new Date(r.timestamp);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });

    const todayData = {
      date: today.toISOString().split('T')[0],
      temperature: todayReading ? todayReading.temperature : null,
      hasReading: !!todayReading,
      phase: phaseInfo.phase,
      phaseName: phaseInfo.phaseName,
      trend: phaseInfo.trend,
      avgBBT: phaseInfo.avgBBT,
      ovulation: phaseInfo.ovulation,
      daysSinceOvulation: phaseInfo.daysSinceOvulation
    };

    // Build the prompt
    const prompt = buildBunnyPrompt(phaseInfo, todayData);

    // Clean up old rate limit records
    cleanupRateLimitCache();

    // Try models in order until one works
    let response = null;
    let lastError = null;
    let usedModel = null;

    for (const modelName of MODEL_FALLBACKS) {
      // Skip models that are rate limited today
      if (isModelRateLimited(modelName)) {
        console.log(`⏭ Skipping ${modelName} (rate limited today)`);
        continue;
      }

      try {
        console.log(`🔄 Trying model: ${modelName}`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt
        });
        usedModel = modelName;
        console.log(`✓ Successfully used model: ${modelName}`);
        break; // Success! Exit loop
      } catch (apiError) {
        lastError = apiError;
        
        // If rate limited, mark this model and try next
        if (apiError.message && (apiError.message.includes('429') || apiError.message.includes('RESOURCE_EXHAUSTED'))) {
          markModelRateLimited(modelName);
          console.warn(`⚠ ${modelName} rate limited, trying next model...`);
          continue; // Try next model
        }
        
        // For other errors, log and try next model
        console.warn(`⚠ ${modelName} failed: ${apiError.message}, trying next model...`);
        continue;
      }
    }

    // If all models failed, use fallback
    if (!response) {
      console.warn('⚠ All models failed, using fallback response');
      const fallbackResponse = {
        greeting: "Hello! I'm here to help you understand your cycle.",
        phaseExplanation: phaseInfo.description || "Keep tracking your temperature daily to understand your body's patterns.",
        food: {
          focus: "Focus on nourishing your body with whole foods",
          recommendations: ["Balanced meals", "Plenty of water", "Iron-rich foods", "Complex carbohydrates"]
        },
        exercise: {
          type: "Gentle movement",
          intensity: "moderate",
          guidance: "Listen to your body and choose movement that feels good"
        },
        social: {
          capacity: "medium",
          guidance: "Honor your energy levels and set boundaries as needed"
        },
        closing: "Take care of yourself today!",
        metadata: {
          phase: phaseInfo.phase,
          phaseName: phaseInfo.phaseName,
          timestamp: new Date().toISOString(),
          fallback: true,
          rateLimitExceeded: true,
          lastError: lastError?.message
        }
      };
      // Cache the fallback response
      dailyCache[todayStr] = fallbackResponse;
      return res.status(200).json(fallbackResponse);
    }
    
    // Extract text from response (response.text is a property, not a method)
    const text = response.text;

    // Try to parse JSON response
    let bunnyResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      bunnyResponse = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON parsing fails, return the raw text in a structured format
      console.warn('Failed to parse Gemini response as JSON, using raw text');
      bunnyResponse = {
        greeting: "Hello!",
        phaseExplanation: text.split('\n\n')[0] || text.substring(0, 200),
        food: {
          focus: "Focus on nourishing your body",
          recommendations: ["Whole foods", "Plenty of water", "Balanced meals"]
        },
        exercise: {
          type: "Listen to your body",
          intensity: "moderate",
          guidance: "Choose movement that feels good today"
        },
        social: {
          capacity: "medium",
          guidance: "Honor your energy levels and set boundaries as needed"
        },
        closing: "Take care of yourself today!",
        rawResponse: text
      };
    }

    // Add metadata
    bunnyResponse.metadata = {
      phase: phaseInfo.phase,
      phaseName: phaseInfo.phaseName,
      timestamp: new Date().toISOString(),
      temperature: todayData.temperature,
      daysSinceOvulation: phaseInfo.daysSinceOvulation,
      model: usedModel
    };

    // Cache the response for today
    dailyCache[todayStr] = bunnyResponse;
    console.log('✓ Cached bunny response for', todayStr);

    // Clean up old cache entries (keep only last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    Object.keys(dailyCache).forEach(dateStr => {
      if (new Date(dateStr) < sevenDaysAgo) {
        delete dailyCache[dateStr];
      }
    });

    res.json(bunnyResponse);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Fallback to static tips if Gemini fails
    const { temperatureReadings, detectCurrentPhase } = req.app.locals;
    const phaseInfo = detectCurrentPhase(temperatureReadings);
    const staticTips = {
      greeting: "Hello! I'm here to help you understand your cycle.",
      phaseExplanation: phaseInfo.description || "Keep tracking your temperature daily to understand your body's patterns.",
      food: {
        focus: "Focus on nourishing your body with whole foods",
        recommendations: ["Balanced meals", "Plenty of water", "Iron-rich foods", "Complex carbohydrates"]
      },
      exercise: {
        type: "Gentle movement",
        intensity: "moderate",
        guidance: "Listen to your body and choose movement that feels good"
      },
      social: {
        capacity: "medium",
        guidance: "Honor your energy levels and set boundaries as needed"
      },
      closing: "Take care of yourself today!",
      metadata: {
        phase: phaseInfo.phase,
        phaseName: phaseInfo.phaseName,
        timestamp: new Date().toISOString(),
        fallback: true
      }
    };

    res.status(200).json(staticTips);
  }
});

/**
 * POST /bunny/ask - Ask Luna a question
 */
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const { temperatureReadings, detectCurrentPhase } = req.app.locals;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Question is required',
        message: 'Please provide a question to ask Luna'
      });
    }

    // Check if Gemini is available
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI not available',
        message: 'GEMINI_API_KEY not configured. Please add it to your .env file.',
        fallback: true
      });
    }

    // Get current phase context for the conversation
    const phaseInfo = detectCurrentPhase(temperatureReadings);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayReading = temperatureReadings.find(r => {
      const readingDate = new Date(r.timestamp);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });

    const todayData = {
      date: today.toISOString().split('T')[0],
      temperature: todayReading ? todayReading.temperature : null,
      hasReading: !!todayReading,
      phase: phaseInfo.phase,
      phaseName: phaseInfo.phaseName,
      trend: phaseInfo.trend,
      avgBBT: phaseInfo.avgBBT,
      ovulation: phaseInfo.ovulation,
      daysSinceOvulation: phaseInfo.daysSinceOvulation
    };

    // Build context-aware prompt for the question
    const contextPrompt = `You are Luna, a friendly, warm, and supportive animated bunny character who helps people understand their menstrual cycle through body literacy. You speak in a gentle, encouraging, and body-positive way. You're knowledgeable about cycle phases but never medical - always supportive and educational.

Current cycle context:
- Phase: ${phaseInfo.phaseName}
- Today's BBT: ${todayData.temperature || 'not recorded yet'}°C
- Temperature Trend: ${phaseInfo.trend || 'stable'}
- Days Since Ovulation: ${phaseInfo.daysSinceOvulation !== null ? phaseInfo.daysSinceOvulation : 'unknown'}

User's question: ${question.trim()}

Please provide a warm, helpful, and supportive answer to their question. Keep it:
- Body-positive and non-judgmental
- Educational but not clinical
- Warm and friendly like a caring friend
- Focused on body literacy and understanding their cycle
- If the question is not cycle-related, gently redirect to cycle topics or answer briefly and suggest how it might relate to their cycle

Keep your response concise (2-4 sentences) and conversational.`;

    // Clean up old rate limit records
    cleanupRateLimitCache();

    // Try models in order until one works
    let response = null;
    let lastError = null;
    let usedModel = null;

    for (const modelName of MODEL_FALLBACKS) {
      // Skip models that are rate limited today
      if (isModelRateLimited(modelName)) {
        console.log(`⏭ Skipping ${modelName} (rate limited today)`);
        continue;
      }

      try {
        console.log(`🔄 Trying model: ${modelName} for question`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: contextPrompt
        });
        usedModel = modelName;
        console.log(`✓ Successfully used model: ${modelName} for question`);
        break; // Success! Exit loop
      } catch (apiError) {
        lastError = apiError;
        
        // If rate limited, mark this model and try next
        if (apiError.message && (apiError.message.includes('429') || apiError.message.includes('RESOURCE_EXHAUSTED'))) {
          markModelRateLimited(modelName);
          console.warn(`⚠ ${modelName} rate limited, trying next model...`);
          continue; // Try next model
        }
        
        // For other errors, log and try next model
        console.warn(`⚠ ${modelName} failed: ${apiError.message}, trying next model...`);
        continue;
      }
    }

    // If all models failed, return error
    if (!response) {
      return res.status(429).json({
        error: 'All models rate limited',
        message: 'Luna is taking a break. Please try again later or wait until tomorrow.',
        fallback: true,
        rateLimitedModels: Object.keys(rateLimitedModels)
      });
    }

    const text = response.text;

    res.json({
      question: question.trim(),
      answer: text,
      timestamp: new Date().toISOString(),
      phase: phaseInfo.phase,
      phaseName: phaseInfo.phaseName,
      model: usedModel
    });
  } catch (error) {
    console.error('Error processing question:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Provide more specific error messages
    let statusCode = 500;
    let errorMessage = 'Luna is having trouble right now. Please try again later.';
    
    if (error.message && error.message.includes('429')) {
      statusCode = 429;
      errorMessage = "I've reached my daily limit. Please try again tomorrow! 🌙";
    } else if (error.message && error.message.includes('API key')) {
      statusCode = 503;
      errorMessage = 'GEMINI_API_KEY not configured properly.';
    }
    
    res.status(statusCode).json({
      error: 'Failed to process question',
      message: errorMessage
    });
  }
});

/**
 * GET /bunny/status - Check Gemini connection status
 */
router.get('/status', (req, res) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const isInitialized = !!ai;
  
  res.json({
    connected: isInitialized,
    hasApiKey: hasApiKey,
    apiKeyLength: hasApiKey ? process.env.GEMINI_API_KEY.length : 0,
    message: isInitialized 
      ? 'Gemini AI is connected and ready' 
      : hasApiKey 
        ? 'API key found but initialization failed - check server logs'
        : 'GEMINI_API_KEY not found in environment variables'
  });
});

/**
 * GET /bunny/models - Debug endpoint to list available Gemini models
 */
router.get('/models', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI not available',
        message: 'GEMINI_API_KEY not configured or initialization failed',
        hasApiKey: !!process.env.GEMINI_API_KEY,
        suggestion: 'Check server logs for initialization errors'
      });
    }

    // Try to list available models
    const models = await ai.models.list();
    res.json({
      available: true,
      connected: true,
      models: models,
      note: 'Check which models support generateContent method'
    });
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({
      error: 'Failed to list models',
      message: error.message,
      connected: false,
      suggestion: 'Try using gemini-2.0-flash-exp or gemini-2.0-flash'
    });
  }
});

module.exports = router;
