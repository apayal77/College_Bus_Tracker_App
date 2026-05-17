import { Platform, PermissionsAndroid, Alert } from 'react-native';
import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import { socketService } from './socketService';
import firestore from '@react-native-firebase/firestore';

let lastSocketTime = 0;
let lastFirestoreTime = 0;
let _isTracking = false;
// UI callback registered by DriverDashboard for map marker updates
let _uiLocationCallback: ((lat: number, lng: number) => void) | null = null;

export const LocationService = {
  /**
   * Register a callback to receive real-time lat/lng updates in the UI.
   * Only ONE callback is kept at a time — calling this again replaces the old one.
   */
  subscribeToLocation: (cb: (lat: number, lng: number) => void) => {
    _uiLocationCallback = cb;
    return () => { _uiLocationCallback = null; }; // returns unsubscribe fn
  },

  setup: async (driverId: string, routeId: string) => {
    // Remove all previous listeners to avoid duplicates on re-setup
    BackgroundGeolocation.removeListeners();

    // Connect socket; register driver only after the socket is confirmed connected
    const socket = socketService.connect();
    
    const onConnect = () => {
      console.log('Socket connected, registering driver...');
      socketService.registerDriver(routeId);
      socketService.joinRoute(routeId);
    };

    // Handle initial connection and all subsequent reconnections
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    BackgroundGeolocation.onLocation(async (location: Location) => {
      if (!_isTracking) return;
      
      const now = Date.now();
      const { latitude, longitude, speed } = location.coords;

      // Notify UI (map marker) on every location event
      if (_uiLocationCallback) _uiLocationCallback(latitude, longitude);

      // A. Emit to Socket every 3 seconds (reduced from 5s) for better testing responsiveness
      if (now - lastSocketTime >= 3000) {
        console.log(`Emitting location [Mock: ${location.mock || 'No'}]:`, latitude, longitude);
        socketService.emitLocation({
          routeId,
          latitude,
          longitude,
          speed: speed || 0,
        });
        lastSocketTime = now;
      }

      // B. Persist to Firestore every 20 seconds (saves history for route recording)
      if (now - lastFirestoreTime >= 20000) {
        console.log('Persisting location to Firestore');
        try {
          const tripSnapshot = await firestore()
            .collection('trips')
            .where('driverId', '==', driverId)
            .where('status', '==', 'active')
            .get();

          if (!tripSnapshot.empty) {
            const tripId = tripSnapshot.docs[0].id;
            const db = firestore();
            const batch = db.batch();

            const tripRef = db.collection('trips').doc(tripId);
            // ✅ firestore.GeoPoint / firestore.FieldValue are statics on the default export
            batch.update(tripRef, {
              currentLocation: new firestore.GeoPoint(latitude, longitude),
              lastUpdate: firestore.FieldValue.serverTimestamp(),
            });

            const historyRef = tripRef.collection('locationHistory').doc();
            batch.set(historyRef, {
              latitude,
              longitude,
              timestamp: firestore.FieldValue.serverTimestamp(),
            });

            await batch.commit();
          }
          lastFirestoreTime = now;
        } catch (error) {
          console.error('Error persisting location:', error);
        }
      }
    });

    // Listen for motion changes (Stationary vs Moving)
    BackgroundGeolocation.onMotionChange((event) => {
      console.log(`[LocationService] Motion changed: ${event.isMoving ? 'Moving' : 'Stationary'}`);
    });

    // ✅ Use flat (top-level) config keys — nested 'geolocation', 'app', etc. are invalid
    await BackgroundGeolocation.ready({
      reset: true, // Ensure new settings are applied
      desiredAccuracy: 0, // 0 corresponds to High accuracy
      locationUpdateInterval: 1000, // Force update every second for Fake GPS
      fastestLocationUpdateInterval: 500,
      distanceFilter: 2, // Very sensitive for testing
      stationaryRadius: 0, // Disable stationary buffer
      stopOnTerminate: false,
      startOnBoot: true,
      debug: false,
      logLevel: 5, // 5 corresponds to Verbose logging
      enableHeadless: true,
      // Performance/Testing tweaks
      heartbeatInterval: 10,
      preventSuspend: true,
      foregroundService: true,
    } as any);

    return true;
  },

  startTracking: async () => {
    console.log('Starting background tracking...');
    _isTracking = true;
    await BackgroundGeolocation.start();
    await BackgroundGeolocation.changePace(true);
  },

  stopTracking: async () => {
    console.log('Stopping background tracking...');
    _isTracking = false;
    // Small delay so any in-flight start() action completes before we stop,
    // preventing the "Waiting for previous start action" error
    await new Promise<void>(res => setTimeout(() => res(), 500));
    try {
      await BackgroundGeolocation.stop();
    } catch (e) {
      console.warn('[LocationService] stopTracking error (safe to ignore):', e);
    }
  },


  checkPermissions: async () => {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      // Android 13+ needs notification permission
      if (Platform.Version >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      if (
        granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to track the bus.'
        );
        return false;
      }

      // For Android 10+, we need background permission
      if (Platform.Version >= 29) {
        const backgroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
        if (backgroundGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Background Permission',
            'Please set location permission to "Allow all the time" in settings for background tracking.'
          );
        }
      }
    }
    return true;
  }
};
