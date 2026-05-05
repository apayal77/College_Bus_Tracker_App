import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';

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
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.routeName}>{item.routeName}</Text>
        <Text style={styles.routeStops}>Stops: {item.stops?.length || 0}</Text>
        {item.driverId && (
          <Text style={styles.routeDriver}>Driver ID: {item.driverId}</Text>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => navigation.navigate('RouteForm', { route: item })}
          style={styles.editBtn}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id, item.routeName)}
          style={styles.deleteBtn}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : (
        <FlatList
          data={routes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No routes found.</Text>
          }
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('RouteForm', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardInfo: { flex: 1 },
  routeName: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  routeStops: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  routeDriver: { fontSize: 12, color: '#10b981', marginTop: 4 },
  actions: { flexDirection: 'row' },
  editBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  deleteBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#f59e0b',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300' },
});
