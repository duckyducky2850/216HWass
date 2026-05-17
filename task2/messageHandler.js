const api = require('./api');
const fm = require('./flightManager');

// clients: Map<ws, { username, role, flightIds: [] }>
// allClients: Map<username, ws>

function broadcastToFlight(flightId, message, activeFlights) {
  const flight = activeFlights[flightId];
  if (!flight) return;
  const payload = JSON.stringify(message);
  flight.subscribers.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload);
  });
}

async function handleMessage(ws, rawData, clients, allClients) {
  let msg;
  try {
    msg = JSON.parse(rawData);
  } catch {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON.' }));
    return;
  }

  const clientInfo = clients.get(ws);

  //  LOGIN 
  if (msg.type === 'LOGIN') {
    try {
      const result = await api.login(msg.username, msg.password);
      if (result.success) {
        clients.set(ws, {
          username: result.username,
          role: result.role,         // 'ATC' or 'Passenger'
          flightIds: result.flight_ids || [],
        });
        allClients.set(result.username, ws);
        ws.send(JSON.stringify({ type: 'LOGIN_SUCCESS', role: result.role, username: result.username, flightIds: result.flight_ids }));
        console.log(`[Auth] ${result.username} (${result.role}) connected.`);
      } else {
        ws.send(JSON.stringify({ type: 'LOGIN_FAIL', message: 'Invalid credentials.' }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Login error: ' + e.message }));
    }
    return;
  }

  // All messages below require login
  if (!clientInfo) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Not authenticated.' }));
    return;
  }

  //  DISPATCH (ATC only) 
  if (msg.type === 'DISPATCH') {
    if (clientInfo.role !== 'ATC') {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Only ATC can dispatch flights.' }));
      return;
    }

    const flightId = msg.flightId;
    try {
      await api.dispatchFlight(flightId);
      const flight = await api.getFlight(flightId);
      const airports = await api.getAirports();

      const origin = airports.find(a => a.code === flight.origin);
      const dest = airports.find(a => a.code === flight.destination);

      if (!origin || !dest) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Airport coordinates not found.' }));
        return;
      }

      const originCoords = { lat: parseFloat(origin.latitude), lon: parseFloat(origin.longitude) };
      const destCoords = { lat: parseFloat(dest.latitude), lon: parseFloat(dest.longitude) };

      // Start animation
      fm.startFlightAnimation(flightId, flight, originCoords, destCoords,
        (fid, message) => broadcastToFlight(fid, message, fm.getActiveFlights())
      );

      // Subscribe ATC to POSITION updates automatically
      fm.subscribeToFlight(flightId, ws);

      ws.send(JSON.stringify({ type: 'DISPATCH_SUCCESS', flightId }));
      console.log(`[Dispatch] Flight ${flightId} dispatched by ATC ${clientInfo.username}.`);

      // Broadcast BOARDING_CALL to all Passengers booked on this flight
      const boardingCall = JSON.stringify({
        type: 'BOARDING_CALL',
        flightId,
        message: `Flight ${flightId} is now boarding. You have 60 seconds to confirm.`,
      });

      allClients.forEach((clientWs, username) => {
        const info = clients.get(clientWs);
        if (info && info.role === 'Passenger' && info.flightIds.includes(String(flightId))) {
          if (clientWs.readyState === 1) clientWs.send(boardingCall);
        }
      });

    } catch (e) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Dispatch failed: ' + e.message }));
    }
    return;
  }

  //  BOARD (Passenger only)
  if (msg.type === 'BOARD') {
    if (clientInfo.role !== 'Passenger') {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Only passengers can board.' }));
      return;
    }

    const flightId = msg.flightId;

    if (!fm.isFlightActive(flightId)) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Flight is not currently active.' }));
      return;
    }

    if (!fm.isBoardingOpen(flightId)) {
      ws.send(JSON.stringify({ type: 'BOARD_ERROR', message: 'Boarding window has closed. You are marked as a no-show.' }));

      // Notify ATC of no-show
      allClients.forEach((clientWs, username) => {
        const info = clients.get(clientWs);
        if (info && info.role === 'ATC' && clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ type: 'NO_SHOW', flightId, passenger: clientInfo.username }));
        }
      });
      return;
    }

    try {
      await api.boardFlight(flightId, clientInfo.username);
      fm.recordBoarding(flightId, clientInfo.username);
      ws.send(JSON.stringify({ type: 'BOARD_SUCCESS', flightId }));

      // Notify ATC of successful boarding
      allClients.forEach((clientWs, username) => {
        const info = clients.get(clientWs);
        if (info && info.role === 'ATC' && clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ type: 'PASSENGER_BOARDED', flightId, passenger: clientInfo.username }));
        }
      });
    } catch (e) {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Boarding failed: ' + e.message }));
    }
    return;
  }

  //  TRACK 
  if (msg.type === 'TRACK') {
    const flightId = msg.flightId;

    if (clientInfo.role === 'Passenger') {
      if (!clientInfo.flightIds.includes(String(flightId))) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'You are not booked on this flight.' }));
        return;
      }
    }

    const subscribed = fm.subscribeToFlight(flightId, ws);
    if (subscribed) {
      ws.send(JSON.stringify({ type: 'TRACK_SUCCESS', flightId, message: 'Subscribed to live position updates.' }));
    } else {
      ws.send(JSON.stringify({ type: 'ERROR', message: `Flight ${flightId} is not currently active.` }));
    }
    return;
  }

  ws.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${msg.type}` }));
}

module.exports = { handleMessage };