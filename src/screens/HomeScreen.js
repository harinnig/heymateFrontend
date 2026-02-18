// frontend/src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NearbyShopsTab from '../components/NearbyShopsTab';

const CATEGORIES = [
  { id: '1',  icon: '🔧', name: 'Plumbing',      color: '#3b82f6' },
  { id: '2',  icon: '⚡', name: 'Electrical',    color: '#f59e0b' },
  { id: '3',  icon: '🏠', name: 'Cleaning',      color: '#10b981' },
  { id: '4',  icon: '🎨', name: 'Painting',      color: '#8b5cf6' },
  { id: '5',  icon: '🔨', name: 'Carpentry',     color: '#ef4444' },
  { id: '6',  icon: '❄️', name: 'AC Repair',     color: '#06b6d4' },
  { id: '7',  icon: '🚗', name: 'Car Wash',      color: '#84cc16' },
  { id: '8',  icon: '📦', name: 'Moving',        color: '#f97316' },
  { id: '9',  icon: '💇', name: 'Salon',         color: '#ec4899' },
  { id: '10', icon: '🐾', name: 'Pet Care',      color: '#14b8a6' },
  { id: '11', icon: '📚', name: 'Tutoring',      color: '#6366f1' },
  { id: '12', icon: '🍔', name: 'Food Delivery', color: '#f43f5e' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();

  const [userLocation, setUserLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('Detecting location...');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: status2 } = await Location.requestForegroundPermissionsAsync();
        if (status2 !== 'granted') {
          setLocationLabel('Enable location in Settings');
          return;
        }
      }

      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
      } catch {
        loc = await Location.getLastKnownPositionAsync();
      }

      if (!loc) { setLocationLabel('Location unavailable'); return; }

      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      try {
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        });
        const label = addr
          ? `${addr.city || addr.district || addr.subregion || ''}, ${addr.region || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
          : `${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`;
        setLocationLabel(label || 'Location detected');
      } catch {
        setLocationLabel(`${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`);
      }
    } catch (e) {
      console.log('Location error:', e.message);
      setLocationLabel('Enable location permission');
    }
  };

  const openCategory = (category) => {
    setSelectedCategory(category.name);
    setModalVisible(true);
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.headerBackground }]}>
        <View style={s.greeting}>
          <Text style={s.greetingText}>
            {new Date().getHours() < 12 ? '🌅 Good Morning' : 
             new Date().getHours() < 18 ? '☀️ Good Afternoon' : '🌙 Good Evening'},
          </Text>
          <Text style={s.userName}>{user?.name || 'User'} 👋</Text>
        </View>
        <TouchableOpacity style={s.locationBtn} onPress={detectLocation}>
          <Text style={s.locationIcon}>📍</Text>
          <Text style={s.locationText} numberOfLines={1}>{locationLabel}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={s.searchSection}>
          <View style={[s.searchBar, { backgroundColor: theme.cardBackground }]}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={[s.searchInput, { color: theme.textPrimary }]}
              placeholder="Search services near you..."
              placeholderTextColor={theme.placeholder}
            />
          </View>
        </View>

        {/* Become Provider Banner */}
        {user?.role !== 'provider' && (
          <TouchableOpacity style={s.providerBanner}>
            <View style={s.providerIconWrap}>
              <Text style={s.providerIcon}>💼</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.providerTitle}>Earn with HeyMate</Text>
              <Text style={s.providerSub}>Register as a provider & get hired!</Text>
            </View>
            <Text style={s.providerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Services Grid */}
        <View style={s.servicesSection}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>🔧 Services</Text>
            <Text style={[s.sectionSub, { color: theme.textSecondary }]}>Real shops near you</Text>
          </View>

          <View style={s.grid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[s.categoryCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => openCategory(cat)}
                activeOpacity={0.7}
              >
                <View style={[s.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                  <Text style={{ fontSize: 36 }}>{cat.icon}</Text>
                </View>
                <Text style={[s.categoryName, { color: theme.textPrimary }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Category Modal with Nearby Shops */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[s.modalContainer, { backgroundColor: theme.background }]}>
          {/* Modal Header */}
          <View style={[s.modalHeader, { backgroundColor: theme.headerBackground }]}>
            <TouchableOpacity style={s.backBtn} onPress={() => setModalVisible(false)}>
              <Text style={{ fontSize: 28, color: '#fff' }}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.modalTitle}>{selectedCategory}</Text>
              <Text style={s.modalSub}>Nearby shops with ratings & reviews</Text>
            </View>
          </View>

          {/* Nearby Shops Tab */}
          {userLocation ? (
            <NearbyShopsTab
              category={selectedCategory}
              userLocation={userLocation}
              theme={theme}
            />
          ) : (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={{ color: theme.textSecondary, marginTop: 12 }}>
                Detecting your location...
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  header:           { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  greeting:         { marginBottom: 12 },
  greetingText:     { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  userName:         { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  locationBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 },
  locationIcon:     { fontSize: 18, marginRight: 6 },
  locationText:     { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  searchSection:    { paddingHorizontal: 20, marginTop: 16 },
  searchBar:        { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, elevation: 2 },
  searchIcon:       { fontSize: 20, marginRight: 10 },
  searchInput:      { flex: 1, fontSize: 15 },
  providerBanner:   { marginHorizontal: 20, marginTop: 20, backgroundColor: '#1e3a8a', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  providerIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  providerIcon:     { fontSize: 26 },
  providerTitle:    { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
  providerSub:      { color: '#93c5fd', fontSize: 13 },
  providerArrow:    { fontSize: 28, color: '#fff' },
  servicesSection:  { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:     { fontSize: 18, fontWeight: 'bold' },
  sectionSub:       { fontSize: 13 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard:     { width: '48%', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2 },
  categoryIcon:     { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  categoryName:     { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  modalContainer:   { flex: 1 },
  modalHeader:      { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalTitle:       { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalSub:         { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
});