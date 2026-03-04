// frontend/src/screens/NearbySettingsScreen.js - ENHANCED NEARBY SETTINGS

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const NearbySettingsScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { token } = useContext(AuthContext);
  
  // Settings State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Distance & Travel Time Settings
  const [maxDistance, setMaxDistance] = useState(3); // km
  const [maxTravelTime, setMaxTravelTime] = useState(10); // minutes
  const [autoExpand, setAutoExpand] = useState(true);
  
  // Display Preferences
  const [showDistance, setShowDistance] = useState(true);
  const [showTravelTime, setShowTravelTime] = useState(true);
  const [showRatings, setShowRatings] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showOpeningHours, setShowOpeningHours] = useState(true);
  
  // Filter Settings
  const [minRating, setMinRating] = useState(3.0);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [sortBy, setSortBy] = useState('distance'); // distance, rating, reviews
  
  // API Settings
  const [preferGooglePlaces, setPreferGooglePlaces] = useState(true);
  const [useOSMFallback, setUseOSMFallback] = useState(true);
  const [apiTimeout, setApiTimeout] = useState(5); // seconds
  
  // Location Settings
  const [useHighAccuracy, setUseHighAccuracy] = useState(true);
  const [locationCacheTime, setLocationCacheTime] = useState(5); // minutes
  
  // Notification Settings
  const [notifyNewShops, setNotifyNewShops] = useState(false);
  const [notifyPriceChanges, setNotifyPriceChanges] = useState(false);

  const s = styles(theme);

  // Load Settings on Mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await AsyncStorage.getItem('nearbySettings');
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Distance & Travel
        setMaxDistance(settings.maxDistance || 3);
        setMaxTravelTime(settings.maxTravelTime || 10);
        setAutoExpand(settings.autoExpand !== false);
        
        // Display
        setShowDistance(settings.showDistance !== false);
        setShowTravelTime(settings.showTravelTime !== false);
        setShowRatings(settings.showRatings !== false);
        setShowPhotos(settings.showPhotos !== false);
        setShowOpeningHours(settings.showOpeningHours !== false);
        
        // Filters
        setMinRating(settings.minRating || 3.0);
        setShowOpenOnly(settings.showOpenOnly || false);
        setSortBy(settings.sortBy || 'distance');
        
        // API
        setPreferGooglePlaces(settings.preferGooglePlaces !== false);
        setUseOSMFallback(settings.useOSMFallback !== false);
        setApiTimeout(settings.apiTimeout || 5);
        
        // Location
        setUseHighAccuracy(settings.useHighAccuracy !== false);
        setLocationCacheTime(settings.locationCacheTime || 5);
        
        // Notifications
        setNotifyNewShops(settings.notifyNewShops || false);
        setNotifyPriceChanges(settings.notifyPriceChanges || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const settings = {
        maxDistance,
        maxTravelTime,
        autoExpand,
        showDistance,
        showTravelTime,
        showRatings,
        showPhotos,
        showOpeningHours,
        minRating,
        showOpenOnly,
        sortBy,
        preferGooglePlaces,
        useOSMFallback,
        apiTimeout,
        useHighAccuracy,
        locationCacheTime,
        notifyNewShops,
        notifyPriceChanges,
        updatedAt: new Date().toISOString()
      };
      
      await AsyncStorage.setItem('nearbySettings', JSON.stringify(settings));
      
      Alert.alert(
        'Success',
        'Settings saved successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all nearby settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setMaxDistance(3);
            setMaxTravelTime(10);
            setAutoExpand(true);
            setShowDistance(true);
            setShowTravelTime(true);
            setShowRatings(true);
            setShowPhotos(true);
            setShowOpeningHours(true);
            setMinRating(3.0);
            setShowOpenOnly(false);
            setSortBy('distance');
            setPreferGooglePlaces(true);
            setUseOSMFallback(true);
            setApiTimeout(5);
            setUseHighAccuracy(true);
            setLocationCacheTime(5);
            setNotifyNewShops(false);
            setNotifyPriceChanges(false);
            Alert.alert('Success', 'Settings reset to defaults');
          }
        }
      ]
    );
  };

  const DistanceOption = ({ value, label, selected, onPress }) => (
    <TouchableOpacity
      style={[s.optionBtn, selected && s.optionBtnSelected]}
      onPress={onPress}
    >
      <Text style={[s.optionText, selected && s.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const TravelTimeOption = ({ value, label, selected, onPress }) => (
    <TouchableOpacity
      style={[s.optionBtn, selected && s.optionBtnSelected]}
      onPress={onPress}
    >
      <Text style={[s.optionText, selected && s.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const RatingOption = ({ value, label, selected, onPress }) => (
    <TouchableOpacity
      style={[s.optionBtn, selected && s.optionBtnSelected]}
      onPress={onPress}
    >
      <Text style={[s.optionText, selected && s.optionTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={s.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={s.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Nearby Settings</Text>
          <Text style={s.headerSubtitle}>
            Customize how you discover nearby shops and services
          </Text>
        </View>

        {/* Distance & Travel Time Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📍 Distance & Travel Time</Text>
          
          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Maximum Search Distance</Text>
            <Text style={s.settingValue}>{maxDistance} km</Text>
          </View>
          <View style={s.optionRow}>
            <DistanceOption
              value={1}
              label="1 km"
              selected={maxDistance === 1}
              onPress={() => setMaxDistance(1)}
            />
            <DistanceOption
              value={3}
              label="3 km"
              selected={maxDistance === 3}
              onPress={() => setMaxDistance(3)}
            />
            <DistanceOption
              value={5}
              label="5 km"
              selected={maxDistance === 5}
              onPress={() => setMaxDistance(5)}
            />
            <DistanceOption
              value={10}
              label="10 km"
              selected={maxDistance === 10}
              onPress={() => setMaxDistance(10)}
            />
          </View>

          <View style={[s.settingRow, { marginTop: 20 }]}>
            <Text style={s.settingLabel}>Maximum Travel Time</Text>
            <Text style={s.settingValue}>{maxTravelTime} min</Text>
          </View>
          <View style={s.optionRow}>
            <TravelTimeOption
              value={5}
              label="5 min"
              selected={maxTravelTime === 5}
              onPress={() => setMaxTravelTime(5)}
            />
            <TravelTimeOption
              value={10}
              label="10 min"
              selected={maxTravelTime === 10}
              onPress={() => setMaxTravelTime(10)}
            />
            <TravelTimeOption
              value={15}
              label="15 min"
              selected={maxTravelTime === 15}
              onPress={() => setMaxTravelTime(15)}
            />
            <TravelTimeOption
              value={20}
              label="20 min"
              selected={maxTravelTime === 20}
              onPress={() => setMaxTravelTime(20)}
            />
          </View>

          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Auto-Expand Search</Text>
              <Text style={s.settingDesc}>
                Automatically increase radius if no results found
              </Text>
            </View>
            <Switch
              value={autoExpand}
              onValueChange={setAutoExpand}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* Display Preferences Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>👁️ Display Preferences</Text>
          
          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Show Distance</Text>
            <Switch
              value={showDistance}
              onValueChange={setShowDistance}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Show Travel Time</Text>
            <Switch
              value={showTravelTime}
              onValueChange={setShowTravelTime}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Show Ratings & Reviews</Text>
            <Switch
              value={showRatings}
              onValueChange={setShowRatings}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Show Shop Photos</Text>
            <Switch
              value={showPhotos}
              onValueChange={setShowPhotos}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Show Opening Hours</Text>
            <Switch
              value={showOpeningHours}
              onValueChange={setShowOpeningHours}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* Filter Settings Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔍 Filter Settings</Text>
          
          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Minimum Rating</Text>
            <Text style={s.settingValue}>⭐ {minRating.toFixed(1)}</Text>
          </View>
          <View style={s.optionRow}>
            <RatingOption
              value={0}
              label="Any"
              selected={minRating === 0}
              onPress={() => setMinRating(0)}
            />
            <RatingOption
              value={3.0}
              label="3.0+"
              selected={minRating === 3.0}
              onPress={() => setMinRating(3.0)}
            />
            <RatingOption
              value={4.0}
              label="4.0+"
              selected={minRating === 4.0}
              onPress={() => setMinRating(4.0)}
            />
            <RatingOption
              value={4.5}
              label="4.5+"
              selected={minRating === 4.5}
              onPress={() => setMinRating(4.5)}
            />
          </View>

          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Show Open Shops Only</Text>
              <Text style={s.settingDesc}>
                Hide shops that are currently closed
              </Text>
            </View>
            <Switch
              value={showOpenOnly}
              onValueChange={setShowOpenOnly}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Sort Results By</Text>
            <Text style={s.settingValue}>
              {sortBy === 'distance' ? '📍 Distance' :
               sortBy === 'rating' ? '⭐ Rating' :
               '👥 Reviews'}
            </Text>
          </View>
          <View style={s.optionRow}>
            <TouchableOpacity
              style={[s.sortBtn, sortBy === 'distance' && s.sortBtnSelected]}
              onPress={() => setSortBy('distance')}
            >
              <Text style={[s.sortText, sortBy === 'distance' && s.sortTextSelected]}>
                📍 Distance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sortBtn, sortBy === 'rating' && s.sortBtnSelected]}
              onPress={() => setSortBy('rating')}
            >
              <Text style={[s.sortText, sortBy === 'rating' && s.sortTextSelected]}>
                ⭐ Rating
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sortBtn, sortBy === 'reviews' && s.sortBtnSelected]}
              onPress={() => setSortBy('reviews')}
            >
              <Text style={[s.sortText, sortBy === 'reviews' && s.sortTextSelected]}>
                👥 Reviews
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* API Settings Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🌐 API Settings</Text>
          
          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Prefer Google Places</Text>
              <Text style={s.settingDesc}>
                Use Google Places API for best results
              </Text>
            </View>
            <Switch
              value={preferGooglePlaces}
              onValueChange={setPreferGooglePlaces}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Use OpenStreetMap Fallback</Text>
              <Text style={s.settingDesc}>
                Fallback to OSM if Google fails
              </Text>
            </View>
            <Switch
              value={useOSMFallback}
              onValueChange={setUseOSMFallback}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>API Timeout</Text>
            <Text style={s.settingValue}>{apiTimeout}s</Text>
          </View>
          <View style={s.optionRow}>
            <TouchableOpacity
              style={[s.optionBtn, apiTimeout === 3 && s.optionBtnSelected]}
              onPress={() => setApiTimeout(3)}
            >
              <Text style={[s.optionText, apiTimeout === 3 && s.optionTextSelected]}>
                3s
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.optionBtn, apiTimeout === 5 && s.optionBtnSelected]}
              onPress={() => setApiTimeout(5)}
            >
              <Text style={[s.optionText, apiTimeout === 5 && s.optionTextSelected]}>
                5s
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.optionBtn, apiTimeout === 10 && s.optionBtnSelected]}
              onPress={() => setApiTimeout(10)}
            >
              <Text style={[s.optionText, apiTimeout === 10 && s.optionTextSelected]}>
                10s
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Settings Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📡 Location Settings</Text>
          
          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>High Accuracy GPS</Text>
              <Text style={s.settingDesc}>
                More accurate but uses more battery
              </Text>
            </View>
            <Switch
              value={useHighAccuracy}
              onValueChange={setUseHighAccuracy}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <Text style={s.settingLabel}>Location Cache Time</Text>
            <Text style={s.settingValue}>{locationCacheTime} min</Text>
          </View>
          <View style={s.optionRow}>
            <TouchableOpacity
              style={[s.optionBtn, locationCacheTime === 1 && s.optionBtnSelected]}
              onPress={() => setLocationCacheTime(1)}
            >
              <Text style={[s.optionText, locationCacheTime === 1 && s.optionTextSelected]}>
                1 min
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.optionBtn, locationCacheTime === 5 && s.optionBtnSelected]}
              onPress={() => setLocationCacheTime(5)}
            >
              <Text style={[s.optionText, locationCacheTime === 5 && s.optionTextSelected]}>
                5 min
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.optionBtn, locationCacheTime === 10 && s.optionBtnSelected]}
              onPress={() => setLocationCacheTime(10)}
            >
              <Text style={[s.optionText, locationCacheTime === 10 && s.optionTextSelected]}>
                10 min
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔔 Notification Settings</Text>
          
          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Notify About New Shops</Text>
              <Text style={s.settingDesc}>
                Get notified when new shops open nearby
              </Text>
            </View>
            <Switch
              value={notifyNewShops}
              onValueChange={setNotifyNewShops}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Price Change Alerts</Text>
              <Text style={s.settingDesc}>
                Get notified about deals and discounts
              </Text>
            </View>
            <Switch
              value={notifyPriceChanges}
              onValueChange={setNotifyPriceChanges}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* Settings Info Box */}
        <View style={s.infoBox}>
          <Text style={s.infoTitle}>💡 Tips for Best Results</Text>
          <Text style={s.infoText}>
            • Use 3-5km radius for balanced results{'\n'}
            • Enable auto-expand to never miss options{'\n'}
            • High accuracy GPS drains battery faster{'\n'}
            • Google Places provides best data quality{'\n'}
            • Filter by rating to see top-rated shops
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.resetBtn}
            onPress={resetToDefaults}
          >
            <Text style={s.resetBtnText}>Reset to Defaults</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.saveBtn}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#121212' : '#F5F5F5',
  },
  scroll: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#333' : '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#fff',
    marginTop: 15,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#333' : '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#666',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  optionBtnSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme === 'dark' ? '#fff' : '#000',
  },
  optionTextSelected: {
    color: '#fff',
  },
  sortBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  sortBtnSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme === 'dark' ? '#fff' : '#000',
  },
  sortTextSelected: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: theme === 'dark' ? '#1A3A1A' : '#E8F5E9',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 10,
    marginTop: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#81C784' : '#2E7D32',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme === 'dark' ? '#A5D6A7' : '#388E3C',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 10,
    marginTop: 20,
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF3B30',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default NearbySettingsScreen;
