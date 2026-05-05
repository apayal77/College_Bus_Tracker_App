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

type UserFormScreenProps = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'UserForm'>;
  route: RouteProp<AppStackParamList, 'UserForm'>;
};

export default function UserFormScreen({ navigation, route }: UserFormScreenProps) {
  const { user, role } = route.params;
  const isEditing = !!user;

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [routeAssigned, setRouteAssigned] = useState(user?.routeAssigned || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation', 'Please fill in Name and Phone Number');
      return;
    }

    if (!phone.startsWith('+')) {
      Alert.alert('Validation', 'Phone number must include country code (e.g., +91)');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: name.trim(),
        phone: phone.trim(),
        role: role,
        routeAssigned: routeAssigned.trim() || null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (isEditing) {
        await firestore().collection('users').doc(user.id).update(userData);
      } else {
        // Check if user already exists
        const existing = await firestore()
          .collection('users')
          .where('phone', '==', phone.trim())
          .get();
        
        if (!existing.empty) {
          Alert.alert('Error', 'A user with this phone number already exists.');
          setLoading(false);
          return;
        }

        await firestore().collection('users').add({
          ...userData,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save user data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone Number (with Country Code)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. +919999988888"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Route Assigned (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. route_01"
          placeholderTextColor="#64748b"
          value={routeAssigned}
          onChangeText={setRouteAssigned}
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
          <Text style={styles.saveBtnText}>{isEditing ? 'Update User' : 'Add User'}</Text>
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
  },
  saveBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
