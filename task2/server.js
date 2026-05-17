const WebSocket = require('ws');
const readline = require('readline');
const { handleMessage } = require('./messageHandler');
const { handleCommand } = require('./commands');
const fm = require('./flightManager');

//  Port validation
const args = process.argv.slice(2);
let port = parseInt(args[0]);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function startServer(port) {
  const wss = new WebSocket.Server({ port }, () => {
    console.log(`[Server] WebSocket server running on ws://localhost:${port}`);
    console.log('[Server] Commands: FLIGHT STATUS <id> | KILL <username> | QUIT');
  });

  // clients: Map<ws, { username, role, flightIds }>
  const clients = new Map();
  // allClients: Map<username, ws>
  const allClients = new Map();

  wss.on('connection', (ws) => {
    console.log('[Server] New client connected.');

    ws.on('message', (data) => {
      handleMessage(ws, data.toString(), clients, allClients);
    });

    ws.on('close', () => {
      const info = clients.get(ws);
      if (info) {
        console.log(`[Server] ${info.username} disconnected.`);
        allClients.delete(info.username);

        // If ATC disconnected, notify all passengers
        if (info.role === 'ATC') {
          allClients.forEach((clientWs, username) => {
            const cInfo = clients.get(clientWs);
            if (cInfo?.role === 'Passenger' && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({
                type: 'ATC_DISCONNECTED',
                message: 'The ATC connection was briefly lost. Your flight is unaffected.',
              }));
            }
          });
        }

        clients.delete(ws);
        fm.unsubscribeFromAll(ws);
      }
    });

    ws.on('error', (err) => {
      console.error('[Server] Socket error:', err.message);
    });
  });

  //  CLI
  rl.on('line', (input) => {
    handleCommand(input, clients, allClients);
  });
}

//  Prompt for port if not provided 
function validateAndStart(portInput) {
  const p = parseInt(portInput);
  if (isNaN(p) || p < 1024 || p > 49151) {
    console.log('[Error] Port must be between 1024 and 49151.');
    rl.question('Enter port number (1024–49151): ', validateAndStart);
  } else {
    startServer(p);
  }
}

if (!port || port < 1024 || port > 49151) {
  rl.question('Enter port number (1024–49151): ', validateAndStart);
} else {
  startServer(port);
}