import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/AppNavigator';
import AppDarkTheme from './src/theme/theme';

export default function App() {
  return (
    // GestureHandlerRootView must be the outermost native view
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* PaperProvider injects the Material Design theme */}
        <PaperProvider theme={AppDarkTheme}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
