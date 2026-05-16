import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../context/AuthContext';
import AppIcon, { ICONS } from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import AppTextInput from '../../components/AppTextInput';
import { dark } from '../../theme/colors';

type LoginScreenNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
interface Props { navigation: LoginScreenNavProp; }

export default function LoginScreen({ navigation }: Props) {
  const { loginByPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });

  const showSnack = (message: string, error = false) =>
    setSnackbar({ visible: true, message, error });

  const handleLogin = async () => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+91/, '').replace(/^91/, '');

    if (!cleaned || cleaned.length !== 10) {
      showSnack('Please enter a valid 10-digit phone number.', true);
      return;
    }

    const fullPhone = `+91${cleaned}`;
    setLoading(true);
    
    try {
      console.log('[Login] Direct Login Request:', fullPhone);
      const success = await loginByPhone(fullPhone);

      if (success) {
        console.log('[Login] Direct Login Successful');
        // Navigation is handled automatically by RootNavigator watching user state
      } else {
        console.warn('[Login] Phone not found in database');
        Alert.alert(
          'Registration Required',
          'This phone number (' + fullPhone + ') was not found in the database. Please make sure the Admin has added you.'
        );
      }
    } catch (error: any) {
      console.error('[Login] Unexpected Error:', error);
      Alert.alert('Login Failed', 'An unexpected error occurred. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* ── Header ──────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <AppIcon {...ICONS.bus} size={46} color={dark.primaryLight} />
            </View>
            <Text variant="headlineMedium" style={styles.title}>College Bus Tracker</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Log in with your registered phone number
            </Text>
          </View>

          {/* ── Form Card ───────────────────────────────────────── */}
          <View style={styles.formCard}>

            <View style={styles.labelRow}>
              <AppIcon {...ICONS.phone} size={15} color={dark.textSecondary} />
              <Text variant="labelLarge" style={styles.label}>Phone Number</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <AppTextInput
                placeholder="10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                left={undefined}
              />
            </View>

            <AppButton
              label={loading ? '' : 'Login'}
              onPress={handleLogin}
              icon="login"
              loading={loading}
              disabled={loading}
              style={styles.btn}
            />

            <Text variant="bodySmall" style={styles.note}>
              Enter the number registered by your college admin.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar(s => ({ ...s, visible: false }))}
        duration={3000}
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
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },

  // ── Header ────────────────────────────────────────────────────
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 6,
    shadowColor: dark.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  title: { color: dark.textPrimary, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: dark.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // ── Form ──────────────────────────────────────────────────────
  formCard: {
    backgroundColor: dark.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: dark.border,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  label: { color: dark.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 8 },
  countryCode: {
    height: 56,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: dark.surfaceVariant,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 10,
  },
  countryCodeText: { color: dark.primaryLight, fontSize: 16, fontWeight: 'bold' },
  input: { flex: 1 },
  btn: { marginBottom: 4 },
  note: { color: dark.textMuted, textAlign: 'center', marginTop: 14 },
});
