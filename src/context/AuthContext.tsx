import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '../services/NotificationService';
import { Alert } from 'react-native';

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
  loginByPhone: (phone: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginByPhone: async () => false,
  logout: async () => {},
});

// Memory fallback if AsyncStorage is not linked/available
let _memoryPhone: string | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('[AuthContext] Checking for saved session...');
        let savedPhone = _memoryPhone;
        try {
          savedPhone = savedPhone || await AsyncStorage.getItem('@user_phone');
        } catch (storageError) {
          console.warn('[AuthContext] AsyncStorage not available, using memory');
        }

        if (savedPhone) {
          console.log('[AuthContext] Restoring session for:', savedPhone);
          const success = await loginByPhone(savedPhone);
          if (!success) {
             console.warn('[AuthContext] Persisted phone no longer valid');
             _memoryPhone = null;
             try { await AsyncStorage.removeItem('@user_phone'); } catch(e) {}
          }
        }
      } catch (e) {
        console.error('[AuthContext] Init error:', e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    
    const unsubscribeNotifications = NotificationService.setupListeners();
    return () => unsubscribeNotifications();
  }, []);

  // Real-time Profile Sync
  useEffect(() => {
    if (!user?.phone) return;

    const unsubscribe = firestore()
      .collection('users')
      .where('phone', '==', user.phone)
      .onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setUser({
            uid: data.phone,
            phone: data.phone,
            name: data.name,
            role: data.role,
            routeAssigned: data.routeAssigned,
          });
        }
      }, err => console.error('[AuthContext] Snapshot error:', err));

    return () => unsubscribe();
  }, [user?.phone]);

  const loginByPhone = async (phone: string) => {
    try {
      const clean10 = phone.replace(/\D/g, '').slice(-10);
      const fullPhone = `+91${clean10}`;
      
      console.log('[AuthContext] Searching for phone variations:', fullPhone, clean10);
      
      const snapshot = await firestore()
        .collection('users')
        .where('phone', 'in', [fullPhone, clean10])
        .get();

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const loggedUser: AuthUser = {
          uid: data.phone,
          phone: data.phone,
          name: data.name,
          role: data.role,
          routeAssigned: data.routeAssigned,
        };
        
        console.log('[AuthContext] Login success for:', data.name);
        setUser(loggedUser);
        
        _memoryPhone = data.phone;
        try {
          await AsyncStorage.setItem('@user_phone', data.phone);
        } catch (e) {
          console.warn('[AuthContext] Could not persist to disk, session will be memory-only');
        }
        
        await NotificationService.requestUserPermission(snapshot.docs[0].id);
        return true;
      } else {
        console.warn('[AuthContext] No user found in Firestore with phone:', phone);
        return false;
      }
    } catch (error: any) {
      console.error('[AuthContext] Database query failed:', error);
      Alert.alert('Database Error', 'Could not reach the server. Please check your internet.');
      return false;
    }
  };

  const logout = async () => {
    console.log('[AuthContext] Logging out...');
    _memoryPhone = null;
    try { await AsyncStorage.removeItem('@user_phone'); } catch(e) {}
    try { await auth().signOut(); } catch(e) {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginByPhone, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
