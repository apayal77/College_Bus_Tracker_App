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
    
    return { 
      id: doc.id, 
      ...data,
      startTime: data.startTime?.toDate?.() ? data.startTime.toDate().toISOString() : data.startTime,
    } as TripData;
  },

  startTrip: async (tripData: Omit<TripData, 'id' | 'status' | 'startTime'>) => {
    return await firestore().collection('trips').add({
      ...tripData,
      status: 'active',
      startTime: firestore.FieldValue.serverTimestamp(),
    });
  },

  endTrip: async (tripId: string) => {
    return await firestore().collection('trips').doc(tripId).update({
      status: 'completed',
      endTime: firestore.FieldValue.serverTimestamp(),
    });
  },

  getTripHistoryByDriver: async (driverId: string): Promise<TripData[]> => {
    const snapshot = await firestore()
      .collection('trips')
      .where('driverId', '==', driverId)
      .where('status', '==', 'completed')
      .orderBy('startTime', 'desc')
      .limit(10)
      .get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate?.() ? data.startTime.toDate().toISOString() : data.startTime,
        endTime: data.endTime?.toDate?.() ? data.endTime.toDate().toISOString() : data.endTime,
      } as TripData;
    });
  }
};

