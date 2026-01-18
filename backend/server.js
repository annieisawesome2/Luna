// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Gemini (API key from environment variable)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiModel = null;

if (GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('✓ Google Gemini initialized');
  } catch (error) {
    console.warn('⚠ Gemini initialization failed, will use static tips:', error.message);
  }
} else {
  console.log('ℹ GEMINI_API_KEY not set, using static tips');
}

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add cache control headers
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// In-memory data store (for MVP - replace with database in production)
let temperatureReadings = [];

// User settings (for MVP - replace with database in production)
let userSettings = {
  profile: {
    name: 'Luna User',
    email: 'luna@example.com'
  },
  notifications: {
    periodReminders: true,
    dailyLogs: true,
    ovulationWindow: false
  },
  preferences: {
    temperatureUnit: 'Celsius',
    cycleLength: 28
  },
  device: {
    connected: false,
    deviceName: null
  }
};

// Initialize with sample data for demo
initializeSampleData();

// ========== CYCLE PHASE LOGIC ==========

/**
 * Calculate cycle phase based on BBT readings
 * Simplified logic for MVP:
 * - Menstrual: Days 1-5 (low BBT)
 * - Follicular: Days 6-13 (rising BBT)
 * - Ovulation: Days 14-16 (peak BBT, typically 0.3-0.5°C rise)
 * - Luteal: Days 17-28 (sustained high BBT)
 */
