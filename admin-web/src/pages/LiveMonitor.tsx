import React, { useEffect, useState, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Radio } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import LiveTrackingMap from '../components/LiveTrackingMap';

const SOCKET_URL = 'http://localhost:5000';

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
  const [routeNames, setRouteNames] = useState<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchRouteNames = async () => {
      const routesSnap = await getDocs(collection(db, 'routes'));
      const names: Record<string, string> = {};
      routesSnap.forEach(doc => {
        names[doc.id] = doc.data().routeName;
      });
      setRouteNames(names);
    };

    fetchRouteNames();

    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('joinRoute', 'admin');

    socketRef.current.on('allBusesUpdate', (data: BusUpdate) => {
      setActiveBuses(prev => ({
        ...prev,
        [data.routeId]: {
          ...data,
          routeName: routeNames[data.routeId] || data.routeId
        }
      }));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [routeNames]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Live Fleet Monitor</h1>
          <p className="text-slate-400 mt-1">Real-time tracking of all active bus routes.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          {Object.keys(activeBuses).length} BUSES ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <LiveTrackingMap buses={activeBuses} />
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
