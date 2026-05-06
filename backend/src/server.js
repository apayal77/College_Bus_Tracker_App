const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { initFirebase } = require('./config/firebase');
const { initSocket } = require('./socket');

dotenv.config();

// Initialize Firebase Admin
initFirebase();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: "*",
}));
app.use(express.json());

// Socket setup
initSocket(server);

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Bus Tracker API is healthy' });
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

