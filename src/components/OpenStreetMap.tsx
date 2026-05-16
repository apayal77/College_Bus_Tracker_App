import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface OpenStreetMapProps {
  busLocation?: { lat: number, lng: number };
  routePath?: { lat: number, lng: number }[];
  studentStop?: { lat: number, lng: number };
}

export default function OpenStreetMap({ 
  busLocation = { lat: 16.65, lng: 74.27 }, 
  routePath = [], 
  studentStop 
}: OpenStreetMapProps) {
  const webViewRef = useRef<WebView>(null);

  // Update marker position via injectJavaScript for smooth performance
  useEffect(() => {
    if (busLocation && webViewRef.current) {
      const script = `window.updateBusLocation(${busLocation.lat}, ${busLocation.lng});`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [busLocation]);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Live tracking</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { padding: 0; margin: 0; }
          html, body, #map { height: 100%; width: 100vw; background: #0f172a; }
          .leaflet-tile { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: false }).setView([${busLocation.lat}, ${busLocation.lng}], 15);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);

          // 1. Bus Marker
          const busIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
          });
          let busMarker = L.marker([${busLocation.lat}, ${busLocation.lng}], { icon: busIcon }).addTo(map);

          // 2. Route Polyline
          const pathPoints = ${JSON.stringify(routePath.map(p => [p.lat, p.lng]))};
          if (pathPoints.length > 0) {
            // Main Route Path (Blue like Google Maps)
            L.polyline(pathPoints, { 
              color: '#3b82f6', 
              weight: 8, 
              opacity: 0.8,
              lineJoin: 'round'
            }).addTo(map);

            // Border for the path (White outline)
            L.polyline(pathPoints, { 
              color: '#ffffff', 
              weight: 12, 
              opacity: 0.3,
              lineJoin: 'round'
            }).addTo(map);
            
            // Auto-zoom to fit route
            map.fitBounds(pathPoints, { padding: [50, 50] });
          }

          // 3. Student Stop Marker
          const stopIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/1231/1231454.png',
            iconSize: [35, 35],
            iconAnchor: [17, 35]
          });
          ${studentStop ? `L.marker([${studentStop.lat}, ${studentStop.lng}], { icon: stopIcon }).addTo(map).bindPopup('Your Stop').openPopup();` : ''}

          // Real-time Update Function
          window.updateBusLocation = function(lat, lng) {
            const newLatLng = new L.LatLng(lat, lng);
            busMarker.setLatLng(newLatLng);
            map.panTo(newLatLng, { animate: true, duration: 1.0 });
          };
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView 
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  map: { flex: 1 }
});
