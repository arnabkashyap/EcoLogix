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

  // Load Pooling
  matchLoadPool: () =>
    apiRequest('/loadpool/match', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // Emissions Calculator
  estimateEmissions: (payload) =>
    apiRequest('/emissions/estimate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Impact Summary
  getImpactSummary: () => apiRequest('/impact/summary'),
};

export const findLoadPoolMatches = (payload) =>
  apiRequest('/loadpool/match', {
    method: 'POST',
    body: JSON.stringify(typeof payload === 'object' ? payload : {}),
  });

export const acceptLoadPoolMatch = (matchId) =>
  apiRequest('/loadpool/match', {
    method: 'POST',
    body: JSON.stringify({ match_id: matchId, accepted: true }),
  });

export const fetchParetoRoutes = async (payload) => {
  const vehicleId = payload?.vehicle_id || 'veh-nw-101';
  const shipmentIds = payload?.shipment_ids || ['ship-nw-01', 'ship-nw-02'];
  const alpha = payload?.alpha ?? 0.5;

  const jobRes = await api.optimizeRoute(vehicleId, shipmentIds, alpha);
  const jobId = jobRes.job_id;

  let attempts = 0;
  while (attempts < 15) {
    await new Promise((r) => setTimeout(r, 400));
    const statusRes = await api.getJobStatus(jobId);
    if (statusRes.status === 'completed' && statusRes.result) {
      return statusRes.result;
    }
    if (statusRes.status === 'failed') {
      throw new Error(statusRes.error || 'Optimization job failed');
    }
    attempts++;
  }
  throw new Error('Route optimization timed out');
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
