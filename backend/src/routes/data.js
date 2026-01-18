import express from 'express';
import { 
  getAllTemperatures, 
  getTemperaturesForDays,
  getReadingsCount 
} from '../db/temperatureRepository.js';
import { detectOvulation } from '../domain/cycleAnalysis.js';
import { getCurrentDate } from '../utils/currentDate.js';

const router = express.Router();

// Helper to get readings in the format expected by cycle analysis
function getReadingsArray() {
  return getAllTemperatures().reverse().map(r => ({
    id: r.id,
    temperature: r.temperature,
    timestamp: r.timestamp
  }));
}

function isoDateUTC(value) {
  // Always normalize to a YYYY-MM-DD key in UTC
  return new Date(value).toISOString().slice(0, 10);
}

function lastNDatesUTC(n, baseDate = new Date()) {
  const baseUtcMidnightMs = Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate()
  );
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(baseUtcMidnightMs - i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// GET /data - Get historical BBT data
router.get('/', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14; // Default to 14 days
    const filtered = getTemperaturesForDays(days);
    
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

// GET /data/chart - Get BBT data formatted for charts with ovulation markers
router.get('/chart', (req, res) => {
  try {
    // We want a true time-series: last 28 calendar dates (UTC), not “last 28 records”.
    const windowDays = 28;
    const windowDates = lastNDatesUTC(windowDays, getCurrentDate()); // oldest -> newest

    const readings = getReadingsArray(); // oldest -> newest
    const ovulation = detectOvulation(readings);
    const ovulationDateKey = ovulation?.detected ? isoDateUTC(ovulation.date) : null;

    // Map latest reading per date (if multiple readings exist in a day)
    const all = getAllTemperatures(); // newest -> oldest (repo order)
    const latestByDate = new Map();
    for (const r of all) {
      const key = isoDateUTC(r.timestamp);
      if (!latestByDate.has(key)) latestByDate.set(key, r);
    }

    const temperatureData = windowDates.map((dateKey, idx) => {
      const reading = latestByDate.get(dateKey);
      const temp = reading ? reading.temperature : null;
      return {
        index: idx + 1,
        date: dateKey, // YYYY-MM-DD (UTC)
        temp,
        hasReading: !!reading,
        timestamp: reading ? reading.timestamp : null,
        isOvulationDay: !!(ovulationDateKey && ovulationDateKey === dateKey),
      };
    });

    const tempsInWindow = temperatureData.map(d => d.temp).filter(v => typeof v === 'number');
    const avgTemp = tempsInWindow.length
      ? tempsInWindow.reduce((sum, v) => sum + v, 0) / tempsInWindow.length
      : null;

    const ovulationIndex = ovulationDateKey
      ? temperatureData.findIndex(d => d.isOvulationDay)
      : -1;

    const ovulationMarkers = ovulation?.detected && ovulationIndex !== -1
      ? [{
          date: ovulationDateKey,
          index: ovulationIndex + 1,
          temperature: ovulation.postOvulationTemp,
          confidence: ovulation.confidence,
        }]
      : [];

    res.json({
      temperatureData,
      avgTemp: avgTemp === null ? null : parseFloat(avgTemp.toFixed(2)),
      ovulationMarkers,
      ovulation,
      totalReadings: getReadingsCount(),
      window: {
        days: windowDays,
        start: windowDates[0],
        end: windowDates[windowDates.length - 1],
      },
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
