import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Map as MapIcon, Bus, Activity } from 'lucide-react';
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
  timestamp: number;
  routeName?: string;
}

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="card flex items-center justify-between border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all">
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white">{value}</h3>
    </div>
    <div className={`p-4 rounded-2xl bg-${color}-500/10`}>
      {icon}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    students: 0,
    drivers: 0,
    routes: 0,
  });

  const [activeBuses, setActiveBuses] = useState<Record<string, BusUpdate>>({});
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Fetch Stats and initial data
    const fetchInitialData = async () => {
      try {
        const [studentSnap, driverSnap, routeSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'driver'))),
          getDocs(collection(db, 'routes'))
        ]);
        
        setStats({
          students: studentSnap.size,
          drivers: driverSnap.size,
          routes: routeSnap.size,
        });
        setLoading(false);
      } catch (err) {
        console.error("Initial fetch error:", err);
        setLoading(false);
      }
    };

    fetchInitialData();

    // 2. Real-time Firestore listeners
    const unsubRoutes = onSnapshot(collection(db, 'routes'), (snapshot) => {
      setRoutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Socket.io Integration
    try {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socketRef.current.on('connect', () => {
        socketRef.current?.emit('join-admin');
      });

      socketRef.current.on('updateLocation', (data: BusUpdate) => {
        if (data.latitude && data.longitude) {
          setActiveBuses(prev => ({
            ...prev,
            [data.routeId]: data
          }));
        }
      });

      socketRef.current.on('busStopped', (data: { routeId: string }) => {
        setActiveBuses(prev => {
          const newState = { ...prev };
          delete newState[data.routeId];
          return newState;
        });
      });
    } catch (err) {
      console.error("Socket error:", err);
    }

    return () => {
      socketRef.current?.disconnect();
      unsubRoutes();
    };
  }, []);

  const busEntries = Object.entries(activeBuses);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Initializing System...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">System Overview</h1>
          <p className="text-slate-400 mt-1 font-medium flex items-center gap-2">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             {busEntries.length} Buses Currently Active
          </p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/50 text-[10px] font-black uppercase tracking-tighter text-slate-500">
           Network: <span className={SOCKET_URL.includes('localhost') ? 'text-amber-500' : 'text-emerald-500'}>
             {SOCKET_URL.includes('localhost') ? 'Development' : 'Cloud Production'}
           </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Students" value={stats.students} icon={<Users className="text-blue-400" />} color="blue" />
        <StatCard title="Active Trips" value={busEntries.length} icon={<Bus className="text-emerald-400" />} color="emerald" />
        <StatCard title="Routes" value={routes.length} icon={<MapIcon className="text-amber-400" />} color="amber" />
        <StatCard title="Drivers" value={stats.drivers} icon={<Users className="text-rose-400" />} color="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 card p-0 overflow-hidden h-[350px] sm:h-[450px] md:h-[550px] border-slate-700/50 shadow-2xl relative">
          <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-full border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shadow-xl">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
             LIVE TRACKING ACTIVE
          </div>
          <LiveTrackingMap 
            buses={activeBuses} 
            routesData={routes.reduce((acc, r) => ({ ...acc, [r.id]: r }), {} as Record<string, any>)} 
          />
        </div>

        <div className="space-y-6">
          <div className="card h-full border-slate-700/50 flex flex-col">
            <h3 className="text-lg font-bold flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
              <Activity size={20} className="text-emerald-500" />
              Active Fleet
            </h3>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {busEntries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 px-4 text-center">
                   <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                      <Bus size={32} className="text-slate-600" />
                   </div>
                   <p className="text-slate-500 font-medium italic">No active trips detected.</p>
                </div>
              ) : (
                busEntries.map(([routeId, data]) => {
                  const route = routes.find(r => r.id === routeId);
                  return (
                    <div key={routeId} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 hover:border-emerald-500/40 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-lg">
                        <Bus size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-100 truncate">{route?.routeName || 'Unknown Route'}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                           Speed: {data.speed ? (data.speed * 3.6).toFixed(1) : '0'} km/h
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                         <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase">Active</span>
                         <p className="text-[8px] text-slate-600 font-bold">{new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
