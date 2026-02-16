// frontend/src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://heymatebackend-production.up.railway.app/api';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [loginMode, setLoginMode]   = useState('email');
  const [email, setEmail]           = useState('');
  const [phone, setPhone]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);

  // ── Forgot Password ──────────────────────────────────────────────────────────
  const [forgotModal, setForgotModal]     = useState(false);
  const [forgotStep, setForgotStep]       = useState(1); // 1=email, 2=otp, 3=newpass
  const [forgotEmail, setForgotEmail]     = useState('');
  const [otp, setOtp]                     = useState('');
  const [generatedOtp, setGeneratedOtp]   = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [showNewPass, setShowNewPass]     = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    const identifier = loginMode === 'email' ? email.trim() : phone.trim();
    if (!identifier) { Alert.alert('Error', `Please enter your ${loginMode === 'email' ? 'email' : 'phone'}`); return; }
    if (!password)   { Alert.alert('Error', 'Please enter your password'); return; }

    try {
      setLoading(true);
      const credentials = loginMode === 'email'
        ? { email: email.trim().toLowerCase(), password }
        : { phone: phone.trim(), password };

      const result = await login(credentials);
      if (!result.success) {
        const msg = result.message || 'Login failed';
        if (msg.includes('Cannot connect') || msg.includes('timed out')) {
          Alert.alert('🔴 Server Unreachable', 'Check your internet connection.\n\n' + msg);
        } else if (msg.includes('No account') || msg.includes('not found')) {
          Alert.alert('Account Not Found', `No account with this ${loginMode}.\nPlease register first!`);
        } else if (msg.includes('password') || msg.includes('Incorrect')) {
          Alert.alert('Wrong Password', 'Incorrect password. Please try again.\n\nForgot your password? Tap "Forgot Password" below.');
        } else {
          Alert.alert('Login Failed', msg);
        }
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD — Step 1: Send OTP ──────────────────────────────────────
  const handleSendOtp = async () => {
    if (!forgotEmail.trim()) { Alert.alert('Error', 'Enter your registered email'); return; }
    setForgotLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        // Store OTP from response (dev mode) or show success
        setGeneratedOtp(data.otp || '');
        setForgotStep(2);
        Alert.alert(
          '✅ OTP Sent!',
          data.otp
            ? `Your OTP is: ${data.otp}\n(Shown for testing purposes)`
            : 'Check your email for the OTP code.',
        );
      } else {
        Alert.alert('Error', data.message || 'Email not found');
      }
    } catch (e) {
      Alert.alert('Error', 'Cannot connect to server');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── FORGOT PASSWORD — Step 2: Verify OTP ────────────────────────────────────
  const handleVerifyOtp = () => {
    if (!otp.trim()) { Alert.alert('Error', 'Enter the OTP'); return; }
    if (otp.trim() !== generatedOtp.trim() && otp.trim().length !== 6) {
      Alert.alert('Error', 'Invalid OTP. Please check and try again.');
      return;
    }
    setForgotStep(3);
  };

  // ── FORGOT PASSWORD — Step 3: Reset Password ─────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPassword)              { Alert.alert('Error', 'Enter new password'); return; }
    if (newPassword.length < 6)    { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (newPassword !== confirmNewPass) { Alert.alert('Error', 'Passwords do not match'); return; }

    setForgotLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:    forgotEmail.trim().toLowerCase(),
          otp:      otp.trim(),
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForgotModal(false);
        setForgotStep(1);
        setForgotEmail(''); setOtp(''); setNewPassword(''); setConfirmNewPass('');
        Alert.alert('✅ Password Reset!', 'Your password has been changed successfully.\nPlease login with your new password.');
      } else {
        Alert.alert('Error', data.message || 'Reset failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Cannot connect to server');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setForgotModal(false);
    setForgotStep(1);
    setForgotEmail(''); setOtp(''); setNewPassword(''); setConfirmNewPass('');
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.inner}>

        {/* Logo */}
        <View style={s.header}>
          <Text style={s.logo}>👋 HeyMate</Text>
          <Text style={s.subtitle}>Welcome back!</Text>
        </View>

        {/* Mode Toggle */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.toggleBtn, loginMode === 'email' && s.toggleActive]}
            onPress={() => setLoginMode('email')}
          >
            <Text style={[s.toggleTxt, loginMode === 'email' && s.toggleTxtActive]}>📧 Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, loginMode === 'phone' && s.toggleActive]}
            onPress={() => setLoginMode('phone')}
          >
            <Text style={[s.toggleTxt, loginMode === 'phone' && s.toggleTxtActive]}>📱 Phone</Text>
          </TouchableOpacity>
        </View>

        {/* Email or Phone */}
        {loginMode === 'email' ? (
          <>
            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        ) : (
          <>
            <Text style={s.label}>Phone Number</Text>
            <View style={s.phoneRow}>
              <View style={s.countryCode}>
                <Text style={s.flag}>🇮🇳</Text>
                <Text style={s.countryNum}>+91</Text>
              </View>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="10-digit number"
                value={phone}
                onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <View style={{ marginBottom: 16 }} />
          </>
        )}

        {/* Password */}
        <Text style={s.label}>Password</Text>
        <View style={s.passRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(!showPass)}>
            <Text style={{ fontSize: 22 }}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={s.forgotLink}
          onPress={() => setForgotModal(true)}
        >
          <Text style={s.forgotTxt}>🔑 Forgot Password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Login</Text>
          }
        </TouchableOpacity>

        {/* Register link */}
        <TouchableOpacity
          style={s.registerRow}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={s.registerTxt}>Don't have an account? </Text>
          <Text style={s.registerLink}>Register Now</Text>
        </TouchableOpacity>

      </View>

      {/* ══════════════════════════════════════════════
          FORGOT PASSWORD MODAL
      ══════════════════════════════════════════════ */}
      <Modal visible={forgotModal} animationType="slide" transparent onRequestClose={closeForgot}>
        <View style={s.overlay}>
          <View style={s.modalBox}>

            {/* Header */}
            <View style={s.modalHead}>
              <View>
                <Text style={s.modalTitle}>🔑 Forgot Password</Text>
                <Text style={s.modalSub}>
                  {forgotStep === 1 && 'Enter your registered email'}
                  {forgotStep === 2 && 'Enter the OTP sent to your email'}
                  {forgotStep === 3 && 'Set your new password'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeForgot}>
                <Text style={{ fontSize: 26, color: '#6b7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Step indicator */}
            <View style={s.stepRow}>
              {[1, 2, 3].map(n => (
                <View key={n} style={s.stepWrap}>
                  <View style={[s.stepCircle, forgotStep >= n && s.stepActive]}>
                    <Text style={[s.stepNum, forgotStep >= n && { color: '#fff' }]}>{n}</Text>
                  </View>
                  {n < 3 && <View style={[s.stepLine, forgotStep > n && s.stepLineDone]} />}
                </View>
              ))}
            </View>
            <View style={s.stepLabels}>
              <Text style={s.stepLabel}>Email</Text>
              <Text style={s.stepLabel}>OTP</Text>
              <Text style={s.stepLabel}>Reset</Text>
            </View>

            {/* ── Step 1: Email ── */}
            {forgotStep === 1 && (
              <View style={s.stepContent}>
                <Text style={s.inputLabel}>Registered Email</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="Enter your email address"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[s.modalBtn, forgotLoading && s.modalBtnDisabled]}
                  onPress={handleSendOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.modalBtnTxt}>📨 Send OTP</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 2: OTP ── */}
            {forgotStep === 2 && (
              <View style={s.stepContent}>
                <View style={s.otpInfo}>
                  <Text style={s.otpInfoTxt}>✉️ OTP sent to {forgotEmail}</Text>
                </View>
                <Text style={s.inputLabel}>Enter 6-digit OTP</Text>
                <TextInput
                  style={[s.modalInput, s.otpInput]}
                  placeholder="_ _ _ _ _ _"
                  value={otp}
                  onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={s.modalBtn}
                  onPress={handleVerifyOtp}
                >
                  <Text style={s.modalBtnTxt}>✅ Verify OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.resendBtn} onPress={handleSendOtp}>
                  <Text style={s.resendTxt}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 3: New Password ── */}
            {forgotStep === 3 && (
              <View style={s.stepContent}>
                <Text style={s.inputLabel}>New Password</Text>
                <View style={s.passRowModal}>
                  <TextInput
                    style={[s.modalInput, { flex: 1, marginBottom: 0 }]}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPass}
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNewPass(!showNewPass)}>
                    <Text style={{ fontSize: 20 }}>{showNewPass ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[s.inputLabel, { marginTop: 12 }]}>Confirm New Password</Text>
                <TextInput
                  style={[s.modalInput, confirmNewPass && newPassword !== confirmNewPass && { borderColor: '#ef4444' },
                    confirmNewPass && newPassword === confirmNewPass && { borderColor: '#10b981' }]}
                  placeholder="Re-enter new password"
                  value={confirmNewPass}
                  onChangeText={setConfirmNewPass}
                  secureTextEntry={!showNewPass}
                />
                {confirmNewPass && newPassword === confirmNewPass && (
                  <Text style={{ color: '#10b981', fontSize: 13, marginBottom: 8 }}>✅ Passwords match</Text>
                )}
                {confirmNewPass && newPassword !== confirmNewPass && (
                  <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>❌ Passwords don't match</Text>
                )}
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: '#10b981' }, forgotLoading && s.modalBtnDisabled]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.modalBtnTxt}>🔐 Reset Password</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc' },
  inner:           { padding: 24, paddingTop: 70 },
  header:          { alignItems: 'center', marginBottom: 36 },
  logo:            { fontSize: 34, fontWeight: 'bold', color: '#2563eb', marginBottom: 8 },
  subtitle:        { fontSize: 16, color: '#64748b' },
  toggle:          { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleActive:    { backgroundColor: '#2563eb' },
  toggleTxt:       { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTxtActive: { color: '#fff' },
  label:           { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:           { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 16, color: '#1f2937' },
  phoneRow:        { flexDirection: 'row', gap: 10, alignItems: 'center' },
  countryCode:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#fff', gap: 6 },
  flag:            { fontSize: 20 },
  countryNum:      { fontSize: 15, fontWeight: '600', color: '#374151' },
  passRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eyeBtn:          { padding: 8 },
  forgotLink:      { alignSelf: 'flex-end', marginBottom: 20 },
  forgotTxt:       { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  btn:             { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3, marginTop: 4 },
  btnDisabled:     { backgroundColor: '#93c5fd' },
  btnTxt:          { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  registerRow:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerTxt:     { color: '#64748b', fontSize: 15 },
  registerLink:    { color: '#2563eb', fontSize: 15, fontWeight: '700' },

  // Modal
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHead:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle:      { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  modalSub:        { fontSize: 13, color: '#6b7280', marginTop: 4 },

  // Steps
  stepRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepWrap:        { flexDirection: 'row', alignItems: 'center' },
  stepCircle:      { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#d1d5db', backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' },
  stepActive:      { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  stepNum:         { fontSize: 14, fontWeight: 'bold', color: '#9ca3af' },
  stepLine:        { width: 60, height: 2, backgroundColor: '#e5e7eb', marginHorizontal: 4 },
  stepLineDone:    { backgroundColor: '#2563eb' },
  stepLabels:      { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, paddingHorizontal: 20 },
  stepLabel:       { fontSize: 12, color: '#6b7280', fontWeight: '600' },

  // Step content
  stepContent:     { gap: 4 },
  inputLabel:      { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modalInput:      { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#f8fafc', color: '#1f2937', marginBottom: 16 },
  otpInput:        { fontSize: 24, letterSpacing: 12, textAlign: 'center', fontWeight: 'bold' },
  otpInfo:         { backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginBottom: 16 },
  otpInfoTxt:      { color: '#1d4ed8', fontSize: 13 },
  modalBtn:        { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 2 },
  modalBtnDisabled:{ backgroundColor: '#93c5fd' },
  modalBtnTxt:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resendBtn:       { alignItems: 'center', padding: 14 },
  resendTxt:       { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  passRowModal:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
});