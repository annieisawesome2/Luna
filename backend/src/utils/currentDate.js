import { userSettings } from '../data/store.js';

/**
 * Returns the app's "current date/time".
 * If demo simulation is enabled, this returns a Date fixed to the simulated day
 * (at 12:00 UTC to avoid timezone shifting when formatting dates).
 */
export function getCurrentDate() {
  const sim = userSettings?.preferences?.simulation;
  if (sim?.enabled && sim?.date) {
    // sim.date is YYYY-MM-DD
    return new Date(`${sim.date}T12:00:00.000Z`);
  }
  return new Date();
}

export function getCurrentDateKeyUTC() {
  return getCurrentDate().toISOString().slice(0, 10);
}

