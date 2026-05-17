const api = require('./api');
const fm = require('./flightManager');

async function handleCommand(input, clients, allClients) {
  const parts = input.trim().split(/\s+/);
  const command = parts[0]?.toUpperCase();

  // FLIGHT STATUS <flightId>
  if (command === 'FLIGHT' && parts[1]?.toUpperCase() === 'STATUS') {
    const flightId = parts[2];
    if (!flightId) {
      console.log('[CMD] Usage: FLIGHT STATUS <flight_id>');
      return;
    }
    try {
      const flight = await api.getFlight(flightId);
      if (!flight) { console.log(`[CMD] Flight ${flightId} not found.`); return; }

      const active = fm.getActiveFlights()[flightId];
      const boarded = active ? active.boardedPassengers.size : 'N/A';

      console.log('─────────────────────────────────');
      console.log(`Flight:     ${flight.flight_number}`);
      console.log(`Status:     ${flight.status}`);
      console.log(`Latitude:   ${flight.latitude ?? 'N/A'}`);
      console.log(`Longitude:  ${flight.longitude ?? 'N/A'}`);
      console.log(`Boarded:    ${boarded} / ${flight.passenger_count ?? 'N/A'}`);
      console.log(`Est. Time Remaining: ${active ? ((1 - (Date.now() - active.startTime) / active.durationMs) * active.flight?.duration_hours * 3600).toFixed(0) + 's' : 'N/A'}`);
      console.log('─────────────────────────────────');
    } catch (e) {
      console.log('[CMD] Error fetching flight:', e.message);
    }
    return;
  }

  // KILL <username> 
  if (command === 'KILL') {
    const username = parts[1];
    if (!username) { console.log('[CMD] Usage: KILL <username>'); return; }

    const ws = allClients.get(username);
    if (!ws) { console.log(`[CMD] No connected user: ${username}`); return; }

    ws.send(JSON.stringify({ type: 'KILLED', message: 'Your connection has been terminated by the server admin.' }));
    ws.close();
    allClients.delete(username);
    console.log(`[CMD] Killed connection for user: ${username}`);
    return;
  }

  // QUIT 
  if (command === 'QUIT') {
    console.log('[CMD] Shutting down server...');
    const shutdownMsg = JSON.stringify({ type: 'SERVER_SHUTDOWN', message: 'The server is shutting down. Please reconnect later.' });

    allClients.forEach((ws) => {
      if (ws.readyState === 1) ws.send(shutdownMsg);
      ws.close();
    });

    setTimeout(() => process.exit(0), 1000);
    return;
  }

  console.log(`[CMD] Unknown command: "${input.trim()}". Try: FLIGHT STATUS <id> | KILL <username> | QUIT`);
}

module.exports = { handleCommand };