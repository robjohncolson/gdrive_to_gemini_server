const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDriveWatcher } = require('./services/driveService');
const { testConnection } = require('./services/supabaseService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Add ping endpoint first
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

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

const PORT = process.env.PORT || 3000;

// Start server first
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize Socket.IO after server is running
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
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

  // Socket.IO error handling
  io.engine.on("connection_error", (err) => {
    console.log("Connection error:", {
      code: err.code,
      message: err.message,
      context: err.context
    });
  });

  // Socket connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('connected', { status: 'ok' });
  });

  try {
    const supabaseConnected = await testConnection();
    if (!supabaseConnected) {
      console.error('Failed to connect to Supabase');
      process.exit(1);
    }
    
    await initializeDriveWatcher(io);
  } catch (error) {
    console.error('Service initialization failed:', error);
    process.exit(1);
  }
}).on('error', (error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Global error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 