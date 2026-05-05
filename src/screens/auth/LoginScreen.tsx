import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';

type LoginScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    // Remove spaces, dashes, and any existing +91 to get the raw 10 digits
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+91/, '').replace(/^91/, '');
    
    if (!cleaned || cleaned.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    const fullPhone = `+91${cleaned}`;

    setLoading(true);
    try {
      // 1. Check if this phone number is pre-approved in Firestore
      const snapshot = await firestore()
        .collection('users')
        .where('phone', '==', fullPhone)
        .get();

      if (snapshot.empty) {
        Alert.alert(
          'Access Denied',
          'Your phone number is not registered. Please contact the admin.',
        );
        setLoading(false);
        return;
      }

      // 2. Send OTP via Firebase
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);

      // 3. Navigate to OTP screen with confirmation and phone
      navigation.navigate('OTPVerification', {
        confirmation,
        phone: fullPhone,
      });
    } catch (error: any) {
      console.error('Send OTP Error:', error);
      Alert.alert('Error', error?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🚌</Text>
            </View>
            <Text style={styles.title}>College Bus Tracker</Text>
            <Text style={styles.subtitle}>Enter your registered phone number to continue</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>
              Only admin-approved numbers can log in.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f1f5f9',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#0f172a',
  },
  countryCode: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#1e3a5f',
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  countryCodeText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#1e3a5f' },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  note: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
