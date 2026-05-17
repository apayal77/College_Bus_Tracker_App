import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Appbar, ActivityIndicator, Chip, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import OpenStreetMap, { MapStop } from '../../components/OpenStreetMap';
import { socketService } from '../../services/socketService';
import { firestoreService, RouteData } from '../../services/firestoreService';
import AppIcon, { ICONS } from '../../components/AppIcon';
import { dark } from '../../theme/colors';

function haversineM(a: number, b: number, c: number, d: number): number {
  const R = 6371000, dL = (c - a) * Math.PI / 180, dl = (d - b) * Math.PI / 180;
  const x = Math.sin(dL / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();

  const [assignedRoute,    setAssignedRoute]    = useState<RouteData | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [connStatus,       setConnStatus]       = useState<'connecting'|'connected'|'disconnected'>('connecting');
  const [isDriverOnline,   setIsDriverOnline]   = useState(false);
  const [isStale,          setIsStale]          = useState(false);
  const [busLocation,      setBusLocation]      = useState<{ lat: number; lng: number } | null>(null);
  const [busSpeed,         setBusSpeed]         = useState(0);
  const [busTimestamp,     setBusTimestamp]     = useState<number | null>(null);
  const [visitedStopIndices, setVisitedStopIndices] = useState<number[]>([]);
  const [etaMinutes,       setEtaMinutes]       = useState<number | null>(null);
  const [distanceKm,       setDistanceKm]       = useState<number | null>(null);
  const [displaySpeed,     setDisplaySpeed]     = useState<number | null>(null);
  const [tripEnded,        setTripEnded]         = useState(false);

  const staleRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeRef      = useRef<RouteData | null>(null);
  const visitedRef    = useRef<number[]>([]);
  const notifiedRef   = useRef<Set<number>>(new Set());
  const nearAlertSent = useRef(false);

  useEffect(() => {
    if (user?.routeAssigned) loadRouteAndConnect();
    else setLoading(false);
    return () => {
      socketService.disconnect();
      if (staleRef.current) clearInterval(staleRef.current);
    };
  }, [user]);

  useEffect(() => {
    staleRef.current = setInterval(() => {
      if (busTimestamp) setIsStale(Date.now() - busTimestamp > 60_000);
    }, 10_000);
    return () => { if (staleRef.current) clearInterval(staleRef.current); };
  }, [busTimestamp]);

  const processBusLocation = useCallback((lat: number, lng: number, speed: number) => {
    setBusLocation({ lat, lng });
    setBusSpeed(speed);
    setBusTimestamp(Date.now());
    setIsDriverOnline(true);
    setIsStale(false);

    // Normalize stops to safely read coordinates
    const stops = (routeRef.current?.stops ?? []).map((s, idx) => {
      if (typeof s === 'string') return { name: s, latitude: undefined, longitude: undefined };
      return {
        name: s?.name || `Stop ${idx + 1}`,
        latitude: s?.latitude,
        longitude: s?.longitude
      };
    });

    const newVisited = [...visitedRef.current];
    let changed = false;

    stops.forEach((stop, i) => {
      if (newVisited.includes(i)) return;
      if (stop.latitude === undefined || stop.longitude === undefined) return;

      const dist = haversineM(lat, lng, stop.latitude, stop.longitude);
      if (dist < 150) {
        newVisited.push(i);
        changed = true;
        if (!notifiedRef.current.has(i)) {
          notifiedRef.current.add(i);
          Alert.alert(`🚌 Bus reached stop!`, `Bus has arrived at: ${stop.name}`);
        }
      }

      // Check final stop alert (last stop in list)
      const isMyStop = i === stops.length - 1;
      if (isMyStop && !nearAlertSent.current && dist < 500) {
        nearAlertSent.current = true;
        Alert.alert(
          '🔔 Bus is almost here!',
          `The bus is less than 500 m away from your stop (${stop.name}). Get ready!`
        );
      }
    });

    if (changed) {
      newVisited.sort((a, b) => a - b);
      visitedRef.current = newVisited;
      setVisitedStopIndices([...newVisited]);
    }
  }, []);

  const loadRouteAndConnect = async () => {
    try {
      setLoading(true);
      const routes  = await firestoreService.getRoutes();
      const assigned = user?.routeAssigned?.toLowerCase().trim();
      const route    = routes.find(r =>
        r.routeName.toLowerCase().trim() === assigned ||
        r.id?.toLowerCase().trim()       === assigned
      );

      if (route) {
        setAssignedRoute(route);
        routeRef.current = route;

        const socket = socketService.connect();
        socketService.joinRoute(route.id!);
        socket?.on('connect', () => {
          setConnStatus('connected');
          socketService.joinRoute(route.id!);
        });
        socket?.on('disconnect', () => setConnStatus('disconnected'));

        socketService.subscribeToDriverStatus(s => setIsDriverOnline(s.online));
        socketService.subscribeToTripStatus(data => {
          setIsDriverOnline(data.status === 'started');
          if (data.status === 'stopped') {
            setBusLocation(null);
            setEtaMinutes(null);
            setVisitedStopIndices([]);
            visitedRef.current = [];
            nearAlertSent.current = false;
            notifiedRef.current.clear();
            // Show student notification that trip has ended
            setTripEnded(true);
            Alert.alert(
              '🏁 Trip Ended',
              'The bus has completed its route. Thank you for using the College Bus Tracker!',
              [{ text: 'OK', onPress: () => setTripEnded(false) }]
            );
          } else if (data.status === 'started') {
            setTripEnded(false);
          }
        });
        socketService.subscribeToLocation(data => {
          processBusLocation(data.latitude, data.longitude, data.speed || 0);
        });
      }
    } catch (e) { console.error('[StudentDashboard]', e); }
    finally { setLoading(false); }
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

  const statusColor = () => {
    if (connStatus !== 'connected') return dark.error;
    if (!isDriverOnline) return dark.warning;
    if (isStale) return dark.textMuted;
    return dark.success;
  };
  const statusText = () => {
    if (connStatus !== 'connected') return 'RECONNECTING...';
    if (!isDriverOnline) return 'BUS OFFLINE';
    if (isStale) return 'SIGNAL WEAK';
    return 'LIVE TRACKING';
  };

  if (loading) return (
    <View style={st.loader}>
      <ActivityIndicator size="large" color={dark.primary} />
      <Text style={st.loaderTxt}>Fetching route data...</Text>
    </View>
  );

  if (!user?.routeAssigned || !assignedRoute) return (
    <SafeAreaView style={st.safe}>
      <Appbar.Header style={st.appbar} elevated>
        <Appbar.Content title={`Hello, ${user?.name}`} titleStyle={st.appbarTitle} />
        <Appbar.Action icon="logout" color={dark.error} onPress={logout} />
      </Appbar.Header>
      <View style={st.emptyWrap}>
        <AppIcon {...ICONS.info} size={64} color={dark.textMuted} />
        <Text variant="headlineSmall" style={st.emptyTitle}>No Route Assigned</Text>
        <Text variant="bodyMedium" style={st.emptySub}>Please contact your administrator.</Text>
      </View>
    </SafeAreaView>
  );

  const stops = getNormalizedStops();
  // Filter for map to only contain stops with coordinates
  const mapStops = stops.filter(s => s.latitude !== undefined && s.longitude !== undefined) as MapStop[];
  const myStopIdx = stops.length > 0 ? stops.length - 1 : undefined;
  const centerLoc = busLocation ?? (mapStops[0] ? { lat: mapStops[0].latitude, lng: mapStops[0].longitude } : { lat: 16.65, lng: 74.27 });
  const nextStopIdx = visitedStopIndices.length > 0 ? Math.max(...visitedStopIndices) + 1 : 0;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* Fixed Appbar */}
      <Appbar.Header style={st.appbar} elevated>
        <View style={st.appbarLeft}>
          <AppIcon {...ICONS.liveTracking} size={20} color={dark.primary} />
          <Appbar.Content
            title={`Hello, ${user?.name || 'Student'}`}
            titleStyle={st.appbarTitle}
            subtitle={`Route: ${assignedRoute.routeName}`}
            subtitleStyle={st.appbarSub}
          />
        </View>
        <Appbar.Action icon="logout" color={dark.error} onPress={logout} size={22} />
      </Appbar.Header>

      {/* Scrollable Body */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Map */}
        <View style={st.mapWrap}>
          <OpenStreetMap
            busLocation={centerLoc}
            stops={mapStops}
            visitedStopIndices={visitedStopIndices}
            studentStopIndex={myStopIdx}
            busSpeed={busSpeed}
            mode="student"
            onEtaUpdate={(eta, dist, spd) => { setEtaMinutes(eta); setDistanceKm(dist); setDisplaySpeed(spd); }}
          />
          <Surface style={st.badge} elevation={4}>
            <AppIcon
              name={connStatus === 'connected' && isDriverOnline && !isStale ? 'signal' : 'signal-off'}
              type="MaterialCommunityIcons" size={13} color={statusColor()}
            />
            <Text variant="labelLarge" style={[st.badgeTxt, { color: statusColor() }]}>{statusText()}</Text>
          </Surface>
        </View>

        {/* Trip Ended Banner */}
        {tripEnded && (
          <Surface style={st.tripEndedBanner} elevation={3}>
            <Text style={st.tripEndedIcon}>🏁</Text>
            <View style={{ flex: 1 }}>
              <Text style={st.tripEndedTitle}>Trip Completed!</Text>
              <Text style={st.tripEndedSub}>The bus has finished its route for today.</Text>
            </View>
          </Surface>
        )}

        {/* ETA Panel */}
        {isDriverOnline && etaMinutes !== null && (
          <Surface style={st.etaPanel} elevation={3}>
            <View style={st.etaRow}>
              <AppIcon name="bus-clock" type="MaterialCommunityIcons" size={30} color={dark.primary} />
              <View style={{ flex: 1 }}>
                <Text style={st.etaLabel}>BUS ARRIVES AT YOUR STOP IN</Text>
                <Text style={st.etaValue}>{etaMinutes} <Text style={st.etaUnit}>min</Text></Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                {distanceKm !== null && <Text style={st.etaDist}>{distanceKm} km</Text>}
                {displaySpeed !== null && displaySpeed > 0 && <Text style={st.etaSpd}>{displaySpeed} km/h</Text>}
              </View>
            </View>
          </Surface>
        )}

        {/* Stop Progress Card */}
        <View style={st.stopsWrap}>
          <Surface style={st.stopsCard} elevation={1}>
            <View style={st.sectionRow}>
              <AppIcon {...ICONS.stopList} size={18} color={dark.primary} />
              <Text variant="titleMedium" style={st.sectionTitle}>Route Progress</Text>
              {visitedStopIndices.length > 0 && (
                <Chip compact style={{ backgroundColor: dark.surfaceVariant, marginLeft: 'auto' }}
                  textStyle={{ fontSize: 10, color: dark.success }}>
                  {visitedStopIndices.length} reached
                </Chip>
              )}
            </View>
            <Divider style={st.divider} />

            {stops.map((stop, index) => {
              const visited  = visitedStopIndices.includes(index);
              const isNext   = index === nextStopIdx && isDriverOnline;
              const isLast   = index === stops.length - 1;
              return (
                <View key={index} style={st.stopRow}>
                  <View style={st.spine}>
                    <View style={[st.dot, {
                      backgroundColor: visited ? dark.success : isNext ? dark.primary : dark.surface,
                      borderColor: visited ? dark.success : isNext ? dark.primaryLight : dark.border,
                    }]}>
                      <Text style={[st.dotInner, { color: visited || isNext ? '#fff' : dark.textMuted }]}>
                        {visited ? '✓' : String(index + 1)}
                      </Text>
                    </View>
                    {index < stops.length - 1 && (
                      <View style={[st.line, { backgroundColor: visited ? dark.success : dark.border }]} />
                    )}
                  </View>
                  <View style={st.stopLabel}>
                    <Text style={[
                      st.stopName,
                      visited && { color: dark.textMuted, textDecorationLine: 'line-through' },
                      isNext   && { color: dark.primaryLight, fontWeight: '800' },
                      isLast   && { color: dark.error },
                    ]}>
                      {stop.name}
                      {isLast ? '  🏁' : ''}
                    </Text>
                    <Text style={st.stopMeta}>
                      {visited ? '✅ Bus passed' : isNext ? '▶ Bus is heading here' : '⏳ Upcoming'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: dark.bg },
  loader:  { flex: 1, backgroundColor: dark.bg, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderTxt: { color: dark.textSecondary },
  emptyWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  emptyTitle: { color: dark.textPrimary, fontWeight: 'bold' },
  emptySub:   { color: dark.textSecondary, textAlign: 'center', lineHeight: 22 },

  appbar:     { backgroundColor: dark.surface, paddingHorizontal: 4 },
  appbarLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 },
  appbarTitle:{ color: dark.textPrimary, fontWeight: '800', fontSize: 16 },
  appbarSub:  { color: dark.primaryLight, fontSize: 12 },

  mapWrap: { height: 310, position: 'relative' },
  badge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(15,23,42,.92)',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,.08)',
  },
  badgeTxt: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.4 },

  etaPanel: {
    backgroundColor: dark.surface, marginHorizontal: 12, marginTop: 10,
    borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: dark.primary,
  },
  etaRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  etaLabel: { color: dark.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  etaValue: { color: dark.textPrimary, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  etaUnit:  { color: dark.textSecondary, fontSize: 16, fontWeight: '400' },
  etaDist:  { color: dark.primaryLight, fontWeight: '700', fontSize: 13 },
  etaSpd:   { color: dark.textMuted, fontSize: 11 },

  stopsWrap: { padding: 12, paddingTop: 10 },
  stopsCard: { backgroundColor: dark.surface, borderRadius: 16, padding: 16 },
  sectionRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle:{ color: dark.textPrimary, fontWeight: 'bold', flex: 1 },
  divider:     { backgroundColor: dark.border, marginBottom: 14 },

  stopRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 0 },
  spine:    { alignItems: 'center', width: 30 },
  dot: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  dotInner: { fontSize: 12, fontWeight: '800' },
  line:     { width: 2, flex: 1, minHeight: 28, marginVertical: 2 },
  stopLabel: { flex: 1, paddingTop: 4, paddingBottom: 14 },
  stopName:  { color: dark.textPrimary, fontWeight: '600', fontSize: 14 },
  stopMeta:  { color: dark.textMuted, fontSize: 11, marginTop: 2 },

  /* Trip Ended Banner */
  tripEndedBanner: {
    marginHorizontal: 12, marginTop: 10, borderRadius: 14, padding: 16,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderLeftWidth: 4, borderLeftColor: dark.success,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  tripEndedIcon:  { fontSize: 32 },
  tripEndedTitle: { color: dark.success, fontWeight: '800', fontSize: 15 },
  tripEndedSub:   { color: dark.textSecondary, fontSize: 12, marginTop: 3 },
});
