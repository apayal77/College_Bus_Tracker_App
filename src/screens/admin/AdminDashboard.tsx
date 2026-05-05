import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';

type AdminDashboardProps = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'AdminDashboard'>;
};

export default function AdminDashboard({ navigation }: AdminDashboardProps) {
  const { user, logout } = useAuth();

  const actions = [
    { title: 'Manage Students', count: 'View/Add Students', color: '#3b82f6', target: 'ManageUsers', params: { role: 'student' } },
    { title: 'Manage Drivers', count: 'View/Add Drivers', color: '#10b981', target: 'ManageUsers', params: { role: 'driver' } },
    { title: 'Manage Routes', count: 'View/Add Routes', color: '#f59e0b', target: 'ManageRoutes' },
    { title: 'Live Fleet Monitor', count: '3 Buses Live', color: '#8b5cf6', target: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel 🛠️</Text>
          <Text style={styles.name}>{user?.name || 'Administrator'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Management</Text>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => action.target && navigation.navigate(action.target as any, action.params)}
            style={[styles.card, { borderLeftColor: action.color }]}>
            <View>
              <Text style={styles.cardTitle}>{action.title}</Text>
              <Text style={styles.cardSub}>{action.count}</Text>
            </View>
            <Text style={[styles.chevron, { color: action.color }]}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  greeting: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  name: { fontSize: 13, color: '#f59e0b', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  chevron: { fontSize: 22, fontWeight: 'bold' },
});
