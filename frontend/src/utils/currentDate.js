const STORAGE_KEY = 'luna.simulation';

/**
 * Frontend simulation state is stored in localStorage so the UI updates instantly.
 * Backend also has simulation settings; Settings page will keep them in sync.
 */
export function getSimulationState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, date: null };
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      date: typeof parsed.date === 'string' ? parsed.date : null
    };
  } catch {
    return { enabled: false, date: null };
  }
}

export function setSimulationState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    enabled: !!next.enabled,
    date: next.date ?? null
  }));
}

export function getCurrentDate() {
  const sim = getSimulationState();
  if (sim.enabled && sim.date) {
    // Use midday UTC to avoid timezone shifting when formatting / comparing.
    return new Date(`${sim.date}T12:00:00.000Z`);
  }
  return new Date();
}

export function getCurrentDateKeyUTC() {
  return getCurrentDate().toISOString().slice(0, 10);
}

