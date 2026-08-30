/**
 * EcoLogix API Service Client
 * Enforces JWT Authorization Header injection for all requests.
 */

const envBaseUrl = import.meta.env?.VITE_API_BASE_URL;

const API_BASE_URL = envBaseUrl
  ? envBaseUrl.replace(/\/+$/, '')
  : (window.location.hostname === 'localhost' && window.location.port === '3000'
      ? 'http://localhost:8000/api/v1'
      : '/api/v1');

export function getStoredToken() {
  return localStorage.getItem('ecologix_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('ecologix_token', token);
  } else {
    localStorage.removeItem('ecologix_token');
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network response error' }));
    throw new Error(errorData.detail || `HTTP Error ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  devLogin: (companyKey) =>
    apiRequest('/dev-login', {
      method: 'POST',
      body: JSON.stringify({ company: companyKey }),
    }),

  // Domain Data
  getFleets: () => apiRequest('/fleets'),
  getVehicles: () => apiRequest('/vehicles'),
  getShipments: () => apiRequest('/shipments'),

  // Optimization
  optimizeRoute: (vehicleId, shipmentIds, alpha = 0.5) =>
    apiRequest('/routes/optimize', {
      method: 'POST',
      body: JSON.stringify({
        vehicle_id: vehicleId,
        shipment_ids: shipmentIds,
        alpha: alpha,
      }),
    }),

  getJobStatus: (jobId) => apiRequest(`/jobs/${jobId}`),

  getParetoCurve: (vehicleId, shipmentIds) =>
    apiRequest(`/routes/pareto?vehicle_id=${vehicleId}&shipment_ids=${shipmentIds.join(',')}`),

  // Cross-Provider Load Pooling Matcher (POST /api/v1/loadpool/match)
  // Identifies bipartite deadhead return matching opportunities across carrier networks
  matchLoadPool: (payload = {}) =>
    apiRequest('/loadpool/match', {
      method: 'POST',
      body: JSON.stringify(typeof payload === 'object' ? payload : {}),
    }),

  // Emissions Calculator
  estimateEmissions: (payload) =>
    apiRequest('/emissions/estimate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // EV Comparison Scenario (POST /api/v1/emissions/compare-ev)
  compareEV: (payload) =>
    apiRequest('/emissions/compare-ev', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Impact Summary
  getImpactSummary: () => apiRequest('/impact/summary'),
};

export const compareEV = (payload) =>
  apiRequest('/emissions/compare-ev', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Cross-Provider Load Pooling Standalone Match Function
 * Calls POST /api/v1/loadpool/match with verified tenant JWT.
 */
export const findLoadPoolMatches = (payload = {}) =>
  apiRequest('/loadpool/match', {
    method: 'POST',
    body: JSON.stringify(typeof payload === 'object' ? payload : {}),
  });

export const acceptLoadPoolMatch = (matchId) =>
  apiRequest('/loadpool/match', {
    method: 'POST',
    body: JSON.stringify({ match_id: matchId, accepted: true }),
  });

import { MOCK_SCENARIOS } from './mockScenarios';

export const fetchParetoRoutes = async (payload) => {
  const vehicleId = payload?.vehicle_id || 'veh-nw-101';
  const shipmentIds = payload?.shipment_ids || ['ship-nw-01', 'ship-nw-02'];
  const alpha = payload?.alpha ?? 0.5;

  try {
    const jobRes = await api.optimizeRoute(vehicleId, shipmentIds, alpha);
    const jobId = jobRes.job_id;

    let attempts = 0;
    while (attempts < 20) {
      await new Promise((r) => setTimeout(r, 400));
      const statusRes = await api.getJobStatus(jobId);
      if (statusRes.status === 'completed' && statusRes.result) {
        return statusRes.result;
      }
      if (statusRes.status === 'failed') {
        break;
      }
      attempts++;
    }
  } catch (err) {
    console.warn('Live route optimization unavailable, using instant mock scenario fallback:', err);
  }

  // Graceful instantaneous fallback to top mock scenario
  const fallback = MOCK_SCENARIOS[0].routeResult;
  return fallback;
};

export const fetchDriverTrips = () =>
  apiRequest('/driver/trips', {
    method: 'GET',
  });

export const fetchDriverStatus = () =>
  apiRequest('/driver/status', {
    method: 'GET',
  });

export const fetchDriverProfile = () =>
  apiRequest('/driver/profile', {
    method: 'GET',
  });

export const updateDriverProfile = (profilePayload) =>
  apiRequest('/driver/profile', {
    method: 'PATCH',
    body: JSON.stringify(profilePayload),
  });

export const updateDriverStatus = (statusPayload) =>
  apiRequest('/driver/status', {
    method: 'POST',
    body: JSON.stringify(statusPayload),
  });

export const acceptDriverReturn = (payload = {}) =>
  apiRequest('/driver/accept-return', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchDriverAlerts = () =>
  apiRequest('/driver/alerts', {
    method: 'GET',
  });

export const fetchImpactSummary = () => apiRequest('/impact/summary');
export const getImpactSummary = () => apiRequest('/impact/summary');

/**
 * Dispatches an event across the window so components like ImpactSummaryPanel
 * can refresh live data immediately without page reload or polling.
 */
export const notifyImpactUpdated = (detail = {}) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ecologix:impact-updated', { detail }));
  }
};

/**
 * Dispatches an event when a user picks any of the 50 mock scenarios,
 * instantly propagating the route and vehicle to all active dashboards and driver screens.
 */
export const notifyScenarioSelected = (scenario) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ecologix_selected_scenario_id', scenario.id);
    } catch (e) {
      console.warn('Could not save scenario to localStorage:', e);
    }
    window.dispatchEvent(new CustomEvent('ecologix:scenario-selected', { detail: { scenario } }));
  }
};
