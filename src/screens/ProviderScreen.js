// frontend/src/screens/ProviderScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, Modal, ScrollView,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import io from 'socket.io-client';

const API_URL    = 'https://heymatebackend-production.up.railway.app/api';
const SOCKET_URL = 'https://heymatebackend-production.up.railway.app';

const STATUS_INFO = {
  pending:         { color: '#f59e0b', icon: '⏳', label: 'Pending' },
  assigned:        { color: '#3b82f6', icon: '👷', label: 'Assigned' },
  payment_pending: { color: '#8b5cf6', icon: '💳', label: 'Payment Pending' },
  active:          { color: '#10b981', icon: '🔄', label: 'Active' },
  completed:       { color: '#059669', icon: '✅', label: 'Completed' },
  cancelled:       { color: '#ef4444', icon: '❌', label: 'Cancelled' },
};

export default function ProviderScreen() {
  const { user } = useAuth();
  const theme    = useTheme();
  const socket   = useRef(null);

  const [tab, setTab]                     = useState('new');       // 'new' | 'active' | 'history'
  const [newRequests, setNewRequests]     = useState([]);
  const [activeJobs, setActiveJobs]       = useState([]);
  const [history, setHistory]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [offerModal, setOfferModal]       = useState(false);
  const [selectedReq, setSelectedReq]     = useState(null);
  const [offerPrice, setOfferPrice]       = useState('');
  const [offerMsg, setOfferMsg]           = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [detailModal, setDetailModal]     = useState(false);
  const [isAvailable, setIsAvailable]     = useState(true);
  const [newReqAlert, setNewReqAlert]     = useState(null);

  useEffect(() => {
    fetchRequests();
    setupSocket();
    return () => { if (socket.current) socket.current.disconnect(); };
  }, []);

  const apiCall = async (method, url, data = null) => {
    const token = await AsyncStorage.getItem('token');
    const res   = await fetch(`${API_URL}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(data && { body: JSON.stringify(data) }),
    });
    return res.json();
  };

  const setupSocket = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      socket.current = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });

      socket.current.on('connect', () => {
        console.log('Provider socket connected');
        socket.current.emit('join-providers');
      });

      // New request notification
      socket.current.on('new-request', (data) => {
        setNewReqAlert(data);
        fetchRequests();
        setTimeout(() => setNewReqAlert(null), 5000);
      });

      // Payment confirmed
      socket.current.on('payment-confirmed', (data) => {
        Alert.alert('💰 Payment Confirmed!', data.message + '\n\n📍 ' + (data.userAddress || ''));
        fetchRequests();
      });

      // Request cancelled
      socket.current.on('request-cancelled', () => {
        Alert.alert('❌ Request Cancelled', 'The user cancelled this request.');
        fetchRequests();
      });

    } catch (e) { console.log('Socket error:', e.message); }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [newRes, myRes] = await Promise.all([
        apiCall('GET', '/requests/provider-requests'),
        apiCall('GET', '/requests/my-requests'),
      ]);

      setNewRequests(newRes.data || []);

      const allReqs = myRes.data || [];
      setActiveJobs(allReqs.filter(r => ['payment_pending','active','assigned'].includes(r.status)));
      setHistory(allReqs.filter(r => ['completed','cancelled'].includes(r.status)));

    } catch (e) { console.log('Fetch error:', e.message); }
    finally { setLoading(false); }
  };

  const handleMakeOffer = async () => {
    if (!offerPrice) { Alert.alert('Error', 'Enter your price'); return; }
    try {
      setSubmitting(true);
      const res = await apiCall('POST', `/requests/${selectedReq._id}/offer`, {
        price:   Number(offerPrice),
        message: offerMsg,
      });
      if (res.success) {
        setOfferModal(false);
        setOfferPrice(''); setOfferMsg('');
        Alert.alert('✅ Offer Sent!', 'Your offer has been sent to the user. You will be notified if they accept.');
        fetchRequests();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  };

  const handleReject = async (reqId) => {
    Alert.alert('Reject Request', 'Skip this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip', style: 'destructive',
        onPress: async () => {
          await apiCall('POST', `/requests/${reqId}/reject`);
          fetchRequests();
        },
      },
    ]);
  };

  const handleComplete = async (reqId) => {
    Alert.alert('Mark Complete', 'Have you finished the service?', [
      { text: 'Not Yet', style: 'cancel' },
      {
        text: '✅ Yes, Completed!',
        onPress: async () => {
          const res = await apiCall('PUT', `/requests/${reqId}/complete`);
          if (res.success) {
            Alert.alert('🎉 Service Completed!', 'Great job! The user has been notified.');
            fetchRequests();
            setDetailModal(false);
          } else {
            Alert.alert('Error', res.message);
          }
        },
      },
    ]);
  };

  const toggleAvailability = async () => {
    try {
      const newStatus = !isAvailable;
      await apiCall('PUT', '/providers/availability', { isAvailable: newStatus });
      setIsAvailable(newStatus);
    } catch (e) {}
  };

  // ── Request Card ─────────────────────────────────────────────────────────────
  const NewRequestCard = ({ item }) => (
    <View style={[s.reqCard, { backgroundColor: theme.cardBackground, borderLeftColor: '#f59e0b' }]}>
      <View style={s.reqTop}>
        <View style={s.reqIconWrap}>
          <Text style={{ fontSize: 28 }}>🛠️</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.reqTitle, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[s.reqCat, { color: theme.textSecondary }]}>📂 {item.category}</Text>
          {item.budget > 0 && <Text style={s.reqBudget}>💰 Budget: ₹{item.budget}</Text>}
          <Text style={[s.reqAddr, { color: theme.textSecondary }]} numberOfLines={1}>
            📍 {item.location?.address || 'Location not provided'}
          </Text>
        </View>
      </View>
      <Text style={[s.reqDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text>
      <View style={s.reqActions}>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#10b981' }]}
          onPress={() => { setSelectedReq(item); setOfferModal(true); }}
        >
          <Text style={s.actionBtnTxt}>✅ Send Offer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#fee2e2' }]}
          onPress={() => handleReject(item._id)}
        >
          <Text style={[s.actionBtnTxt, { color: '#ef4444' }]}>❌ Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ActiveJobCard = ({ item }) => {
    const info = STATUS_INFO[item.status] || STATUS_INFO.active;
    return (
      <TouchableOpacity
        style={[s.reqCard, { backgroundColor: theme.cardBackground, borderLeftColor: info.color }]}
        onPress={() => { setSelectedReq(item); setDetailModal(true); }}
      >
        <View style={s.reqTop}>
          <View style={[s.reqIconWrap, { backgroundColor: info.color + '20' }]}>
            <Text style={{ fontSize: 26 }}>{info.icon}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.reqTitle, { color: theme.textPrimary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[s.reqCat, { color: theme.textSecondary }]}>{item.category}</Text>
            {item.finalAmount > 0 && <Text style={s.reqBudget}>💰 Amount: ₹{item.finalAmount}</Text>}
          </View>
          <View style={[s.statusBadge, { backgroundColor: info.color + '20' }]}>
            <Text style={[s.statusTxt, { color: info.color }]}>{info.icon} {info.label}</Text>
          </View>
        </View>
        <Text style={[s.reqAddr, { color: theme.textSecondary }]} numberOfLines={1}>
          📍 {item.location?.address}
        </Text>
        {item.status === 'active' && (
          <TouchableOpacity
            style={[s.completeBtn]}
            onPress={() => handleComplete(item._id)}
          >
            <Text style={s.completeBtnTxt}>✅ Mark as Completed</Text>
          </TouchableOpacity>
        )}
        {item.status === 'payment_pending' && (
          <View style={s.waitingBadge}>
            <Text style={s.waitingTxt}>⏳ Waiting for user payment...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.headerBackground }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>👷 Provider Dashboard</Text>
            <Text style={s.headerSub}>{user?.name || 'Provider'}</Text>
          </View>
          <TouchableOpacity
            style={[s.availBtn, { backgroundColor: isAvailable ? '#dcfce7' : '#fee2e2' }]}
            onPress={toggleAvailability}
          >
            <Text style={[s.availTxt, { color: isAvailable ? '#16a34a' : '#ef4444' }]}>
              {isAvailable ? '🟢 Available' : '🔴 Busy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[s.tabs, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          {[
            { key: 'new',    label: `New (${newRequests.length})` },
            { key: 'active', label: `Active (${activeJobs.length})` },
            { key: 'history',label: 'History' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, tab === t.key && s.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[s.tabTxt, tab === t.key && s.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* New request alert banner */}
      {newReqAlert && (
        <View style={s.alertBanner}>
          <Text style={s.alertTxt}>🔔 New {newReqAlert.category} request near you!</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <>
          {tab === 'new' && (
            newRequests.length === 0 ? (
              <View style={s.center}>
                <Text style={{ fontSize: 60 }}>🔍</Text>
                <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No new requests</Text>
                <Text style={[s.emptySub, { color: theme.textSecondary }]}>New requests nearby will appear here</Text>
                <TouchableOpacity style={s.refreshBtn} onPress={fetchRequests}>
                  <Text style={s.refreshBtnTxt}>🔄 Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={newRequests}
                keyExtractor={item => item._id}
                renderItem={({ item }) => <NewRequestCard item={item} />}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
                onRefresh={fetchRequests}
                refreshing={loading}
              />
            )
          )}

          {tab === 'active' && (
            activeJobs.length === 0 ? (
              <View style={s.center}>
                <Text style={{ fontSize: 60 }}>💼</Text>
                <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No active jobs</Text>
                <Text style={[s.emptySub, { color: theme.textSecondary }]}>Accept a request to get started</Text>
              </View>
            ) : (
              <FlatList
                data={activeJobs}
                keyExtractor={item => item._id}
                renderItem={({ item }) => <ActiveJobCard item={item} />}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
                onRefresh={fetchRequests}
                refreshing={loading}
              />
            )
          )}

          {tab === 'history' && (
            history.length === 0 ? (
              <View style={s.center}>
                <Text style={{ fontSize: 60 }}>📜</Text>
                <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No history yet</Text>
              </View>
            ) : (
              <FlatList
                data={history}
                keyExtractor={item => item._id}
                renderItem={({ item }) => <ActiveJobCard item={item} />}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
              />
            )
          )}
        </>
      )}

      {/* ── Make Offer Modal ── */}
      <Modal visible={offerModal} animationType="slide" transparent onRequestClose={() => setOfferModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>💼 Send Offer</Text>
              <TouchableOpacity onPress={() => setOfferModal(false)}>
                <Text style={{ fontSize: 26, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedReq && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={[s.offerReqInfo, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[{ color: theme.textPrimary, fontWeight: '700', fontSize: 15 }]}>{selectedReq.title}</Text>
                  <Text style={[{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }]}>{selectedReq.description}</Text>
                  {selectedReq.budget > 0 && (
                    <Text style={{ color: '#10b981', marginTop: 4, fontWeight: '600' }}>Client Budget: ₹{selectedReq.budget}</Text>
                  )}
                </View>
                <Text style={[s.label, { color: theme.textPrimary }]}>Your Price (₹) *</Text>
                <View style={s.priceRow}>
                  <Text style={s.rupee}>₹</Text>
                  <TextInput
                    style={[s.priceInput, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="Enter your price"
                    placeholderTextColor={theme.placeholder}
                    value={offerPrice}
                    onChangeText={setOfferPrice}
                    keyboardType="number-pad"
                  />
                </View>
                <Text style={[s.label, { color: theme.textPrimary }]}>Message to Client</Text>
                <TextInput
                  style={[s.input, s.textarea, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
                  placeholder="e.g. I can fix this within 2 hours..."
                  placeholderTextColor={theme.placeholder}
                  value={offerMsg}
                  onChangeText={setOfferMsg}
                  multiline numberOfLines={3} textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[s.submitBtn, submitting && { backgroundColor: '#93c5fd' }]}
                  onPress={handleMakeOffer} disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.submitBtnTxt}>✅ Send Offer</Text>
                  }
                </TouchableOpacity>
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
  header:         { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16 },
  headerTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle:    { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  availBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  availTxt:       { fontSize: 13, fontWeight: 'bold' },
  tabs:           { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  tabBtn:         { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:      { backgroundColor: '#fff' },
  tabTxt:         { color: 'rgba(255,255,255,0.75)', fontWeight: '600', fontSize: 12 },
  tabTxtActive:   { color: '#2563eb' },
  alertBanner:    { backgroundColor: '#fef9c3', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  alertTxt:       { color: '#92400e', fontWeight: '700', fontSize: 14 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle:     { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  emptySub:       { fontSize: 14, textAlign: 'center', marginTop: 6 },
  refreshBtn:     { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  refreshBtnTxt:  { color: '#fff', fontWeight: 'bold' },
  reqCard:        { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3, borderLeftWidth: 4 },
  reqTop:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reqIconWrap:    { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center' },
  reqTitle:       { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  reqCat:         { fontSize: 12, marginBottom: 2 },
  reqBudget:      { fontSize: 12, color: '#10b981', fontWeight: '600', marginBottom: 2 },
  reqAddr:        { fontSize: 12, marginBottom: 6 },
  reqDesc:        { fontSize: 13, lineHeight: 20, marginBottom: 10 },
  reqActions:     { flexDirection: 'row', gap: 10 },
  actionBtn:      { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnTxt:   { fontWeight: 'bold', fontSize: 13, color: '#fff' },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusTxt:      { fontSize: 11, fontWeight: '700' },
  completeBtn:    { backgroundColor: '#10b981', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 8 },
  completeBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  waitingBadge:   { backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 8 },
  waitingTxt:     { color: '#92400e', fontWeight: '600', fontSize: 13 },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:     { fontSize: 20, fontWeight: 'bold' },
  offerReqInfo:   { borderRadius: 14, padding: 14, marginBottom: 16 },
  label:          { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  priceRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rupee:          { fontSize: 24, fontWeight: 'bold', color: '#10b981', marginRight: 8 },
  priceInput:     { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 20, fontWeight: 'bold' },
  input:          { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  textarea:       { height: 90, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn:      { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3 },
  submitBtnTxt:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});