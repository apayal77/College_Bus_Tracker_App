import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, FAB, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import AppIcon, { ICONS } from '../../components/AppIcon';
import AppCard from '../../components/AppCard';
import { dark } from '../../theme/colors';

type ManageUsersScreenProps = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'ManageUsers'>;
  route: RouteProp<AppStackParamList, 'ManageUsers'>;
};

export default function ManageUsersScreen({ navigation, route }: ManageUsersScreenProps) {
  const { role } = route.params;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('users')
      .where('role', '==', role)
      .onSnapshot(
        snapshot => {
          const userList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(userList);
          setLoading(false);
        },
        error => {
          console.error('Error fetching users:', error);
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, [role]);

  const handleDelete = (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('users').doc(userId).delete();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <AppCard accentColor={role === 'student' ? dark.student : dark.driver} elevation={2}>
      <View style={styles.userRow}>
        <View style={styles.userInfo}>
          <Text variant="titleMedium" style={styles.userName}>{item.name}</Text>
          <View style={styles.detailRow}>
            <AppIcon {...ICONS.phone} size={12} color={dark.textMuted} />
            <Text variant="bodySmall" style={styles.userPhone}>{item.phone}</Text>
          </View>
          {item.routeAssigned && (
            <View style={styles.detailRow}>
              <AppIcon {...ICONS.createRoute} size={12} color={dark.primaryLight} />
              <Text variant="bodySmall" style={styles.userRoute}>Route: {item.routeAssigned}</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UserForm', { user: item, role })}
            style={styles.actionBtn}>
            <AppIcon {...ICONS.editUser} size={20} color={dark.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            style={styles.actionBtn}>
            <AppIcon {...ICONS.deleteUser} size={20} color={dark.error} />
          </TouchableOpacity>
        </View>
      </View>
    </AppCard>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={dark.primary} />
          <Text style={{ marginTop: 12, color: dark.textSecondary }}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="account-off" type="MaterialCommunityIcons" size={48} color={dark.border} />
              <Text style={styles.emptyText}>No {role}s found.</Text>
            </View>
          }
        />
      )}
      <FAB
        icon="plus"
        label={`Add ${role}`}
        style={[styles.fab, { backgroundColor: role === 'student' ? dark.student : dark.driver }]}
        onPress={() => navigation.navigate('UserForm', { role })}
        color="#fff"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flex: 1 },
  userName: { color: dark.textPrimary, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  userPhone: { color: dark.textSecondary },
  userRoute: { color: dark.primaryLight, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 8, backgroundColor: dark.surfaceVariant, borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', marginTop: 100, gap: 12 },
  emptyText: { textAlign: 'center', color: dark.textMuted },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 16,
  },
});
