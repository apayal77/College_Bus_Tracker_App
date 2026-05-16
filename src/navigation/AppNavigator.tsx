import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

import { useAuth } from '../context/AuthContext';

// ── Screens ────────────────────────────────────────────────────────────────
import SplashScreen from '../screens/SplashScreen';

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
import { dark } from '../theme/colors';

// ── Type Definitions ───────────────────────────────────────────────────────
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

/**
 * Root stack that sits at the very top of the navigation tree.
 * Splash is always the first screen; it replaces itself once auth is resolved.
 */
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;               // → AuthNavigator
  App: { screen?: keyof AppStackParamList }; // → AppNavigator
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

// ── Auth Navigator ─────────────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </AuthStack.Navigator>
  );
}

// ── App Navigator (Post-login) ─────────────────────────────────────────────
function AppNavigator() {
  const { user } = useAuth();

  const getInitialRoute = (): keyof AppStackParamList => {
    if (user?.role === 'driver') return 'DriverDashboard';
    if (user?.role === 'admin') return 'AdminDashboard';
    return 'StudentDashboard';
  };

  return (
    <AppStack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{
        headerStyle: { backgroundColor: dark.surface },
        headerTintColor: dark.textPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
      <AppStack.Screen
        name="StudentDashboard"
        component={StudentDashboard}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="DriverDashboard"
        component={DriverDashboard}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ headerShown: false }}
      />

      {/* Admin-specific screens */}
      <AppStack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={({ route }) => ({ title: `Manage ${route.params.role}s` })}
      />
      <AppStack.Screen
        name="UserForm"
        component={UserFormScreen}
        options={({ route }) => ({
          title: route.params.user ? 'Edit User' : 'Add User',
        })}
      />
      <AppStack.Screen
        name="ManageRoutes"
        component={ManageRoutesScreen}
        options={{ title: 'Manage Routes' }}
      />
      <AppStack.Screen
        name="RouteForm"
        component={RouteFormScreen}
        options={({ route }) => ({
          title: route.params.route ? 'Edit Route' : 'Create Route',
        })}
      />
    </AppStack.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user, loading } = useAuth();

  // Show a simple loading screen while the initial auth state is being determined
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // If logged in, go straight to the App stack
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          // If not logged in, show Splash then Auth
          <>
            <RootStack.Screen name="Splash" component={SplashScreen} />
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1628',
  },
});
