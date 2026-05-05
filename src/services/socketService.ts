import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://172.16.68.126:5000'; 
let socket: Socket | null = null;

export const socketService = {
  connect: () => {
    if (!socket) {
      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      socket.on('connect', () => {
        console.log('Connected to Socket server');
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket server:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket Connection Error:', error);
      });
    }
    return socket;
  },

  joinRoute: (routeId: string) => {
    if (socket) {
      socket.emit('joinRoute', routeId);
    }
  },

  registerDriver: (routeId: string) => {
    if (socket) {
      socket.emit('registerDriver', routeId);
    }
  },

  emitLocation: (data: { routeId: string; latitude: number; longitude: number; speed?: number }) => {
    if (socket) {
      socket.emit('locationUpdate', {
        ...data,
        timestamp: Date.now()
      });
    }
  },

  emitTripStatus: (routeId: string, status: 'started' | 'stopped') => {
    if (socket) {
      socket.emit('tripStatusUpdate', { routeId, status });
    }
  },

  subscribeToLocation: (callback: (location: any) => void) => {
    if (socket) {
      socket.off('routeLocationUpdate'); // Prevent multiple listeners
      socket.on('routeLocationUpdate', callback);
    }
  },

  subscribeToDriverStatus: (callback: (status: { online: boolean }) => void) => {
    if (socket) {
      socket.off('driverStatus');
      socket.on('driverStatus', callback);
    }
  },

  subscribeToTripStatus: (callback: (status: any) => void) => {
    if (socket) {
      socket.off('tripStatusChange');
      socket.on('tripStatusChange', callback);
    }
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};
