// frontend/src/screens/PaymentScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://heymatebackend-production.up.railway.app/api';

export default function PaymentScreen({ route, navigation }) {
  const { requestId, amount, requestTitle } = route.params;
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const initiatePayment = async (method) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      const res = await fetch(`${API_URL}/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          requestId,
          amount,
          method, // 'razorpay', 'phonepe', 'paytm', 'cash'
        }),
      });

      const data = await res.json();

      if (data.success && data.paymentUrl) {
        // Open payment gateway in WebView
        setPaymentUrl(data.paymentUrl);
        setShowWebView(true);
      } else if (method === 'cash') {
        // Cash on delivery - mark as pending
        await confirmPayment('CASH_PENDING');
      } else {
        Alert.alert('Error', data.message || 'Payment initiation failed');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (paymentId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/requests/${requestId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId }),
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert('✅ Payment Confirmed!', 'Your booking is confirmed!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleWebViewNavigation = (navState) => {
    const { url } = navState;
    
    // Check for success/failure in URL
    if (url.includes('/payment/success')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const paymentId = urlParams.get('payment_id');
      setShowWebView(false);
      confirmPayment(paymentId);
    } else if (url.includes('/payment/failure')) {
      setShowWebView(false);
      Alert.alert('Payment Failed', 'Please try again');
    }
  };

  if (showWebView) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <Text style={styles.closeBtn}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Complete Payment</Text>
        </View>
        <WebView
          source={{ uri: paymentUrl }}
          onNavigationStateChange={handleWebViewNavigation}
          startInLoadingState
          renderLoading={() => <ActivityIndicator size="large" color="#2563eb" />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Amount Card */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amount}>₹{amount}</Text>
        <Text style={styles.requestTitle}>{requestTitle}</Text>
      </View>

      {/* Payment Methods */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Choose Payment Method</Text>

      {/* Razorpay */}
      <TouchableOpacity
        style={[styles.methodBtn, { backgroundColor: theme.cardBackground }]}
        onPress={() => initiatePayment('razorpay')}
        disabled={loading}
      >
        <View style={styles.methodIcon}>
          <Text style={{ fontSize: 28 }}>💳</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodLabel, { color: theme.textPrimary }]}>Razorpay</Text>
          <Text style={[styles.methodSub, { color: theme.textSecondary }]}>
            UPI, Cards, Net Banking, Wallets
          </Text>
        </View>
        {loading ? <ActivityIndicator color="#2563eb" /> : <Text style={styles.arrow}>›</Text>}
      </TouchableOpacity>

      {/* PhonePe */}
      <TouchableOpacity
        style={[styles.methodBtn, { backgroundColor: theme.cardBackground }]}
        onPress={() => initiatePayment('phonepe')}
        disabled={loading}
      >
        <View style={[styles.methodIcon, { backgroundColor: '#5f259f' }]}>
          <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>Pe</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodLabel, { color: theme.textPrimary }]}>PhonePe</Text>
          <Text style={[styles.methodSub, { color: theme.textSecondary }]}>Pay via PhonePe UPI</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* Paytm */}
      <TouchableOpacity
        style={[styles.methodBtn, { backgroundColor: theme.cardBackground }]}
        onPress={() => initiatePayment('paytm')}
        disabled={loading}
      >
        <View style={[styles.methodIcon, { backgroundColor: '#00baf2' }]}>
          <Text style={{ fontSize: 20, color: '#fff', fontWeight: 'bold' }}>Paytm</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodLabel, { color: theme.textPrimary }]}>Paytm</Text>
          <Text style={[styles.methodSub, { color: theme.textSecondary }]}>Wallet & UPI</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* Cash on Delivery */}
      <TouchableOpacity
        style={[styles.methodBtn, { backgroundColor: theme.cardBackground, borderColor: '#fbbf24', borderWidth: 2 }]}
        onPress={() => initiatePayment('cash')}
        disabled={loading}
      >
        <View style={[styles.methodIcon, { backgroundColor: '#fef3c7' }]}>
          <Text style={{ fontSize: 28 }}>💵</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodLabel, { color: theme.textPrimary }]}>Cash on Service</Text>
          <Text style={[styles.methodSub, { color: theme.textSecondary }]}>Pay after service completion</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, padding: 16 },
  amountCard:     { backgroundColor: '#1e3a8a', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24, elevation: 4 },
  amountLabel:    { color: '#93c5fd', fontSize: 14, marginBottom: 4 },
  amount:         { color: '#fff', fontSize: 42, fontWeight: 'bold', marginBottom: 8 },
  requestTitle:   { color: '#bfdbfe', fontSize: 14, textAlign: 'center' },
  sectionTitle:   { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  methodBtn:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 2 },
  methodIcon:     { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  methodLabel:    { fontSize: 16, fontWeight: '600' },
  methodSub:      { fontSize: 12, marginTop: 2 },
  arrow:          { fontSize: 24, color: '#9ca3af' },
  webViewHeader:  { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#1e3a8a', paddingTop: 50 },
  closeBtn:       { color: '#fff', fontSize: 16, fontWeight: '600' },
  webViewTitle:   { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 16 },
});