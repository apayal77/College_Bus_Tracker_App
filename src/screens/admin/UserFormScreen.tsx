import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import AppButton from '../../components/AppButton';
import AppTextInput from '../../components/AppTextInput';
import { dark } from '../../theme/colors';

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
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

  const showSnack = (message: string, error = false) =>
    setSnackbar({ visible: true, message, error });

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      showSnack('Please fill in Name and Phone Number', true);
      return;
    }

    if (!phone.startsWith('+')) {
      showSnack('Phone number must include country code (e.g., +91)', true);
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
        const existing = await firestore()
          .collection('users')
          .where('phone', '==', phone.trim())
          .get();
        
        if (!existing.empty) {
          showSnack('A user with this phone number already exists.', true);
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
      showSnack('Failed to save user data', true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text variant="labelLarge" style={styles.label}>Full Name</Text>
          <AppTextInput
            placeholder="e.g. John Doe"
            value={name}
            onChangeText={setName}
            left={<AppTextInput.Icon icon="account" />}
          />
        </View>

        <View style={styles.formGroup}>
          <Text variant="labelLarge" style={styles.label}>Phone Number (with Country Code)</Text>
          <AppTextInput
            placeholder="e.g. +919999988888"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            left={<AppTextInput.Icon icon="phone" />}
          />
        </View>

        <View style={styles.formGroup}>
          <Text variant="labelLarge" style={styles.label}>Route Assigned (Optional)</Text>
          <AppTextInput
            placeholder="e.g. route_01"
            value={routeAssigned}
            onChangeText={setRouteAssigned}
            left={<AppTextInput.Icon icon="map-marker-path" />}
          />
        </View>

        <AppButton
          label={isEditing ? 'Update User' : 'Add User'}
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          icon={isEditing ? 'account-edit' : 'account-plus'}
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
  saveBtn: { marginTop: 12 },
});
