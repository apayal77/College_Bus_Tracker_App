import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Radio, Activity } from 'lucide-react';
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

const formatDateTime = (raw: any) => {
  if (!raw) return '--:--';
  try {
    const d = typeof raw === 'string' 
      ? new Date(raw) 
      : typeof raw.toDate === 'function' 
        ? raw.toDate() 
        : new Date(raw.seconds * 1000);
        
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) + 
           ' (' + d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ')';
  } catch (e) {
    return '--:--';
  }
};

const LiveMonitor = () => {
  const [activeBuses, setActiveBuses] = useState<Record<string, BusUpdate>>({});
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const routeNamesRef = useRef<Record<string, string>>({});
  const allRoutesRef = useRef<Record<string, any>>({});
  const driversRef = useRef<Record<string, string>>({});
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

        // Fetch Drivers to resolve driverId -> name
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'driver')));
        const driversMap: Record<string, string> = {};
        usersSnap.forEach(doc => {
          const data = doc.data() as any;
          driversMap[doc.id] = data.name || data.phone || 'Driver';
        });
        driversRef.current = driversMap;

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

    // 5. Trip History Realtime Sync (fetches last 15 active/completed trips)
    const tripsQuery = query(
      collection(db, 'trips'),
      orderBy('startTime', 'desc'),
      limit(15)
    );

    const unsubscribeTrips = onSnapshot(tripsQuery, (snapshot) => {
      const tripsList: any[] = [];
      snapshot.forEach(doc => {
        tripsList.push({ id: doc.id, ...doc.data() });
      });
      setRecentTrips(tripsList);
    }, (error) => {
      console.error("Error listening to trips history:", error);
    });

    return () => {
      socketRef.current?.disconnect();
      unsubscribeTrips();
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
                    <span>{(bus.speed * 3.6).toFixed(1)} km/h</span>
                    <span>{new Date(bus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Trip History Section */}
      <div className="card bg-slate-900/50 border-slate-800 p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity size={22} className="text-emerald-500" />
            Trip Logs & History
          </h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700/50 font-semibold uppercase tracking-wider">
            Real-Time Updates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">End Time</th>
                <th className="py-3 px-4">Stops Visited</th>
                <th className="py-3 px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {recentTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    No recent trips logged.
                  </td>
                </tr>
              ) : (
                recentTrips.map((trip) => {
                  const routeName = routeNamesRef.current[trip.routeId] || trip.summary?.routeName || trip.routeId;
                  const driverName = driversRef.current[trip.driverId] || trip.driverId;
                  const isCompleted = trip.status === 'completed';
                  const visitedCount = trip.summary?.visitedCount ?? 0;
                  const totalStops = trip.summary?.totalStops ?? (allRoutesRef.current[trip.routeId]?.stops?.length || 0);
                  
                  let durationStr = '--';
                  if (trip.summary?.durationMs) {
                    const mins = Math.round(trip.summary.durationMs / 60000);
                    durationStr = `${mins} mins`;
                  } else if (trip.startTime && trip.status === 'active') {
                    const elapsed = Math.round((Date.now() - new Date(trip.startTime).getTime()) / 60000);
                    durationStr = elapsed > 0 ? `${elapsed} mins (live)` : '0 mins';
                  }

                  return (
                    <tr key={trip.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">{routeName}</td>
                      <td className="py-4 px-4 text-slate-300">{driverName}</td>
                      <td className="py-4 px-4">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs">{formatDateTime(trip.startTime)}</td>
                      <td className="py-4 px-4 text-slate-400 text-xs">
                        {isCompleted ? formatDateTime(trip.endTime) : <span className="text-slate-600">--</span>}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-300">
                        {trip.status === 'active' ? (
                          <span className="text-blue-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                            In Progress
                          </span>
                        ) : (
                          <span>
                            {visitedCount} / {totalStops} stops
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-300 font-medium">{durationStr}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
