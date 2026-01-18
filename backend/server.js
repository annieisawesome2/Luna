// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

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
    temperatureUnit: 'Celsius'
  },
  device: {
    connected: false,
    deviceName: null
  }
};

// Initialize with sample data for demo
initializeSampleData();

// ========== PHYSIOLOGY-FIRST CYCLE DETECTION ==========

/**
 * Detect ovulation based on BBT pattern (physiology-first approach)
 * Uses the "3-over-6" rule: 3 consecutive days at least 0.3°C above the previous 6 days
 * @param {Array} readings - Sorted temperature readings (oldest to newest)
 * @returns {Object|null} - Ovulation detection info or null
 */
function detectOvulation(readings) {
  if (readings.length < 9) {
    return null; // Need at least 9 days of data
  }

  // Sort from oldest to newest
  const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  // Look for ovulation pattern in the last 30 days
  const recentReadings = sorted.slice(-30);
  
  for (let i = 6; i < recentReadings.length - 2; i++) {
    // Get 6 days before potential ovulation
    const baselineDays = recentReadings.slice(i - 6, i);
    const baselineAvg = baselineDays.reduce((sum, r) => sum + r.temperature, 0) / baselineDays.length;
    
    // Check next 3 days for sustained rise
    const riseDays = recentReadings.slice(i, i + 3);
    const riseAvg = riseDays.reduce((sum, r) => sum + r.temperature, 0) / riseDays.length;
    
    // Check if all 3 days are above baseline
    const allAboveBaseline = riseDays.every(r => r.temperature >= baselineAvg + 0.1);
    const avgRise = riseAvg - baselineAvg;
    
    // Ovulation detected if: 3 days are 0.3°C+ above baseline average
    if (avgRise >= 0.3 && allAboveBaseline) {
      return {
        detected: true,
        date: new Date(riseDays[0].timestamp),
        confidence: avgRise >= 0.5 ? 'high' : avgRise >= 0.4 ? 'medium' : 'low',
        temperatureRise: parseFloat(avgRise.toFixed(2)),
        baselineTemp: parseFloat(baselineAvg.toFixed(2)),
        postOvulationTemp: parseFloat(riseAvg.toFixed(2))
      };
    }
  }
  
  return null;
}

/**
 * Predict period start based on detected ovulation
 * Period typically starts 12-14 days after ovulation
 * @param {Object} ovulation - Ovulation detection result
 * @returns {Object} - Period prediction with confidence window
 */
function predictPeriodStart(ovulation) {
  if (!ovulation || !ovulation.detected) {
    return null;
  }

  const ovulationDate = new Date(ovulation.date);
  const earliestPeriod = new Date(ovulationDate);
  earliestPeriod.setDate(earliestPeriod.getDate() + 12);
  
  const latestPeriod = new Date(ovulationDate);
  latestPeriod.setDate(latestPeriod.getDate() + 14);
  
  const mostLikely = new Date(ovulationDate);
  mostLikely.setDate(mostLikely.getDate() + 13);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysUntilEarliest = Math.ceil((earliestPeriod - today) / (1000 * 60 * 60 * 24));
  const daysUntilLatest = Math.ceil((latestPeriod - today) / (1000 * 60 * 60 * 24));
  const daysUntilMostLikely = Math.ceil((mostLikely - today) / (1000 * 60 * 60 * 24));

  return {
    windowStart: earliestPeriod.toISOString().split('T')[0],
    windowEnd: latestPeriod.toISOString().split('T')[0],
    mostLikely: mostLikely.toISOString().split('T')[0],
    daysUntilEarliest: daysUntilEarliest,
    daysUntilLatest: daysUntilLatest,
    daysUntilMostLikely: daysUntilMostLikely,
    confidence: ovulation.confidence,
    isInWindow: today >= earliestPeriod && today <= latestPeriod
  };
}

/**
 * Determine current phase based on BBT patterns (not calendar)
 * @param {Array} readings - Temperature readings
 * @returns {Object} - Current phase information
 */
