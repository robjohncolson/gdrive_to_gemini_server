const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Add ping endpoint first, before any middleware or imports
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

// Start server immediately
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Delay loading services that might exit the process
setTimeout(async () => {
  try {
    const { initializeDriveWatcher } = require('./services/driveService');
    const { testConnection } = require('./services/supabaseService');
    
    // Initialize Socket.IO after server is running
    const io = new Server(server, {
      cors: {
        origin: [
          "https://gdrive-to-gemini-5srbzrkqy-roberts-projects-19fe2013.vercel.app",
          "https://gdrive-to-gemini.vercel.app",
          "http://localhost:5173"
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Initialize services
    const supabaseConnected = await testConnection();
    if (!supabaseConnected) {
      console.error('Failed to connect to Supabase');
    } else {
      await initializeDriveWatcher(io);
    }
  } catch (error) {
    console.error('Service initialization failed:', error);
  }
}, 1000);

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 