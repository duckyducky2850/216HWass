const WebSocket = require('ws');
const readline = require('readline');
const { handleMessage } = require('./messageHandler');
const { handleCommand } = require('./commands');
const fm = require('./flightManager');
const express = require('express');
const http = require('http');
const axios = require('axios');
const { baseURL, auth } = require('./config');

const credentials = `${auth.username}:${auth.password}`;
const baseWithAuth = baseURL.replace('https://', `https://${credentials}@`);

const args = process.argv.slice(2);
let port = parseInt(args[0]);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function startServer(port) {
  // Express app for HTTP requests from Angular
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.post('/api', async (req, res) => {
    try {
      console.log('[API] Calling:', `${baseWithAuth}/api.php`);
      console.log('[API] Body:', req.body);
      const response = await axios.post(`${baseWithAuth}/api.php`, req.body);
      res.json(response.data);
    } catch (err) {
      console.log('[API] Error:', err.message);
      console.log('[API] Response:', err.response?.data);
      res.status(500).json({ status: 'error', data: err.message });
    }
  });




  // Create HTTP server that handles both Express and WebSocket
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server }, () => {
    console.log(`[Server] Running on port ${port}`);
    console.log('[Server] Commands: FLIGHT STATUS <id> | KILL <username> | QUIT');
  });

  server.listen(port, () => {
    console.log(`[Server] WebSocket server running on ws://localhost:${port}`);
    console.log(`[Server] HTTP API available at http://localhost:${port}/api`);
  });

  const clients = new Map();
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

  rl.on('line', (input) => {
    handleCommand(input, clients, allClients);
  });
}

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

