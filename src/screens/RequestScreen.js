// frontend/src/screens/RequestScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://heymatebackend-production.up.railway.app';

const API_URL = 'https://heymatebackend-production.up.railway.app/api';

const CATEGORIES = [
  { icon: '🔧', name: 'Plumbing' },   { icon: '⚡', name: 'Electrical' },
  { icon: '🏠', name: 'Cleaning' },   { icon: '🎨', name: 'Painting' },
  { icon: '🔨', name: 'Carpentry' },  { icon: '❄️', name: 'AC Repair' },
  { icon: '🚗', name: 'Car Wash' },   { icon: '📦', name: 'Moving' },
  { icon: '💇', name: 'Salon' },      { icon: '🐾', name: 'Pet Care' },
  { icon: '📚', name: 'Tutoring' },   { icon: '🍔', name: 'Food Delivery' },
];

const STATUS_INFO = {
  pending:         { color: '#f59e0b', icon: '⏳', label: 'Finding Provider...' },
  assigned:        { color: '#3b82f6', icon: '👷', label: 'Provider Assigned' },
  payment_pending: { color: '#8b5cf6', icon: '💳', label: 'Payment Required' },
  active:          { color: '#10b981', icon: '🔄', label: 'Service in Progress' },
  completed:       { color: '#059669', icon: '✅', label: 'Completed' },
  cancelled:       { color: '#ef4444', icon: '❌', label: 'Cancelled' },
};

