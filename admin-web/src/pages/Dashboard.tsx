import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Map as MapIcon, Bus, Radio } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import LiveTrackingMap from '../components/LiveTrackingMap';

const SOCKET_URL = 'https://college-bus-tracker-app.onrender.com'; // Admin web runs on the same machine as backend

interface BusUpdate {
  routeId: string;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
  routeName?: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    drivers: 0,
    routes: 0,
    activeTrips: 0
  });

  const [activeBuses, setActiveBuses] = useState<Record<string, BusUpdate>>({});
  const routeNamesRef = useRef<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const driverQuery = query(collection(db, 'users'), where('role', '==', 'driver'));
        const routesSnap = await getDocs(collection(db, 'routes'));
        
        const studentsSnap = await getDocs(studentQuery);
        const driversSnap = await getDocs(driverQuery);

        // Map route IDs to Names
        const names: Record<string, string> = {};
        routesSnap.forEach(doc => {
          names[doc.id] = doc.data().routeName;
        });
        routeNamesRef.current = names;

        // Fetch CURRENTLY ACTIVE TRIPS from Firestore to show immediately
        const activeTripsQuery = query(collection(db, 'trips'), where('status', '==', 'active'));
        const activeTripsSnap = await getDocs(activeTripsQuery);
        
        const initialBuses: Record<string, BusUpdate> = {};
        activeTripsSnap.forEach(doc => {
          const data = doc.data();
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

        setStats({
          students: studentsSnap.size,
          drivers: driversSnap.size,
          routes: routesSnap.size,
          activeTrips: activeTripsSnap.size
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchData();

    // Socket Integration
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    
    socketRef.current.on('connect', () => {
      console.log('Admin socket connected');
      socketRef.current?.emit('joinRoute', 'admin'); 
    });

    socketRef.current.on('allBusesUpdate', (data: BusUpdate) => {
      setActiveBuses(prev => {
        const name = routeNamesRef.current[data.routeId] || data.routeId;
        return {
          ...prev,
          [data.routeId]: {
            ...data,
            routeName: name
          }
        };
      });
    });

    // Handle drivers going offline
    socketRef.current.on('driverStatus', (data: { routeId: string, online: boolean }) => {
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

  const statCards = [
    { label: 'Total Students', value: stats.students, icon: <Users className="text-blue-500" />, color: 'blue' },
    { label: 'Active Drivers', value: stats.drivers, icon: <Bus className="text-emerald-500" />, color: 'emerald' },
    { label: 'Total Routes', value: stats.routes, icon: <MapIcon className="text-amber-500" />, color: 'amber' },
    { label: 'Live Buses', value: Object.keys(activeBuses).length, icon: <Radio className="text-red-500 animate-pulse" />, color: 'red' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Live Fleet Monitoring</h1>
        <p className="text-slate-400 mt-2">Real-time tracking of all active bus routes across the campus.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="card flex items-center justify-between border-slate-800 bg-slate-900/50">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">{card.label}</p>
              <h3 className="text-2xl font-bold text-white">{card.value}</h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-800">
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Live Map</h2>
            <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              LIVE UPDATES
            </div>
          </div>
          <LiveTrackingMap buses={activeBuses} />
        </div>

        <div className="card h-full flex flex-col">
          <h2 className="text-xl font-bold mb-6">Active Route Status</h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {Object.keys(activeBuses).length === 0 ? (
              <p className="text-slate-500 italic text-center mt-10">No buses are currently on road.</p>
            ) : (
              Object.values(activeBuses).map((bus) => (
                <div key={bus.routeId} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-white">{bus.routeName}</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase font-bold">Active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500">Speed</p>
                      <p className="text-slate-300 font-medium">{bus.speed.toFixed(1)} km/h</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Last Update</p>
                      <p className="text-slate-300 font-medium">{new Date(bus.timestamp).toLocaleTimeString()}</p>
                    </div>
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

export default Dashboard;
