import firestore from '@react-native-firebase/firestore';

export interface UserData {
  id?: string;
  name: string;
  phone: string;
  role: 'student' | 'driver' | 'admin';
  routeAssigned?: string;
}

export interface Stop {
  name: string;
  latitude: number;
  longitude: number;
}

export interface RouteData {
  id?: string;
  routeName: string;
  stops: Stop[];
  driverId?: string;
  studentIds: string[];
}

export interface TripData {
  id?: string;
  routeId: string;
  driverId: string;
  status: 'active' | 'completed';
  startTime: string;
  endTime?: string;
  summary?: TripSummary;
}

export interface TripSummary {
  routeName?: string;
  totalStops: number;
  visitedStops: number[];
  visitedCount: number;
  durationMs?: number;
}

export const firestoreService = {
  // Users
  getUserByPhone: async (phone: string): Promise<UserData | null> => {
    const snapshot = await firestore()
      .collection('users')
      .where('phone', '==', phone)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as UserData;
  },

  // Routes
  getRoutes: async (): Promise<RouteData[]> => {
    const snapshot = await firestore().collection('routes').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RouteData[];
  },

  getRouteById: async (id: string): Promise<RouteData | null> => {
    const doc = await firestore().collection('routes').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as RouteData;
  },

  // Trips
  getActiveTripByDriver: async (driverId: string): Promise<TripData | null> => {
    const snapshot = await firestore()
      .collection('trips')
      .where('driverId', '==', driverId)
      .where('status', '==', 'active')
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Safely parse start time into ISO string
    let startTimeStr = '';
    if (data.startTime) {
      if (typeof data.startTime?.toDate === 'function') {
        startTimeStr = data.startTime.toDate().toISOString();
      } else if (typeof data.startTime === 'string') {
        startTimeStr = data.startTime;
      } else {
        startTimeStr = new Date().toISOString();
      }
    }
    
    return { 
      id: doc.id, 
      ...data,
      startTime: startTimeStr,
    } as TripData;
  },

  startTrip: async (tripData: Omit<TripData, 'id' | 'status' | 'startTime'>): Promise<string> => {
    // 1. Auto-cleanup: end any previous lingering active trips for this driver
    try {
      const snapshot = await firestore()
        .collection('trips')
        .where('driverId', '==', tripData.driverId)
        .where('status', '==', 'active')
        .get();
      
      if (!snapshot.empty) {
        const batch = firestore().batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'completed',
            endTime: firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn('[firestoreService] Lingering active trips cleanup failed:', e);
    }

    // 2. Create the new trip document with current network time as server timestamp
    const docRef = await firestore().collection('trips').add({
      ...tripData,
      status: 'active',
      startTime: firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  },

  endTrip: async (tripId: string, summary?: TripSummary) => {
    const db = firestore();
    const tripRef = db.collection('trips').doc(tripId);

    // Mark trip as completed + embed summary directly on the existing trips document
    // (no separate collection needed — avoids permission-denied on new collections)
    await tripRef.update({
      status: 'completed',
      endTime: firestore.FieldValue.serverTimestamp(),
      ...(summary && { summary }),
    });
  },

  getTripHistoryByDriver: async (driverId: string): Promise<TripData[]> => {
    // NOTE: No .orderBy() here — composite indexes are not set up yet.
    // We sort client-side after fetching to avoid firestore/failed-precondition.
    const snapshot = await firestore()
      .collection('trips')
      .where('driverId', '==', driverId)
      .where('status', '==', 'completed')
      .limit(20)
      .get();

    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate?.() ? data.startTime.toDate().toISOString() : data.startTime,
          endTime:   data.endTime?.toDate?.()   ? data.endTime.toDate().toISOString()   : data.endTime,
        } as TripData;
      })
      // Sort newest first client-side
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10); // keep only last 10
  }
};

