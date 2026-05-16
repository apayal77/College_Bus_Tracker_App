import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Radio } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import LiveTrackingMap from '../components/LiveTrackingMap';

const getSocketURL = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return 'https://college-bus-tracker-app.onrender.com';
};

const SOCKET_URL = getSocketURL();

interface BusUpdate {
  routeId: string;
  latitude: number;
  longitude: number;
  speed: number;
  routeName?: string;
  timestamp: number;
}

const LiveMonitor = () => {
  const [activeBuses, setActiveBuses] = useState<Record<string, BusUpdate>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const routeNamesRef = useRef<Record<string, string>>({});
  const allRoutesRef = useRef<Record<string, any>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const initMonitor = async () => {
      try {
        // 1. Check for missing Firebase Config
        if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
          console.error('[LiveMonitor] Firebase Environment Variables are MISSING!');
        }

        // 2. Fetch Route Data
        const routesSnap = await getDocs(collection(db, 'routes'));
        const names: Record<string, string> = {};
        const fullRoutes: Record<string, any> = {};
        routesSnap.forEach(doc => {
          const data = doc.data() as any;
          names[doc.id] = data.routeName;
          fullRoutes[doc.id] = data;
        });
        routeNamesRef.current = names;
        allRoutesRef.current = fullRoutes;

        // 3. Fetch Initial Active Trips
        const activeTripsSnap = await getDocs(query(collection(db, 'trips'), where('status', '==', 'active')));
        const initialBuses: Record<string, BusUpdate> = {};
        activeTripsSnap.forEach(doc => {
          const data = doc.data() as any;
          if (data.currentLocation) {
            initialBuses[data.routeId] = {
              routeId: data.routeId,
              latitude: data.currentLocation.latitude,
              longitude: data.currentLocation.longitude,
              speed: 0,
              timestamp: data.lastUpdate?.toMillis() || Date.now(),
              routeName: names[data.routeId] || data.routeId
            };
          }
        });
        setActiveBuses(initialBuses);
      } catch (error) {
        console.error('Error initializing monitor:', error);
      }
    };

    initMonitor();

    // 4. Socket Setup
    console.log(`[Socket] Connecting to: ${SOCKET_URL}`);
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log(`[Socket] Monitor connected to ${SOCKET_URL}`);
      setConnectionStatus('connected');
      socketRef.current?.emit('joinRoute', 'admin');
    });

    socketRef.current.on('disconnect', () => setConnectionStatus('disconnected'));

    socketRef.current.on('allBusesUpdate', (data: BusUpdate) => {
      setActiveBuses(prev => ({
        ...prev,
        [data.routeId]: {
          ...data,
          routeName: routeNamesRef.current[data.routeId] || data.routeId
        }
      }));
    });

    socketRef.current.on('driverStatus', (data: { routeId: string, online: boolean }) => {
      console.log(`[LiveMonitor] Driver status for ${data.routeId}: ${data.online ? 'ONLINE' : 'OFFLINE'}`);
      if (!data.online) {
        setActiveBuses(prev => {
          const newState = { ...prev };
          delete newState[data.routeId];
          return newState;
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Fleet Monitor</h1>
          <p className="text-slate-400 mt-1">Real-time tracking of all active bus routes.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border ${
            connectionStatus === 'connected' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' :
            connectionStatus === 'connecting' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
            'text-red-500 bg-red-500/10 border-red-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500 animate-ping' :
              connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
              'bg-red-500'
            }`}></span>
            {connectionStatus.toUpperCase()}
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-500 font-bold bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
            {Object.keys(activeBuses).length} BUSES ACTIVE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <LiveTrackingMap buses={activeBuses} routesData={allRoutesRef.current} />
        </div>

        <div className="card h-[500px] flex flex-col bg-slate-900/50 border-slate-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Radio size={18} className="text-blue-500" />
            Route Status
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {Object.keys(activeBuses).length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-500 text-sm italic">Waiting for bus updates...</p>
              </div>
            ) : (
              Object.values(activeBuses).map((bus) => (
                <div key={bus.routeId} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-white truncate mr-2">{bus.routeName}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">LIVE</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{bus.speed.toFixed(1)} km/h</span>
                    <span>{new Date(bus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
