import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Text,
  Appbar,
  ActivityIndicator,
  Chip,
  Divider,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, RouteData, TripData } from '../../services/firestoreService';
import { LocationService } from '../../services/LocationService';
import { socketService } from '../../services/socketService';
import OpenStreetMap from '../../components/OpenStreetMap';
import BackgroundGeolocation from 'react-native-background-geolocation';
import AppIcon, { ICONS } from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import { dark } from '../../theme/colors';

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [assignedRoute, setAssignedRoute] = useState<RouteData | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { 
    fetchDashboardData(); 
    
    // Subscribe to real-time location updates for the UI/Map
    const unsubscribeLocation = LocationService.subscribeToLocation((lat, lng) => {
      setCurrentLocation({ lat, lng });
    });

    return () => {
      unsubscribeLocation();
    };
  }, [user]);

  // ── All data-fetching logic unchanged ─────────────────────────
  const fetchDashboardData = async () => {
    if (!user) {
      console.log('[DriverDashboard] No user in context yet.');
      return;
    }
    
    // Safety timeout to prevent infinite loading screen
    const timeout = setTimeout(() => {
      console.warn('[DriverDashboard] Data fetch timed out after 10s');
      setLoading(false);
    }, 10000);

    try {
      console.log('[DriverDashboard] Fetching data for user:', user.uid);
      setLoading(true);
      
      let currentRoute: RouteData | null = null;
      if (user.routeAssigned) {
        console.log('[DriverDashboard] Fetching routes for:', user.routeAssigned);
        const routes = await firestoreService.getRoutes();
        const assigned = user.routeAssigned?.toLowerCase().trim();
        
        console.log('[DriverDashboard] User assigned route:', assigned);

        const route = routes.find(r => {
          const nameMatch = r.routeName.toLowerCase().trim() === assigned;
          const idMatch = r.id?.toLowerCase().trim() === assigned;
          return nameMatch || idMatch;
        });

        if (route) { 
          console.log('[DriverDashboard] Assigned route found:', route.routeName);
          setAssignedRoute(route); 
          currentRoute = route; 
        } else {
          console.warn('[DriverDashboard] Assigned route NOT found in collection for:', assigned);
        }
      } else {
        console.log('[DriverDashboard] No route assigned to this user');
      }

      console.log('[DriverDashboard] Checking for active trip...');
      const trip = await firestoreService.getActiveTripByDriver(user.uid);
      setActiveTrip(trip);

      if (currentRoute) {
        console.log('[DriverDashboard] Setting up location service for route:', currentRoute.id);
        await LocationService.setup(user.uid, currentRoute.id!);
        
        console.log('[DriverDashboard] Connecting socket...');
        socketService.connect();
        socketService.joinRoute(currentRoute.id!);

        console.log('[DriverDashboard] Getting initial position...');
        BackgroundGeolocation.getCurrentPosition({ timeout: 10, maximumAge: 60000 })
          .then(loc => {
            console.log('[DriverDashboard] Initial position received');
            setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          })
          .catch(e => console.warn('[DriverDashboard] Could not get initial position:', e));
          
        if (trip) {
          console.log('[DriverDashboard] Trip is active, starting tracking');
          LocationService.startTracking();
        }
      }
    } catch (error) {
      console.error('[DriverDashboard] Error fetching dashboard data:', error);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      console.log('[DriverDashboard] Data fetch complete.');
    }
  };

  // ── Trip handlers — unchanged ──────────────────────────────────
  const handleStartTrip = async () => {
    if (!assignedRoute) { 
      Alert.alert('No Route', 'You must be assigned a route by an admin first.'); 
      return; 
    }
    try {
      console.log('[DriverDashboard] Starting trip for route:', assignedRoute.id, 'Driver:', user?.uid);
      setActionLoading(true);
      const hasPermission = await LocationService.checkPermissions();
      if (!hasPermission) { 
        console.warn('[DriverDashboard] Missing permissions');
        setActionLoading(false); 
        return; 
      }

      await firestoreService.startTrip({ 
        routeId: assignedRoute.id!, 
        driverId: user!.uid // This is now the phone number
      });

      console.log('[DriverDashboard] Trip doc created in Firestore');
      await LocationService.startTracking();
      socketService.emitTripStatus(assignedRoute.id!, 'started');
      
      Alert.alert('Trip Started', 'Have a safe journey!');
      fetchDashboardData();
    } catch (error) { 
      console.error('[DriverDashboard] Failed to start trip:', error);
      Alert.alert('Error', 'Failed to start trip. Check your internet.'); 
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    try {
      console.log('[DriverDashboard] Ending trip:', activeTrip.id);
      setActionLoading(true);
      await firestoreService.endTrip(activeTrip.id!);
      Alert.alert('Trip Ended', 'Trip records saved successfully.');
      await LocationService.stopTracking();
      // ✅ Emit the routeId (not the trip document id) so students receive the status update
      socketService.emitTripStatus(activeTrip.routeId, 'stopped');
      fetchDashboardData();
    } catch { Alert.alert('Error', 'Failed to end trip'); }
    finally { setActionLoading(false); }
  };

  // Convert stops to lat/lng points for the map polyline
  const getRoutePath = () => {
    if (!assignedRoute?.stops) return [];
    return assignedRoute.stops
      .map(stop => ({ lat: stop.latitude, lng: stop.longitude }))
      .filter(p => p.lat !== undefined && p.lng !== undefined);
  };

  const routePath = getRoutePath();

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={dark.driver} />
        <Text style={styles.loadingText}>Loading your route…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Appbar ────────────────────────────────────────────── */}
      <Appbar.Header style={styles.appbar} elevated>
        <View style={styles.appbarLeft}>
          <AppIcon {...ICONS.bus} size={20} color={dark.driver} />
          <Appbar.Content
            title={`Hello, ${user?.name || 'Driver'}`}
            titleStyle={styles.appbarTitle}
            subtitle={assignedRoute?.routeName || 'No Route Assigned'}
            subtitleStyle={[
              styles.appbarSub,
              { color: assignedRoute ? dark.driver : dark.textMuted },
            ]}
          />
        </View>
        <Appbar.Action icon="logout" color={dark.error} onPress={logout} size={22} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── GPS Status Chip ────────────────────────────────────── */}
        <View style={styles.chipsRow}>
          <Chip
            icon={activeTrip ? 'satellite-uplink' : 'satellite-off'}
            style={[styles.chip, { borderColor: activeTrip ? dark.driver : dark.error }]}
            textStyle={{ color: activeTrip ? dark.driver : dark.error, fontWeight: '700' }}>
            {activeTrip ? 'LIVE' : 'INACTIVE'}
          </Chip>
          {activeTrip && (
            <Chip
              icon="clock-outline"
              style={[styles.chip, { borderColor: dark.textMuted }]}
              textStyle={{ color: dark.textMuted }}>
              {new Date(activeTrip.startTime).toLocaleTimeString()}
            </Chip>
          )}
        </View>

        {/* ── Status Card ───────────────────────────────────────── */}
        <AppCard
          accentColor={activeTrip ? dark.driver : dark.border}
          elevation={2}
          style={styles.statusCard}>
          <View style={styles.statusRow}>
            <AppIcon
              name={activeTrip ? 'satellite-uplink' : 'satellite-off'}
              type="MaterialCommunityIcons"
              size={30}
              color={activeTrip ? dark.driver : dark.error}
            />
            <View style={styles.statusTextBlock}>
              <Text variant="labelMedium" style={styles.statusLabel}>Current Trip Status</Text>
              <Text
                variant="titleLarge"
                style={[styles.statusValue, { color: activeTrip ? dark.driver : dark.error }]}>
                {activeTrip ? 'LIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* ── Map ───────────────────────────────────────────────── */}
        <Surface style={styles.mapWrapper} elevation={2}>
          <OpenStreetMap
            busLocation={currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : (routePath[0] || { lat: 16.65, lng: 74.27 })}
            routePath={routePath}
          />
        </Surface>

        {/* ── Start / End Trip button ───────────────────────────── */}
        {!assignedRoute ? (
           <Surface style={styles.noRouteWarning} elevation={1}>
             <AppIcon {...ICONS.info} size={20} color={dark.error} />
             <Text style={styles.noRouteText}>No route assigned. Please contact Admin.</Text>
           </Surface>
        ) : (
          <AppButton
            label={activeTrip ? 'END TRIP' : 'START TRIP'}
            onPress={activeTrip ? handleEndTrip : handleStartTrip}
            icon={activeTrip ? 'stop-circle' : 'play-circle'}
            loading={actionLoading}
            disabled={actionLoading}
            variant={activeTrip ? 'danger' : 'success'}
            style={styles.actionBtn}
          />
        )}

        {/* ── Route Stops ───────────────────────────────────────── */}
        <AppCard accentColor={dark.driver} elevation={1} style={styles.stopsCard}>
          <View style={styles.sectionTitleRow}>
            <AppIcon {...ICONS.stopList} size={20} color={dark.textPrimary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Route Stops</Text>
          </View>
          <Divider style={styles.divider} />
          {assignedRoute?.stops.map((stop, index) => {
            const stopName = typeof stop === 'string' ? stop : (stop?.name || 'Unknown Stop');
            return (
              <View key={index} style={styles.stopRow}>
                <AppIcon {...ICONS.stop} size={16} color={dark.driver} />
                <Text variant="bodyMedium" style={styles.stopText}>{stopName}</Text>
              </View>
            );
          })}
          {!assignedRoute && (
            <Text variant="bodySmall" style={styles.emptyText}>
              Waiting for route assignment...
            </Text>
          )}
        </AppCard>

        {/* ── Trip History ──────────────────────────────────────── */}
        <AppCard accentColor={dark.textMuted} elevation={1} style={styles.historyCard}>
          <View style={styles.sectionTitleRow}>
            <AppIcon {...ICONS.tripHistory} size={20} color={dark.textPrimary} />
            <Text variant="titleMedium" style={styles.sectionTitle}>Recent Trips</Text>
          </View>
          <Text variant="bodySmall" style={styles.emptyText}>
            Trip recording is {activeTrip ? 'active' : 'ready'}.
          </Text>
        </AppCard>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  loaderContainer: {
    flex: 1,
    backgroundColor: dark.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: dark.textSecondary },

  appbar: { backgroundColor: dark.surface, paddingHorizontal: 4 },
  appbarLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 },
  appbarTitle: { color: dark.textPrimary, fontWeight: '800', fontSize: 16 },
  appbarSub: { fontSize: 12 },

  content: { padding: 16, paddingBottom: 48 },

  chipsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: { backgroundColor: 'transparent', borderWidth: 1.5 },

  statusCard: { marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusTextBlock: { flex: 1 },
  statusLabel: { color: dark.textSecondary, marginBottom: 2 },
  statusValue: { fontWeight: '800' },

  mapWrapper: {
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: dark.surface,
  },

  actionBtn: { marginBottom: 18 },

  noRouteWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: dark.error,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  noRouteText: { color: dark.error, fontWeight: '700', flex: 1 },

  stopsCard: { marginBottom: 16 },
  historyCard: { marginBottom: 32 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: dark.textPrimary, fontWeight: '700' },
  divider: { backgroundColor: dark.border, marginBottom: 12 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stopText: { color: dark.textSecondary },
  emptyText: { color: dark.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
});
