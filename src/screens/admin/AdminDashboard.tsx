import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Appbar, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import AppIcon, { ICONS } from '../../components/AppIcon';
import AppCard from '../../components/AppCard';
import { dark } from '../../theme/colors';

type AdminDashboardProps = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'AdminDashboard'>;
};

export default function AdminDashboard({ navigation }: AdminDashboardProps) {
  const { user, logout } = useAuth();

  // ── Action cards — all navigation targets unchanged ────────────
  const actions = [
    {
      title: 'Manage Students',
      sub: 'View, add & edit students',
      color: dark.student,
      target: 'ManageUsers',
      params: { role: 'student' as const },
      icon: ICONS.manageStudents,
    },
    {
      title: 'Manage Drivers',
      sub: 'View, add & edit drivers',
      color: dark.driver,
      target: 'ManageUsers',
      params: { role: 'driver' as const },
      icon: ICONS.manageDrivers,
    },
    {
      title: 'Manage Routes',
      sub: 'Create & assign bus routes',
      color: dark.admin,
      target: 'ManageRoutes',
      params: undefined,
      icon: ICONS.createRoute,
    },
    {
      title: 'Live Fleet Monitor',
      sub: 'Track all active buses',
      color: dark.secondary,
      target: null,
      params: undefined,
      icon: ICONS.fleet,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Appbar ────────────────────────────────────────────── */}
      <Appbar.Header style={styles.appbar} elevated>
        <View style={styles.appbarLeft}>
          <AppIcon {...ICONS.monitor} size={20} color={dark.admin} />
          <Appbar.Content
            title="Admin Panel"
            titleStyle={styles.appbarTitle}
            subtitle={user?.name || 'Administrator'}
            subtitleStyle={styles.appbarSub}
          />
        </View>
        <Appbar.Action
          icon="logout"
          color={dark.error}
          onPress={logout}
          size={22}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Welcome chip ──────────────────────────────────────── */}
        <View style={styles.welcomeRow}>
          <Chip
            icon="shield-account"
            style={styles.roleChip}
            textStyle={{ color: dark.admin, fontWeight: '700' }}>
            Admin
          </Chip>
          <Text variant="bodySmall" style={styles.welcomeSub}>
            Full system access
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* ── Section header ────────────────────────────────────── */}
        <Text variant="titleSmall" style={styles.sectionTitle}>Management</Text>

        {/* ── Action cards ──────────────────────────────────────── */}
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.82}
            onPress={() =>
              action.target &&
              navigation.navigate(action.target as any, action.params)
            }>
            <AppCard accentColor={action.color} elevation={2} style={styles.card}>
              <View style={styles.cardInner}>
                {/* Icon badge */}
                <View style={[styles.iconBadge, { backgroundColor: action.color + '26' }]}>
                  <AppIcon {...action.icon} size={24} color={action.color} />
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <Text variant="titleMedium" style={styles.cardTitle}>{action.title}</Text>
                  <Text variant="bodySmall" style={styles.cardSub}>{action.sub}</Text>
                </View>

                {/* Chevron */}
                <AppIcon {...ICONS.chevronRight} size={22} color={action.color} />
              </View>
            </AppCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  appbar: { backgroundColor: dark.surface, paddingHorizontal: 4 },
  appbarLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6 },
  appbarTitle: { color: dark.textPrimary, fontWeight: '800', fontSize: 18 },
  appbarSub: { color: dark.admin, fontSize: 12 },

  content: { padding: 20, paddingBottom: 40 },

  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  roleChip: { backgroundColor: dark.admin + '22', borderColor: dark.admin, borderWidth: 1 },
  welcomeSub: { color: dark.textMuted },

  divider: { backgroundColor: dark.border, marginBottom: 20 },

  sectionTitle: {
    color: dark.textSecondary,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  card: { marginBottom: 14 },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { color: dark.textPrimary, fontWeight: '700' },
  cardSub: { color: dark.textMuted, marginTop: 2 },
});
