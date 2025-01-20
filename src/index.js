const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDriveWatcher } = require('./services/driveService');
const { transcribeVideo } = require('./services/geminiService');
const { testConnection } = require('./services/supabaseService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://gdrive-to-gemini-5srbzrkqy-roberts-projects-19fe2013.vercel.app",
  "https://gdrive-to-gemini.vercel.app",
  "http://localhost:5173"
];

// Enable CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  
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

// Replace the current health check endpoint with this:
app.get('/health', async (req, res) => {
  try {
    // Check Supabase connection
    const supabaseConnected = await testConnection();
    if (!supabaseConnected) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Supabase connection failed',
        timestamp: new Date().toISOString()
      });
    }

    // Check Google Drive API auth
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Google credentials not configured',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        supabase: 'connected',
        google: 'configured'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Add a ping endpoint
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Detailed Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      "https://gdrive-to-gemini-5srbzrkqy-roberts-projects-19fe2013.vercel.app",
      "https://gdrive-to-gemini.vercel.app",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"]
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  connectTimeout: 45000
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

  // Acknowledge connection
  socket.emit('connected', { status: 'ok' });
});

// Add error handling for the server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS allowed for:', io.opts.cors.origin);
  
  // Test Supabase connection before starting the watcher
  const supabaseConnected = await testConnection();
  if (!supabaseConnected) {
    console.error('Failed to connect to Supabase. Shutting down...');
    process.exit(1);
  }
  
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