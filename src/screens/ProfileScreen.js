import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator, Image, Switch,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_URL    = 'https://heymatebackend-production.up.railway.app/api';
const SOCKET_URL = 'https://heymatebackend-production.up.railway.app';

const ProfileScreen = () => {
  const { user, logout, updateUser } = useAuth();
  const theme = useTheme();
  const socketRef = React.useRef(null);

  // ── Profile States ──
  const [profilePhoto, setProfilePhoto] = useState(user?.profileImage || null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  // ── Address States ──
  const [addressModal, setAddressModal]     = useState(false);
  const [street, setStreet]                 = useState('');
  const [city, setCity]                     = useState('');
  const [addressState, setAddressState]     = useState('');
  const [pincode, setPincode]               = useState('');
  const [country, setCountry]               = useState('India');
  const [locationLoading, setLocationLoading] = useState(false);

  // ── Notification States ──
  const [notifModal, setNotifModal]         = useState(false);
  const [notifications, setNotifications]   = useState([]);
  const [notifLoading, setNotifLoading]     = useState(false);
  const [unreadCount, setUnreadCount]       = useState(0);
  
  // ── Payment Notification Popup States ──
  const [payNotifPopup, setPayNotifPopup]   = useState(false);
  const [payNotifData, setPayNotifData]     = useState(null);

  // ── Notification Settings ──
  const [notifSettings, setNotifSettings] = useState({
    newOffer:       true,
    statusUpdate:   true,
    paymentConfirm: true,
    newRequest:     true,
    promotions:     false,
    sound:          true,
    vibration:      true,
  });

  // ── Initialize ──
  useEffect(() => {
    loadNotifications();
    loadNotificationSettings();
    loadUserAddress();
    setupSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  // ══════════════════════════════════════════════════════════════════════════
  // SOCKET SETUP
  // ══════════════════════════════════════════════════════════════════════════
  const setupSocket = async () => {
    if (!user?._id) return;
    try {
      const token = await AsyncStorage.getItem('token');
      socketRef.current = io(SOCKET_URL, {
        auth:       { token },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        socketRef.current.emit('join-user-room', user._id);
        console.log('🔔 Socket connected for notifications');
      });

      // ── Payment confirmed ──
      socketRef.current.on('request-status-update', (data) => {
        if (data.status === 'active' && notifSettings.paymentConfirm) {
          const newNotif = {
            id: Date.now().toString(),
            type: 'payment',
            title: '💰 Payment Confirmed!',
            message: data.message || 'Your payment was successful. Provider is on the way!',
            requestId: data.requestId,
            time: new Date().toISOString(),
            read: false,
          };
          addNotification(newNotif);
          showPaymentPopup(newNotif);
        }
        if (data.status === 'completed' && notifSettings.statusUpdate) {
          const newNotif = {
            id: Date.now().toString(),
            type: 'completed',
            title: '🎉 Service Completed!',
            message: data.message || 'Your service has been completed successfully!',
            requestId: data.requestId,
            time: new Date().toISOString(),
            read: false,
          };
          addNotification(newNotif);
          showPaymentPopup(newNotif);
        }
      });

      // ── New offer ──
      socketRef.current.on('new-offer', (data) => {
        if (notifSettings.newOffer) {
          const newNotif = {
            id: Date.now().toString(),
            type: 'new-offer',
            title: '💼 New Offer Received!',
            message: `A provider sent an offer of ₹${data.price} for "${data.requestTitle}"`,
            requestId: data.requestId,
            time: new Date().toISOString(),
            read: false,
          };
          addNotification(newNotif);
          showPaymentPopup(newNotif);
        }
      });

      // ── Offer accepted (for providers) ──
      socketRef.current.on('offer-accepted', (data) => {
        if (notifSettings.statusUpdate) {
          const newNotif = {
            id: Date.now().toString(),
            type: 'offer-accepted',
            title: '✅ Your Offer Accepted!',
            message: `User accepted your offer for ₹${data.price}`,
            requestId: data.requestId,
            time: new Date().toISOString(),
            read: false,
          };
          addNotification(newNotif);
          showPaymentPopup(newNotif);
        }
      });

    } catch (e) {
      console.log('Socket error:', e.message);
    }
  };

  const showPaymentPopup = (notifData) => {
    setPayNotifData(notifData);
    setPayNotifPopup(true);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════════════════
  const loadNotifications = async () => {
    try {
      setNotifLoading(true);
      const stored = await AsyncStorage.getItem('notifications');
      const list   = stored ? JSON.parse(stored) : [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.read).length);
    } catch (e) {
      console.log('Load notifications error:', e);
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const addNotification = async (newNotif) => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      const list   = stored ? JSON.parse(stored) : [];
      const updated = [newNotif, ...list].slice(0, 50); // Keep only last 50
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
      setNotifications(updated);
      setUnreadCount(updated.filter(n => !n.read).length);
    } catch (e) {
      console.log('Add notification error:', e);
    }
  };

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    await AsyncStorage.setItem('notifications', JSON.stringify(updated));
  };

  const clearAllNotifications = async () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive',
        onPress: async () => {
          setNotifications([]);
          setUnreadCount(0);
          await AsyncStorage.setItem('notifications', JSON.stringify([]));
        },
      },
    ]);
  };

  const loadNotificationSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifSettings');
      if (stored) setNotifSettings(JSON.parse(stored));
    } catch (e) {
      console.log('Load notif settings error:', e);
    }
  };

  const toggleNotifSetting = async (key) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    await AsyncStorage.setItem('notifSettings', JSON.stringify(updated));
    Alert.alert('✅ Updated', `${key.replace(/([A-Z])/g, ' $1').trim()} ${updated[key] ? 'enabled' : 'disabled'}`);
  };

  const getNotifIcon = (type) => {
    const icons = {
      'new-offer':     '💼',
      'offer-accepted':'✅',
      'payment':       '💰',
      'completed':     '🎉',
      'cancelled':     '❌',
      'new-request':   '📋',
      'status':        '🔔',
    };
    return icons[type] || '🔔';
  };

  const getNotifColor = (type) => {
    const colors = {
      'new-offer':     '#3b82f6',
      'offer-accepted':'#10b981',
      'payment':       '#8b5cf6',
      'completed':     '#059669',
      'cancelled':     '#ef4444',
      'new-request':   '#f59e0b',
      'status':        '#6b7280',
    };
    return colors[type] || '#6b7280';
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE & ROLE
  // ══════════════════════════════════════════════════════════════════════════
  const handleSwitchRole = async (newRole) => {
    if (newRole === user?.role) return;
    Alert.alert(
      newRole === 'provider' ? '👷 Switch to Provider?' : '👤 Switch to User?',
      newRole === 'provider'
        ? 'You will see the Provider Dashboard to accept jobs.'
        : 'You will switch back to User mode to post service requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch Now',
          onPress: async () => {
            try {
              setSwitchingRole(true);
              const token = await AsyncStorage.getItem('token');
              const res   = await fetch(`${API_URL}/auth/switch-role`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify({ role: newRole }),
              });
              const data = await res.json();
              if (data.success) {
                await updateUser({ role: newRole });
                Alert.alert('✅ Switched!', `You are now in ${newRole === 'provider' ? 'Provider' : 'User'} mode.`);
              } else {
                Alert.alert('Cannot Switch', data.message || 'Please register as a provider first.');
              }
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setSwitchingRole(false);
            }
          },
        },
      ]
    );
  };

  const handleProfilePhoto = () => {
    Alert.alert('Update Profile Photo', 'Choose option', [
      { text: 'Camera',  onPress: openCamera },
      { text: 'Gallery', onPress: openGallery },
      { text: 'Cancel',  style: 'cancel' },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission required'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (!result.canceled) saveProfilePhoto(result.assets[0].uri);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Gallery permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (!result.canceled) saveProfilePhoto(result.assets[0].uri);
  };

  const saveProfilePhoto = async (uri) => {
    try {
      setPhotoLoading(true);
      setProfilePhoto(uri);
      await updateUser({ profileImage: uri });
      Alert.alert('✅ Photo updated!');
    } catch { 
      Alert.alert('Error saving photo'); 
    } finally { 
      setPhotoLoading(false); 
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ADDRESS
  // ══════════════════════════════════════════════════════════════════════════
  const loadUserAddress = () => {
    if (user?.address) {
      setStreet(user.address.street || '');
      setCity(user.address.city || '');
      setAddressState(user.address.state || '');
      setPincode(user.address.pincode || '');
      setCountry(user.address.country || 'India');
    }
  };

  const handleGetLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Location permission required'); return; }
      const loc     = await Location.getCurrentPositionAsync({});
      const [addr]  = await Location.reverseGeocodeAsync(loc.coords);
      if (addr) {
        setStreet(addr.street || '');
        setCity(addr.city || addr.district || '');
        setAddressState(addr.region || '');
        setPincode(addr.postalCode || '');
        setCountry(addr.country || 'India');
      }
    } catch { 
      Alert.alert('Location fetch failed'); 
    } finally { 
      setLocationLoading(false); 
    }
  };

  const handleSaveAddress = async () => {
    if (!city || !addressState || !pincode) { 
      Alert.alert('Error', 'Please fill City, State and Pincode'); 
      return; 
    }
    const result = await updateUser({ 
      address: { street, city, state: addressState, pincode, country } 
    });
    if (result?.success !== false) { 
      Alert.alert('✅ Address saved!'); 
      setAddressModal(false); 
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ══════════════════════════════════════════════════════════════════════════
  const handleLogout = () => {
    Alert.alert('Logout?', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={[s.header, { backgroundColor: theme.headerBackground }]}>
          <TouchableOpacity style={s.photoBtnWrap} onPress={handleProfilePhoto}>
            {photoLoading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: '#1d4ed8' }]}>
                <Text style={s.avatarLetter}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
              </View>
            )}
            <View style={s.cameraIcon}><Text style={{ fontSize: 14 }}>📷</Text></View>
          </TouchableOpacity>
          <Text style={s.userName}>{user?.name || 'User'}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          {user?.phone && <Text style={s.userPhone}>📱 {user.phone}</Text>}
          <View style={[s.roleBadge, { backgroundColor: user?.role === 'provider' ? '#10b981' : '#3b82f6' }]}>
            <Text style={s.roleTxt}>{user?.role === 'provider' ? '👷 Provider' : '👤 User'}</Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>

          {/* ── NOTIFICATIONS ── */}
          <TouchableOpacity
            style={[s.menuCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => { setNotifModal(true); loadNotifications(); }}
          >
            <View style={s.menuLeft}>
              <View style={[s.menuIconWrap, { backgroundColor: '#fef3c7' }]}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
              </View>
              <View>
                <Text style={[s.menuLabel, { color: theme.textPrimary }]}>Notifications</Text>
                <Text style={[s.menuSub, { color: theme.textSecondary }]}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </Text>
              </View>
            </View>
            <View style={s.menuRight}>
              {unreadCount > 0 && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadTxt}>{unreadCount}</Text>
                </View>
              )}
              <Text style={{ color: theme.textSecondary, fontSize: 20 }}>›</Text>
            </View>
          </TouchableOpacity>

          {/* ── ADDRESS ── */}
          <TouchableOpacity
            style={[s.menuCard, { backgroundColor: theme.cardBackground }]}
            onPress={() => { setAddressModal(true); loadUserAddress(); }}
          >
            <View style={s.menuLeft}>
              <View style={[s.menuIconWrap, { backgroundColor: '#dbeafe' }]}>
                <Text style={{ fontSize: 22 }}>📍</Text>
              </View>
              <View>
                <Text style={[s.menuLabel, { color: theme.textPrimary }]}>My Address</Text>
                <Text style={[s.menuSub, { color: theme.textSecondary }]}>
                  {user?.address?.city ? `${user.address.city}, ${user.address.state}` : 'Add your address'}
                </Text>
              </View>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 20 }}>›</Text>
          </TouchableOpacity>

          {/* ── SWITCH MODE ── */}
          <View style={[s.sectionCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>🔄 Switch Mode</Text>
            <Text style={[s.sectionSub, { color: theme.textSecondary }]}>
              Currently: {user?.role === 'provider' ? '👷 Provider Mode' : '👤 User Mode'}
            </Text>
            <View style={s.roleRow}>
              <TouchableOpacity
                style={[s.roleBtn, { borderColor: '#2563eb', backgroundColor: user?.role === 'user' ? '#2563eb' : 'transparent' }]}
                onPress={() => handleSwitchRole('user')}
                disabled={switchingRole || user?.role === 'user'}
              >
                <Text style={{ fontSize: 26 }}>👤</Text>
                <Text style={[s.roleBtnTxt, { color: user?.role === 'user' ? '#fff' : '#2563eb' }]}>User</Text>
                <Text style={{ color: user?.role === 'user' ? '#bfdbfe' : theme.textSecondary, fontSize: 11 }}>Post requests</Text>
                {user?.role === 'user' && <Text style={{ color: '#bfdbfe', fontSize: 10, marginTop: 2 }}>✅ Active</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.roleBtn, { borderColor: '#10b981', backgroundColor: user?.role === 'provider' ? '#10b981' : 'transparent' }]}
                onPress={() => handleSwitchRole('provider')}
                disabled={switchingRole || user?.role === 'provider'}
              >
                {switchingRole ? <ActivityIndicator color={user?.role === 'provider' ? '#fff' : '#10b981'} /> : (
                  <>
                    <Text style={{ fontSize: 26 }}>👷</Text>
                    <Text style={[s.roleBtnTxt, { color: user?.role === 'provider' ? '#fff' : '#10b981' }]}>Provider</Text>
                    <Text style={{ color: user?.role === 'provider' ? '#a7f3d0' : theme.textSecondary, fontSize: 11 }}>Accept jobs</Text>
                    {user?.role === 'provider' && <Text style={{ color: '#a7f3d0', fontSize: 10, marginTop: 2 }}>✅ Active</Text>}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── APP INFO ── */}
          <View style={[s.sectionCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>ℹ️ App Info</Text>
            {[
              { label: 'Version',   value: '1.0.0' },
              { label: 'Account',   value: user?.email || '' },
              { label: 'Member ID', value: user?._id?.slice(-8)?.toUpperCase() || '' },
            ].map(item => (
              <View key={item.label} style={[s.infoRow, { borderBottomColor: theme.divider || '#f1f5f9' }]}>
                <Text style={[s.infoLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                <Text style={[s.infoValue, { color: theme.textPrimary }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* ── LOGOUT ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutTxt}>🚪 Logout</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════
          NOTIFICATIONS MODAL
      ══════════════════════════════════════════════ */}
      <Modal visible={notifModal} animationType="slide" transparent onRequestClose={() => setNotifModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground || '#fff', maxHeight: '92%' }]}>

            {/* Header */}
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>🔔 Notifications</Text>
              <TouchableOpacity onPress={() => setNotifModal(false)}>
                <Text style={{ fontSize: 26, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            {notifications.length > 0 && (
              <View style={s.notifActions}>
                <TouchableOpacity style={s.notifActionBtn} onPress={markAllRead}>
                  <Text style={s.notifActionTxt}>✅ Mark All Read</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.notifActionBtn, { backgroundColor: '#fee2e2' }]} onPress={clearAllNotifications}>
                  <Text style={[s.notifActionTxt, { color: '#ef4444' }]}>🗑️ Clear All</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Notification List */}
              {notifLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
              ) : notifications.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Text style={{ fontSize: 60 }}>🔕</Text>
                  <Text style={[{ fontSize: 18, fontWeight: 'bold', marginTop: 12, color: theme.textPrimary }]}>No notifications yet</Text>
                  <Text style={[{ fontSize: 14, color: theme.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                    You'll see offer updates, payment confirmations and service status here
                  </Text>
                </View>
              ) : (
                notifications.map((notif, idx) => (
                  <View key={idx} style={[s.notifCard, { backgroundColor: notif.read ? theme.cardBackground : getNotifColor(notif.type) + '10', borderLeftColor: getNotifColor(notif.type) }]}>
                    <View style={[s.notifIconWrap, { backgroundColor: getNotifColor(notif.type) + '20' }]}>
                      <Text style={{ fontSize: 22 }}>{getNotifIcon(notif.type)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[s.notifTitle, { color: theme.textPrimary }]}>{notif.title}</Text>
                      <Text style={[s.notifMsg, { color: theme.textSecondary }]}>{notif.message}</Text>
                      <Text style={[s.notifTime, { color: theme.textSecondary }]}>
                        🕐 {new Date(notif.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {!notif.read && <View style={s.unreadDot} />}
                  </View>
                ))
              )}

              {/* ── Notification Settings ── */}
              <View style={[s.sectionCard, { backgroundColor: theme.cardBackground, margin: 0, marginTop: 16 }]}>
                <Text style={[s.sectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>⚙️ Notification Settings</Text>
                {[
                  { key: 'newOffer',       label: '💼 New Offer Received',     sub: 'When a provider sends you an offer' },
                  { key: 'statusUpdate',   label: '🔄 Status Updates',          sub: 'Request status changes' },
                  { key: 'paymentConfirm', label: '💰 Payment Confirmation',    sub: 'Payment success/failure' },
                  { key: 'newRequest',     label: '📋 New Nearby Requests',     sub: 'For providers only' },
                  { key: 'promotions',     label: '🎉 Promotions & Offers',     sub: 'Deals and discounts' },
                  { key: 'sound',          label: '🔊 Notification Sound',      sub: 'Play sound for notifications' },
                  { key: 'vibration',      label: '📳 Vibration',               sub: 'Vibrate on notifications' },
                ].map(item => (
                  <View key={item.key} style={[s.settingRow, { borderBottomColor: theme.divider || '#f1f5f9' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.settingLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                      <Text style={[s.settingSub, { color: theme.textSecondary }]}>{item.sub}</Text>
                    </View>
                    <Switch
                      value={notifSettings[item.key]}
                      onValueChange={() => toggleNotifSetting(item.key)}
                      trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                      thumbColor={notifSettings[item.key] ? '#2563eb' : '#f3f4f6'}
                    />
                  </View>
                ))}
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          ADDRESS MODAL
      ══════════════════════════════════════════════ */}
      <Modal visible={addressModal} animationType="slide" transparent onRequestClose={() => setAddressModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground || '#fff' }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>📍 Update Address</Text>
              <TouchableOpacity onPress={() => setAddressModal(false)}>
                <Text style={{ fontSize: 26, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[s.autoLocBtn, { backgroundColor: '#eff6ff' }]}
                onPress={handleGetLocation}
              >
                {locationLoading
                  ? <ActivityIndicator color="#2563eb" />
                  : <Text style={s.autoLocTxt}>📍 Auto Detect Location</Text>
                }
              </TouchableOpacity>
              {[
                { label: 'Street / Area',  value: street,       setter: setStreet,       key: 'street',       kb: 'default' },
                { label: 'City *',         value: city,         setter: setCity,         key: 'city',         kb: 'default' },
                { label: 'State *',        value: addressState, setter: setAddressState, key: 'state',        kb: 'default' },
                { label: 'Pincode *',      value: pincode,      setter: setPincode,      key: 'pincode',      kb: 'number-pad' },
                { label: 'Country',        value: country,      setter: setCountry,      key: 'country',      kb: 'default' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={[s.inputLabel, { color: theme.textPrimary }]}>{f.label}</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: theme.inputBackground || '#f8fafc', borderColor: theme.inputBorder || '#e2e8f0', color: theme.inputText || '#1f2937' }]}
                    value={f.value}
                    onChangeText={f.setter}
                    keyboardType={f.kb}
                    placeholder={f.label}
                    placeholderTextColor={theme.placeholder || '#9ca3af'}
                  />
                </View>
              ))}
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveAddress}>
                <Text style={s.saveBtnTxt}>💾 Save Address</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════
          PAYMENT NOTIFICATION POPUP
      ══════════════════════════════════════════════ */}
      <Modal
        visible={payNotifPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setPayNotifPopup(false)}
      >
        <View style={{
          flex: 1, justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}>
          <View style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 28,
            marginHorizontal: 30, alignItems: 'center', elevation: 10,
            shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10,
          }}>
            {/* Icon */}
            <View style={{
              width: 80, height: 80, borderRadius: 40, marginBottom: 16,
              backgroundColor: payNotifData?.type === 'payment'   ? '#dcfce7'
                             : payNotifData?.type === 'completed' ? '#eff6ff'
                             : payNotifData?.type === 'offer-accepted' ? '#d1fae5'
                             : '#fef9c3',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 40 }}>
                {payNotifData?.type === 'payment'   ? '💰'
               : payNotifData?.type === 'completed' ? '🎉'
               : payNotifData?.type === 'offer-accepted' ? '✅'
               : '💼'}
              </Text>
            </View>

            {/* Title */}
            <Text style={{
              fontSize: 20, fontWeight: 'bold', color: '#1f2937',
              textAlign: 'center', marginBottom: 10,
            }}>
              {payNotifData?.title}
            </Text>

            {/* Message */}
            <Text style={{
              fontSize: 14, color: '#6b7280', textAlign: 'center',
              lineHeight: 22, marginBottom: 24,
            }}>
              {payNotifData?.message}
            </Text>

            {/* OK Button */}
            <TouchableOpacity
              style={{
                backgroundColor:
                  payNotifData?.type === 'payment'   ? '#10b981'
                : payNotifData?.type === 'completed' ? '#2563eb'
                : payNotifData?.type === 'offer-accepted' ? '#10b981'
                : '#f59e0b',
                borderRadius: 14, paddingVertical: 14,
                paddingHorizontal: 40, width: '100%', alignItems: 'center',
              }}
              onPress={() => setPayNotifPopup(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                OK, Got it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export default ProfileScreen;

const s = StyleSheet.create({
  header:          { paddingTop: 60, paddingBottom: 30, alignItems: 'center', paddingHorizontal: 20 },
  photoBtnWrap:    { position: 'relative', marginBottom: 12 },
  avatar:          { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder:{ width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarLetter:    { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  cameraIcon:      { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  userName:        { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  userEmail:       { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 2 },
  userPhone:       { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 8 },
  roleBadge:       { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  roleTxt:         { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  menuCard:        { borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  menuLeft:        { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconWrap:    { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel:       { fontSize: 15, fontWeight: '700' },
  menuSub:         { fontSize: 12, marginTop: 2 },
  menuRight:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadBadge:     { backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadTxt:       { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  sectionCard:     { borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  sectionTitle:    { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  sectionSub:      { fontSize: 13, marginBottom: 12 },
  roleRow:         { flexDirection: 'row', gap: 10 },
  roleBtn:         { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2 },
  roleBtnTxt:      { fontWeight: '700', marginTop: 4, fontSize: 14 },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel:       { fontSize: 13 },
  infoValue:       { fontSize: 13, fontWeight: '600' },
  logoutBtn:       { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  logoutTxt:       { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHead:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:      { fontSize: 20, fontWeight: 'bold' },
  notifActions:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  notifActionBtn:  { flex: 1, backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, alignItems: 'center' },
  notifActionTxt:  { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  notifCard:       { flexDirection: 'row', alignItems: 'flex-start', padding: 14, marginBottom: 8, borderRadius: 12, borderLeftWidth: 3 },
  notifIconWrap:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  notifTitle:      { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  notifMsg:        { fontSize: 13, lineHeight: 18 },
  notifTime:       { fontSize: 11, marginTop: 4 },
  unreadDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6', marginTop: 4 },
  settingRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  settingLabel:    { fontSize: 14, fontWeight: '600' },
  settingSub:      { fontSize: 12, marginTop: 2 },
  autoLocBtn:      { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 14 },
  autoLocTxt:      { color: '#2563eb', fontWeight: '600', fontSize: 15 },
  inputLabel:      { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input:           { borderWidth: 1.5, borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 14 },
  saveBtn:         { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3 },
  saveBtnTxt:      { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});