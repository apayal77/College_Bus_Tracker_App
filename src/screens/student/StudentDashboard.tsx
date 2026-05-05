import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import OpenStreetMap from '../../components/OpenStreetMap';
import { socketService } from '../../services/socketService';
import { firestoreService, RouteData } from '../../services/firestoreService';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [busLocation, setBusLocation] = useState<{ lat: number, lng: number, timestamp: number } | null>(null);
  const [assignedRoute, setAssignedRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const staleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user?.routeAssigned) {
      loadRouteAndConnect();
    }

    return () => {
      socketService.disconnect();
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
    };
  }, [user]);

  // Check for stale data every 10 seconds
  useEffect(() => {
    staleTimerRef.current = setInterval(() => {
      if (busLocation?.timestamp) {
        const diff = Date.now() - busLocation.timestamp;
        setIsStale(diff > 60000); // Stale if no update for 60 seconds
      }
    }, 10000);

    return () => {
      if (staleTimerRef.current) clearInterval(staleTimerRef.current);
    };
  }, [busLocation]);

  const loadRouteAndConnect = async () => {
    try {
      setLoading(true);
      const routes = await firestoreService.getRoutes();
      const route = routes.find(r => r.routeName === user?.routeAssigned || r.id === user?.routeAssigned);

      if (route) {
        setAssignedRoute(route);

        const socket = socketService.connect();
        socketService.joinRoute(route.id!);

        socket?.on('connect', () => {
          setConnectionStatus('connected');
          socketService.joinRoute(route.id!); // Re-join on reconnect
        });
        socket?.on('disconnect', () => setConnectionStatus('disconnected'));

        // Listen for Driver Status
        socketService.subscribeToDriverStatus((status) => {
          setIsDriverOnline(status.online);
        });

        // Listen for Location Updates
        socketService.subscribeToLocation((data) => {
          setBusLocation({
            lat: data.latitude,
            lng: data.longitude,
            timestamp: data.timestamp || Date.now()
          });
          setIsDriverOnline(true); // If we get location, driver is definitely online
          setIsStale(false);
        });
      }
    } catch (error) {
      console.error('Error connecting student dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock Data for Demo
  const mockPath = [
    { lat: 16.6500, lng: 74.2700 },
    { lat: 16.6510, lng: 74.2710 },
    { lat: 16.6520, lng: 74.2720 },
    { lat: 16.6530, lng: 74.2730 },
  ];
  const mockStop = { lat: 16.6530, lng: 74.2730 };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  const getStatusColor = () => {
    if (connectionStatus !== 'connected') return '#f87171';
    if (!isDriverOnline) return '#fbbf24';
    if (isStale) return '#94a3b8';
    return '#4ade80';
  };

  const getStatusText = () => {
    if (connectionStatus !== 'connected') return 'RECONNECTING...';
    if (!isDriverOnline) return 'BUS OFFLINE';
    if (isStale) return 'SIGNAL WEAK';
    return 'LIVE TRACKING';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'Student'} 👋</Text>
          <Text style={styles.route}>Route: {assignedRoute?.routeName || 'Not Assigned'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.mapContainer}>
        <OpenStreetMap
          busLocation={busLocation ? { lat: busLocation.lat, lng: busLocation.lng } : mockPath[0]}
          routePath={mockPath}
          studentStop={mockStop}
        />

        {/* Live Indicator Overlay */}
        <View style={[styles.liveIndicator, { borderColor: getStatusColor() }]}>
          <View style={[styles.liveDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.liveText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {isStale && (
          <View style={styles.staleWarning}>
            <Text style={styles.staleText}>Location hasn't updated in a while</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loaderContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  greeting: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  route: { fontSize: 13, color: '#60a5fa', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  mapContainer: { flex: 1, position: 'relative' },
  liveIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  liveText: { fontSize: 11, fontWeight: 'bold' },
  staleWarning: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  staleText: { color: '#94a3b8', fontSize: 12 },
});
