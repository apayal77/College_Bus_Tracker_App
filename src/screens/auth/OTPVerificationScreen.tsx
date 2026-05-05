import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { RouteProp } from '@react-navigation/native';

type OTPScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPScreenRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

interface Props {
  navigation: OTPScreenNavProp;
  route: OTPScreenRouteProp;
}

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { confirmation, phone } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next box
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
    // Auto-submit if all 6 digits entered
    if (index === 5 && value) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      // Confirm the OTP with Firebase — this triggers onAuthStateChanged in AuthContext
      await (confirmation as FirebaseAuthTypes.ConfirmationResult).confirm(code);
      // Navigation handled automatically by RootNavigator reacting to auth state change
    } catch (error: any) {
      console.error('OTP Verify Error:', error);
      if (error?.code === 'auth/invalid-verification-code') {
        Alert.alert('Wrong OTP', 'The code you entered is incorrect. Please try again.');
      } else if (error?.code === 'auth/code-expired') {
        Alert.alert('OTP Expired', 'The OTP has expired. Please go back and request a new one.');
      } else {
        Alert.alert('Error', error?.message || 'Verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.container}>
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              A 6-digit code was sent to{'\n'}
              <Text style={styles.phoneHighlight}>{phone}</Text>
            </Text>
          </View>

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => { inputs.current[index] = ref; }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={val => handleOtpChange(val.slice(-1), index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.resendBtn}>
            <Text style={styles.resendText}>Didn't receive OTP? Go back & resend</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  flex: { flex: 1 },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 20, left: 28 },
  backText: { color: '#60a5fa', fontSize: 16 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneHighlight: {
    color: '#60a5fa',
    fontWeight: '700',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 40,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 10,
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: 'bold',
  },
  otpBoxFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#1e3a5f',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { backgroundColor: '#1e3a5f' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', marginTop: 8 },
  resendText: { color: '#64748b', fontSize: 14 },
});
