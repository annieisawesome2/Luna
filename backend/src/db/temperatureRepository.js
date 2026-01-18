import db from './database.js';

// Insert a new temperature reading
export function insertTemperature(temperature, timestamp) {
  const stmt = db.prepare(`
    INSERT INTO temperatures (temperature, timestamp)
    VALUES (?, ?)
  `);
  
  const result = stmt.run(temperature, timestamp);
  return {
    id: result.lastInsertRowid,
    temperature,
    timestamp
  };
}

// Get all temperature readings (most recent first)
export function getAllTemperatures() {
  const stmt = db.prepare(`
    SELECT id, temperature, timestamp, created_at
    FROM temperatures
    ORDER BY timestamp DESC
  `);
  return stmt.all();
}

// Get temperatures for the last N days
export function getTemperaturesForDays(days = 14) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const stmt = db.prepare(`
    SELECT id, temperature, timestamp, created_at
    FROM temperatures
    WHERE timestamp >= ?
    ORDER BY timestamp ASC
  `);
  return stmt.all(cutoffDate.toISOString());
}

// Get temperature for a specific date
export function getTemperatureForDate(dateStr) {
  const stmt = db.prepare(`
    SELECT id, temperature, timestamp, created_at
    FROM temperatures
    WHERE date(timestamp) = date(?)
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  return stmt.get(dateStr);
}

// Get temperatures for a specific month (for calendar)
export function getTemperaturesForMonth(year, month) {
  // month is 0-indexed (0 = January)
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);
  
  const stmt = db.prepare(`
    SELECT id, temperature, timestamp, created_at
    FROM temperatures
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
  `);
  return stmt.all(startDate.toISOString(), endDate.toISOString());
}

// Get total count of readings
export function getReadingsCount() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM temperatures');
  return stmt.get().count;
}

// Delete old readings (keep last N days)
export function cleanupOldReadings(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const stmt = db.prepare(`
    DELETE FROM temperatures
    WHERE timestamp < ?
  `);
  const result = stmt.run(cutoffDate.toISOString());
  return result.changes;
}

// Get temperature statistics
export function getTemperatureStats() {
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as count,
      AVG(temperature) as average,
      MIN(temperature) as min,
      MAX(temperature) as max
    FROM temperatures
  `);
  return stmt.get();
}

// Clear all temperature data
export function clearAllTemperatures() {
  const stmt = db.prepare('DELETE FROM temperatures');
  const result = stmt.run();
  // Reset the autoincrement counter
  db.prepare("DELETE FROM sqlite_sequence WHERE name='temperatures'").run();
  return result.changes;
}

// Seed sample data for testing (only if database is empty)
export function seedSampleData(force = false) {
  const count = getReadingsCount();
  if (count > 0 && !force) {
    console.log(`Database already has ${count} readings, skipping seed`);
    return false;
  }

  if (force && count > 0) {
    console.log('Force reseeding - clearing existing data...');
    clearAllTemperatures();
  }

  console.log('Seeding sample temperature data with ovulation spike...');
  
  const today = new Date();
  const readings = [];
  
  // Generate 28 days of sample data to show a full cycle
  // Typical cycle: 
  //   - Days 1-5: Menstruation (lower temps ~36.2-36.4)
  //   - Days 6-13: Follicular phase (low temps ~36.3-36.5)
  //   - Day 14: Ovulation day - slight dip then spike
  //   - Days 15-28: Luteal phase (elevated temps ~36.7-37.0)
  //   - Period expected ~14 days after ovulation
  
  const baselineTemp = 36.35; // Pre-ovulation baseline
  const postOvulationTemp = 36.75; // Post-ovulation baseline (0.3-0.4°C higher)
  
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(7, 0, 0, 0); // 7 AM readings
    
    const dayOfCycle = 28 - i; // Day 1 to 28
    let temp;
    
    if (dayOfCycle <= 5) {
      // Days 1-5: Menstruation - lower temps with slight variation
      temp = baselineTemp + (Math.random() * 0.1 - 0.05);
    } else if (dayOfCycle <= 13) {
      // Days 6-13: Follicular phase - stable low temps
      temp = baselineTemp + 0.05 + (Math.random() * 0.1 - 0.05);
    } else if (dayOfCycle === 14) {
      // Day 14: Ovulation day - characteristic dip before spike
      temp = baselineTemp - 0.1 + (Math.random() * 0.05);
    } else if (dayOfCycle === 15) {
      // Day 15: Day after ovulation - sharp rise (THE SPIKE)
      temp = postOvulationTemp + 0.15 + (Math.random() * 0.1);
    } else if (dayOfCycle <= 25) {
      // Days 16-25: Luteal phase - sustained high temps
      temp = postOvulationTemp + (Math.random() * 0.15 - 0.05);
    } else {
      // Days 26-28: Pre-menstrual - temps start dropping slightly
      temp = postOvulationTemp - 0.1 + (Math.random() * 0.1 - 0.05);
    }
    
    readings.push({
      temperature: parseFloat(temp.toFixed(2)),
      timestamp: date.toISOString()
    });
  }
  
  // Insert all readings
  const insertStmt = db.prepare(`
    INSERT INTO temperatures (temperature, timestamp)
    VALUES (?, ?)
  `);
  
  const insertMany = db.transaction((readings) => {
    for (const reading of readings) {
      insertStmt.run(reading.temperature, reading.timestamp);
    }
  });
  
  insertMany(readings);
  console.log(`✓ Seeded ${readings.length} sample temperature readings`);
  console.log(`  Ovulation detected around day 14 (${readings[14].timestamp.split('T')[0]})`);
  console.log(`  Expected period: ~14 days after ovulation`);
  return true;
}
