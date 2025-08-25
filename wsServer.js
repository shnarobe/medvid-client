
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 9998 });

wss.on('connection', (ws, req) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    console.log('Received:', message);
    // Echo the message back to the client
    ws.send(`Server received: ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  // Send a welcome message
  ws.send('Welcome to the WebSocket server!');
});

console.log('WebSocket server running on ws://localhost:9998');
