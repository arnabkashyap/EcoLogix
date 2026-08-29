/**
 * Lookup API Service — Client for Vehicle & Weather Lookup Endpoints.
 * Reuses existing api token authorization and base URL config.
 */

import { api } from './api';

const envBaseUrl = import.meta.env?.VITE_API_BASE_URL;
const API_BASE_URL = envBaseUrl
  ? envBaseUrl.replace(/\/+$/, '')
  : (window.location.hostname === 'localhost' && window.location.port === '3000'
      ? 'http://localhost:8000/api/v1'
      : '/api/v1');

export const lookupApi = {
  lookupVehicle: async (vehicleName) => {
    const token = localStorage.getItem('ecologix_token');
    const res = await fetch(`${API_BASE_URL}/lookup/vehicle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ vehicle_name: vehicleName }),
    });
    if (!res.ok) {
      throw new Error(`Vehicle lookup failed: ${res.status}`);
    }
    return res.json();
  },

  lookupWeather: async (destLat, destLon, condition = null) => {
    const token = localStorage.getItem('ecologix_token');
    const res = await fetch(`${API_BASE_URL}/lookup/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        destination_lat: destLat,
        destination_lon: destLon,
        condition: condition,
      }),
    });
    if (!res.ok) {
      throw new Error(`Weather lookup failed: ${res.status}`);
    }
    return res.json();
  },
};
