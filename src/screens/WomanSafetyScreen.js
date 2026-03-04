// frontend/src/screens/WomanSafetyScreen.js - WOMAN SAFETY FEATURES

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'YOUR_API_URL';

const WomanSafetyScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { user, token } = useContext(AuthContext);
  
  // State
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  
  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  
  // Nearby Safety Places
  const [nearbyPoliceStations, setNearbyPoliceStations] = useState([]);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  
  // Settings
  const [autoShareLocation, setAutoShareLocation] = useState(true);
  const [shakeToSOS, setShakeToSOS] = useState(true);
  const [silentMode, setSilentMode] = useState(false);

  const s = styles(theme);

  useEffect(() => {
    loadEmergencyContacts();
    loadSafetySettings();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for safety features');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadEmergencyContacts = async () => {
    try {
      const saved = await AsyncStorage.getItem('emergencyContacts');
      if (saved) {
        setEmergencyContacts(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadSafetySettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('safetySettings');
      if (saved) {
        const settings = JSON.parse(saved);
        setAutoShareLocation(settings.autoShareLocation !== false);
        setShakeToSOS(settings.shakeToSOS !== false);
        setSilentMode(settings.silentMode || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveEmergencyContact = async () => {
    if (!newContactName || !newContactPhone) {
      Alert.alert('Error', 'Please enter name and phone number');
      return;
    }

    const contact = {
      id: Date.now().toString(),
      name: newContactName,
      phone: newContactPhone.replace(/\s/g, ''),
      addedAt: new Date().toISOString()
    };

    const updated = [...emergencyContacts, contact];
    setEmergencyContacts(updated);
    await AsyncStorage.setItem('emergencyContacts', JSON.stringify(updated));
    
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContact(false);
    
    Alert.alert('Success', 'Emergency contact added');
  };

  const deleteContact = async (id) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = emergencyContacts.filter(c => c.id !== id);
            setEmergencyContacts(updated);
            await AsyncStorage.setItem('emergencyContacts', JSON.stringify(updated));
          }
        }
      ]
    );
  };

  const triggerSOS = async () => {
    Alert.alert(
      '🚨 SOS ALERT',
      'This will send emergency alerts to all your emergency contacts with your current location. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            setSosActive(true);
            setLoading(true);

            try {
              // Get current location
              await getCurrentLocation();

              if (!location) {
                Alert.alert('Error', 'Unable to get your location');
                return;
              }

              // Send SMS to all emergency contacts
              for (const contact of emergencyContacts) {
                const message = `🚨 EMERGENCY ALERT from ${user?.name || 'HeyMate User'}!\n\nI need help immediately!\n\nMy Location: https://maps.google.com/?q=${location.latitude},${location.longitude}\n\nTime: ${new Date().toLocaleString()}\n\nThis is an automated emergency message from HeyMate Safety App.`;
                
                const url = Platform.select({
                  ios: `sms:${contact.phone}&body=${encodeURIComponent(message)}`,
                  android: `sms:${contact.phone}?body=${encodeURIComponent(message)}`
                });

                await Linking.openURL(url);
              }

              // Call emergency number (option)
              Alert.alert(
                'SOS Sent',
                'Emergency alerts sent to your contacts. Do you want to call emergency services?',
                [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Call 100 (Police)',
                    onPress: () => Linking.openURL('tel:100')
                  },
                  {
                    text: 'Call 108 (Ambulance)',
                    onPress: () => Linking.openURL('tel:108')
                  }
                ]
              );

              // Send to backend for tracking
              await axios.post(`${API_URL}/safety/sos`, {
                userId: user._id,
                location: location,
                timestamp: new Date().toISOString(),
                contacts: emergencyContacts
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });

            } catch (error) {
              console.error('Error sending SOS:', error);
              Alert.alert('Error', 'Failed to send SOS. Please call emergency services directly.');
            } finally {
              setLoading(false);
              setTimeout(() => setSosActive(false), 5000);
            }
          }
        }
      ]
    );
  };

  const findNearbyPoliceStations = async () => {
    if (!location) {
      Alert.alert('Error', 'Unable to get your location');
      return;
    }

    try {
      setLoadingPlaces(true);

      const res = await axios.get(`${API_URL}/safety/nearby-police`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 5000 // 5km
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setNearbyPoliceStations(res.data.data);
        if (res.data.data.length === 0) {
          Alert.alert('No Results', 'No police stations found nearby. Expanding search...');
        }
      }
    } catch (error) {
      console.error('Error finding police stations:', error);
      Alert.alert('Error', 'Failed to find nearby police stations');
    } finally {
      setLoadingPlaces(false);
    }
  };

  const findNearbyHospitals = async () => {
    if (!location) {
      Alert.alert('Error', 'Unable to get your location');
      return;
    }

    try {
      setLoadingPlaces(true);

      const res = await axios.get(`${API_URL}/safety/nearby-hospitals`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 5000
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setNearbyHospitals(res.data.data);
      }
    } catch (error) {
      console.error('Error finding hospitals:', error);
      Alert.alert('Error', 'Failed to find nearby hospitals');
    } finally {
      setLoadingPlaces(false);
    }
  };

  const callPlace = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Phone', 'Phone number not available');
    }
  };

  const openInMaps = (lat, lon, name) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${name}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${name})`
    });
    Linking.openURL(url);
  };

  const shareLocation = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    const message = `My Current Location:\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}\n\nShared via HeyMate at ${new Date().toLocaleString()}`;

    try {
      await Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to share location');
    }
  };

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>👩 Woman Safety</Text>
          <Text style={s.headerSubtitle}>
            Emergency features and safety resources
          </Text>
        </View>

        {/* SOS Button - Most Prominent */}
        <View style={s.sosSection}>
          <TouchableOpacity
            style={[s.sosButton, sosActive && s.sosButtonActive]}
            onPress={triggerSOS}
            disabled={loading || emergencyContacts.length === 0}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Text style={s.sosIcon}>🚨</Text>
                <Text style={s.sosText}>SOS EMERGENCY</Text>
                <Text style={s.sosSubtext}>
                  Press to send emergency alerts
                </Text>
              </>
            )}
          </TouchableOpacity>

          {emergencyContacts.length === 0 && (
            <View style={s.warningBox}>
              <Text style={s.warningText}>
                ⚠️ Add emergency contacts below to use SOS
              </Text>
            </View>
          )}

          {sosActive && (
            <View style={s.activeAlert}>
              <Text style={s.activeAlertText}>
                ✓ SOS alerts sent to {emergencyContacts.length} contacts
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚡ Quick Actions</Text>
          
          <View style={s.quickActions}>
            <TouchableOpacity
              style={s.quickActionBtn}
              onPress={() => Linking.openURL('tel:100')}
            >
              <Text style={s.quickActionIcon}>👮</Text>
              <Text style={s.quickActionText}>Call Police</Text>
              <Text style={s.quickActionSubtext}>100</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickActionBtn}
              onPress={() => Linking.openURL('tel:108')}
            >
              <Text style={s.quickActionIcon}>🚑</Text>
              <Text style={s.quickActionText}>Ambulance</Text>
              <Text style={s.quickActionSubtext}>108</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickActionBtn}
              onPress={() => Linking.openURL('tel:1091')}
            >
              <Text style={s.quickActionIcon}>📞</Text>
              <Text style={s.quickActionText}>Women Helpline</Text>
              <Text style={s.quickActionSubtext}>1091</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.quickActionBtn}
              onPress={shareLocation}
            >
              <Text style={s.quickActionIcon}>📍</Text>
              <Text style={s.quickActionText}>Share Location</Text>
              <Text style={s.quickActionSubtext}>SMS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>👥 Emergency Contacts</Text>
            <TouchableOpacity onPress={() => setShowAddContact(true)}>
              <Text style={s.addButton}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {emergencyContacts.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyText}>No emergency contacts added</Text>
              <Text style={s.emptySubtext}>
                Add trusted contacts who will receive SOS alerts
              </Text>
              <TouchableOpacity
                style={s.emptyButton}
                onPress={() => setShowAddContact(true)}
              >
                <Text style={s.emptyButtonText}>Add First Contact</Text>
              </TouchableOpacity>
            </View>
          ) : (
            emergencyContacts.map((contact) => (
              <View key={contact.id} style={s.contactCard}>
                <View style={s.contactInfo}>
                  <Text style={s.contactName}>{contact.name}</Text>
                  <Text style={s.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={s.contactActions}>
                  <TouchableOpacity
                    style={s.contactActionBtn}
                    onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                  >
                    <Text style={s.contactActionIcon}>📞</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.contactActionBtn}
                    onPress={() => deleteContact(contact.id)}
                  >
                    <Text style={s.contactActionIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Nearby Safety Places */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🏢 Nearby Safety Places</Text>
          
          <TouchableOpacity
            style={s.findButton}
            onPress={findNearbyPoliceStations}
            disabled={loadingPlaces}
          >
            {loadingPlaces ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <Text style={s.findButtonIcon}>👮</Text>
                <Text style={s.findButtonText}>Find Police Stations</Text>
              </>
            )}
          </TouchableOpacity>

          {nearbyPoliceStations.length > 0 && (
            <View style={s.placesList}>
              {nearbyPoliceStations.slice(0, 3).map((place, index) => (
                <View key={index} style={s.placeCard}>
                  <View style={s.placeInfo}>
                    <Text style={s.placeName}>{place.name}</Text>
                    <Text style={s.placeAddress}>{place.address}</Text>
                    <Text style={s.placeDistance}>
                      📍 {place.distance} • 🚗 {place.travelTime}
                    </Text>
                  </View>
                  <View style={s.placeActions}>
                    <TouchableOpacity
                      style={s.placeActionBtn}
                      onPress={() => callPlace(place.phone)}
                    >
                      <Text style={s.placeActionText}>📞 Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.placeActionBtn}
                      onPress={() => openInMaps(place.lat, place.lon, place.name)}
                    >
                      <Text style={s.placeActionText}>🗺️ Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={s.findButton}
            onPress={findNearbyHospitals}
            disabled={loadingPlaces}
          >
            {loadingPlaces ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <Text style={s.findButtonIcon}>🏥</Text>
                <Text style={s.findButtonText}>Find Hospitals</Text>
              </>
            )}
          </TouchableOpacity>

          {nearbyHospitals.length > 0 && (
            <View style={s.placesList}>
              {nearbyHospitals.slice(0, 3).map((place, index) => (
                <View key={index} style={s.placeCard}>
                  <View style={s.placeInfo}>
                    <Text style={s.placeName}>{place.name}</Text>
                    <Text style={s.placeAddress}>{place.address}</Text>
                    <Text style={s.placeDistance}>
                      📍 {place.distance} • 🚗 {place.travelTime}
                    </Text>
                  </View>
                  <View style={s.placeActions}>
                    <TouchableOpacity
                      style={s.placeActionBtn}
                      onPress={() => callPlace(place.phone)}
                    >
                      <Text style={s.placeActionText}>📞 Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.placeActionBtn}
                      onPress={() => openInMaps(place.lat, place.lon, place.name)}
                    >
                      <Text style={s.placeActionText}>🗺️ Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Safety Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚙️ Safety Settings</Text>
          
          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Auto Share Location</Text>
              <Text style={s.settingDesc}>
                Automatically include location in SOS alerts
              </Text>
            </View>
            <Switch
              value={autoShareLocation}
              onValueChange={setAutoShareLocation}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Shake to SOS</Text>
              <Text style={s.settingDesc}>
                Shake phone to trigger emergency alert
              </Text>
            </View>
            <Switch
              value={shakeToSOS}
              onValueChange={setShakeToSOS}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>

          <View style={s.settingRow}>
            <View style={s.settingInfo}>
              <Text style={s.settingLabel}>Silent Mode</Text>
              <Text style={s.settingDesc}>
                Send alerts without notification sound
              </Text>
            </View>
            <Switch
              value={silentMode}
              onValueChange={setSilentMode}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
            />
          </View>
        </View>

        {/* Safety Tips */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>💡 Safety Tips</Text>
          <View style={s.tipBox}>
            <Text style={s.tipText}>
              • Always trust your instincts{'\n'}
              • Keep phone charged and accessible{'\n'}
              • Share location with trusted contacts{'\n'}
              • Know emergency numbers: 100 (Police), 108 (Ambulance), 1091 (Women){'\n'}
              • Avoid isolated areas at night{'\n'}
              • Stay alert and aware of surroundings
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContact}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddContact(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Emergency Contact</Text>
            
            <TextInput
              style={s.input}
              placeholder="Contact Name"
              placeholderTextColor="#999"
              value={newContactName}
              onChangeText={setNewContactName}
            />

            <TextInput
              style={s.input}
              placeholder="Phone Number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={newContactPhone}
              onChangeText={setNewContactPhone}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => {
                  setNewContactName('');
                  setNewContactPhone('');
                  setShowAddContact(false);
                }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalSaveBtn}
                onPress={saveEmergencyContact}
              >
                <Text style={s.modalSaveText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sosSection: {
    padding: 20,
    alignItems: 'center',
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonActive: {
    backgroundColor: '#34C759',
  },
  sosIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  sosText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  sosSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  warningBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
  },
  activeAlert: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#D1F2EB',
    borderRadius: 8,
  },
  activeAlertText: {
    fontSize: 14,
    color: '#0F5132',
    fontWeight: '600',
  },
  section: {
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#fff',
    marginTop: 15,
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 15,
  },
  addButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    width: '48%',
    padding: 15,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#444' : '#E0E0E0',
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 3,
  },
  quickActionSubtext: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  emptyButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    borderRadius: 8,
    marginBottom: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 3,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  contactActionBtn: {
    padding: 8,
  },
  contactActionIcon: {
    fontSize: 20,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 10,
  },
  findButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  findButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  placesList: {
    marginTop: 10,
  },
  placeCard: {
    padding: 12,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    borderRadius: 8,
    marginBottom: 10,
  },
  placeInfo: {
    marginBottom: 10,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 3,
  },
  placeAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  placeDistance: {
    fontSize: 12,
    color: '#007AFF',
  },
  placeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  placeActionBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: theme === 'dark' ? '#1A1A1A' : '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    alignItems: 'center',
  },
  placeActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
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
  tipBox: {
    padding: 15,
    backgroundColor: theme === 'dark' ? '#1A3A1A' : '#E8F5E9',
    borderRadius: 8,
  },
  tipText: {
    fontSize: 13,
    color: theme === 'dark' ? '#A5D6A7' : '#388E3C',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#fff',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF3B30',
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default WomanSafetyScreen;