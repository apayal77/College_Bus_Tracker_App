import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator, Snackbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { RouteProp } from '@react-navigation/native';
import AppIcon, { ICONS } from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import { dark } from '../../theme/colors';

type OTPScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPScreenRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;
interface Props { navigation: OTPScreenNavProp; route: OTPScreenRouteProp; }

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { confirmation, phone } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });
  const inputs = useRef<(TextInput | null)[]>([]);

  const showSnack = (message: string, error = false) =>
    setSnackbar({ visible: true, message, error });

  // ── OTP input logic — unchanged ────────────────────────────────
  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (index === 5 && value) handleVerify(newOtp.join(''));
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      showSnack('Please enter the complete 6-digit OTP.', true);
      return;
    }
    setLoading(true);
    try {
      await (confirmation as FirebaseAuthTypes.ConfirmationResult).confirm(code);
      // We don't set loading to false on success because RootNavigator 
      // will unmount this screen once the auth state updates.
    } catch (error: any) {
      console.error('OTP Verify Error:', error);
      setLoading(false); // Only reset loading if there was an error
      if (error?.code === 'auth/invalid-verification-code') {
        showSnack('Wrong OTP. The code you entered is incorrect.', true);
      } else if (error?.code === 'auth/code-expired') {
        showSnack('OTP expired. Please go back and request a new one.', true);
      } else {
        showSnack(error?.message || 'Verification failed.', true);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.container}>

          {/* ── Back ──────────────────────────────────────────────── */}
          <IconButton
            icon="arrow-left"
            iconColor={dark.primaryLight}
            size={24}
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          />

          {/* ── Header ────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <AppIcon {...ICONS.shield} size={42} color={dark.primaryLight} />
            </View>
            <Text variant="headlineMedium" style={styles.title}>Verify OTP</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              A 6-digit code was sent to{'\n'}
              <Text style={styles.phoneHighlight}>{phone}</Text>
            </Text>
          </View>

          {/* ── OTP Boxes ─────────────────────────────────────────── */}
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

          {/* ── Verify Button ─────────────────────────────────────── */}
          <AppButton
            label={loading ? '' : 'Verify & Login'}
            onPress={() => handleVerify()}
            icon="shield-check"
            loading={loading}
            disabled={loading}
            style={styles.btn}
          />

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.resendBtn}>
            <Text variant="bodySmall" style={styles.resendText}>
              Didn't receive OTP? Go back & resend
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Snackbar ─────────────────────────────────────────────── */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar(s => ({ ...s, visible: false }))}
        duration={3500}
        style={{ backgroundColor: snackbar.error ? dark.errorDark : dark.success }}
        action={{ label: 'OK', onPress: () => setSnackbar(s => ({ ...s, visible: false })) }}>
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  flex: { flex: 1 },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 8, left: 12 },

  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: dark.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  title: { color: dark.textPrimary, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: dark.textSecondary, textAlign: 'center', lineHeight: 24 },
  phoneHighlight: { color: dark.primaryLight, fontWeight: '700' },

  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 36 },
  otpBox: {
    width: 48,
    height: 58,
    borderWidth: 2,
    borderColor: dark.border,
    borderRadius: 12,
    backgroundColor: dark.surface,
    color: dark.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  otpBoxFilled: { borderColor: dark.primary, backgroundColor: dark.elevated },

  btn: { marginBottom: 12 },
  resendBtn: { alignItems: 'center', marginTop: 8 },
  resendText: { color: dark.textMuted },
});
