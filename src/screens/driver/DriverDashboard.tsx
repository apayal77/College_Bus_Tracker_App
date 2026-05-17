import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Appbar, ActivityIndicator, Chip, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, RouteData, TripData, TripSummary } from '../../services/firestoreService';
import { LocationService } from '../../services/LocationService';
import { socketService } from '../../services/socketService';
import OpenStreetMap, { MapStop } from '../../components/OpenStreetMap';
import BackgroundGeolocation from 'react-native-background-geolocation';
import AppIcon, { ICONS } from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import { dark } from '../../theme/colors';

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseDateSafe(raw: any): Date {
  if (!raw) return new Date();
  if (typeof raw === 'string') return new Date(raw);
  if (raw instanceof Date) return raw;
  if (typeof raw?.toDate === 'function') return raw.toDate();
  if (typeof raw?.toMillis === 'function') return new Date(raw.toMillis());
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  return new Date();
}

function formatTime(raw: any): string {
  if (!raw) return '--:--';
  try {
    const d = parseDateSafe(raw);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return '--:--'; }
}

export default function DriverDashboard() {
  const { user, logout } = useAuth();

  const [assignedRoute, setAssignedRoute] = useState<RouteData | null>(null);
  const [activeTrip, setActiveTrip]       = useState<TripData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [visitedStopIndices, setVisitedStopIndices] = useState<number[]>([]);
  const [tripHistory, setTripHistory] = useState<TripData[]>([]);

  const routeRef      = useRef<RouteData | null>(null);
  const visitedRef    = useRef<number[]>([]);
  const activeTripRef = useRef<TripData | null>(null);  // ref so proximity cb can read it
  const autoEndedRef  = useRef(false);                   // prevent double auto-end

  useEffect(() => {
    fetchDashboardData();
    const unsub = LocationService.subscribeToLocation((lat, lng) => {
      setCurrentLocation({ lat, lng });
      checkStopProximity(lat, lng);
    });
    return () => { unsub(); };
  }, [user]);

  const checkStopProximity = useCallback((lat: number, lng: number) => {
    // Normalize stops — guard against null/undefined entries from Firestore
    const stops = (routeRef.current?.stops ?? []).map((s: any, idx: number) => {
      if (s == null) return { name: `Stop ${idx + 1}`, latitude: undefined, longitude: undefined };
      if (typeof s === 'string') return { name: s, latitude: undefined, longitude: undefined };
      return {
        name: s?.name || `Stop ${idx + 1}`,
        latitude: typeof s?.latitude === 'number' ? s.latitude : undefined,
        longitude: typeof s?.longitude === 'number' ? s.longitude : undefined,
      };
    });

    stops.forEach((stop: any, index: number) => {
      if (!stop || visitedRef.current.includes(index)) return;
      if (stop.latitude === undefined || stop.longitude === undefined) return;

      const dist = haversineM(lat, lng, stop.latitude, stop.longitude);
      if (dist < 120) {
        const updated = [...visitedRef.current, index].sort((a, b) => a - b);
        visitedRef.current = updated;
        setVisitedStopIndices([...updated]);

        // Check if this was the LAST mappable stop — auto-end trip
        const mappableStops = stops.filter(
          (s: any) => s && s.latitude !== undefined && s.longitude !== undefined
        );
        const allVisited = mappableStops.every(
          (_: any, i: number) => updated.includes(stops.indexOf(mappableStops[i]))
        );
        if (allVisited && activeTripRef.current && !autoEndedRef.current) {
          autoEndedRef.current = true;
          Alert.alert(
            '🏁 Final Stop Reached!',
            'You have arrived at the last stop. The trip will end automatically.',
            [{ text: 'OK' }]
          );
          // Small delay for alert to show before ending
          setTimeout(() => handleEndTripAuto(), 1500);
        }
      }
    });
  }, []);

  // Called automatically when final stop reached — same logic as handleEndTrip
  const handleEndTripAuto = async () => {
    const trip = activeTripRef.current;
    const route = routeRef.current;
    if (!trip) return;
    try {
      // Safely parse trip start time using custom safe parser
      const startDate = parseDateSafe(trip.startTime);
      const startMs = startDate.getTime();
      const totalSt = (route?.stops ?? []).length;
      const summary = {
        routeName: route?.routeName,
        totalStops: totalSt,
        visitedStops: visitedRef.current,
        visitedCount: visitedRef.current.length,
        durationMs: startMs > 0 ? Date.now() - startMs : undefined,
      };
      
      // Stop tracking and emit status update instantly
      await LocationService.stopTracking();
      socketService.emitTripStatus(trip.routeId, 'stopped');
      
      // Update database status
      await firestoreService.endTrip(trip.id!, summary);
      
      // Reset local state instantly so UI updates without any delay
      setActiveTrip(null);
      activeTripRef.current = null;
      setVisitedStopIndices([]);
      visitedRef.current = [];
      autoEndedRef.current = false;
      
      fetchDashboardData();
    } catch (e) {
      console.error('[DriverDashboard] autoEndTrip error:', e);
    }
  };


  const fetchDashboardData = async () => {
    if (!user) return;
    const timeout = setTimeout(() => setLoading(false), 10_000);
    try {
      setLoading(true);
      let currentRoute: RouteData | null = null;
      if (user.routeAssigned) {
        const routes  = await firestoreService.getRoutes();
        const assigned = user.routeAssigned.toLowerCase().trim();
        const route    = routes.find(r =>
          r.routeName.toLowerCase().trim() === assigned ||
          r.id?.toLowerCase().trim()       === assigned
        );
        if (route) {
          setAssignedRoute(route);
          routeRef.current = route;
          currentRoute = route;
        } else {
          setAssignedRoute(null);
          routeRef.current = null;
        }
      } else {
        setAssignedRoute(null);
        routeRef.current = null;
      }

      const trip = await firestoreService.getActiveTripByDriver(user.uid);
      setActiveTrip(trip);
      activeTripRef.current = trip;
      if (!trip) autoEndedRef.current = false; // reset flag when no active trip

      // Load recent trip history
      const history = await firestoreService.getTripHistoryByDriver(user.uid);
      setTripHistory(history);

      if (currentRoute) {
        await LocationService.setup(user.uid, currentRoute.id!);
        socketService.connect();
        socketService.joinRoute(currentRoute.id!);

        // 1. Get initial position safely — catch busy/timeout error 499
        try {
          const loc = await BackgroundGeolocation.getCurrentPosition({ timeout: 15, maximumAge: 60_000 });
          setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (e) {
          console.warn('[DriverDashboard] Initial GPS check skipped/busy (error 499):', e);
        }

        // 2. Resume tracking safely if trip is active — catch any start tracking errors
        if (trip) {
          try {
            await LocationService.startTracking();
          } catch (e) {
            console.warn('[DriverDashboard] Tracking resume failed:', e);
          }
        }
      }

    } catch (e) {
      console.error('[DriverDashboard]', e);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!assignedRoute) { Alert.alert('No Route', 'You must be assigned a route first.'); return; }
    try {
      setActionLoading(true);
      const ok = await LocationService.checkPermissions();
      if (!ok) return;

      // Start the trip and get the new trip ID
      const newTripId = await firestoreService.startTrip({ routeId: assignedRoute.id!, driverId: user!.uid });
      
      // Create local activeTrip state instantly for timezone-perfect synchronization
      const newTrip: TripData = {
        id: newTripId,
        routeId: assignedRoute.id!,
        driverId: user!.uid,
        status: 'active',
        startTime: new Date().toISOString(),
      };
      
      setActiveTrip(newTrip);
      activeTripRef.current = newTrip;
      autoEndedRef.current = false;
      setVisitedStopIndices([]);
      visitedRef.current = [];

      await LocationService.startTracking();
      socketService.emitTripStatus(assignedRoute.id!, 'started');
      
      Alert.alert('Trip Started 🚌', 'Have a safe journey!');
      fetchDashboardData();
    } catch (e) {
      console.error('[DriverDashboard] startTrip error:', e);
      Alert.alert('Error', 'Failed to start trip.');
    } finally {
      setActionLoading(false);
    }
  };


  const handleEndTrip = async () => {
    if (!activeTrip) return;
    try {
      setActionLoading(true);

      // Build summary safely using our robust parser
      const startDate = parseDateSafe(activeTrip.startTime);
      const startMs = startDate.getTime();
      const summary: TripSummary = {
        routeName: assignedRoute?.routeName,
        totalStops: stops.length,
        visitedStops: visitedStopIndices,
        visitedCount: visitedStopIndices.length,
        durationMs: startMs > 0 ? Date.now() - startMs : undefined,
      };

      // Stop tracking and emit status update instantly
      await LocationService.stopTracking();
      socketService.emitTripStatus(activeTrip.routeId, 'stopped');
      
      // Update database status
      await firestoreService.endTrip(activeTrip.id!, summary);

      // Reset local state instantly so UI updates without any delay
      setActiveTrip(null);
      activeTripRef.current = null;
      setVisitedStopIndices([]);
      visitedRef.current = [];
      autoEndedRef.current = false;

      const dur = summary.durationMs
        ? `${Math.round(summary.durationMs / 60000)} min`
        : '';
      Alert.alert(
        'Trip Ended 🏁',
        `Visited ${summary.visitedCount}/${summary.totalStops} stops.${dur ? ` Duration: ${dur}` : ''} Records saved.`
      );
      fetchDashboardData();
    } catch (e) {
      console.error('[DriverDashboard] endTrip error:', e);
      Alert.alert('Error', 'Failed to end trip');
    } finally {
      setActionLoading(false);
    }
  };


  const getNormalizedStops = () => {
    return (assignedRoute?.stops ?? []).map((s, idx) => {
      if (typeof s === 'string') {
        return { name: s, latitude: undefined, longitude: undefined };
      }
      return {
        name: s?.name || `Stop ${idx + 1}`,
        latitude: s?.latitude,
        longitude: s?.longitude
      };
    });
  };

  const stops = getNormalizedStops();
  const mapStops = stops.filter(s => s.latitude !== undefined && s.longitude !== undefined) as MapStop[];
  const centerLoc = currentLocation
    ?? (mapStops[0] ? { lat: mapStops[0].latitude, lng: mapStops[0].longitude } : { lat: 16.65, lng: 74.27 });
  const nextStopIdx = visitedStopIndices.length > 0
    ? Math.max(...visitedStopIndices) + 1
    : (activeTrip ? 0 : -1);

  if (loading) {
    return (
      <View style={st.loader}>
        <ActivityIndicator size="large" color={dark.driver} />
        <Text style={st.loaderTxt}>Loading your route…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* Appbar */}
      <Appbar.Header style={st.appbar} elevated>
        <View style={st.appbarLeft}>
          <AppIcon {...ICONS.bus} size={20} color={dark.driver} />
          <Appbar.Content
            title={`Hello, ${user?.name || 'Driver'}`}
            titleStyle={st.appbarTitle}
            subtitle={assignedRoute?.routeName || 'No Route Assigned'}
            subtitleStyle={[st.appbarSub, { color: assignedRoute ? dark.driver : dark.textMuted }]}
          />
        </View>
        <Appbar.Action icon="logout" color={dark.error} onPress={logout} size={22} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={st.content}>
        {/* Status chips */}
        <View style={st.chipsRow}>
          <Chip
            icon={activeTrip ? 'satellite-uplink' : 'satellite-off'}
            style={[st.chip, { borderColor: activeTrip ? dark.driver : dark.error }]}
            textStyle={{ color: activeTrip ? dark.driver : dark.error, fontWeight: '700' }}>
            {activeTrip ? 'LIVE' : 'INACTIVE'}
          </Chip>
          {activeTrip && (
            <Chip
              icon="clock-start"
              style={[st.chip, { borderColor: dark.textMuted }]}
              textStyle={{ color: dark.textMuted }}>
              Started {formatTime(activeTrip.startTime)}
            </Chip>
          )}
          {activeTrip && visitedStopIndices.length > 0 && (
            <Chip
              icon="check-circle"
              style={[st.chip, { borderColor: dark.success }]}
              textStyle={{ color: dark.success }}>
              {visitedStopIndices.length}/{stops.length} Stops
            </Chip>
          )}
        </View>

        {/* Route Assignment Banner */}
        {assignedRoute && (
          <Surface style={st.assignmentBanner} elevation={1}>
            <View style={st.bannerHeader}>
              <AppIcon name="checkbox-marked-circle-outline" type="MaterialCommunityIcons" size={22} color={dark.success} />
              <Text variant="titleMedium" style={st.bannerTitle}>Route Assigned!</Text>
            </View>
            <Text style={st.bannerText}>
              Route <Text style={st.bannerRouteName}>{assignedRoute.routeName}</Text> has been assigned to you.
            </Text>
          </Surface>
        )}

        {/* Map */}
        <Surface style={st.mapWrapper} elevation={2}>
          <OpenStreetMap
            busLocation={centerLoc}
            stops={mapStops}
            visitedStopIndices={visitedStopIndices}
            mode="driver"
          />
        </Surface>

        {/* Action Button */}
        {!assignedRoute ? (
          <Surface style={st.noRoute} elevation={1}>
            <AppIcon {...ICONS.info} size={20} color={dark.error} />
            <Text style={st.noRouteTxt}>No route assigned. Please contact Admin.</Text>
          </Surface>
        ) : (
          <AppButton
            label={activeTrip ? 'END TRIP' : 'START TRIP'}
            onPress={activeTrip ? handleEndTrip : handleStartTrip}
            icon={activeTrip ? 'stop-circle' : 'play-circle'}
            loading={actionLoading}
            disabled={actionLoading}
            variant={activeTrip ? 'danger' : 'success'}
            style={st.actionBtn}
          />
        )}

        {/* Route Progress Card */}
        <AppCard accentColor={dark.driver} elevation={1} style={st.stopsCard}>
          <View style={st.sectionRow}>
            <AppIcon {...ICONS.stopList} size={20} color={dark.textPrimary} />
            <Text variant="titleMedium" style={st.sectionTitle}>Route Progress</Text>
          </View>
          <Divider style={st.divider} />

          {stops.length === 0 ? (
            <Text style={st.emptyTxt}>No stops added to this route yet.</Text>
          ) : (
            stops.map((stop, index) => {
              const visited  = visitedStopIndices.includes(index);
              const isNext   = !visited && index === nextStopIdx;
              const isFirst  = index === 0;
              const isLast   = index === stops.length - 1;
              const dotColor = visited ? dark.success : isNext ? dark.primary : dark.border;

              return (
                <View key={index} style={st.stopRow}>
                  {/* Spine */}
                  <View style={st.spine}>
                    <View style={[
                      st.dot,
                      { backgroundColor: dotColor, borderColor: visited ? dark.success : isNext ? dark.primaryLight : dark.border },
                      isNext && st.dotPulse,
                    ]}>
                      {visited && <Text style={st.dotCheck}>✓</Text>}
                      {!visited && <Text style={[st.dotNum, { color: isNext ? '#fff' : dark.textMuted }]}>{index + 1}</Text>}
                    </View>
                    {index < stops.length - 1 && (
                      <View style={[st.line, { backgroundColor: visited ? dark.success : dark.border }]} />
                    )}
                  </View>

                  {/* Label */}
                  <View style={st.stopLabel}>
                    <Text style={[
                      st.stopName,
                      visited && st.visitedText,
                      isNext  && st.nextText,
                    ]}>
                      {stop.name}
                      {isFirst ? '  🟢' : isLast ? '  🔴' : ''}
                    </Text>
                    <Text style={st.stopMeta}>
                      {visited ? '✅ Reached' : isNext ? '▶ Next Stop' : '⏳ Upcoming'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </AppCard>

        {/* Trip History Card */}
        {tripHistory.length > 0 && (
          <AppCard accentColor={dark.textMuted} elevation={1} style={[st.stopsCard, { marginTop: 4 }]}>
            <View style={st.sectionRow}>
              <AppIcon name="history" type="MaterialCommunityIcons" size={20} color={dark.textPrimary} />
              <Text variant="titleMedium" style={st.sectionTitle}>Trip History</Text>
            </View>
            <Divider style={st.divider} />

            {tripHistory.map((trip, i) => {
              const startDate = parseDateSafe(trip.startTime);
              const startStr = startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                + '  ' + startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

              const dur = trip.summary?.durationMs
                ? `${Math.round(trip.summary.durationMs / 60000)} min`
                : null;
              const visited = trip.summary?.visitedCount ?? '?';
              const total   = trip.summary?.totalStops   ?? '?';

              return (
                <View key={trip.id || i} style={st.historyRow}>
                  <View style={st.historyDot}>
                    <Text style={st.historyDotTxt}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.historyRoute}>{trip.summary?.routeName || assignedRoute?.routeName || 'Trip'}</Text>
                    <Text style={st.historyDate}>{startStr}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <Text style={st.historyMeta}>🚏 {visited}/{total} stops</Text>
                      {dur && <Text style={st.historyMeta}>⏱ {dur}</Text>}
                    </View>
                  </View>
                </View>
              );
            })}
          </AppCard>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: dark.bg },
  loader: { flex: 1, backgroundColor: dark.bg, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loaderTxt: { color: dark.textSecondary },

  appbar:     { backgroundColor: dark.surface, paddingHorizontal: 4 },
  appbarLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 },
  appbarTitle:{ color: dark.textPrimary, fontWeight: '800', fontSize: 16 },
  appbarSub:  { fontSize: 12 },

  content: { padding: 16, paddingBottom: 48 },

  assignmentBanner: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1.5,
    borderColor: dark.success,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    color: dark.success,
    fontWeight: '900',
    fontSize: 16,
  },
  bannerText: {
    color: dark.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  bannerRouteName: {
    fontWeight: 'bold',
    color: dark.success,
  },

  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  chip:     { backgroundColor: 'transparent', borderWidth: 1.5 },

  mapWrapper: { height: 260, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: dark.surface },

  actionBtn: { marginBottom: 18 },
  noRoute:   { backgroundColor: 'rgba(239,68,68,.1)', borderWidth: 1, borderColor: dark.error, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  noRouteTxt:{ color: dark.error, fontWeight: '700', flex: 1 },

  stopsCard:  { marginBottom: 32 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:{ color: dark.textPrimary, fontWeight: '700' },
  divider:    { backgroundColor: dark.border, marginBottom: 14 },
  emptyTxt:   { color: dark.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  /* Stop row */
  stopRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 0 },
  spine:     { alignItems: 'center', width: 32 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, backgroundColor: dark.surface,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  dotPulse:  { backgroundColor: dark.primary },
  dotCheck:  { color: '#fff', fontWeight: '900', fontSize: 14 },
  dotNum:    { fontSize: 12, fontWeight: '800' },
  line:      { width: 2, flex: 1, minHeight: 30, marginVertical: 2 },

  stopLabel:   { flex: 1, paddingTop: 4, paddingBottom: 16 },
  stopName:    { color: dark.textPrimary, fontWeight: '600', fontSize: 14 },
  visitedText: { color: dark.textMuted, textDecorationLine: 'line-through', fontWeight: '400' },
  nextText:    { color: dark.primaryLight, fontWeight: '800' },
  stopMeta:    { color: dark.textMuted, fontSize: 11, marginTop: 3 },

  /* History rows */
  historyRow:    { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16 },
  historyDot:    { width: 28, height: 28, borderRadius: 14, backgroundColor: dark.surfaceVariant, borderWidth: 1.5, borderColor: dark.border, alignItems: 'center', justifyContent: 'center' },
  historyDotTxt: { color: dark.success, fontWeight: '900', fontSize: 13 },
  historyRoute:  { color: dark.textPrimary, fontWeight: '700', fontSize: 13 },
  historyDate:   { color: dark.textMuted, fontSize: 11, marginTop: 2 },
  historyMeta:   { color: dark.textSecondary, fontSize: 11 },
});
