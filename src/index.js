const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initializeDriveWatcher } = require('./services/driveService');
const { transcribeVideo } = require('./services/geminiService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Detailed CORS setup
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://gdrive-to-gemini-6yrtipfzr-roberts-projects-19fe2013.vercel.app'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Add error handling for socket connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
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