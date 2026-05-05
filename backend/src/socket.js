const { Server } = require('socket.io');
const { sendNotificationToRoute } = require('./services/notificationService');
const admin = require('firebase-admin');

let io;
const routeStates = new Map(); // Stores { lastLocation: {}, driverSocketId: null, stops: [] }
const socketToRoute = new Map(); 
const notifiedStudents = new Set(); // To prevent spam: "tripId_studentId"

// Haversine formula to calculate distance in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on('connection', (socket) => {
    socket.on('joinRoute', (routeId) => {
      socket.join(routeId);
      if (routeStates.has(routeId)) {
        const state = routeStates.get(routeId);
        if (state.lastLocation) socket.emit('routeLocationUpdate', state.lastLocation);
      }
    });

    socket.on('registerDriver', async (routeId) => {
      socket.join(routeId);
      socketToRoute.set(socket.id, routeId);

      // Fetch route stops from Firestore
      const routeDoc = await admin.firestore().collection('routes').doc(routeId).get();
      const stops = routeDoc.exists ? routeDoc.data().stops || [] : [];

      if (!routeStates.has(routeId)) {
        routeStates.set(routeId, { lastLocation: null, driverSocketId: socket.id, stops });
      } else {
        const state = routeStates.get(routeId);
        state.driverSocketId = socket.id;
        state.stops = stops;
      }
      
      io.to(routeId).emit('driverStatus', { online: true });
    });

    socket.on('locationUpdate', async (data) => {
      const { routeId, latitude, longitude, speed } = data;
      const update = { latitude, longitude, speed, timestamp: Date.now(), routeId };

      if (routeStates.has(routeId)) {
        const state = routeStates.get(routeId);
        state.lastLocation = update;

        // Proximity check for "Bus Near Stop" (within 500m)
        state.stops.forEach(async (stop) => {
          const dist = getDistance(latitude, longitude, stop.latitude, stop.longitude);
          if (dist < 500) {
             const notificationKey = `${routeId}_${stop.name}`;
             if (!notifiedStudents.has(notificationKey)) {
                sendNotificationToRoute(
                  routeId, 
                  'Bus Nearby! 🚌', 
                  `The bus is approaching ${stop.name}. Be ready!`
                );
                notifiedStudents.add(notificationKey);
                setTimeout(() => notifiedStudents.delete(notificationKey), 30 * 60 * 1000);
             }
          }
        });
      }

      // Broadcast to specific route room
      io.to(routeId).emit('routeLocationUpdate', update);
      
      // NEW: Also broadcast to 'admin' room for global monitoring
      io.to('admin').emit('allBusesUpdate', update);
    });

    socket.on('disconnect', () => {
      const routeId = socketToRoute.get(socket.id);
      if (routeId) {
        const state = routeStates.get(routeId);
        if (state && state.driverSocketId === socket.id) {
          state.driverSocketId = null;
          io.to(routeId).emit('driverStatus', { online: false });
        }
      }
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
