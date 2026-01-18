import { getAllTemperatures, getTemperaturesForDays } from '../db/temperatureRepository.js';

// Get temperature readings from database (for backwards compatibility)
// This returns the readings in the format expected by existing code
export function getTemperatureReadings() {
  return getAllTemperatures().map(r => ({
    id: r.id,
    temperature: r.temperature,
    timestamp: r.timestamp
  }));
}

// For backwards compatibility - returns readings sorted oldest first
export const temperatureReadings = {
  get length() {
    return getAllTemperatures().length;
  },
  
  // Make it iterable like an array
  [Symbol.iterator]() {
    const readings = getAllTemperatures().reverse(); // oldest first
    let index = 0;
    return {
      next() {
        if (index < readings.length) {
          return { value: readings[index++], done: false };
        }
        return { done: true };
      }
    };
  },
  
  // Array-like methods for compatibility
  filter(callback) {
    return getAllTemperatures().reverse().filter(callback);
  },
  
  map(callback) {
    return getAllTemperatures().reverse().map(callback);
  },
  
  find(callback) {
    return getAllTemperatures().reverse().find(callback);
  },
  
  reduce(callback, initial) {
    return getAllTemperatures().reverse().reduce(callback, initial);
  },
  
  sort(comparator) {
    return getAllTemperatures().reverse().sort(comparator);
  },
  
  slice(start, end) {
    return getAllTemperatures().reverse().slice(start, end);
  }
};

// User settings (for MVP - replace with database in production)
export const userSettings = {
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
    simulation: {
      enabled: false,
      // YYYY-MM-DD (interpreted as “simulated today”)
      date: null
    }
  },
  device: {
    connected: false,
    deviceName: null
  }
};
