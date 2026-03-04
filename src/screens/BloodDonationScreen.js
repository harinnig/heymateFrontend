// frontend/src/screens/BloodDonationScreen.js - EMERGENCY BLOOD DONATION

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'YOUR_API_URL';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BloodDonationScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { user, token } = useContext(AuthContext);
  
  // State
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Blood Banks
  const [nearbyBloodBanks, setNearbyBloodBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  
  // Blood Donors
  const [nearbyDonors, setNearbyDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);
  
  // Emergency Request
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestBloodGroup, setRequestBloodGroup] = useState('');
  const [requestPatientName, setRequestPatientName] = useState('');
  const [requestHospital, setRequestHospital] = useState('');
  const [requestPhone, setRequestPhone] = useState('');
  const [requestUrgency, setRequestUrgency] = useState('urgent'); // urgent, normal
  
  // Donor Registration
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [isDonor, setIsDonor] = useState(false);
  const [donorBloodGroup, setDonorBloodGroup] = useState('');
  const [donorAvailable, setDonorAvailable] = useState(true);
  const [lastDonation, setLastDonation] = useState('');
  
  // Search State
  const [searchBloodGroup, setSearchBloodGroup] = useState('');
  const [searchRadius, setSearchRadius] = useState(5); // km

  const s = styles(theme);

  useEffect(() => {
    getCurrentLocation();
    checkDonorStatus();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const checkDonorStatus = async () => {
    try {
      const saved = await AsyncStorage.getItem('donorProfile');
      if (saved) {
        const profile = JSON.parse(saved);
        setIsDonor(true);
        setDonorBloodGroup(profile.bloodGroup);
        setDonorAvailable(profile.available !== false);
        setLastDonation(profile.lastDonation || '');
      }
    } catch (error) {
      console.error('Error checking donor status:', error);
    }
  };

  const findNearbyBloodBanks = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    try {
      setLoadingBanks(true);

      const res = await axios.get(`${API_URL}/blood/nearby-banks`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: searchRadius * 1000
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setNearbyBloodBanks(res.data.data);
        if (res.data.data.length === 0) {
          Alert.alert('No Results', 'No blood banks found nearby. Try increasing search radius.');
        }
      }
    } catch (error) {
      console.error('Error finding blood banks:', error);
      Alert.alert('Error', 'Failed to find blood banks');
    } finally {
      setLoadingBanks(false);
    }
  };

  const findNearbyDonors = async (bloodGroup) => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    if (!bloodGroup) {
      Alert.alert('Error', 'Please select a blood group');
      return;
    }

    try {
      setLoadingDonors(true);

      const res = await axios.get(`${API_URL}/blood/nearby-donors`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          bloodGroup: bloodGroup,
          radius: searchRadius * 1000
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setNearbyDonors(res.data.data);
        if (res.data.data.length === 0) {
          Alert.alert(
            'No Donors Found',
            `No ${bloodGroup} donors found within ${searchRadius}km. Try:\n• Increasing search radius\n• Checking compatible blood groups\n• Contacting blood banks`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error finding donors:', error);
      Alert.alert('Error', 'Failed to find donors');
    } finally {
      setLoadingDonors(false);
    }
  };

  const sendEmergencyRequest = async () => {
    if (!requestBloodGroup || !requestPatientName || !requestHospital || !requestPhone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        bloodGroup: requestBloodGroup,
        patientName: requestPatientName,
        hospital: requestHospital,
        phone: requestPhone,
        urgency: requestUrgency,
        location: location,
        requestedBy: user._id,
        timestamp: new Date().toISOString()
      };

      const res = await axios.post(`${API_URL}/blood/emergency-request`, requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Alert.alert(
          'Request Sent',
          `Emergency blood request sent to nearby ${requestBloodGroup} donors and blood banks.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowRequestModal(false);
                findNearbyDonors(requestBloodGroup);
                setRequestPatientName('');
                setRequestHospital('');
                setRequestPhone('');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error sending request:', error);
      Alert.alert('Error', 'Failed to send emergency request');
    } finally {
      setLoading(false);
    }
  };

  const registerAsDonor = async () => {
    if (!donorBloodGroup) {
      Alert.alert('Error', 'Please select your blood group');
      return;
    }

    try {
      setLoading(true);

      const donorProfile = {
        userId: user._id,
        name: user.name,
        bloodGroup: donorBloodGroup,
        phone: user.phone,
        location: location,
        available: donorAvailable,
        lastDonation: lastDonation,
        registeredAt: new Date().toISOString()
      };

      // Save locally
      await AsyncStorage.setItem('donorProfile', JSON.stringify(donorProfile));

      // Save to backend
      const res = await axios.post(`${API_URL}/blood/register-donor`, donorProfile, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setIsDonor(true);
        setShowDonorModal(false);
        Alert.alert('Success', 'You are now registered as a blood donor!');
      }
    } catch (error) {
      console.error('Error registering donor:', error);
      Alert.alert('Error', 'Failed to register as donor');
    } finally {
      setLoading(false);
    }
  };

  const updateDonorAvailability = async (available) => {
    try {
      setDonorAvailable(available);
      
      const profile = await AsyncStorage.getItem('donorProfile');
      if (profile) {
        const updated = { ...JSON.parse(profile), available };
        await AsyncStorage.setItem('donorProfile', JSON.stringify(updated));
        
        await axios.put(`${API_URL}/blood/donor-availability`, 
          { available },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const callBloodBank = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Phone', 'Phone number not available');
    }
  };

  const callDonor = (phone) => {
    Alert.alert(
      'Call Donor',
      'Call this donor for blood donation request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${phone}`)
        }
      ]
    );
  };

  const openInMaps = (lat, lon, name) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${name}@${lat},${lon}`,
      android: `geo:0,0?q=${lat},${lon}(${name})`
    });
    Linking.openURL(url);
  };

  const getCompatibleBloodGroups = (requested) => {
    const compatibility = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-']
    };
    return compatibility[requested] || [requested];
  };

  return (
    <View style={s.container}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>🩸 Blood Donation</Text>
          <Text style={s.headerSubtitle}>
            Find blood banks and donors nearby
          </Text>
        </View>

        {/* Emergency Alert Button */}
        <View style={s.emergencySection}>
          <TouchableOpacity
            style={s.emergencyButton}
            onPress={() => setShowRequestModal(true)}
          >
            <Text style={s.emergencyIcon}>🚨</Text>
            <Text style={s.emergencyText}>EMERGENCY</Text>
            <Text style={s.emergencyText}>BLOOD REQUEST</Text>
            <Text style={s.emergencySubtext}>Notify nearby donors</Text>
          </TouchableOpacity>
        </View>

        {/* Donor Status Card */}
        {isDonor ? (
          <View style={s.donorCard}>
            <View style={s.donorHeader}>
              <View>
                <Text style={s.donorTitle}>✓ You're a Registered Donor</Text>
                <Text style={s.donorBloodGroup}>Blood Group: {donorBloodGroup}</Text>
              </View>
              <TouchableOpacity
                style={[s.availabilityBadge, donorAvailable && s.availableBadge]}
                onPress={() => updateDonorAvailability(!donorAvailable)}
              >
                <Text style={s.availabilityText}>
                  {donorAvailable ? 'Available' : 'Not Available'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={s.donorInfo}>
              Thank you for saving lives! {donorAvailable ? 'You will receive' : "You won't receive"} emergency notifications.
            </Text>
          </View>
        ) : (
          <View style={s.registerCard}>
            <Text style={s.registerTitle}>Become a Blood Donor</Text>
            <Text style={s.registerDesc}>
              Register to help people in emergency situations
            </Text>
            <TouchableOpacity
              style={s.registerButton}
              onPress={() => setShowDonorModal(true)}
            >
              <Text style={s.registerButtonText}>Register as Donor</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Blood Group */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔍 Find Blood Donors</Text>
          
          <Text style={s.label}>Select Blood Group:</Text>
          <View style={s.bloodGroupGrid}>
            {BLOOD_GROUPS.map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  s.bloodGroupBtn,
                  searchBloodGroup === group && s.bloodGroupBtnSelected
                ]}
                onPress={() => setSearchBloodGroup(group)}
              >
                <Text style={[
                  s.bloodGroupText,
                  searchBloodGroup === group && s.bloodGroupTextSelected
                ]}>
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Search Radius:</Text>
          <View style={s.radiusRow}>
            {[5, 10, 20, 50].map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.radiusBtn, searchRadius === r && s.radiusBtnSelected]}
                onPress={() => setSearchRadius(r)}
              >
                <Text style={[
                  s.radiusText,
                  searchRadius === r && s.radiusTextSelected
                ]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={s.searchButton}
            onPress={() => findNearbyDonors(searchBloodGroup)}
            disabled={loadingDonors || !searchBloodGroup}
          >
            {loadingDonors ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.searchButtonText}>Search Donors</Text>
            )}
          </TouchableOpacity>

          {searchBloodGroup && (
            <View style={s.compatibilityBox}>
              <Text style={s.compatibilityTitle}>Compatible Groups:</Text>
              <Text style={s.compatibilityText}>
                {getCompatibleBloodGroups(searchBloodGroup).join(', ')}
              </Text>
            </View>
          )}

          {nearbyDonors.length > 0 && (
            <View style={s.resultsList}>
              <Text style={s.resultsTitle}>
                Found {nearbyDonors.length} {searchBloodGroup} Donor(s)
              </Text>
              {nearbyDonors.map((donor, index) => (
                <View key={index} style={s.donorResultCard}>
                  <View style={s.donorResultInfo}>
                    <Text style={s.donorResultName}>{donor.name}</Text>
                    <Text style={s.donorResultBlood}>🩸 {donor.bloodGroup}</Text>
                    <Text style={s.donorResultDistance}>
                      📍 {donor.distance} • 🚗 {donor.travelTime}
                    </Text>
                    {donor.lastDonation && (
                      <Text style={s.donorResultLast}>
                        Last donation: {new Date(donor.lastDonation).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={s.callDonorBtn}
                    onPress={() => callDonor(donor.phone)}
                  >
                    <Text style={s.callDonorText}>📞 Call</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Nearby Blood Banks */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🏥 Nearby Blood Banks</Text>
          
          <TouchableOpacity
            style={s.findButton}
            onPress={findNearbyBloodBanks}
            disabled={loadingBanks}
          >
            {loadingBanks ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <Text style={s.findButtonIcon}>🔍</Text>
                <Text style={s.findButtonText}>Find Blood Banks</Text>
              </>
            )}
          </TouchableOpacity>

          {nearbyBloodBanks.length > 0 && (
            <View style={s.banksList}>
              {nearbyBloodBanks.map((bank, index) => (
                <View key={index} style={s.bankCard}>
                  <View style={s.bankInfo}>
                    <Text style={s.bankName}>{bank.name}</Text>
                    <Text style={s.bankAddress}>{bank.address}</Text>
                    <Text style={s.bankDistance}>
                      📍 {bank.distance} • 🚗 {bank.travelTime}
                    </Text>
                    {bank.openingHours && (
                      <Text style={s.bankHours}>
                        🕐 {bank.isOpen ? '✅ Open' : '❌ Closed'} • {bank.openingHours}
                      </Text>
                    )}
                  </View>
                  <View style={s.bankActions}>
                    <TouchableOpacity
                      style={s.bankActionBtn}
                      onPress={() => callBloodBank(bank.phone)}
                    >
                      <Text style={s.bankActionText}>📞 Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.bankActionBtn}
                      onPress={() => openInMaps(bank.lat, bank.lon, bank.name)}
                    >
                      <Text style={s.bankActionText}>🗺️ Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Emergency Contacts */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🆘 Emergency Numbers</Text>
          
          <TouchableOpacity
            style={s.emergencyContactBtn}
            onPress={() => Linking.openURL('tel:108')}
          >
            <Text style={s.emergencyContactIcon}>🚑</Text>
            <View style={s.emergencyContactInfo}>
              <Text style={s.emergencyContactTitle}>Ambulance</Text>
              <Text style={s.emergencyContactNumber}>108</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.emergencyContactBtn}
            onPress={() => Linking.openURL('tel:102')}
          >
            <Text style={s.emergencyContactIcon}>🩸</Text>
            <View style={s.emergencyContactInfo}>
              <Text style={s.emergencyContactTitle}>Blood Bank Helpline</Text>
              <Text style={s.emergencyContactNumber}>102</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={s.infoBox}>
          <Text style={s.infoTitle}>💡 Blood Donation Facts</Text>
          <Text style={s.infoText}>
            • 1 donation can save 3 lives{'\n'}
            • Eligible to donate every 3 months{'\n'}
            • Takes only 10-15 minutes{'\n'}
            • Age 18-65, weight {'>'} 50kg{'\n'}
            • Free health check-up provided{'\n'}
            • Helps reduce iron overload
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Emergency Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>🚨 Emergency Blood Request</Text>
            
            <Text style={s.inputLabel}>Blood Group Needed *</Text>
            <View style={s.bloodGroupModalGrid}>
              {BLOOD_GROUPS.map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    s.bloodGroupModalBtn,
                    requestBloodGroup === group && s.bloodGroupModalBtnSelected
                  ]}
                  onPress={() => setRequestBloodGroup(group)}
                >
                  <Text style={[
                    s.bloodGroupModalText,
                    requestBloodGroup === group && s.bloodGroupModalTextSelected
                  ]}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>Patient Name *</Text>
            <TextInput
              style={s.input}
              placeholder="Enter patient name"
              placeholderTextColor="#999"
              value={requestPatientName}
              onChangeText={setRequestPatientName}
            />

            <Text style={s.inputLabel}>Hospital Name *</Text>
            <TextInput
              style={s.input}
              placeholder="Enter hospital name"
              placeholderTextColor="#999"
              value={requestHospital}
              onChangeText={setRequestHospital}
            />

            <Text style={s.inputLabel}>Contact Phone *</Text>
            <TextInput
              style={s.input}
              placeholder="Enter contact number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={requestPhone}
              onChangeText={setRequestPhone}
            />

            <Text style={s.inputLabel}>Urgency Level</Text>
            <View style={s.urgencyRow}>
              <TouchableOpacity
                style={[s.urgencyBtn, requestUrgency === 'urgent' && s.urgencyBtnSelected]}
                onPress={() => setRequestUrgency('urgent')}
              >
                <Text style={[s.urgencyText, requestUrgency === 'urgent' && s.urgencyTextSelected]}>
                  🚨 Urgent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.urgencyBtn, requestUrgency === 'normal' && s.urgencyBtnSelected]}
                onPress={() => setRequestUrgency('normal')}
              >
                <Text style={[s.urgencyText, requestUrgency === 'normal' && s.urgencyTextSelected]}>
                  📋 Normal
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalSendBtn}
                onPress={sendEmergencyRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalSendText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Donor Registration Modal */}
      <Modal
        visible={showDonorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDonorModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Register as Blood Donor</Text>
            
            <Text style={s.inputLabel}>Your Blood Group *</Text>
            <View style={s.bloodGroupModalGrid}>
              {BLOOD_GROUPS.map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    s.bloodGroupModalBtn,
                    donorBloodGroup === group && s.bloodGroupModalBtnSelected
                  ]}
                  onPress={() => setDonorBloodGroup(group)}
                >
                  <Text style={[
                    s.bloodGroupModalText,
                    donorBloodGroup === group && s.bloodGroupModalTextSelected
                  ]}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>Last Donation Date (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={lastDonation}
              onChangeText={setLastDonation}
            />

            <View style={s.checkboxRow}>
              <TouchableOpacity
                style={s.checkbox}
                onPress={() => setDonorAvailable(!donorAvailable)}
              >
                <Text style={s.checkboxIcon}>
                  {donorAvailable ? '☑️' : '⬜'}
                </Text>
                <Text style={s.checkboxText}>I'm available for donation</Text>
              </TouchableOpacity>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setShowDonorModal(false)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.modalSendBtn}
                onPress={registerAsDonor}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalSendText}>Register</Text>
                )}
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
  emergencySection: {
    padding: 20,
    alignItems: 'center',
  },
  emergencyButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emergencyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emergencyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emergencySubtext: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  donorCard: {
    marginHorizontal: 10,
    marginBottom: 15,
    padding: 15,
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#fff',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  donorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  donorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 4,
  },
  donorBloodGroup: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  availabilityBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
  },
  availableBadge: {
    backgroundColor: '#34C759',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  donorInfo: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  registerCard: {
    marginHorizontal: 10,
    marginBottom: 15,
    padding: 20,
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  registerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 8,
  },
  registerDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  registerButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: theme === 'dark' ? '#1E1E1E' : '#fff',
    marginTop: 15,
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 10,
  },
  bloodGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  bloodGroupBtn: {
    width: '23%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    alignItems: 'center',
    marginBottom: 10,
  },
  bloodGroupBtnSelected: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  bloodGroupText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
  },
  bloodGroupTextSelected: {
    color: '#fff',
  },
  radiusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  radiusBtnSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
  },
  radiusTextSelected: {
    color: '#fff',
  },
  searchButton: {
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  compatibilityBox: {
    padding: 12,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F0F8FF',
    borderRadius: 8,
    marginBottom: 15,
  },
  compatibilityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 5,
  },
  compatibilityText: {
    fontSize: 13,
    color: '#007AFF',
  },
  resultsList: {
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 10,
  },
  donorResultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    borderRadius: 8,
    marginBottom: 10,
  },
  donorResultInfo: {
    flex: 1,
  },
  donorResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 3,
  },
  donorResultBlood: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 3,
  },
  donorResultDistance: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  donorResultLast: {
    fontSize: 11,
    color: '#999',
  },
  callDonorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#34C759',
    borderRadius: 6,
  },
  callDonorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
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
    marginBottom: 15,
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
  banksList: {
    marginTop: 10,
  },
  bankCard: {
    padding: 12,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    borderRadius: 8,
    marginBottom: 10,
  },
  bankInfo: {
    marginBottom: 10,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 3,
  },
  bankAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  bankDistance: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 3,
  },
  bankHours: {
    fontSize: 12,
    color: '#666',
  },
  bankActions: {
    flexDirection: 'row',
    gap: 10,
  },
  bankActionBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: theme === 'dark' ? '#1A1A1A' : '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    alignItems: 'center',
  },
  bankActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  emergencyContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    borderRadius: 10,
    marginBottom: 10,
  },
  emergencyContactIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  emergencyContactInfo: {
    flex: 1,
  },
  emergencyContactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 3,
  },
  emergencyContactNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoBox: {
    marginHorizontal: 10,
    marginTop: 15,
    padding: 15,
    backgroundColor: theme === 'dark' ? '#1A3A1A' : '#E8F5E9',
    borderRadius: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
    marginBottom: 8,
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
  bloodGroupModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  bloodGroupModalBtn: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    alignItems: 'center',
    marginBottom: 8,
  },
  bloodGroupModalBtnSelected: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  bloodGroupModalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#fff' : '#000',
  },
  bloodGroupModalTextSelected: {
    color: '#fff',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme === 'dark' ? '#444' : '#DDD',
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F9F9F9',
    alignItems: 'center',
  },
  urgencyBtnSelected: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#fff' : '#000',
  },
  urgencyTextSelected: {
    color: '#fff',
  },
  checkboxRow: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 14,
    color: theme === 'dark' ? '#fff' : '#000',
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
  modalSendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalSendText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default BloodDonationScreen;