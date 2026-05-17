import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// ── Custom Icons ──────────────────────────────────────────────
const busIcon = new L.DivIcon({
  html: `<div style="
    width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#3b82f6,#1d4ed8);
    border:3px solid #fff;font-size:20px;
    box-shadow:0 0 0 4px rgba(59,130,246,0.35),0 4px 14px rgba(0,0,0,0.5);
  ">🚌</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -44],
});

const makeStopIcon = (label: string, bg: string, pulse = false) =>
  new L.DivIcon({
    html: `<div style="
      width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      background:${bg};color:#fff;font-size:10px;font-weight:800;
      border:2px solid rgba(255,255,255,0.6);
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      ${pulse ? 'animation:pulse 2s infinite;' : ''}
    ">${label}</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
  });

interface Stop { name: string; latitude: number; longitude: number; }

// Predefined modern high-contrast color palettes for routes
const ROUTE_PALETTES = [
  { main: '#2563eb', glow: '#3b82f6', core: '#06b6d4' }, // Premium Royal Blue
  { main: '#059669', glow: '#10b981', core: '#34d399' }, // Vibrant Emerald Green
  { main: '#d97706', glow: '#f59e0b', core: '#fbbf24' }, // Amber / Gold
  { main: '#7c3aed', glow: '#8b5cf6', core: '#c084fc' }, // Electric Purple
  { main: '#db2777', glow: '#ec4899', core: '#f472b6' }, // Deep Rose Pink
  { main: '#0891b2', glow: '#06b6d4', core: '#22d3ee' }, // Tech Teal
  { main: '#ea580c', glow: '#f97316', core: '#fdba74' }  // Bright Orange
];

const getRoutePalette = (routeId: string, routeName?: string) => {
  const identifier = routeName || routeId || '';
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % ROUTE_PALETTES.length;
  return ROUTE_PALETTES[idx];
};

// ── Auto-fit map to active buses & stops ──────────────────────
function AutoFit({ buses, routesData = {} }: { buses: Record<string, BusLocation>; routesData?: Record<string, { stops: Stop[] }> }) {
  const map = useMap();
  const busArray = Object.values(buses).filter(
    b => b && typeof b.latitude === 'number' && typeof b.longitude === 'number' && b.latitude !== 0 && b.longitude !== 0 && !isNaN(b.latitude) && !isNaN(b.longitude)
  );

  useEffect(() => {
    const coords: [number, number][] = [];

    // Add active buses
    busArray.forEach(b => coords.push([b.latitude, b.longitude]));

    // Add route stops
    Object.values(routesData).forEach(r => {
      if (r?.stops) {
        r.stops.forEach(s => {
          if (s && s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude) && s.latitude !== 0 && s.longitude !== 0) {
            coords.push([s.latitude, s.longitude]);
          }
        });
      }
    });

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busArray.length, Object.keys(routesData).length]);

  return null;
}

// ── Types ─────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────
const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ buses, routesData = {} }) => {
  const busArray  = Object.values(buses).filter(b => b.latitude !== 0 && b.longitude !== 0 && !isNaN(b.latitude) && !isNaN(b.longitude));
  const center: [number, number] = busArray.length > 0
    ? [busArray[0].latitude, busArray[0].longitude]
    : [16.65, 74.27];

  return (
    <div className="h-[350px] sm:h-[450px] md:h-[500px] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,.7); }
          70%       { box-shadow: 0 0 0 10px rgba(245,158,11,0); }
        }
        .leaflet-popup-content-wrapper { background:#1e293b; color:#f1f5f9; border:1px solid #334155; border-radius:10px; }
        .leaflet-popup-tip { background:#1e293b; }
      `}</style>

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AutoFit buses={buses} routesData={routesData} />

        {/* ── Route Paths (Direct Sequential Connections) ────── */}
        {Object.entries(routesData).map(([routeId, data]: [string, any]) => {
          const stops: Stop[] = (data?.stops || []).filter((s: any) => s.latitude && s.longitude);
          const stopCoords = stops.map(s => [s.latitude, s.longitude] as [number, number]);

          if (stopCoords.length < 2) return null;

          const palette = getRoutePalette(routeId, data?.routeName);

          return (
            <React.Fragment key={`route-${routeId}`}>
              {/* Outer glowing path */}
              <Polyline positions={stopCoords} color={palette.glow} weight={12} opacity={0.15} lineJoin="round" lineCap="round" />
              {/* Solid border path */}
              <Polyline positions={stopCoords} color="#ffffff" weight={7} opacity={0.3} lineJoin="round" lineCap="round" />
              {/* Main colored transit path */}
              <Polyline positions={stopCoords} color={palette.main} weight={4} opacity={0.95} lineJoin="round" lineCap="round" />
              {/* Inner glowing electric core */}
              <Polyline positions={stopCoords} color={palette.core} weight={1.5} opacity={0.9} lineJoin="round" lineCap="round" />

              {/* Stop Markers */}
              {stops.map((stop, idx) => {
                const isFirst = idx === 0;
                const isLast  = idx === stops.length - 1;
                const bg      = isFirst ? '#10b981' : isLast ? '#ef4444' : palette.main;
                const icon    = makeStopIcon(String(idx + 1), bg);
                return (
                  <Marker key={`stop-${routeId}-${idx}`} position={[stop.latitude, stop.longitude]} icon={icon}>
                    <Popup>
                      <b>{stop.name}</b>
                      {isFirst && <><br /><span style={{ color: '#10b981' }}>🟢 Start</span></>}
                      {isLast  && <><br /><span style={{ color: '#ef4444' }}>🔴 End</span></>}
                    </Popup>
                  </Marker>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* ── Live Bus Markers ──────────────────────────────── */}
        {busArray.map(bus => (
          <Marker key={bus.routeId} position={[bus.latitude, bus.longitude]} icon={busIcon}>
            <Popup>
              <div style={{ padding: '4px 0' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  🚌 {bus.routeName || bus.routeId}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Speed: {bus.speed ? (bus.speed * 3.6).toFixed(1) : '0'} km/h
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {bus.latitude.toFixed(5)}, {bus.longitude.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveTrackingMap;
