// frontend/src/screens/NearbyMapScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://heymatebackend-production.up.railway.app/api';

export default function NearbyMapScreen({ route, navigation }) {
  const { category } = route.params;
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setUserLoc(coords);
      setMapRegion({
        ...coords,
        latitudeDelta:  0.05,
        longitudeDelta: 0.05,
      });

      // Fetch nearby shops
      fetchNearbyShops(coords);
    } catch (e) {
      Alert.alert('Error', 'Could not get location');
      setLoading(false);
    }
  };

  const fetchNearbyShops = async (coords) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/nearby/shops?latitude=${coords.latitude}&longitude=${coords.longitude}&category=${category}&radius=5000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (data.success && data.data) {
        setShops(data.data);
      }
    } catch (e) {
      console.log('Fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const openDirections = (shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lon}`;
    Linking.openURL(url);
  };

  const callShop = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert('No phone', 'Phone number not available');
  };

  if (loading || !userLoc) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: theme.textSecondary }}>Finding nearby {category}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {/* User location circle */}
        <Circle
          center={userLoc}
          radius={5000}
          strokeColor="rgba(37,99,235,0.3)"
          fillColor="rgba(37,99,235,0.1)"
        />

        {/* Shop markers */}
        {shops.map((shop, idx) => (
          <Marker
            key={idx}
            coordinate={{ latitude: shop.lat, longitude: shop.lon }}
            onPress={() => setSelectedShop(shop)}
            pinColor={shop.source === 'google' ? '#ef4444' : '#3b82f6'}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.marker, { backgroundColor: shop.isOpen === false ? '#9ca3af' : '#10b981' }]}>
                <Text style={styles.markerText}>🛠️</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: '#fff' }}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category} Nearby</Text>
        <Text style={styles.headerCount}>{shops.length} found</Text>
      </View>

      {/* Selected shop card */}
      {selectedShop && (
        <View style={[styles.shopCard, { backgroundColor: theme.cardBackground }]}>
          <TouchableOpacity
            style={styles.closeCard}
            onPress={() => setSelectedShop(null)}
          >
            <Text style={{ fontSize: 20, color: '#9ca3af' }}>✕</Text>
          </TouchableOpacity>

          <Text style={[styles.shopName, { color: theme.textPrimary }]}>{selectedShop.name}</Text>
          <Text style={[styles.shopAddr, { color: theme.textSecondary }]} numberOfLines={2}>
            📍 {selectedShop.address}
          </Text>

          {selectedShop.rating > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>⭐ {selectedShop.rating.toFixed(1)}</Text>
              {selectedShop.reviews > 0 && (
                <Text style={styles.reviews}>({selectedShop.reviews} reviews)</Text>
              )}
            </View>
          )}

          {selectedShop.isOpen !== undefined && (
            <View style={[styles.openBadge, { backgroundColor: selectedShop.isOpen ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.openTxt, { color: selectedShop.isOpen ? '#16a34a' : '#dc2626' }]}>
                {selectedShop.isOpen ? '✓ Open Now' : '✕ Closed'}
              </Text>
            </View>
          )}

          <Text style={styles.distance}>📏 {selectedShop.distance}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => openDirections(selectedShop)}
            >
              <Text style={styles.actionTxt}>🗺️ Directions</Text>
            </TouchableOpacity>

            {selectedShop.phone && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                onPress={() => callShop(selectedShop.phone)}
              >
                <Text style={styles.actionTxt}>📞 Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  map:             { flex: 1 },
  header:          { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: '#1e3a8a', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 6 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:     { flex: 1, color: '#fff', fontSize: 17, fontWeight: 'bold', marginLeft: 12 },
  headerCount:     { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  markerContainer: { alignItems: 'center' },
  marker:          { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', elevation: 4 },
  markerText:      { fontSize: 18 },
  shopCard:        { position: 'absolute', bottom: 20, left: 16, right: 16, borderRadius: 20, padding: 18, elevation: 10 },
  closeCard:       { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  shopName:        { fontSize: 17, fontWeight: 'bold', marginBottom: 6, paddingRight: 30 },
  shopAddr:        { fontSize: 13, marginBottom: 8 },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stars:           { fontSize: 14, fontWeight: 'bold', color: '#f59e0b' },
  reviews:         { fontSize: 12, color: '#9ca3af', marginLeft: 6 },
  openBadge:       { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  openTxt:         { fontSize: 12, fontWeight: '600' },
  distance:        { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  actions:         { flexDirection: 'row', gap: 10 },
  actionBtn:       { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  actionTxt:       { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
