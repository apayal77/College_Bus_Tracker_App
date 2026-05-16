import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, FAB, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import AppIcon, { ICONS } from '../../components/AppIcon';
import AppCard from '../../components/AppCard';
import { dark } from '../../theme/colors';

type ManageRoutesScreenProps = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'ManageRoutes'>;
};

export default function ManageRoutesScreen({ navigation }: ManageRoutesScreenProps) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('routes')
      .onSnapshot(
        snapshot => {
          const routeList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRoutes(routeList);
          setLoading(false);
        },
        error => {
          console.error('Error fetching routes:', error);
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const handleDelete = (routeId: string, routeName: string) => {
    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete ${routeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('routes').doc(routeId).delete();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <AppCard accentColor={dark.admin} elevation={2}>
      <View style={styles.routeRow}>
        <View style={styles.routeInfo}>
          <Text variant="titleMedium" style={styles.routeName}>{item.routeName}</Text>
          <View style={styles.detailRow}>
            <AppIcon {...ICONS.stopList} size={14} color={dark.textMuted} />
            <Text variant="bodySmall" style={styles.routeStops}>
              {item.stops?.length || 0} Stops
            </Text>
          </View>
          {item.driverId && (
            <View style={styles.detailRow}>
              <AppIcon name="account-tie" type="MaterialCommunityIcons" size={14} color={dark.success} />
              <Text variant="bodySmall" style={styles.routeDriver}>
                Driver ID: {item.driverId.slice(0, 8)}...
              </Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('RouteForm', { route: item })}
            style={styles.actionBtn}>
            <AppIcon {...ICONS.editUser} size={20} color={dark.primaryLight} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.routeName)}
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
          <ActivityIndicator size="large" color={dark.admin} />
          <Text style={{ marginTop: 12, color: dark.textSecondary }}>Loading routes...</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon name="map-marker-off" type="MaterialCommunityIcons" size={48} color={dark.border} />
              <Text style={styles.emptyText}>No routes found.</Text>
            </View>
          }
        />
      )}
      <FAB
        icon="map-plus"
        label="Create Route"
        style={[styles.fab, { backgroundColor: dark.admin }]}
        onPress={() => navigation.navigate('RouteForm', {})}
        color="#fff"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: dark.bg },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  routeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeInfo: { flex: 1 },
  routeName: { color: dark.textPrimary, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  routeStops: { color: dark.textSecondary },
  routeDriver: { color: dark.success, fontWeight: '600' },
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