function detectCurrentPhase(readings) {
  if (readings.length === 0) {
    return {
      phase: 'unknown',
      phaseName: 'Unknown',
      description: 'Start tracking your BBT daily to understand your body\'s patterns.',
      tip: 'Take your temperature first thing in the morning for the most accurate readings.',
      temperature: null,
      trend: null,
      daysSinceOvulation: null
    };
  }

  // Sort from newest to oldest
  const sorted = [...readings].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latest = sorted[0];
  const currentBBT = latest.temperature;

  // Detect ovulation
  const ovulation = detectOvulation([...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
  
  // Calculate temperature trend
  let trend = 'stable';
  if (sorted.length >= 3) {
    const recent3 = sorted.slice(0, 3).map(r => r.temperature);
    const avgRecent = recent3.reduce((a, b) => a + b) / 3;
    const older3 = sorted.slice(3, 6).map(r => r.temperature);
    if (older3.length >= 3) {
      const avgOlder = older3.reduce((a, b) => a + b) / 3;
      if (avgRecent - avgOlder >= 0.2) {
        trend = 'rising';
      } else if (avgOlder - avgRecent >= 0.2) {
        trend = 'falling';
      }
    }
  }

  // Determine phase based on ovulation detection
  let phase, phaseName, description, tip, daysSinceOvulation = null;

  if (ovulation && ovulation.detected) {
    const ovulationDate = new Date(ovulation.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    ovulationDate.setHours(0, 0, 0, 0);
    
    daysSinceOvulation = Math.floor((today - ovulationDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceOvulation < 0) {
      // Before detected ovulation
      phase = 'pre-ovulation';
      phaseName = 'Pre-Ovulation';
      description = 'Your body is preparing for ovulation. BBT is typically lower during this phase.';
      tip = 'Your temperature is in the lower range. This is a good time for planning and starting new projects.';
    } else if (daysSinceOvulation === 0) {
      // Day of ovulation
      phase = 'ovulation';
      phaseName = 'Ovulation Detected';
      description = `Temperature rise detected! Your BBT increased by ${ovulation.temperatureRise}°C, indicating ovulation.`;
      tip = 'Your body has released an egg. Energy and mood may be at their peak.';
    } else if (daysSinceOvulation <= 14) {
      // Luteal phase (post-ovulation)
      phase = 'luteal';
      phaseName = 'Luteal Phase';
      description = `You're ${daysSinceOvulation} day${daysSinceOvulation !== 1 ? 's' : ''} past ovulation. BBT remains elevated.`;
      tip = 'Your body is in the luteal phase. Progesterone is high, which can affect energy and mood.';
    } else {
      // Likely in or approaching period
      phase = 'pre-menstrual';
      phaseName = 'Pre-Menstrual';
      description = `It's been ${daysSinceOvulation} days since ovulation. Your period may start soon.`;
      tip = 'Your period is likely approaching. Listen to your body and prioritize rest.';
    }
  } else {
    // No ovulation detected yet - determine based on temperature pattern
    if (sorted.length < 6) {
      phase = 'insufficient-data';
      phaseName = 'Building Baseline';
      description = 'Keep tracking daily. We need more readings to detect your body\'s patterns.';
      tip = 'Consistency is key. Take your temperature at the same time each morning.';
    } else {
      // Check if temperature is in lower range (pre-ovulation) or higher range (post-ovulation)
      const avgBBT = sorted.slice(0, 7).reduce((sum, r) => sum + r.temperature, 0) / Math.min(7, sorted.length);
      
      if (currentBBT < avgBBT - 0.1) {
        phase = 'pre-ovulation';
        phaseName = 'Pre-Ovulation';
        description = 'Your BBT is in the lower range, suggesting you\'re in the pre-ovulation phase.';
        tip = 'Lower temperatures are typical before ovulation. This is often a time of rising energy.';
      } else if (currentBBT > avgBBT + 0.2) {
        phase = 'post-ovulation';
        phaseName = 'Post-Ovulation';
        description = 'Your BBT is elevated, suggesting you may have ovulated recently.';
        tip = 'Elevated temperatures typically indicate the luteal phase. Energy may fluctuate.';
      } else {
        phase = 'transition';
        phaseName = 'Transition Phase';
        description = 'Your temperature pattern suggests you may be approaching ovulation.';
        tip = 'Watch for a sustained temperature rise to confirm ovulation.';
      }
    }
  }

  // Get period prediction
  const periodPrediction = predictPeriodStart(ovulation);

  return {
    phase,
    phaseName,
    description,
    tip,
    temperature: currentBBT,
    trend,
    ovulation,
    periodPrediction,
    daysSinceOvulation,
    avgBBT: sorted.slice(0, 7).reduce((sum, r) => sum + r.temperature, 0) / Math.min(7, sorted.length)
  };
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

// GET /today - Get today's summary (temperature, phase, prediction)
app.get('/today', (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's reading if available
    const todayReading = temperatureReadings.find(r => {
      const readingDate = new Date(r.timestamp);
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });
    
    // Detect current phase using BBT patterns
    const phaseInfo = detectCurrentPhase(temperatureReadings);
    
    res.json({
      date: today.toISOString().split('T')[0],
      temperature: todayReading ? todayReading.temperature : null,
      hasReading: !!todayReading,
      phase: phaseInfo.phase,
      phaseName: phaseInfo.phaseName,
      description: phaseInfo.description,
      tip: phaseInfo.tip,
      trend: phaseInfo.trend,
      avgBBT: parseFloat(phaseInfo.avgBBT.toFixed(2)),
      ovulation: phaseInfo.ovulation,
      periodPrediction: phaseInfo.periodPrediction,
      daysSinceOvulation: phaseInfo.daysSinceOvulation,
      readingsCount: temperatureReadings.length
    });
  } catch (error) {
    console.error('Error fetching today data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /phase - Get current cycle phase info (physiology-based)
app.get('/phase', (req, res) => {
  try {
    const phaseInfo = detectCurrentPhase(temperatureReadings);
    res.json(phaseInfo);
  } catch (error) {
    console.error('Error detecting phase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /calendar - Get calendar data with phase information (physiology-based)
app.get('/calendar', (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarData = [];
    
    // Detect ovulation for reference
    const ovulation = detectOvulation(temperatureReadings);
    const phaseInfo = detectCurrentPhase(temperatureReadings);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find if there's a reading for this day
      const dayReading = temperatureReadings.find(r => {
        const readingDate = new Date(r.timestamp);
        return readingDate.toISOString().split('T')[0] === dateStr;
      });
      
      let phase = null;
      let phaseColor = null;
      let isOvulationDay = false;
      
      if (dayReading) {
        // Check if this is the ovulation day
        if (ovulation && ovulation.detected) {
          const ovulationDateStr = ovulation.date.toISOString().split('T')[0];
          if (dateStr === ovulationDateStr) {
            isOvulationDay = true;
            phase = 'ovulation';
            phaseColor = '#93a7d1';
          } else {
            // Determine phase based on days since ovulation
            const daysSinceOv = Math.floor((date - ovulation.date) / (1000 * 60 * 60 * 24));
            if (daysSinceOv < 0) {
              phase = 'pre-ovulation';
              phaseColor = '#93a7d1';
            } else if (daysSinceOv <= 14) {
              phase = 'luteal';
              phaseColor = '#9d7089';
            } else {
              phase = 'pre-menstrual';
              phaseColor = '#c14a4a';
            }
          }
        } else {
          // No ovulation detected yet - use temperature to estimate
          const sorted = [...temperatureReadings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          const avgBBT = sorted.reduce((sum, r) => sum + r.temperature, 0) / sorted.length;
          
          if (dayReading.temperature < avgBBT - 0.1) {
            phase = 'pre-ovulation';
            phaseColor = '#93a7d1';
          } else if (dayReading.temperature > avgBBT + 0.2) {
            phase = 'luteal';
            phaseColor = '#9d7089';
          }
        }
      }
      
      calendarData.push({
        day,
        date: dateStr,
        phase,
        phaseColor,
        hasReading: !!dayReading,
        temperature: dayReading ? dayReading.temperature : null,
        isOvulationDay: isOvulationDay
      });
    }
    
    res.json({
      year,
      month,
      daysInMonth,
      calendarData,
      ovulation: ovulation,
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

// GET /data/chart - Get BBT data formatted for charts with ovulation markers
app.get('/data/chart', (req, res) => {
  try {
    const sorted = [...temperatureReadings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (sorted.length === 0) {
      return res.json({ 
        temperatureData: [], 
        avgTemp: null,
        ovulationMarkers: []
      });
    }

    // Detect ovulation
    const ovulation = detectOvulation(temperatureReadings);
    
    // Format data with day numbers (days since first reading)
    const firstReading = sorted[0];
    const chartData = sorted.map((reading, index) => {
      const daysSinceFirst = Math.floor((new Date(reading.timestamp) - new Date(firstReading.timestamp)) / (1000 * 60 * 60 * 24));
      const isOvulationDay = ovulation && ovulation.detected && 
        new Date(reading.timestamp).toISOString().split('T')[0] === ovulation.date.toISOString().split('T')[0];
      
      return {
        day: daysSinceFirst + 1, // Day 1, 2, 3, etc.
        temp: reading.temperature,
        date: reading.timestamp,
        isOvulationDay: isOvulationDay || false
      };
    });

    // Calculate average temperature
    const avgTemp = sorted.reduce((sum, r) => sum + r.temperature, 0) / sorted.length;

    // Get ovulation markers for the chart
    const ovulationMarkers = ovulation && ovulation.detected ? [{
      day: chartData.findIndex(d => d.isOvulationDay) + 1,
      date: ovulation.date.toISOString().split('T')[0],
      temperature: ovulation.postOvulationTemp,
      confidence: ovulation.confidence
    }] : [];

    res.json({
      temperatureData: chartData,
      avgTemp: parseFloat(avgTemp.toFixed(1)),
      ovulationMarkers: ovulationMarkers,
      ovulation: ovulation
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
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

// GET /tips - Get tips based on detected phase (physiology-based)
app.get('/tips', (req, res) => {
  try {
    const phaseInfo = detectCurrentPhase(temperatureReadings);
    const currentPhase = phaseInfo.phase;

    // Tips based on detected phases (physiology-first)
    const phaseTips = {
      'pre-ovulation': {
        phase: "Pre-Ovulation",
        icon: "sparkles",
        color: "#93a7d1",
        tips: [
          {
            title: "Rising Energy",
            description: "Your body is preparing for ovulation. Energy and motivation may be increasing. Great time for planning and starting new projects.",
          },
          {
            title: "Build Momentum",
            description: "This phase often brings clarity and focus. Use this time to tackle tasks that require sustained attention.",
          },
          {
            title: "Social Connection",
            description: "You might feel more outgoing and social. Good time to connect with others and network.",
          },
        ],
      },
      'ovulation': {
        phase: "Ovulation Detected",
        icon: "activity",
        color: "#93a7d1",
        tips: [
          {
            title: "Peak Performance",
            description: "Your body has released an egg. Energy, mood, and cognitive function are often at their peak.",
          },
          {
            title: "High-Intensity Activities",
            description: "This is a great time for challenging workouts, important meetings, or creative projects.",
          },
          {
            title: "Communication",
            description: "Communication skills are often enhanced. Good time for important conversations.",
          },
        ],
      },
      'luteal': {
        phase: "Luteal Phase",
        icon: "brain",
        color: "#9d7089",
        tips: [
          {
            title: "Self-Care Priority",
            description: "Progesterone is high. Listen to your body's need for rest, nourishment, and gentler movement.",
          },
          {
            title: "Stable Energy",
            description: "Support your body with complex carbs, healthy fats, and adequate protein to maintain steady energy.",
          },
          {
            title: "Gentle Movement",
            description: "Yoga, walking, or stretching can feel better than high-intensity workouts during this phase.",
          },
        ],
      },
      'pre-menstrual': {
        phase: "Pre-Menstrual",
        icon: "heart",
        color: "#c14a4a",
        tips: [
          {
            title: "Rest & Recovery",
            description: "Your period is approaching. Prioritize rest, gentle movement, and plenty of sleep.",
          },
          {
            title: "Nourish Your Body",
            description: "Iron-rich foods, magnesium, and omega-3s can help support your body through this transition.",
          },
          {
            title: "Set Boundaries",
            description: "It's okay to say no and protect your energy. Honor what your body needs.",
          },
        ],
      },
      'insufficient-data': {
        phase: "Building Baseline",
        icon: "brain",
        color: "#9d7089",
        tips: [
          {
            title: "Consistency Matters",
            description: "Take your temperature at the same time each morning for the most accurate readings.",
          },
          {
            title: "Track Daily",
            description: "Daily tracking helps us detect your body's unique patterns and predict your period more accurately.",
          },
          {
            title: "Trust the Process",
            description: "Your body's signals are unique. We'll learn your patterns as you continue tracking.",
          },
        ],
      },
      'transition': {
        phase: "Transition Phase",
        icon: "sparkles",
        color: "#93a7d1",
        tips: [
          {
            title: "Watch for Patterns",
            description: "Your temperature may be shifting. Keep tracking to detect when ovulation occurs.",
          },
          {
            title: "Stay Consistent",
            description: "Continue taking your temperature daily to catch the temperature rise that indicates ovulation.",
          },
        ],
      },
    };

    const generalTips = [
      {
        icon: "utensils",
        title: "Nutrition for Body Literacy",
        description: "Eat a balanced diet rich in whole foods. Your body's needs may shift throughout your cycle—listen and respond.",
      },
      {
        icon: "brain",
        title: "Understand Your Patterns",
        description: "Track how you feel alongside your temperature. Over time, you'll see patterns that help you understand your body better.",
      },
      {
        icon: "heart",
        title: "Body Wisdom",
        description: "Your body communicates through temperature, energy, and mood. Learning to read these signals builds self-understanding.",
      },
    ];

    // Get tips for current detected phase
    const currentPhaseTips = phaseTips[currentPhase] || phaseTips['insufficient-data'];
    
    // Get all phase tips for display
    const allPhaseTips = Object.values(phaseTips);

    res.json({
      currentPhase: currentPhase,
      currentPhaseName: phaseInfo.phaseName,
      currentPhaseTips: currentPhaseTips,
      allPhaseTips: allPhaseTips,
      generalTips: generalTips
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
  res.json({ 
    status: 'ok', 
    readings: temperatureReadings.length
  });
});

// ========== GEMINI AI INTEGRATION ==========

// Initialize Gemini AI (only if API key is provided)
// The client gets the API key from the environment variable `GEMINI_API_KEY`
let ai = null;

if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({});
    console.log('✓ Gemini AI initialized');
  } catch (error) {
    console.warn('⚠ Gemini AI initialization failed:', error.message);
  }
} else {
  console.warn('⚠ GEMINI_API_KEY not found in environment variables');
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
app.get('/bunny', async (req, res) => {
  try {
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

    // Build the prompt
    const prompt = buildBunnyPrompt(phaseInfo, todayData);

    // Call Gemini API using the new SDK structure
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    
    // Extract text from response
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
      daysSinceOvulation: phaseInfo.daysSinceOvulation
    };

    res.json(bunnyResponse);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Fallback to static tips if Gemini fails
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
 * GET /bunny/models - Debug endpoint to list available Gemini models
 */
app.get('/bunny/models', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini AI not available',
        message: 'GEMINI_API_KEY not configured'
      });
    }

    // Try to list available models
    const models = await ai.models.list();
    res.json({
      available: true,
      models: models,
      note: 'Check which models support generateContent method'
    });
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({
      error: 'Failed to list models',
      message: error.message,
      suggestion: 'Try using gemini-2.0-flash-exp or gemini-2.0-flash'
    });
  }
});

// ========== SAMPLE DATA INITIALIZATION ==========

function initializeSampleData() {
  // Generate sample data for last 20 days to show pre-menstrual phase
  // Pre-menstrual occurs when ovulation was detected >14 days ago
  const now = new Date();
  const baseTemp = 36.5; // Base BBT in Celsius
  
  // Pattern: Ovulation detected 16 days ago, now in pre-menstrual phase
  // We need at least 9 days for ovulation detection, so create 20 days of data
  for (let i = 19; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(7, 0, 0, 0); // Morning reading time
    
    let temp;
    if (i >= 19) {
      // Days 19-17: Pre-ovulation baseline (lower temps) - 6 days before ovulation
      temp = baseTemp - 0.15 + (Math.random() * 0.1); // 36.35-36.45 range
    } else if (i >= 16) {
      // Days 16-14: Ovulation rise (3 consecutive days above baseline) - detected 16 days ago
      temp = baseTemp + 0.35 + (Math.random() * 0.1); // 36.75-36.85 range (0.3-0.4°C above baseline)
    } else if (i >= 2) {
      // Days 13-2: Luteal phase (sustained high after ovulation)
      temp = baseTemp + 0.3 + (Math.random() * 0.1); // 36.7-36.8 range
    } else {
      // Days 1-0 (today and yesterday): Pre-menstrual - temps may start dropping slightly
      temp = baseTemp + 0.25 + (Math.random() * 0.1); // 36.65-36.75 range (slightly lower, period approaching)
    }
    
    temperatureReadings.push({
      temperature: parseFloat(temp.toFixed(2)),
      timestamp: date.toISOString(),
      id: date.getTime()
    });
  }
  
  console.log(`Initialized with ${temperatureReadings.length} sample readings`);
  console.log(`Sample data pattern: Ovulation detected 16 days ago → Pre-menstrual phase (period expected soon)`);
}

// ========== START SERVER ==========

app.listen(PORT, () => {
  console.log(`\n=== Luna Backend Server ===`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /temperature - Receive BBT reading`);
  console.log(`  GET  /data        - Get historical data`);
  console.log(`  GET  /today       - Get today's summary`);
  console.log(`  GET  /phase       - Get cycle phase info`);
  console.log(`  GET  /tips        - Get wellness tips`);
  console.log(`  GET  /bunny       - Get Luna bunny AI guidance`);
  console.log(`  GET  /bunny/models - List available Gemini models (debug)`);
  console.log(`  GET  /health      - Health check\n`);
});
