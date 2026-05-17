const { updateFlightPosition } = require('./api');

// activeFlights: { flightId: { flight, originCoords, destCoords, startTime, durationMs, interval, subscribers: Set, boardingTimer, boardedPassengers: Set, boardingOpen } }
const activeFlights = {};

// positionUpdateInterval in ms — used for the "on interval" strategy
const DB_UPDATE_INTERVAL_MS = 5000;

function startFlightAnimation(flightId, flight, originCoords, destCoords, broadcast) {
  const durationMs = flight.duration_hours * 1000; // N hours → N seconds (scaled)
  const tickMs = 100; // update position every 100ms
  let elapsed = 0;
  let lastDbUpdate = 0;

  activeFlights[flightId] = {
    flight,
    originCoords,
    destCoords,
    durationMs,
    subscribers: new Set(),
    boardingOpen: true,
    boardedPassengers: new Set(),
    boardingTimer: null,
  };

  // Close boarding window after 60 seconds
  activeFlights[flightId].boardingTimer = setTimeout(() => {
    if (activeFlights[flightId]) {
      activeFlights[flightId].boardingOpen = false;
    }
  }, 60000);

  const interval = setInterval(async () => {
    elapsed += tickMs;
    const progress = Math.min(elapsed / durationMs, 1);

    const lat = originCoords.lat + (destCoords.lat - originCoords.lat) * progress;
    const lon = originCoords.lon + (destCoords.lon - originCoords.lon) * progress;

    // Broadcast POSITION to all subscribers
    broadcast(flightId, {
      type: 'POSITION',
      flightId,
      latitude: lat,
      longitude: lon,
      progress,
    });

    // Update DB on interval strategy (every DB_UPDATE_INTERVAL_MS)
    lastDbUpdate += tickMs;
    if (lastDbUpdate >= DB_UPDATE_INTERVAL_MS) {
      lastDbUpdate = 0;
      try {
        await updateFlightPosition(flightId, lat, lon);
      } catch (e) {
        console.error(`[DB] Failed to update position for flight ${flightId}:`, e.message);
      }
    }

    // Flight complete
    if (progress >= 1) {
      clearInterval(interval);
      try {
        await updateFlightPosition(flightId, destCoords.lat, destCoords.lon);
      } catch (e) {
        console.error(`[DB] Final position update failed:`, e.message);
      }

      broadcast(flightId, {
        type: 'LANDED',
        flightId,
        message: `Flight ${flightId} has landed.`,
      });

      delete activeFlights[flightId];
      console.log(`[Flight] ${flightId} has landed and been removed from active flights.`);
    }
  }, tickMs);

  activeFlights[flightId].interval = interval;
}

function subscribeToFlight(flightId, ws) {
  if (activeFlights[flightId]) {
    activeFlights[flightId].subscribers.add(ws);
    return true;
  }
  return false;
}

function unsubscribeFromAll(ws) {
  for (const flightId in activeFlights) {
    activeFlights[flightId].subscribers.delete(ws);
  }
}

function isBoardingOpen(flightId) {
  return activeFlights[flightId]?.boardingOpen ?? false;
}

function recordBoarding(flightId, username) {
  if (activeFlights[flightId]) {
    activeFlights[flightId].boardedPassengers.add(username);
  }
}

function isFlightActive(flightId) {
  return !!activeFlights[flightId];
}

function getActiveFlights() {
  return activeFlights;
}

module.exports = {
  startFlightAnimation,
  subscribeToFlight,
  unsubscribeFromAll,
  isBoardingOpen,
  recordBoarding,
  isFlightActive,
  getActiveFlights,
};