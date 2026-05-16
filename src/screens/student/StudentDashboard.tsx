import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Appbar, ActivityIndicator, Chip, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import OpenStreetMap from '../../components/OpenStreetMap';
import { socketService } from '../../services/socketService';
import { firestoreService, RouteData } from '../../services/firestoreService';
import AppIcon, { ICONS } from '../../components/AppIcon';
import { dark } from '../../theme/colors';

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
    } else {
      setLoading(false);
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
      const assigned = user?.routeAssigned?.toLowerCase().trim();
      
      console.log('[StudentDashboard] User assigned route:', assigned);

      const route = routes.find(r => {
        const nameMatch = r.routeName.toLowerCase().trim() === assigned;
        const idMatch = r.id?.toLowerCase().trim() === assigned;
        return nameMatch || idMatch;
      });

      if (route) {
        console.log('[StudentDashboard] Found matching route:', route.routeName);
        setAssignedRoute(route);
        // ... socket logic unchanged ...

        const socket = socketService.connect();
        socketService.joinRoute(route.id!);

        socket?.on('connect', () => {
          setConnectionStatus('connected');
          socketService.joinRoute(route.id!); // Re-join on reconnect
        });
        socket?.on('disconnect', () => setConnectionStatus('disconnected'));

        socketService.subscribeToDriverStatus((status) => {
          setIsDriverOnline(status.online);
        });

        socketService.subscribeToTripStatus((data) => {
          console.log('[StudentDashboard] Trip status changed:', data.status);
          setIsDriverOnline(data.status === 'started');
          if (data.status === 'stopped') {
            setBusLocation(null);
          }
        });

        socketService.subscribeToLocation((data) => {
          setBusLocation({
            lat: data.latitude,
            lng: data.longitude,
            timestamp: data.timestamp || Date.now()
          });
          setIsDriverOnline(true);
          setIsStale(false);
        });
      }
    } catch (error) {
      console.error('Error connecting student dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert stops to lat/lng points for the map polyline
  const getRoutePath = () => {
    if (!assignedRoute?.stops) return [];
    return assignedRoute.stops
      .map(stop => {
        if (typeof stop === 'string') return null; 
        if (stop.latitude && stop.longitude) {
           return { lat: stop.latitude, lng: stop.longitude };
        }
        return null;
      })
      .filter(p => p !== null) as { lat: number, lng: number }[];
  };

  const getStudentStop = () => {
    const path = getRoutePath();
    return path.length > 0 ? path[path.length - 1] : undefined;
  };

  const getStatusColor = () => {
    if (connectionStatus !== 'connected') return dark.error;
    if (!isDriverOnline) return dark.warning;
    if (isStale) return dark.textMuted;
    return dark.success;
  };

  const getStatusText = () => {
    if (connectionStatus !== 'connected') return 'RECONNECTING...';
    if (!isDriverOnline) return 'BUS OFFLINE';
    if (isStale) return 'SIGNAL WEAK';
    return 'LIVE TRACKING';
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={dark.primary} />
        <Text style={styles.loadingText}>Fetching route data...</Text>
      </View>
    );
  }

  if (!user?.routeAssigned || !assignedRoute) {
    return (
      <SafeAreaView style={styles.safe}>
        <Appbar.Header style={styles.appbar} elevated>
          <Appbar.Content title={`Hello, ${user?.name}`} titleStyle={styles.appbarTitle} />
          <Appbar.Action icon="logout" color={dark.error} onPress={logout} />
        </Appbar.Header>
        <View style={styles.emptyContainer}>
          <AppIcon {...ICONS.info} size={64} color={dark.textMuted} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>No Route Assigned</Text>
          <Text variant="bodyMedium" style={styles.emptySub}>Please contact your administrator to assign you to a bus route.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const routePath = getRoutePath();
  const studentStop = getStudentStop();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Appbar ────────────────────────────────────────────── */}
      <Appbar.Header style={styles.appbar} elevated>
        <View style={styles.appbarLeft}>
          <AppIcon {...ICONS.liveTracking} size={20} color={dark.primary} />
          <Appbar.Content
            title={`Hello, ${user?.name || 'Student'}`}
            titleStyle={styles.appbarTitle}
            subtitle={`Route: ${assignedRoute?.routeName || 'Not Assigned'}`}
            subtitleStyle={styles.appbarSub}
          />
        </View>
        <Appbar.Action icon="logout" color={dark.error} onPress={logout} size={22} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <View style={styles.mapWrapper}>
          <OpenStreetMap
            busLocation={busLocation ? { lat: busLocation.lat, lng: busLocation.lng } : (routePath[0] || { lat: 16.65, lng: 74.27 })}
            routePath={routePath}
            studentStop={studentStop}
          />

          {/* Live Indicator Overlay */}
          <Surface style={styles.liveIndicator} elevation={4}>
            <AppIcon
              name={connectionStatus === 'connected' && isDriverOnline && !isStale ? 'signal' : 'signal-off'}
              type="MaterialCommunityIcons"
              size={14}
              color={getStatusColor()}
            />
            <Text variant="labelLarge" style={[styles.liveText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </Surface>
        </View>

        {/* ── Route Details ────────────────────────────────────── */}
        <View style={styles.detailsContainer}>
          <Surface style={styles.stopsCard} elevation={1}>
            <View style={styles.sectionTitleRow}>
              <AppIcon {...ICONS.stopList} size={18} color={dark.primary} />
              <Text variant="titleMedium" style={styles.sectionTitle}>Route Stops</Text>
            </View>
            <Divider style={styles.divider} />
            {assignedRoute.stops.map((stop, index) => {
              const stopName = typeof stop === 'string' ? stop : (stop?.name || 'Unknown Stop');
              return (
                <View key={index} style={styles.stopRow}>
                  <View style={styles.stopIndicator}>
                    <View style={[styles.stopDot, { backgroundColor: index === 0 ? dark.success : dark.primary }]} />
                    {index < assignedRoute.stops.length - 1 && <View style={styles.stopLine} />}
                  </View>
                  <Text variant="bodyMedium" style={styles.stopText}>{stopName}</Text>
                </View>
              );
            })}
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  loaderContainer: { flex: 1, backgroundColor: dark.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: dark.textSecondary },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  emptyTitle: { color: dark.textPrimary, fontWeight: 'bold' },
  emptySub: { color: dark.textSecondary, textAlign: 'center', lineHeight: 22 },

  appbar: { backgroundColor: dark.surface, paddingHorizontal: 4 },
  appbarLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 },
  appbarTitle: { color: dark.textPrimary, fontWeight: '800', fontSize: 16 },
  appbarSub: { color: dark.primaryLight, fontSize: 12 },

  content: { flex: 1 },
  mapWrapper: { height: 350, position: 'relative' },

  liveIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  liveText: { fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },

  detailsContainer: { padding: 16, paddingBottom: 40 },
  stopsCard: { backgroundColor: dark.surface, borderRadius: 16, padding: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { color: dark.textPrimary, fontWeight: 'bold' },
  divider: { backgroundColor: dark.border, marginBottom: 16 },
  
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 0 },
  stopIndicator: { alignItems: 'center', width: 20 },
  stopDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  stopLine: { width: 2, height: 30, backgroundColor: dark.border, position: 'absolute', top: 10 },
  stopText: { color: dark.textSecondary, paddingVertical: 10 },
});
