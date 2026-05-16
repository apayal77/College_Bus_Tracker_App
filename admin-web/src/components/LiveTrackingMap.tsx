import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet + React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Bus icon
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -10],
});

const stopIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1483/1483336.png', // Small pin
    iconSize: [20, 20],
    iconAnchor: [10, 20],
});

interface Stop {
  name: string;
  latitude: number;
  longitude: number;
}

interface BusLocation {
  routeId: string;
  latitude: number;
  longitude: number;
  routeName?: string;
  speed?: number;
}

interface LiveTrackingMapProps {
  buses: Record<string, BusLocation>;
  routesData?: Record<string, { stops: Stop[] }>;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ buses, routesData = {} }) => {
  const busArray = Object.values(buses).filter(b => b.latitude !== 0 && b.longitude !== 0);
  
  // Default center (Kolhapur) or first valid bus
  const center: [number, number] = busArray.length > 0 
    ? [busArray[0].latitude, busArray[0].longitude] 
    : [16.65, 74.27];

  return (
    <div className="h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />

        {/* 1. Render Route Paths & Stops */}
        {Object.entries(routesData).map(([routeId, data]: [string, any]) => {
           if (!data || !data.stops || data.stops.length < 2) return null;
           const positions = data.stops.map((s: any) => [s.latitude, s.longitude] as [number, number]);

           return (
             <React.Fragment key={`route-${routeId}`}>
                {/* Outer halo */}
                <Polyline positions={positions} color="white" weight={10} opacity={0.1} />
                {/* Main path */}
                <Polyline positions={positions} color="#3b82f6" weight={5} opacity={0.6} />
                
                {data.stops.map((stop: any, idx: number) => (
                  <Marker 
                    key={`stop-${routeId}-${idx}`} 
                    position={[stop.latitude, stop.longitude]} 
                    icon={stopIcon}
                  >
                    <Popup>Stop: {stop.name}</Popup>
                  </Marker>
                ))}
             </React.Fragment>
           );
        })}

        {/* 2. Render Active Buses */}
        {busArray.map((bus) => (
          <Marker 
            key={bus.routeId} 
            position={[bus.latitude, bus.longitude]} 
            icon={busIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2">
                <h3 className="font-bold text-slate-900">Route: {bus.routeName || bus.routeId}</h3>
                <p className="text-sm text-slate-600">Speed: {bus.speed?.toFixed(1) || 0} km/h</p>
                <p className="text-xs text-slate-400 mt-1">ID: {bus.routeId}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveTrackingMap;
