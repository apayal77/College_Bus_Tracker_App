import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';

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

  const handleSave = async () => {
    if (!routeName.trim() || !stops.trim()) {
      Alert.alert('Validation', 'Please fill in Route Name and Stops');
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
      Alert.alert('Error', 'Failed to save route data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Route Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Route 01 - North"
          placeholderTextColor="#64748b"
          value={routeName}
          onChangeText={setRouteName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Stops (Comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Stop A, Stop B, Stop C"
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={3}
          value={stops}
          onChangeText={setStops}
        />
        <Text style={styles.hint}>Separate stop names with commas.</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Driver ID (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter driver user ID"
          placeholderTextColor="#64748b"
          value={driverId}
          onChangeText={setDriverId}
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveBtn, loading && styles.disabledBtn]} 
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>{isEditing ? 'Update Route' : 'Create Route'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#94a3b8', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'top',
  },
  hint: { fontSize: 12, color: '#64748b', marginTop: 4 },
  saveBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