export default function RequestScreen() {
  const { user } = useAuth();
  const theme    = useTheme();

  const [tab, setTab]                       = useState('my'); // 'my' | 'new'
  const [myRequests, setMyRequests]         = useState([]);
  const [loading, setLoading]               = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  // ── Notification state ────────────────────────────────────────────────────
  const socketRef                           = React.useRef(null);
  const [notif, setNotif]                   = useState(null);
  const [notifVisible, setNotifVisible]     = useState(false);
  const [notifCount, setNotifCount]         = useState(0);
  const [notifList, setNotifList]           = useState([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // New request form
  const [title, setTitle]                   = useState('');
  const [description, setDescription]       = useState('');
  const [category, setCategory]             = useState('');
  const [budget, setBudget]                 = useState('');
  const [address, setAddress]               = useState('');
  const [userLoc, setUserLoc]               = useState(null);
  const [submitting, setSubmitting]         = useState(false);

  // Request detail modal
  const [detailModal, setDetailModal]       = useState(false);
  const [selectedReq, setSelectedReq]       = useState(null);
  const [loadingDetail, setLoadingDetail]   = useState(false);
  const [paymentModal, setPaymentModal]     = useState(false);
  const [payingReq, setPayingReq]           = useState(null);

  useEffect(() => {
    fetchMyRequests();
    detectLocation();
    setupSocket();
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  // ── Socket setup ──────────────────────────────────────────────────────────
  const setupSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      socketRef.current = io(SOCKET_URL, {
        auth: { token }, transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        if (user?._id) socketRef.current.emit('join-user-room', user._id);
      });

      // ── New offer received ──
      socketRef.current.on('new-offer', (data) => {
        const n = {
          id:      Date.now(),
          type:    'offer',
          icon:    '💼',
          title:   'New Offer Received!',
          message: `Provider sent ₹${data.price} offer for "${data.requestTitle}"`,
          time:    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          color:   '#f59e0b',
          bg:      '#fffbeb',
        };
        showNotif(n);
        fetchMyRequests();
      });

      // ── Offer accepted (status updates) ──
      socketRef.current.on('request-status-update', (data) => {
        let n = null;
        if (data.status === 'active') {
          n = {
            id:      Date.now(),
            type:    'payment',
            icon:    '💰',
            title:   'Payment Confirmed!',
            message: data.message || 'Your booking is confirmed! Provider is on the way.',
            time:    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            color:   '#10b981',
            bg:      '#f0fdf4',
          };
        } else if (data.status === 'completed') {
          n = {
            id:      Date.now(),
            type:    'completed',
            icon:    '🎉',
            title:   'Service Completed!',
            message: data.message || 'Your service has been completed successfully!',
            time:    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            color:   '#2563eb',
            bg:      '#eff6ff',
          };
        } else if (data.status === 'payment_pending') {
          n = {
            id:      Date.now(),
            type:    'accepted',
            icon:    '✅',
            title:   'Offer Accepted!',
            message: 'You accepted an offer. Please complete payment to confirm.',
            time:    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            color:   '#8b5cf6',
            bg:      '#f5f3ff',
          };
        }
        if (n) { showNotif(n); fetchMyRequests(); }
      });

      // ── Offer accepted by user (provider view) ──
      socketRef.current.on('offer-accepted', (data) => {
        const n = {
          id:      Date.now(),
          type:    'accepted',
          icon:    '✅',
          title:   'Offer Accepted!',
          message: data.message || 'Your offer was accepted!',
          time:    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          color:   '#10b981',
          bg:      '#f0fdf4',
        };
        showNotif(n);
      });

    } catch (e) { console.log('Socket error:', e.message); }
  };

  const showNotif = (n) => {
    setNotif(n);
    setNotifVisible(true);
    setNotifCount(prev => prev + 1);
    setNotifList(prev => [n, ...prev].slice(0, 20));
    // Auto hide after 4 seconds
    setTimeout(() => setNotifVisible(false), 4000);
  };

  const apiCall = async (method, url, data = null) => {
    const token = await AsyncStorage.getItem('token');
    const res   = await fetch(`${API_URL}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(data && { body: JSON.stringify(data) }),
    });
    return res.json();
  };

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc   = await Location.getCurrentPositionAsync({});
      const [addr] = await Location.reverseGeocodeAsync(loc.coords);
      setUserLoc(loc.coords);
      if (addr) setAddress(`${addr.street || ''} ${addr.district || ''} ${addr.city || ''} ${addr.region || ''}`.trim());
    } catch (e) {}
  };

  const fetchMyRequests = async () => {
    try {
      setRefreshing(true);
      const res = await apiCall('GET', '/requests/my-requests');
      setMyRequests(res.data || []);
    } catch (e) {} finally { setRefreshing(false); }
  };

  const handleSubmit = async () => {
    if (!title.trim())    { Alert.alert('Error', 'Enter a title'); return; }
    if (!description.trim()) { Alert.alert('Error', 'Describe the problem'); return; }
    if (!category)        { Alert.alert('Error', 'Select a category'); return; }
    if (!address.trim())  { Alert.alert('Error', 'Enter your address'); return; }

    try {
      setSubmitting(true);
      const res = await apiCall('POST', '/requests', {
        title: title.trim(),
        description: description.trim(),
        category,
        budget:    budget ? Number(budget) : 0,
        latitude:  userLoc?.latitude,
        longitude: userLoc?.longitude,
        address:   address.trim(),
      });

      if (res.success) {
        Alert.alert('🎉 Request Sent!', 'Your request has been sent to nearby providers. You will be notified when a provider responds.');
        setTitle(''); setDescription(''); setCategory(''); setBudget('');
        setTab('my');
        fetchMyRequests();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setSubmitting(false); }
  };

  const openRequest = async (req) => {
    setSelectedReq(req);
    setDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await apiCall('GET', `/requests/${req._id}`);
      if (res.success) setSelectedReq(res.data);
    } catch (e) {} finally { setLoadingDetail(false); }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      const res = await apiCall('POST', `/requests/${selectedReq._id}/accept-offer`, { offerId });
      if (res.success) {
        Alert.alert('✅ Offer Accepted!', 'Please complete payment to confirm the booking.');
        setDetailModal(false);
        const reqData = res.data || selectedReq;
        // Make sure finalAmount is set
        if (!reqData.finalAmount) {
          const offer = selectedReq.offers?.find(o => o._id === offerId);
          if (offer) reqData.finalAmount = offer.price;
        }
        setPayingReq(reqData);
        setPaymentModal(true);
        fetchMyRequests();
      } else {
        Alert.alert('Error', res.message || 'Could not accept offer');
      }
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handlePayment = async () => {
    try {
      const res = await apiCall('POST', `/requests/${payingReq._id}/payment`, {
        paymentId: 'PAY_' + Date.now(),
      });
      if (res.success) {
        setPaymentModal(false);
        Alert.alert('💰 Payment Confirmed!', '✅ Your booking is confirmed!\n\nThe provider will arrive soon. You will be notified when the service is completed.');
        fetchMyRequests();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleCancel = async (reqId) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await apiCall('PUT', `/requests/${reqId}/cancel`, { reason: 'Cancelled by user' });
            fetchMyRequests();
            setDetailModal(false);
          } catch (e) {}
        },
      },
    ]);
  };

  // ── Request Card ─────────────────────────────────────────────────────────────
  const RequestCard = ({ item }) => {
    const info = STATUS_INFO[item.status] || STATUS_INFO.pending;
    const cat  = CATEGORIES.find(c => c.name === item.category);
    return (
      <TouchableOpacity
        style={[s.reqCard, { backgroundColor: theme.cardBackground, borderLeftColor: info.color }]}
        onPress={() => openRequest(item)}
      >
        <View style={s.reqTop}>
          <View style={[s.reqCatIcon, { backgroundColor: info.color + '20' }]}>
            <Text style={{ fontSize: 24 }}>{cat?.icon || '🛠️'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.reqTitle, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[s.reqCat, { color: theme.textSecondary }]}>{item.category}</Text>
            {item.budget > 0 && <Text style={s.reqBudget}>💰 Budget: ₹{item.budget}</Text>}
          </View>
          <View>
            <View style={[s.statusBadge, { backgroundColor: info.color + '20' }]}>
              <Text style={[s.statusTxt, { color: info.color }]}>{info.icon} {info.label}</Text>
            </View>
            {item.offers?.length > 0 && (
              <Text style={s.offerCount}>{item.offers.length} offer{item.offers.length > 1 ? 's' : ''}</Text>
            )}
          </View>
        </View>
        <Text style={[s.reqAddr, { color: theme.textSecondary }]} numberOfLines={1}>
          📍 {item.location?.address || 'Location not set'}
        </Text>
        <Text style={[s.reqTime, { color: theme.textSecondary }]}>
          🕐 {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Payment pending CTA */}
        {item.status === 'payment_pending' && (
          <TouchableOpacity
            style={s.payNowBtn}
            onPress={() => { setPayingReq(item); setPaymentModal(true); }}
          >
            <Text style={s.payNowTxt}>💳 Pay Now to Confirm</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>

      {/* Header with notification bell */}
      <View style={[s.tabBar, { backgroundColor: theme.headerBackground }]}>
        <View style={s.headerRow}>
          <Text style={s.tabTitle}>📋 Requests</Text>
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => { setNotifPanelOpen(true); setNotifCount(0); }}
          >
            <Text style={{ fontSize: 26 }}>🔔</Text>
            {notifCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'my' && s.tabActive]}
            onPress={() => { setTab('my'); fetchMyRequests(); }}
          >
            <Text style={[s.tabTxt, tab === 'my' && s.tabTxtActive]}>My Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'new' && s.tabActive]}
            onPress={() => setTab('new')}
          >
            <Text style={[s.tabTxt, tab === 'new' && s.tabTxtActive]}>+ New Request</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Floating notification toast ── */}
      {notifVisible && notif && (
        <TouchableOpacity
          style={[s.toast, { backgroundColor: notif.bg, borderLeftColor: notif.color }]}
          onPress={() => setNotifVisible(false)}
          activeOpacity={0.9}
        >
          <Text style={s.toastIcon}>{notif.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.toastTitle, { color: notif.color }]}>{notif.title}</Text>
            <Text style={s.toastMsg} numberOfLines={2}>{notif.message}</Text>
          </View>
          <Text style={s.toastClose}>✕</Text>
        </TouchableOpacity>
      )}

      {/* My Requests */}
      {tab === 'my' && (
        refreshing ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : myRequests.length === 0 ? (
          <View style={s.center}>
            <Text style={{ fontSize: 60 }}>📋</Text>
            <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No requests yet</Text>
            <Text style={[s.emptySub, { color: theme.textSecondary }]}>Tap "+ New Request" to get started</Text>
            <TouchableOpacity style={s.newBtn} onPress={() => setTab('new')}>
              <Text style={s.newBtnTxt}>+ Create Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={myRequests}
            keyExtractor={item => item._id}
            renderItem={({ item }) => <RequestCard item={item} />}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            onRefresh={fetchMyRequests}
            refreshing={refreshing}
          />
        )
      )}

      {/* New Request Form */}
      {tab === 'new' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          <Text style={[s.formTitle, { color: theme.textPrimary }]}>📝 Create New Request</Text>

          <Text style={[s.label, { color: theme.textPrimary }]}>Service Title *</Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
            placeholder="e.g. Fix leaking pipe in bathroom"
            placeholderTextColor={theme.placeholder}
            value={title} onChangeText={setTitle}
          />

          <Text style={[s.label, { color: theme.textPrimary }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.name}
                style={[s.catChip, { borderColor: '#2563eb', backgroundColor: category === cat.name ? '#2563eb' : 'transparent' }]}
                onPress={() => setCategory(cat.name)}
              >
                <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                <Text style={[s.catChipTxt, { color: category === cat.name ? '#fff' : theme.textPrimary }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.label, { color: theme.textPrimary }]}>Describe the Problem *</Text>
          <TextInput
            style={[s.input, s.textarea, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
            placeholder="Describe the issue in detail..."
            placeholderTextColor={theme.placeholder}
            value={description} onChangeText={setDescription}
            multiline numberOfLines={4} textAlignVertical="top"
          />

          <Text style={[s.label, { color: theme.textPrimary }]}>Your Address *</Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
            placeholder="Enter your full address"
            placeholderTextColor={theme.placeholder}
            value={address} onChangeText={setAddress}
          />

          <Text style={[s.label, { color: theme.textPrimary }]}>Budget (₹) — Optional</Text>
          <TextInput
            style={[s.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
            placeholder="e.g. 500"
            placeholderTextColor={theme.placeholder}
            value={budget} onChangeText={setBudget}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[s.submitBtn, submitting && { backgroundColor: '#93c5fd' }]}
            onPress={handleSubmit} disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnTxt}>🚀 Send Request to Providers</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Request Detail Modal ── */}
      <Modal visible={detailModal} animationType="slide" transparent onRequestClose={() => setDetailModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground, maxHeight: '92%' }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>Request Details</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Text style={{ fontSize: 26, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>
            ) : selectedReq && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Status */}
                {(() => {
                  const info = STATUS_INFO[selectedReq.status] || STATUS_INFO.pending;
                  return (
                    <View style={[s.statusCard, { backgroundColor: info.color + '15', borderColor: info.color }]}>
                      <Text style={[s.statusBig, { color: info.color }]}>{info.icon} {info.label}</Text>
                      {(selectedReq.statusHistory?.length > 0) && (
                        <Text style={[s.statusMsg, { color: info.color }]}>
                          {selectedReq.statusHistory[selectedReq.statusHistory.length - 1]?.message || ''}
                        </Text>
                      )}
                    </View>
                  );
                })()}

                {/* Request Info */}
                <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[s.infoTitle, { color: theme.textPrimary }]}>{selectedReq.title}</Text>
                  <Text style={[s.infoSub, { color: theme.textSecondary }]}>{selectedReq.category}</Text>
                  <Text style={[s.infoDesc, { color: theme.textPrimary }]}>{selectedReq.description}</Text>
                  {selectedReq.budget > 0 && <Text style={s.infoBudget}>💰 Budget: ₹{selectedReq.budget}</Text>}
                  <Text style={[s.infoAddr, { color: theme.textSecondary }]}>📍 {selectedReq.location?.address}</Text>
                </View>

                {/* Offers */}
                {selectedReq.offers?.filter(o => o.status === 'pending').length > 0 && (
                  <View>
                    <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>
                      💼 Provider Offers ({selectedReq.offers.filter(o => o.status === 'pending').length})
                    </Text>
                    {selectedReq.offers.filter(o => o.status === 'pending').map(offer => (
                      <View key={offer._id} style={[s.offerCard, { backgroundColor: theme.cardBackground }]}>
                        <View style={s.offerTop}>
                          <View style={s.offerIcon}>
                            <Text style={{ fontSize: 28 }}>👷</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[s.offerProvider, { color: theme.textPrimary }]}>
                              {offer.provider?.user?.name || 'Provider'}
                            </Text>
                            <Text style={s.offerPrice}>💰 ₹{offer.price}</Text>
                            {offer.message && (
                              <Text style={[s.offerMsg, { color: theme.textSecondary }]}>{offer.message}</Text>
                            )}
                          </View>
                        </View>
                        {selectedReq.status === 'pending' && (
                          <TouchableOpacity
                            style={s.acceptBtn}
                            onPress={() => Alert.alert(
                              'Accept Offer?',
                              `Accept offer for ₹${offer.price}?\nYou will be redirected to payment.`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Accept & Pay', onPress: () => handleAcceptOffer(offer._id) },
                              ]
                            )}
                          >
                            <Text style={s.acceptBtnTxt}>✅ Accept & Pay ₹{offer.price}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Assigned Provider */}
                {selectedReq.assignedProvider && (
                  <View style={[s.infoCard, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[s.sectionTitle, { color: '#1d4ed8' }]}>👷 Assigned Provider</Text>
                    <Text style={{ color: '#1d4ed8', fontSize: 15 }}>
                      {selectedReq.assignedProvider?.user?.name || 'Your Provider'}
                    </Text>
                    {selectedReq.finalAmount > 0 && (
                      <Text style={{ color: '#1d4ed8', marginTop: 4 }}>💰 Amount: ₹{selectedReq.finalAmount}</Text>
                    )}
                  </View>
                )}

                {/* Pay Now */}
                {selectedReq.status === 'payment_pending' && (
                  <TouchableOpacity
                    style={[s.submitBtn, { backgroundColor: '#8b5cf6' }]}
                    onPress={() => { setDetailModal(false); setPayingReq(selectedReq); setPaymentModal(true); }}
                  >
                    <Text style={s.submitBtnTxt}>💳 Complete Payment ₹{selectedReq.finalAmount}</Text>
                  </TouchableOpacity>
                )}

                {/* Cancel */}
                {['pending', 'payment_pending'].includes(selectedReq.status) && (
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => handleCancel(selectedReq._id)}
                  >
                    <Text style={s.cancelBtnTxt}>❌ Cancel Request</Text>
                  </TouchableOpacity>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Notification Panel Modal ── */}
      <Modal
        visible={notifPanelOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifPanelOpen(false)}
      >
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground, maxHeight: '85%' }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>🔔 Notifications</Text>
              <TouchableOpacity onPress={() => setNotifPanelOpen(false)}>
                <Text style={{ fontSize: 26, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {notifList.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <Text style={{ fontSize: 50 }}>🔕</Text>
                <Text style={[{ color: theme.textPrimary, fontSize: 16, fontWeight: 'bold', marginTop: 12 }]}>
                  No notifications yet
                </Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 13, marginTop: 6 }]}>
                  Offers and status updates will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifList}
                keyExtractor={item => item.id?.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={[s.notifItem, { backgroundColor: item.bg, borderLeftColor: item.color }]}>
                    <Text style={s.notifItemIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.notifItemTitle, { color: item.color }]}>{item.title}</Text>
                      <Text style={[s.notifItemMsg, { color: theme.textSecondary }]}>{item.message}</Text>
                      <Text style={s.notifItemTime}>{item.time}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}

            {notifList.length > 0 && (
              <TouchableOpacity
                style={{ alignItems: 'center', padding: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}
                onPress={() => { setNotifList([]); setNotifCount(0); }}
              >
                <Text style={{ color: '#ef4444', fontWeight: '600' }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal visible={paymentModal} animationType="slide" transparent onRequestClose={() => setPaymentModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>💳 Complete Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModal(false)}>
                <Text style={{ fontSize: 26, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            {payingReq && (
              <ScrollView>
                <View style={[s.payCard, { backgroundColor: '#f0fdf4' }]}>
                  <Text style={s.payTitle}>{payingReq.title}</Text>
                  <Text style={s.payAmount}>₹{payingReq.finalAmount || payingReq.budget || 0}</Text>
                  <Text style={s.payProvider}>Provider accepted your request</Text>
                </View>
                <View style={s.payMethods}>
                  <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>Choose Payment Method</Text>
                  {[
                    { icon: '📱', label: 'UPI', sub: 'GPay, PhonePe, Paytm' },
                    { icon: '💳', label: 'Card', sub: 'Debit / Credit Card' },
                    { icon: '🏦', label: 'Net Banking', sub: 'All major banks' },
                    { icon: '💵', label: 'Cash', sub: 'Pay after service' },
                  ].map(method => (
                    <TouchableOpacity
                      key={method.label}
                      style={[s.payMethodBtn, { backgroundColor: theme.cardBackground }]}
                      onPress={handlePayment}
                    >
                      <Text style={{ fontSize: 28 }}>{method.icon}</Text>
                      <View style={{ marginLeft: 14 }}>
                        <Text style={[s.payMethodLabel, { color: theme.textPrimary }]}>{method.label}</Text>
                        <Text style={[s.payMethodSub, { color: theme.textSecondary }]}>{method.sub}</Text>
                      </View>
                      <Text style={{ color: theme.textSecondary, marginLeft: 'auto', fontSize: 20 }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1 },
  tabBar:         { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16 },
  tabTitle:       { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  tabs:           { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  tabBtn:         { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:      { backgroundColor: '#fff' },
  tabTxt:         { color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  tabTxtActive:   { color: '#2563eb' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle:     { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  emptySub:       { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  newBtn:         { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  newBtnTxt:      { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  reqCard:        { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, borderLeftWidth: 4 },
  reqTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reqCatIcon:     { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  reqTitle:       { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  reqCat:         { fontSize: 12, marginBottom: 2 },
  reqBudget:      { fontSize: 12, color: '#10b981', fontWeight: '600' },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusTxt:      { fontSize: 11, fontWeight: '700' },
  offerCount:     { fontSize: 11, color: '#f59e0b', fontWeight: '700', textAlign: 'center', marginTop: 4 },
  reqAddr:        { fontSize: 12, marginBottom: 2 },
  reqTime:        { fontSize: 11 },
  payNowBtn:      { backgroundColor: '#8b5cf6', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 8 },
  payNowTxt:      { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  form:           { padding: 16 },
  formTitle:      { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label:          { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input:          { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  textarea:       { height: 100, textAlignVertical: 'top' },
  catChip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 2 },
  catChipTxt:     { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  submitBtn:      { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3, marginTop: 8 },
  submitBtnTxt:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:     { fontSize: 20, fontWeight: 'bold' },
  statusCard:     { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 14 },
  statusBig:      { fontSize: 18, fontWeight: 'bold' },
  statusMsg:      { fontSize: 13, marginTop: 4 },
  infoCard:       { borderRadius: 14, padding: 14, marginBottom: 12 },
  infoTitle:      { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  infoSub:        { fontSize: 13, marginBottom: 8 },
  infoDesc:       { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  infoBudget:     { fontSize: 14, color: '#10b981', fontWeight: '600' },
  infoAddr:       { fontSize: 13, marginTop: 4 },
  sectionTitle:   { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 4 },
  offerCard:      { borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2 },
  offerTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  offerIcon:      { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  offerProvider:  { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  offerPrice:     { fontSize: 16, color: '#10b981', fontWeight: 'bold' },
  offerMsg:       { fontSize: 13, marginTop: 4 },
  acceptBtn:      { backgroundColor: '#10b981', borderRadius: 12, padding: 12, alignItems: 'center' },
  acceptBtnTxt:   { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelBtn:      { backgroundColor: '#fee2e2', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  cancelBtnTxt:   { color: '#ef4444', fontWeight: 'bold', fontSize: 14 },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bellBtn:        { position: 'relative', padding: 4 },
  badge:          { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeTxt:       { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  toast:          { position: 'absolute', top: 130, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderLeftWidth: 4, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, zIndex: 999 },
  toastIcon:      { fontSize: 28, marginRight: 12 },
  toastTitle:     { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  toastMsg:       { fontSize: 13, color: '#374151', lineHeight: 18 },
  toastClose:     { fontSize: 18, color: '#9ca3af', marginLeft: 8 },
  notifItem:      { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderLeftWidth: 4, marginBottom: 8, borderRadius: 12 },
  notifItemIcon:  { fontSize: 26, marginRight: 12, marginTop: 2 },
  notifItemTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  notifItemMsg:   { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  notifItemTime:  { fontSize: 11, color: '#9ca3af' },
  payCard:        { borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 },
  payTitle:       { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  payAmount:      { fontSize: 36, fontWeight: 'bold', color: '#10b981', marginBottom: 4 },
  payProvider:    { fontSize: 14, color: '#6b7280' },
  payMethods:     { gap: 10 },
  payMethodBtn:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, elevation: 2 },
  payMethodLabel: { fontSize: 16, fontWeight: '600' },
  payMethodSub:   { fontSize: 12, marginTop: 2 },
});