// src/screens/HomeScreen.js - Main Home Screen with Categories

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';

const API_URL = 'YOUR_BACKEND_API_URL'; // Replace with your backend URL

const HomeScreen = ({ navigation }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [nearbyShops, setNearbyShops] = useState([]);
  const [showShopsModal, setShowShopsModal] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);

  // Service Categories
  const CATEGORIES = [
    { id: '1', name: 'Plumbing', icon: '🔧', color: '#007AFF' },
    { id: '2', name: 'Electrical', icon: '⚡', color: '#FF9500' },
    { id: '3', name: 'Cleaning', icon: '🏠', color: '#34C759' },
    { id: '4', name: 'Painting', icon: '🎨', color: '#FF3B30' },
    { id: '5', name: 'Carpentry', icon: '🔨', color: '#8E8E93' },
    { id: '6', name: 'AC Repair', icon: '❄️', color: '#5AC8FA' },
    { id: '7', name: 'Car Wash', icon: '🚗', color: '#007AFF' },
    { id: '8', name: 'Moving', icon: '📦', color: '#FF9500' },
    { id: '9', name: 'Salon', icon: '💇', color: '#FF2D55' },
    { id: '10', name: 'Pet Care', icon: '🐾', color: '#34C759' },
    { id: '11', name: 'Tutoring', icon: '📚', color: '#5856D6' },
    { id: '12', name: 'Food Delivery', icon: '🍔', color: '#FF3B30' },
    { id: '13', name: 'Woman Safety', icon: '👩', color: '#FF3B30' },
    { id: '14', name: 'Blood Donation', icon: '🩸', color: '#FF3B30' }
  ];

  useEffect(() => {
    getLocationPermission();
  }, []);

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      setLoadingLocation(false);
    } catch (error) {
      console.error('Location error:', error);
      setLoadingLocation(false);
    }
  };

  const handleCategoryPress = async (category) => {
    // Navigate to safety features
    if (category.name === 'Woman Safety') {
      navigation.navigate('WomanSafety');
      return;
    }
    
    if (category.name === 'Blood Donation') {
      navigation.navigate('BloodDonation');
      return;
    }

    // For other categories, fetch nearby shops
    if (!userLocation) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }

    await fetchNearbyShops(category.name);
  };

  const fetchNearbyShops = async (categoryName) => {
    try {
      setLoadingShops(true);

      const res = await axios.get(`${API_URL}/nearby/shops`, {
        params: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          category: categoryName,
          radius: 3000
        }
      });

      if (res.data.success) {
        setNearbyShops(res.data.data);
        setShowShopsModal(true);
      } else {
        Alert.alert('No Results', 'No shops found nearby for this category');
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      Alert.alert('Error', 'Failed to fetch nearby shops');
    } finally {
      setLoadingShops(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Welcome to HeyMate! 👋</Text>
          <Text style={styles.headerSubtitle}>
            {loadingLocation ? 'Getting location...' : '📍 Location detected'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('NearbySettings')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Grid */}
      <ScrollView 
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Select a Service</Text>
        
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: category.color }]}
              onPress={() => handleCategoryPress(category)}
              disabled={loadingShops}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('Requests')}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionText}>My Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Nearby Shops Modal */}
      <Modal
        visible={showShopsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShopsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nearby Shops</Text>
              <TouchableOpacity onPress={() => setShowShopsModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.shopsList}>
              {nearbyShops.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No shops found nearby</Text>
                </View>
              ) : (
                nearbyShops.map((shop, index) => (
                  <View key={index} style={styles.shopCard}>
                    <Text style={styles.shopName}>{shop.name}</Text>
                    <Text style={styles.shopAddress}>{shop.address}</Text>
                    <View style={styles.shopMeta}>
                      <Text style={styles.shopDistance}>📍 {shop.distance}</Text>
                      <Text style={styles.shopTime}>🚗 {shop.travelTime}</Text>
                      {shop.rating > 0 && (
                        <Text style={styles.shopRating}>⭐ {shop.rating}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loadingShops && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Finding nearby shops...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 28,
  },
  scroll: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  categoryCard: {
    width: '45%',
    margin: '2.5%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: 10,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  shopsList: {
    padding: 15,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  shopCard: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  shopAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  shopMeta: {
    flexDirection: 'row',
    gap: 15,
  },
  shopDistance: {
    fontSize: 12,
    color: '#007AFF',
  },
  shopTime: {
    fontSize: 12,
    color: '#FF9500',
  },
  shopRating: {
    fontSize: 12,
    color: '#FFD700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
  },
});

export default HomeScreen;