// State Management for Multi-Page Application

const STATE_KEY = 'maine_menu_match_state';

const defaultState = {
  cuisine: '',
  foodTruck: '',
  seasonal: '',
  vibe: '',
  features: []
};

export function getState() {
  const saved = sessionStorage.getItem(STATE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse state', e);
    }
  }
  return { ...defaultState };
}

export function saveState(state) {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function updateState(updates) {
  const current = getState();
  const next = { ...current, ...updates };
  saveState(next);
  return next;
}

export function clearState() {
  sessionStorage.removeItem(STATE_KEY);
}

export function toggleFeature(feature) {
  const current = getState();
  const idx = current.features.indexOf(feature);
  if (idx === -1) {
    current.features.push(feature);
  } else {
    current.features.splice(idx, 1);
  }
  saveState(current);
  return current;
}