function calculateCyclePhase(readings) {
  if (readings.length === 0) {
    return { phase: 'unknown', day: 0, tip: 'Start tracking your BBT to determine your cycle phase.' };
  }

  // Sort readings by date (newest first)
  const sorted = [...readings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latest = sorted[0];
  
  // Calculate days since first reading (simplified cycle day calculation)
  const firstReading = sorted[sorted.length - 1];
  const daysSinceStart = Math.floor((new Date(latest.timestamp) - new Date(firstReading.timestamp)) / (1000 * 60 * 60 * 24));
  const cycleDay = (daysSinceStart % 28) + 1; // Assume 28-day cycle for MVP

  // Get average BBT for baseline
  const avgBBT = sorted.slice(0, 7).reduce((sum, r) => sum + r.temperature, 0) / Math.min(7, sorted.length);
  const currentBBT = latest.temperature;

  // Determine phase based on cycle day and BBT pattern
  let phase, tip;
  
  if (cycleDay >= 1 && cycleDay <= 5) {
    phase = 'menstrual';
    tip = 'Menstrual phase: Rest and hydrate. Your BBT is typically lower during this phase.';
  } else if (cycleDay >= 6 && cycleDay <= 13) {
    phase = 'follicular';
    tip = 'Follicular phase: Energy is rising! Great time for new activities and planning.';
  } else if (cycleDay >= 14 && cycleDay <= 16) {
    phase = 'ovulation';
    tip = 'Ovulation window: Peak fertility. You may notice a slight BBT rise (0.3-0.5°C).';
  } else {
    phase = 'luteal';
    tip = 'Luteal phase: Progesterone is high. BBT stays elevated. Self-care is important.';
  }

  // Enhanced logic: Check for BBT rise pattern (ovulation indicator)
  if (sorted.length >= 3) {
    const recent3 = sorted.slice(0, 3).map(r => r.temperature);
    const avgRecent = recent3.reduce((a, b) => a + b) / 3;
    const older3 = sorted.slice(3, 6).map(r => r.temperature);
    const avgOlder = older3.length > 0 ? older3.reduce((a, b) => a + b) / older3.length : avgRecent;
    
    if (avgRecent - avgOlder >= 0.3 && cycleDay >= 12 && cycleDay <= 18) {
      phase = 'ovulation';
      tip = 'Ovulation detected! BBT rise of ' + (avgRecent - avgOlder).toFixed(2) + '°C indicates fertile window.';
    }
  }

  return {
    phase,
    day: cycleDay,
    tip,
    temperature: currentBBT,
    avgBBT: avgBBT.toFixed(2)
  };
}

// ========== GEMINI AI INTEGRATION ==========

/**
 * Generate personalized tip using Google Gemini
 * @param {string} phase - Current cycle phase (menstrual, follicular, ovulation, luteal)
 * @param {number} cycleDay - Current day of cycle
 * @param {number} temperature - Current BBT reading
 * @param {number} avgBBT - Average BBT over recent readings
 * @returns {Promise<string>} Generated tip or null if Gemini unavailable
 */
async function generateTipWithGemini(phase, cycleDay, temperature, avgBBT) {
  if (!geminiModel) {
    return null;
  }

  try {
    const phaseDescriptions = {
      menstrual: 'menstruation (days 1-5)',
      follicular: 'follicular phase (days 6-13)',
      ovulation: 'ovulation window (days 14-16)',
      luteal: 'luteal phase (days 17-28)'
    };

    const prompt = `You are a helpful health assistant for a menstrual cycle tracking app called Luna. 

The user is currently in the ${phaseDescriptions[phase] || phase} phase, on day ${cycleDay} of their cycle. Their current basal body temperature (BBT) is ${temperature}°C, with an average BBT of ${avgBBT}°C over recent readings.

Generate a brief, supportive, and personalized daily tip (1-2 sentences, max 150 characters) that:
- Is specific to their current cycle phase
- Provides practical, actionable advice
- Is warm, encouraging, and non-medical (no diagnosis or treatment advice)
- Focuses on wellness, self-care, nutrition, or lifestyle

Keep it concise and friendly. Return only the tip text, no additional formatting.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Clean up the response (remove quotes if present)
    return text.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating tip with Gemini:', error.message);
    return null;
  }
}

/**
 * Generate phase-specific tips using Google Gemini
 * @param {string} phase - Cycle phase
 * @param {number} count - Number of tips to generate (default: 3)
 * @returns {Promise<Array>} Array of tip objects with title and description
 */
async function generatePhaseTipsWithGemini(phase, count = 3) {
  if (!geminiModel) {
    return null;
  }

  try {
    const phaseInfo = {
      menstrual: {
        name: 'Menstruation',
        days: 'days 1-5',
        description: 'the menstrual phase when the body is shedding the uterine lining'
      },
      follicular: {
        name: 'Follicular Phase',
        days: 'days 6-13',
        description: 'the follicular phase when estrogen is rising and energy increases'
      },
      ovulation: {
        name: 'Ovulation',
        days: 'days 14-16',
        description: 'the ovulation window when fertility peaks and energy is at its highest'
      },
      luteal: {
        name: 'Luteal Phase',
        days: 'days 17-28',
        description: 'the luteal phase when progesterone is high and the body prepares for potential pregnancy'
      }
    };

    const info = phaseInfo[phase] || phaseInfo.luteal;

    const prompt = `You are a helpful health assistant for a menstrual cycle tracking app. 

Generate ${count} practical, actionable wellness tips for someone in the ${info.name} (${info.days}) of their menstrual cycle. This is ${info.description}.

For each tip, provide:
1. A short, catchy title (3-6 words)
2. A brief description (1-2 sentences, max 100 characters)

Format your response as a JSON array with this exact structure:
[
  {"title": "Tip Title 1", "description": "Description here"},
  {"title": "Tip Title 2", "description": "Description here"},
  {"title": "Tip Title 3", "description": "Description here"}
]

Make tips:
- Specific to this cycle phase
- Practical and actionable
- Focused on wellness, nutrition, exercise, self-care, or lifestyle
- Warm and supportive
- Non-medical (no diagnosis or treatment advice)

Return ONLY the JSON array, no additional text.`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const tips = JSON.parse(jsonMatch[0]);
      return tips;
    }
    
    return null;
  } catch (error) {
    console.error('Error generating phase tips with Gemini:', error.message);
    return null;
  }
}

// ========== API ENDPOINTS ==========

// POST /temperature - Receive BBT reading from ESP32
app.post('/temperature', (req, res) => {
  try {
    const { temperature, timestamp } = req.body;
    
    if (!temperature || !timestamp) {
      return res.status(400).json({ error: 'Missing temperature or timestamp' });
    }
    
    const reading = {
      temperature: parseFloat(temperature),
      timestamp: new Date(parseInt(timestamp) * 1000).toISOString(), // Convert Unix timestamp to ISO
      id: Date.now()
    };
    
    temperatureReadings.push(reading);
    
    // Keep only last 90 days of readings
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    temperatureReadings = temperatureReadings.filter(r => new Date(r.timestamp) > cutoff);
    
    console.log(`✓ New reading: ${reading.temperature}°C at ${reading.timestamp}`);
    
    res.status(201).json({
      success: true,
      reading,
      message: 'Temperature reading recorded'
    });
  } catch (error) {
    console.error('Error processing temperature reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /data - Get historical BBT data
app.get('/data', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14; // Default to 14 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const filtered = temperatureReadings
      .filter(r => new Date(r.timestamp) >= cutoff)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
      readings: filtered,
      count: filtered.length,
      days: days
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /today - Get today's summary (temperature, phase, tip)
app.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's reading if available
    const todayReading = temperatureReadings.find(r => {
      const readingDate = new Date(r.timestamp);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });
    
    // Calculate cycle phase
    const phaseInfo = calculateCyclePhase(temperatureReadings);
    
    // Try to generate personalized tip with Gemini
    let tip = phaseInfo.tip;
    let aiGenerated = false;
    
    if (geminiModel) {
      try {
        const geminiTip = await generateTipWithGemini(
          phaseInfo.phase,
          phaseInfo.day,
          phaseInfo.temperature,
          parseFloat(phaseInfo.avgBBT)
        );
        
        if (geminiTip) {
          tip = geminiTip;
          aiGenerated = true;
          console.log('✓ Generated Gemini tip for today');
        }
      } catch (error) {
        console.warn('⚠ Gemini tip generation failed, using default tip:', error.message);
      }
    }
    
    res.json({
      date: today.toISOString().split('T')[0],
      temperature: todayReading ? todayReading.temperature : null,
      hasReading: !!todayReading,
      phase: phaseInfo.phase,
      cycleDay: phaseInfo.day,
      tip: tip,
      avgBBT: phaseInfo.avgBBT,
      aiGenerated: aiGenerated
    });
  } catch (error) {
    console.error('Error fetching today data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /phase - Get current cycle phase info
app.get('/phase', (req, res) => {
  try {
    const phaseInfo = calculateCyclePhase(temperatureReadings);
    res.json(phaseInfo);
  } catch (error) {
    console.error('Error calculating phase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /calendar - Get calendar data with phase information for a month
app.get('/calendar', (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth();
    
    // Calculate cycle phase for each day of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarData = [];
    
    // Get current cycle info
    const phaseInfo = calculateCyclePhase(temperatureReadings);
    const currentCycleDay = phaseInfo.day;
    
    // Calculate which cycle day each calendar day corresponds to
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find if there's a reading for this day
      const dayReading = temperatureReadings.find(r => {
        const readingDate = new Date(r.timestamp);
        return readingDate.toISOString().split('T')[0] === dateStr;
      });
      
      // Calculate cycle day (simplified - assumes 28 day cycle)
      // For MVP, we'll calculate based on the current cycle day
      const daysSinceStart = dayReading 
        ? Math.floor((new Date(dayReading.timestamp) - new Date(temperatureReadings[temperatureReadings.length - 1].timestamp)) / (1000 * 60 * 60 * 24))
        : null;
      
      let cycleDay = null;
      let phase = null;
      let phaseColor = null;
      
      if (dayReading) {
        // Calculate cycle day from readings
        const sorted = [...temperatureReadings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const firstReading = sorted[0];
        const daysSinceFirst = Math.floor((new Date(dayReading.timestamp) - new Date(firstReading.timestamp)) / (1000 * 60 * 60 * 24));
        cycleDay = (daysSinceFirst % 28) + 1;
        
        // Determine phase
        if (cycleDay >= 1 && cycleDay <= 5) {
          phase = 'menstrual';
          phaseColor = '#c14a4a';
        } else if (cycleDay >= 12 && cycleDay <= 16) {
          phase = 'ovulation';
          phaseColor = '#93a7d1';
        } else if (cycleDay >= 17 && cycleDay <= 28) {
          phase = 'luteal';
          phaseColor = '#9d7089';
        } else {
          phase = 'follicular';
          phaseColor = null;
        }
      } else {
        // Estimate based on current cycle day
        // This is simplified - in production, you'd track cycle start dates
        const estimatedCycleDay = ((currentCycleDay + (day - new Date().getDate())) % 28) + 1;
        if (estimatedCycleDay >= 1 && estimatedCycleDay <= 5) {
          phase = 'menstrual';
          phaseColor = '#c14a4a';
        } else if (estimatedCycleDay >= 12 && estimatedCycleDay <= 16) {
          phase = 'ovulation';
          phaseColor = '#93a7d1';
        } else if (estimatedCycleDay >= 17 && estimatedCycleDay <= 28) {
          phase = 'luteal';
          phaseColor = '#9d7089';
        }
      }
      
      calendarData.push({
        day,
        date: dateStr,
        cycleDay,
        phase,
        phaseColor,
        hasReading: !!dayReading,
        temperature: dayReading ? dayReading.temperature : null
      });
    }
    
    res.json({
      year,
      month,
      daysInMonth,
      calendarData,
      currentCycleDay: phaseInfo.day,
      currentPhase: phaseInfo.phase
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: 'Luna Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'POST /temperature': 'Receive BBT reading from ESP32',
      'GET /data': 'Get historical BBT data (query: ?days=14)',
      'GET /today': "Get today's summary (temperature, phase, tip)",
      'GET /phase': 'Get current cycle phase info',
      'GET /health': 'Health check'
    },
    readings: temperatureReadings.length
  });
});

// GET /data/chart - Get BBT data formatted for charts (by cycle day)
app.get('/data/chart', (req, res) => {
  try {
    const sorted = [...temperatureReadings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (sorted.length === 0) {
      return res.json({ temperatureData: [], avgTemp: null });
    }

    // Calculate cycle day for each reading
    const firstReading = sorted[0];
    const chartData = sorted.map(reading => {
      const daysSinceFirst = Math.floor((new Date(reading.timestamp) - new Date(firstReading.timestamp)) / (1000 * 60 * 60 * 24));
      const cycleDay = (daysSinceFirst % 28) + 1;
      return {
        day: cycleDay,
        temp: reading.temperature,
        date: reading.timestamp
      };
    });

    // Calculate average temperature
    const avgTemp = sorted.reduce((sum, r) => sum + r.temperature, 0) / sorted.length;

    res.json({
      temperatureData: chartData,
      avgTemp: parseFloat(avgTemp.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /data/mood - Get mood data (mock for MVP)
app.get('/data/mood', (req, res) => {
  try {
    // Mock mood data - in production, this would come from a database
    // For now, generate based on cycle day
    const sorted = [...temperatureReadings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (sorted.length === 0) {
      return res.json({ moodData: [], avgMood: null });
    }

    const firstReading = sorted[0];
    const moodData = sorted.map((reading, index) => {
      const daysSinceFirst = Math.floor((new Date(reading.timestamp) - new Date(firstReading.timestamp)) / (1000 * 60 * 60 * 24));
      const cycleDay = (daysSinceFirst % 28) + 1;
      
      // Simulate mood based on cycle phase
      let mood = 3; // neutral
      if (cycleDay >= 1 && cycleDay <= 5) {
        mood = 2 + Math.random(); // Lower during period
      } else if (cycleDay >= 6 && cycleDay <= 13) {
        mood = 3 + Math.random() * 1.5; // Rising during follicular
      } else if (cycleDay >= 14 && cycleDay <= 16) {
        mood = 4 + Math.random(); // High during ovulation
      } else {
        mood = 3 + Math.random() * 0.5; // Moderate during luteal
      }
      
      return {
        day: cycleDay,
        mood: Math.round(mood * 10) / 10 // Round to 1 decimal
      };
    });

    const avgMood = moodData.reduce((sum, d) => sum + d.mood, 0) / moodData.length;

    res.json({
      moodData: moodData.filter((d, i) => i % 2 === 0), // Return every other day for cleaner chart
      avgMood: parseFloat(avgMood.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching mood data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /data/export - Export data as CSV
app.get('/data/export', (req, res) => {
  try {
    const sorted = [...temperatureReadings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Create CSV content
    let csv = 'Date,Temperature (°C),Timestamp\n';
    sorted.forEach(reading => {
      const date = new Date(reading.timestamp).toLocaleDateString();
      csv += `${date},${reading.temperature},${reading.timestamp}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=luna-data.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tips - Get tips based on current phase
app.get('/tips', async (req, res) => {
  try {
    const phaseInfo = calculateCyclePhase(temperatureReadings);
    const currentPhase = phaseInfo.phase;

    // Static tips as fallback
    const staticTips = {
      menstrual: {
        phase: "Menstruation",
        icon: "heart",
        color: "#c14a4a",
        tips: [
          {
            title: "Rest & Recovery",
            description: "Your body is working hard. Prioritize rest, gentle movement like walking or yoga, and plenty of sleep.",
          },
          {
            title: "Iron-Rich Foods",
            description: "Combat fatigue with iron-rich foods like leafy greens, lean meats, and legumes.",
          },
          {
            title: "Heat Therapy",
            description: "Use heating pads or warm baths to ease cramps and promote relaxation.",
          },
        ],
      },
      follicular: {
        phase: "Follicular Phase",
        icon: "sparkles",
        color: "#93a7d1",
        tips: [
          {
            title: "Energy Rising",
            description: "As estrogen increases, you may feel more energized. This is a great time to try new activities or tackle challenging projects.",
          },
          {
            title: "Strength Training",
            description: "Your body responds well to strength training during this phase. Build muscle and boost metabolism.",
          },
          {
            title: "Social Connection",
            description: "You might feel more social and outgoing. Great time to connect with friends and network.",
          },
        ],
      },
      ovulation: {
        phase: "Ovulation",
        icon: "activity",
        color: "#93a7d1",
        tips: [
          {
            title: "Peak Energy",
            description: "This is typically when you'll feel your best physically and mentally. Take advantage of peak performance.",
          },
          {
            title: "High-Intensity Workouts",
            description: "Your body can handle more intense exercise. Try HIIT or challenging cardio sessions.",
          },
          {
            title: "Communication",
            description: "Communication skills peak during ovulation. Great time for important conversations or presentations.",
          },
        ],
      },
      luteal: {
        phase: "Luteal Phase",
        icon: "brain",
        color: "#9d7089",
        tips: [
          {
            title: "Self-Care Focus",
            description: "As energy decreases, focus on self-care. Listen to your body's needs for rest and nourishment.",
          },
          {
            title: "Complex Carbs",
            description: "Combat PMS symptoms with complex carbohydrates, magnesium-rich foods, and omega-3 fatty acids.",
          },
          {
            title: "Gentle Exercise",
            description: "Switch to gentler forms of exercise like yoga, pilates, or leisurely walks.",
          },
        ],
      },
    };

    const generalTips = [
      {
        icon: "utensils",
        title: "Nutrition Throughout Your Cycle",
        description: "Eat a balanced diet rich in whole foods, lean proteins, healthy fats, and plenty of fruits and vegetables. Stay hydrated throughout your cycle.",
      },
      {
        icon: "brain",
        title: "Track Your Patterns",
        description: "Keep notes on how you feel physically and emotionally throughout your cycle. Patterns will emerge that help you plan better.",
      },
      {
        icon: "heart",
        title: "Hormone Health",
        description: "Support hormone balance with adequate sleep (7-9 hours), stress management, and regular exercise.",
      },
    ];

    // Try to generate tips with Gemini, fallback to static tips
    let tips = staticTips;
    let useGemini = false;
    const phases = ['menstrual', 'follicular', 'ovulation', 'luteal'];
    const phaseConfig = {
      menstrual: { phase: "Menstruation", icon: "heart", color: "#c14a4a" },
      follicular: { phase: "Follicular Phase", icon: "sparkles", color: "#93a7d1" },
      ovulation: { phase: "Ovulation", icon: "activity", color: "#93a7d1" },
      luteal: { phase: "Luteal Phase", icon: "brain", color: "#9d7089" }
    };

    if (geminiModel) {
      try {
        console.log('🤖 Generating AI tips with Gemini...');
        tips = { ...staticTips };
        let generatedCount = 0;
        
        // Generate tips for all phases (or at least current phase)
        // For performance, we can generate all at once or just current phase
        const phasesToGenerate = phases; // Generate for all phases
        
        for (const phase of phasesToGenerate) {
          try {
            const geminiTips = await generatePhaseTipsWithGemini(phase, 3);
            
            if (geminiTips && geminiTips.length > 0) {
              const config = phaseConfig[phase];
              tips[phase] = {
                phase: config.phase,
                icon: config.icon,
                color: config.color,
                tips: geminiTips
              };
              generatedCount++;
              console.log(`  ✓ Generated ${geminiTips.length} tips for ${config.phase}`);
            } else {
              console.log(`  ⚠ No tips generated for ${phase}, using static tips`);
            }
          } catch (phaseError) {
            console.warn(`  ⚠ Error generating tips for ${phase}:`, phaseError.message);
            // Keep static tips for this phase
          }
        }
        
        if (generatedCount > 0) {
          useGemini = true;
          console.log(`✓ Successfully generated AI tips for ${generatedCount}/${phases.length} phases`);
        } else {
          console.warn('⚠ No Gemini tips generated, falling back to static tips');
        }
      } catch (error) {
        console.warn('⚠ Gemini tip generation failed, using static tips:', error.message);
      }
    } else {
      console.log('ℹ Gemini not configured (GEMINI_API_KEY not set), using static tips');
    }

    // Get current phase tips
    const currentPhaseTips = tips[currentPhase] || tips.luteal;
    
    // Get all phase tips for display
    const allPhaseTips = Object.values(tips);

    res.json({
      currentPhase: currentPhase,
      currentPhaseTips: currentPhaseTips,
      allPhaseTips: allPhaseTips,
      generalTips: generalTips,
      aiGenerated: useGemini
    });
  } catch (error) {
    console.error('Error fetching tips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /settings - Get user settings
app.get('/settings', (req, res) => {
  try {
    res.json(userSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /settings - Update user settings
app.put('/settings', (req, res) => {
  try {
    const { profile, notifications, preferences, device } = req.body;
    
    if (profile) {
      userSettings.profile = { ...userSettings.profile, ...profile };
    }
    if (notifications) {
      userSettings.notifications = { ...userSettings.notifications, ...notifications };
    }
    if (preferences) {
      userSettings.preferences = { ...userSettings.preferences, ...preferences };
    }
    if (device) {
      userSettings.device = { ...userSettings.device, ...device };
    }
    
    res.json({
      success: true,
      settings: userSettings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', readings: temperatureReadings.length });
});

// ========== SAMPLE DATA INITIALIZATION ==========

function initializeSampleData() {
  // Generate sample data for last 14 days
  const now = new Date();
  const baseTemp = 36.5; // Base BBT in Celsius
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(7, 0, 0, 0); // Morning reading time
    
    // Simulate cycle pattern
    const cycleDay = (i % 28) + 1;
    let temp = baseTemp;
    
    if (cycleDay >= 1 && cycleDay <= 5) {
      temp = baseTemp - 0.2 + (Math.random() * 0.1); // Menstrual: lower
    } else if (cycleDay >= 6 && cycleDay <= 13) {
      temp = baseTemp - 0.1 + (Math.random() * 0.15); // Follicular: rising
    } else if (cycleDay >= 14 && cycleDay <= 16) {
      temp = baseTemp + 0.4 + (Math.random() * 0.1); // Ovulation: peak
    } else {
      temp = baseTemp + 0.3 + (Math.random() * 0.15); // Luteal: sustained high
    }
    
    temperatureReadings.push({
      temperature: parseFloat(temp.toFixed(2)),
      timestamp: date.toISOString(),
      id: date.getTime()
    });
  }
  
  console.log(`Initialized with ${temperatureReadings.length} sample readings`);
}

// ========== START SERVER ==========

app.listen(PORT, () => {
  console.log(`\n=== Luna Backend Server ===`);
  console.log(`Server running on http://localhost:${PORT}`);
  if (geminiModel) {
    console.log(`🤖 Google Gemini: ENABLED (AI tips active)`);
  } else {
    console.log(`ℹ Google Gemini: DISABLED (set GEMINI_API_KEY to enable AI tips)`);
  }
  console.log(`Endpoints:`);
  console.log(`  POST /temperature - Receive BBT reading`);
  console.log(`  GET  /data        - Get historical data`);
  console.log(`  GET  /today       - Get today's summary`);
  console.log(`  GET  /phase       - Get cycle phase info`);
  console.log(`  GET  /tips        - Get wellness tips`);
  console.log(`  GET  /health      - Health check\n`);
});
