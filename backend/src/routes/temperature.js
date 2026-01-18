// ESP + client API routes for temperature data

import express from 'express';
import { 
  insertTemperature, 
  getAllTemperatures, 
  getTemperaturesForDays,
  getTemperatureForDate,
  getTemperaturesForMonth,
  getReadingsCount,
  cleanupOldReadings,
  seedSampleData
} from '../db/temperatureRepository.js';
import { detectCurrentPhase, detectOvulation } from '../domain/cycleAnalysis.js';

const router = express.Router();

// Helper to get readings in the format expected by cycle analysis
function getReadingsArray() {
  return getAllTemperatures().reverse().map(r => ({
    id: r.id,
    temperature: r.temperature,
    timestamp: r.timestamp
  }));
}

// POST /temperature - Receive BBT reading from ESP32
router.post('/', (req, res) => {
  try {
    const { temperature, timestamp } = req.body;
    
    if (!temperature || !timestamp) {
      return res.status(400).json({ error: 'Missing temperature or timestamp' });
    }
    
    // Convert Unix timestamp to ISO if needed
    let isoTimestamp;
    if (typeof timestamp === 'number' || /^\d+$/.test(timestamp)) {
      isoTimestamp = new Date(parseInt(timestamp) * 1000).toISOString();
    } else {
      isoTimestamp = new Date(timestamp).toISOString();
    }
    
    const reading = insertTemperature(parseFloat(temperature), isoTimestamp);
    
    // Cleanup old readings (keep last 90 days)
    cleanupOldReadings(90);
    
    console.log(`✓ New reading saved: ${reading.temperature}°C at ${reading.timestamp}`);
    
    res.status(201).json({
      success: true,
      reading,
      message: 'Temperature reading saved to database'
    });
  } catch (error) {
    console.error('Error processing temperature reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /temperature/today - Get today's summary (temperature, phase, prediction)
router.get('/today', (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get today's reading if available
    const todayReading = getTemperatureForDate(todayStr);
    
    // Get all readings for phase detection
    const readings = getReadingsArray();
    
    // Detect current phase using BBT patterns
    const phaseInfo = detectCurrentPhase(readings);
    
    res.json({
      date: todayStr,
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
      readingsCount: getReadingsCount()
    });
  } catch (error) {
    console.error('Error fetching today data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /temperature/phase - Get current cycle phase info (physiology-based)
router.get('/phase', (req, res) => {
  try {
    const readings = getReadingsArray();
    const phaseInfo = detectCurrentPhase(readings);
    res.json(phaseInfo);
  } catch (error) {
    console.error('Error detecting phase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /temperature/calendar - Get calendar data with phase information
router.get('/calendar', (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarData = [];
    
    // Get readings for this month
    const monthReadings = getTemperaturesForMonth(year, month);
    const allReadings = getReadingsArray();
    
    // Detect ovulation for reference
    const ovulation = detectOvulation(allReadings);
    const phaseInfo = detectCurrentPhase(allReadings);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find if there's a reading for this day
      const dayReading = monthReadings.find(r => {
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
          if (allReadings.length > 0) {
            const avgBBT = allReadings.reduce((sum, r) => sum + r.temperature, 0) / allReadings.length;
            
            if (dayReading.temperature < avgBBT - 0.1) {
              phase = 'pre-ovulation';
              phaseColor = '#93a7d1';
            } else if (dayReading.temperature > avgBBT + 0.2) {
              phase = 'luteal';
              phaseColor = '#9d7089';
            }
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

// GET /temperature/health - Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    readings: getReadingsCount(),
    database: 'sqlite'
  });
});

// POST /temperature/seed - Seed sample data (for development)
// Use ?force=true to clear and reseed
router.post('/seed', (req, res) => {
  try {
    const force = req.query.force === 'true';
    const seeded = seedSampleData(force);
    if (seeded) {
      res.json({ 
        success: true, 
        message: force ? 'Data cleared and reseeded with ovulation pattern' : 'Sample data seeded with ovulation pattern',
        readings: getReadingsCount()
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Database already has data. Use ?force=true to clear and reseed.',
        readings: getReadingsCount()
      });
    }
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
