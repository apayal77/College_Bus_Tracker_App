import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { useAuth } from '../context/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';

// App Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import DriverDashboard from '../screens/driver/DriverDashboard';
import AdminDashboard from '../screens/admin/AdminDashboard';
import ManageUsersScreen from '../screens/admin/ManageUsersScreen';
import UserFormScreen from '../screens/admin/UserFormScreen';
import ManageRoutesScreen from '../screens/admin/ManageRoutesScreen';
import RouteFormScreen from '../screens/admin/RouteFormScreen';

// ---------- Type Definitions ----------
export type AuthStackParamList = {
  Login: undefined;
  OTPVerification: {
    confirmation: FirebaseAuthTypes.ConfirmationResult;
    phone: string;
  };
};

export type AppStackParamList = {
  StudentDashboard: undefined;
  DriverDashboard: undefined;
  AdminDashboard: undefined;
  ManageUsers: { role: 'student' | 'driver' };
  UserForm: { user?: any; role: 'student' | 'driver' };
  ManageRoutes: undefined;
  RouteForm: { route?: any };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

// ---------- Auth Navigator ----------
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </AuthStack.Navigator>
  );
}

// ---------- App Navigator (Post-login) ----------
function AppNavigator() {
  const { user } = useAuth();

  const getInitialRoute = (): keyof AppStackParamList => {
    if (user?.role === 'driver') return 'DriverDashboard';
    if (user?.role === 'admin') return 'AdminDashboard';
    return 'StudentDashboard'; // default
  };

  return (
    <AppStack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{ 
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' }
      }}>
      <AppStack.Screen name="StudentDashboard" component={StudentDashboard} options={{ headerShown: false }} />
      <AppStack.Screen name="DriverDashboard" component={DriverDashboard} options={{ headerShown: false }} />
      <AppStack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
      
      {/* Admin Specific Screens */}
      <AppStack.Screen name="ManageUsers" component={ManageUsersScreen} options={({ route }) => ({ title: `Manage ${route.params.role}s` })} />
      <AppStack.Screen name="UserForm" component={UserFormScreen} options={({ route }) => ({ title: route.params.user ? 'Edit User' : 'Add User' })} />
      <AppStack.Screen name="ManageRoutes" component={ManageRoutesScreen} options={{ title: 'Manage Routes' }} />
      <AppStack.Screen name="RouteForm" component={RouteFormScreen} options={({ route }) => ({ title: route.params.route ? 'Edit Route' : 'Create Route' })} />
    </AppStack.Navigator>
  );
}


// ---------- Root Navigator ----------
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
