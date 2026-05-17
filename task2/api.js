const axios = require('axios');
const { baseURL, auth } = require('./config');

const credentials = `${auth.username}:${auth.password}`;
const baseWithAuth = baseURL.replace('https://', `https://${credentials}@`);

const api = axios.create({ 
  baseURL: baseWithAuth,
  headers: { 'Content-Type': 'application/json' }
});

async function login(email, password) {
  const res = await api.post('/api.php', { type: 'Login', email, password });
  return res.data;
}

async function getAllFlights(apikey) {
  const res = await api.post('/api.php', { type: 'GetAllFlights', apikey });
  return res.data;
}

async function getFlight(flightId, apikey) {
  const res = await api.post('/api.php', { type: 'GetFlight', flight_id: flightId, apikey });
  return res.data;
}

async function dispatchFlight(flightId, apikey) {
  const res = await api.post('/api.php', { type: 'DispatchFlight', flight_id: flightId, apikey });
  return res.data;
}

async function updateFlightPosition(flightId, lat, lon, status) {
  const res = await api.post('/api.php', { 
    type: 'UpdateFlightPosition',
    server_key: 'HA_SERVER_SECRET_KEY_u25368037',
    flight_id: flightId,
    latitude: lat,
    longitude: lon,
    status: status
  });
  return res.data;
}

async function getAirports(apikey) {
  const res = await api.post('/api.php', { type: 'GetAirports', apikey });
  return res.data;
}

async function boardFlight(flightId, apikey) {
  const res = await api.post('/api.php', { type: 'BoardFlight', flight_id: flightId, apikey });
  return res.data;
}

module.exports = { login, getAllFlights, getFlight, dispatchFlight, updateFlightPosition, getAirports, boardFlight };
