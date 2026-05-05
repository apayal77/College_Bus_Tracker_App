import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { NotificationService } from '../services/NotificationService';

export type UserRole = 'student' | 'driver' | 'admin' | null;

interface AuthUser {
  uid: string;
  phone: string;
  name: string;
  role: UserRole;
  routeAssigned?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Setup Notification Listeners (Forever)
    const unsubscribeNotifications = NotificationService.setupListeners();

    // 2. Listen to Firebase auth state changes
    const unsubscribeAuth = auth().onAuthStateChanged(
      async (firebaseUser: FirebaseAuthTypes.User | null) => {
        if (firebaseUser) {
          try {
            const snapshot = await firestore()
              .collection('users')
              .where('phone', '==', firebaseUser.phoneNumber)
              .get();

            if (!snapshot.empty) {
              const doc = snapshot.docs[0];
              const data = doc.data()!;
              
              setUser({
                uid: firebaseUser.uid,
                phone: data.phone,
                name: data.name,
                role: data.role,
                routeAssigned: data.routeAssigned,
              });

              // 3. Request Permissions and Save FCM Token
              // We use doc.id because that's the Firestore document ID we want to update
              await NotificationService.requestUserPermission(doc.id);

            } else {
              await auth().signOut();
              setUser(null);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      },
    );

    return () => {
      unsubscribeAuth();
      unsubscribeNotifications();
    };
  }, []);

  const logout = async () => {
    await auth().signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
