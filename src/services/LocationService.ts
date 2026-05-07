import { Platform, PermissionsAndroid, Alert } from 'react-native';
import BackgroundGeolocation, {
  Location,
} from 'react-native-background-geolocation';
import { socketService } from './socketService';
import firestore from '@react-native-firebase/firestore';

let lastSocketTime = 0;
let lastFirestoreTime = 0;

export const LocationService = {
  setup: async (driverId: string, routeId: string) => {
    BackgroundGeolocation.removeListeners();

    // Register as driver on socket connect
    socketService.connect();
    socketService.registerDriver(routeId);

    BackgroundGeolocation.onLocation(async (location: Location) => {
      const now = Date.now();
      const { latitude, longitude, speed } = location.coords;

      // A. Emit to Socket every 10 seconds for "Smooth" live tracking
      if (now - lastSocketTime >= 10000) {
        console.log('Emitting location to socket:', latitude, longitude);
        socketService.emitLocation({
          routeId,
          latitude,
          longitude,
          speed: speed || 0,
        });
        lastSocketTime = now;
      }

      // B. Persist to Firestore every 60 seconds (Saving costs/bandwidth)
      if (now - lastFirestoreTime >= 60000) {
        console.log('Persisting location to Firestore');
        try {
          const tripSnapshot = await firestore().collection('trips')
            .where('driverId', '==', driverId)
            .where('status', '==', 'active')
            .get();

          if (!tripSnapshot.empty) {
            const tripId = tripSnapshot.docs[0].id;
            const batch = firestore().batch();
            
            const tripRef = firestore().collection('trips').doc(tripId);
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

    await BackgroundGeolocation.ready({
      reset: false,
      geolocation: {
        desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
        distanceFilter: 5,
        stopTimeout: 5,
      },
      app: {
        stopOnTerminate: false,
        startOnBoot: true,
        notification: {
          title: 'Bus Tracking Active',
          text: 'Sharing your live location with students.',
        },
      },
      logger: {
        debug: false,
        logLevel: BackgroundGeolocation.LogLevel.Off,
      },
      http: {
        batchSync: false,
        autoSync: true,
      }
    });
  },

  startTracking: async () => {
    console.log('Starting background tracking...');
    await BackgroundGeolocation.start();
    await BackgroundGeolocation.changePace(true);
  },

  stopTracking: async () => {
    console.log('Stopping background tracking...');
    await BackgroundGeolocation.stop();
  },

  checkPermissions: async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

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
