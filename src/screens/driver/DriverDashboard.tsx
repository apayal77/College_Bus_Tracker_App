import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { firestoreService, RouteData, TripData } from '../../services/firestoreService';
import { LocationService } from '../../services/LocationService';
import { socketService } from '../../services/socketService';
import OpenStreetMap from '../../components/OpenStreetMap';
import BackgroundGeolocation from 'react-native-background-geolocation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [assignedRoute, setAssignedRoute] = useState<RouteData | null>(null);
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // 1. Fetch assigned route details
      let currentRoute: RouteData | null = null;
      if (user.routeAssigned) {
        const routes = await firestoreService.getRoutes();
        const route = routes.find(r => r.routeName === user.routeAssigned || r.id === user.routeAssigned);
        if (route) {
          setAssignedRoute(route);
          currentRoute = route;
        }
      }

      // 2. Check if there is an active trip
      const trip = await firestoreService.getActiveTripByDriver(user.uid);
      setActiveTrip(trip);

      // 3. Initialize tracking if assigned a route
      if (currentRoute) {
        await LocationService.setup(user.uid, currentRoute.id!);
        socketService.connect();
        socketService.joinRoute(currentRoute.id!);

        // Listen for local UI updates
        BackgroundGeolocation.onLocation((location) => {
          setCurrentLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude
          });
        });

        if (trip) {
          LocationService.startTracking();
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!assignedRoute) {
      Alert.alert('No Route', 'You must be assigned a route by an admin first.');
      return;
    }

    try {
      setActionLoading(true);
      
      const hasPermission = await LocationService.checkPermissions();
      if (!hasPermission) {
        setActionLoading(false);
        return;
      }

      await firestoreService.startTrip({
        routeId: assignedRoute.id!,
        driverId: user!.uid,
      });
      Alert.alert('Trip Started', 'Have a safe journey!');
      await LocationService.startTracking();
      socketService.emitTripStatus(assignedRoute.id!, 'started');
      fetchDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Failed to start trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;

    try {
      setActionLoading(true);
      await firestoreService.endTrip(activeTrip.id!);
      Alert.alert('Trip Ended', 'Trip records saved successfully.');
      await LocationService.stopTracking();
      socketService.emitTripStatus(activeTrip.id!, 'stopped');
      fetchDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Failed to end trip');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'Driver'} 🚌</Text>
          <Text style={styles.routeHeader}>
            {assignedRoute ? assignedRoute.routeName : 'No Route Assigned'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={[styles.statusCard, activeTrip && styles.statusCardActive]}>
          <Text style={styles.statusLabel}>Current Trip Status</Text>
          <Text style={[styles.statusValue, { color: activeTrip ? '#4ade80' : '#f87171' }]}>
            {activeTrip ? '● LIVE' : '○ INACTIVE'}
          </Text>
          {activeTrip && (
            <Text style={styles.startTime}>
              Started at: {new Date(activeTrip.startTime).toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Map Section */}
        <View style={styles.mapWrapper}>
          <OpenStreetMap
            busLocation={currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : undefined}
          />
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            activeTrip ? styles.stopBtn : styles.startBtn,
            (!assignedRoute || actionLoading) && styles.disabledBtn
          ]}
          disabled={!assignedRoute || actionLoading}
          onPress={activeTrip ? handleEndTrip : handleStartTrip}>
          {actionLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {activeTrip ? 'END TRIP' : 'START TRIP'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Route Stops */}
        <View style={styles.stopsCard}>
          <Text style={styles.sectionTitle}>Route Stops</Text>
          {assignedRoute?.stops.map((stop, index) => (
            <View key={index} style={styles.stopRow}>
              <View style={styles.stopDot} />
              <Text style={styles.stopText}>{stop}</Text>
            </View>
          ))}
          {!assignedRoute && (
            <Text style={styles.emptyText}>Contact admin to assign a route.</Text>
          )}
        </View>

        {/* Trip History Placeholder/Preview */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          <Text style={styles.historyHint}>View full history in the menu</Text>
          <View style={styles.historyCard}>
            <Text style={styles.emptyText}>History integration ready.</Text>
          </View>
        </View>
      </ScrollView>
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
  routeHeader: { fontSize: 13, color: '#4ade80', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  content: { padding: 20 },
  statusCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  statusCardActive: { borderColor: '#4ade80' },
  statusLabel: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  statusValue: { fontSize: 28, fontWeight: 'bold' },
  startTime: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  mapWrapper: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stopsCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 16 },
  stopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80', marginRight: 12 },
  stopText: { fontSize: 16, color: '#cbd5e1' },
  emptyText: { color: '#64748b', fontStyle: 'italic', textAlign: 'center' },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 20,
  },
  startBtn: { backgroundColor: '#16a34a' },
  stopBtn: { backgroundColor: '#dc2626' },
  disabledBtn: { backgroundColor: '#334155', opacity: 0.5 },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  historySection: { marginTop: 10, paddingBottom: 40 },
  historyHint: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  historyCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  }
});

