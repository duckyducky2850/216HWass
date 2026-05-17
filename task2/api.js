const axios = require('axios');
const { baseURL, auth } = require('./config');

const credentials = `${auth.username}:${auth.password}`;
const baseWithAuth = baseURL.replace('https://', `https://${credentials}@`);

const api = axios.create({ baseURL: baseWithAuth });

async function login(username, password) {
  const res = await api.post('/login.php', { username, password });
  return res.data;
}

async function getAllFlights() {
  const res = await api.get('/get_all_flights.php');
  return res.data;
}

async function getFlight(flightId) {
  const res = await api.get('/get_flight.php', { params: { flight_id: flightId } });
  return res.data;
}

async function dispatchFlight(flightId) {
  const res = await api.post('/dispatch_flight.php', { flight_id: flightId });
  return res.data;
}

async function updateFlightPosition(flightId, lat, lon) {
  const res = await api.post('/update_flight_position.php', {
    flight_id: flightId,
    latitude: lat,
    longitude: lon,
  });
  return res.data;
}

async function getAirports() {
  const res = await api.get('/get_airports.php');
  return res.data;
}

async function boardFlight(flightId, username) {
  const res = await api.post('/board_flight.php', { flight_id: flightId, username });
  return res.data;
}

module.exports = { login, getAllFlights, getFlight, dispatchFlight, updateFlightPosition, getAirports, boardFlight };