// ========== PHYSIOLOGY-FIRST CYCLE DETECTION ==========

import { getCurrentDate } from '../utils/currentDate.js';

/**
 * Detect ovulation based on BBT pattern (physiology-first approach)
 * Uses the "3-over-6" rule: 3 consecutive days at least 0.3°C above the previous 6 days
 * @param {Array} readings - Sorted temperature readings (oldest to newest)
 * @returns {Object|null} - Ovulation detection info or null
 */
export function detectOvulation(readings) {
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
export function predictPeriodStart(ovulation) {
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

  const today = getCurrentDate();
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
export function detectCurrentPhase(readings) {
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
    const today = getCurrentDate();
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
