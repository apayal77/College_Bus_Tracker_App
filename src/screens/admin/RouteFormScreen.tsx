import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import AppButton from '../../components/AppButton';
import AppTextInput from '../../components/AppTextInput';
import { dark } from '../../theme/colors';

type RouteFormScreenProps = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'RouteForm'>;
  route: RouteProp<AppStackParamList, 'RouteForm'>;
};

export default function RouteFormScreen({ navigation, route: routeNav }: RouteFormScreenProps) {
  const { route } = routeNav.params;
  const isEditing = !!route;

  const [routeName, setRouteName] = useState(route?.routeName || '');
  const [stops, setStops] = useState(route?.stops?.join(', ') || '');
  const [driverId, setDriverId] = useState(route?.driverId || '');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

  const showSnack = (message: string, error = false) =>
    setSnackbar({ visible: true, message, error });

  const handleSave = async () => {
    if (!routeName.trim() || !stops.trim()) {
      showSnack('Please fill in Route Name and Stops', true);
      return;
    }

    setLoading(true);
    try {
      const stopsArray = stops.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
      
      const routeData = {
        routeName: routeName.trim(),
        stops: stopsArray,
        driverId: driverId.trim() || null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (isEditing) {
        await firestore().collection('routes').doc(route.id).update(routeData);
      } else {
        await firestore().collection('routes').add({
          ...routeData,
          studentIds: [],
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      showSnack('Failed to save route data', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text variant="labelLarge" style={styles.label}>Route Name</Text>
          <AppTextInput
            placeholder="e.g. Route 01 - North"
            value={routeName}
            onChangeText={setRouteName}
            left={<AppTextInput.Icon icon="bus-side" />}
          />
        </View>

        <View style={styles.formGroup}>
          <Text variant="labelLarge" style={styles.label}>Stops (Comma separated)</Text>
          <AppTextInput
            placeholder="e.g. Stop A, Stop B, Stop C"
            multiline
            numberOfLines={4}
            value={stops}
            onChangeText={setStops}
            style={styles.textArea}
          />
          <Text variant="bodySmall" style={styles.hint}>Separate stop names with commas.</Text>
        </View>

        <View style={styles.formGroup}>
          <Text variant="labelLarge" style={styles.label}>Driver ID (Optional)</Text>
          <AppTextInput
            placeholder="Enter driver user ID"
            value={driverId}
            onChangeText={setDriverId}
            left={<AppTextInput.Icon icon="account-tie" />}
          />
        </View>

        <AppButton
          label={isEditing ? 'Update Route' : 'Create Route'}
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          variant="warning"
          icon={isEditing ? 'map-marker-check' : 'map-marker-plus'}
          style={styles.saveBtn}
        />
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar(s => ({ ...s, visible: false }))}
        style={{ backgroundColor: snackbar.error ? dark.errorDark : dark.success }}>
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  container: { flex: 1 },
  content: { padding: 24 },
  formGroup: { marginBottom: 20 },
  label: { color: dark.textSecondary, marginBottom: 8, fontWeight: '600' },
  textArea: { minHeight: 100 },
  hint: { color: dark.textMuted, marginTop: 6 },
  saveBtn: { marginTop: 12 },
});
