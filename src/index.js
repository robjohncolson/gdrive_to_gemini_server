const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDriveWatcher } = require('./services/driveService');
const { testConnection } = require('./services/supabaseService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Add ping endpoint first, before any middleware
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

// Start server immediately
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize services after server is running
const initializeServices = async () => {
  try {
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

    const supabaseConnected = await testConnection();
    if (!supabaseConnected) {
      console.error('Failed to connect to Supabase');
      return;
    }

    await initializeDriveWatcher(io);
  } catch (error) {
    console.error('Service initialization failed:', error);
  }
};

// Start service initialization after a short delay
setTimeout(initializeServices, 1000);

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