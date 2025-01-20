const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDriveWatcher } = require('./services/driveService');
const { transcribeVideo } = require('./services/geminiService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enable CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://gdrive-to-gemini-jqxyd4dki-roberts-projects-19fe2013.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Add a ping endpoint
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      "https://gdrive-to-gemini-jqxyd4dki-roberts-projects-19fe2013.vercel.app",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  transports: ['polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Add connection event logging
io.engine.on("connection_error", (err) => {
  console.log("Connection error:", {
    req: err.req,
    code: err.code,
    message: err.message,
    context: err.context
  });
});

const PORT = process.env.PORT || 3000;

// Add error handling for socket connections
io.on('connection', (socket) => {
  console.log('Client connected:', {
    id: socket.id,
    transport: socket.conn.transport.name,
    headers: socket.handshake.headers,
    query: socket.handshake.query
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', {
      id: socket.id,
      reason: reason,
      wasConnected: socket.connected
    });
  });
});

// Add error handling for the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS allowed for:', io.opts.cors.origin);
  initializeDriveWatcher(io);
}).on('error', (error) => {
  console.error('Server failed to start:', error);
});

// Global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 