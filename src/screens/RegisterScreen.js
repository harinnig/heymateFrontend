// frontend/src/screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleRegister = async () => {
    // ── Validation ────────────────────────────────────────────────────
    if (!name.trim())  { Alert.alert('Error', 'Please enter your full name'); return; }
    if (!email.trim()) { Alert.alert('Error', 'Please enter your email'); return; }
    if (!phone.trim()) { Alert.alert('Error', 'Please enter your phone number'); return; }
    if (phone.length !== 10) { Alert.alert('Error', 'Phone must be 10 digits'); return; }
    if (!password)     { Alert.alert('Error', 'Please enter a password'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    if (password !== confirm) { Alert.alert('Error', 'Passwords do not match'); return; }

    try {
      setLoading(true);
      const result = await register({
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        phone:    phone.trim(),
        password,
      });

      if (result.success) {
        // Registration successful — AuthContext will set isAuthenticated = true
        // Navigation happens automatically via App.js
      } else {
        // Show the EXACT error from server
        Alert.alert('Registration Failed', result.message || 'Could not create account. Please try again.');
      }
    } catch (e) {
      // Show network/connection error clearly
      const msg = e?.response?.data?.message || e?.message || 'Unknown error';
      if (msg.includes('Network') || msg.includes('connect') || msg.includes('ECONNREFUSED')) {
        Alert.alert(
          'Cannot Connect to Server',
          'Make sure:\n• Backend server is running\n• Both phones are on same WiFi\n• Or use tunnel mode\n\nError: ' + msg
        );
      } else {
        Alert.alert('Registration Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch = confirm.length > 0 && password === confirm;
  const passwordWrong = confirm.length > 0 && password !== confirm;

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.inner}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>HeyMate</Text>
          <Text style={s.subtitle}>Create your account</Text>
        </View>

        {/* Full Name */}
        <Text style={s.label}>Full Name *</Text>
        <TextInput
          style={s.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Email */}
        <Text style={s.label}>Email Address *</Text>
        <TextInput
          style={s.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Phone */}
        <Text style={s.label}>Phone Number *</Text>
        <View style={s.phoneRow}>
          <View style={s.countryCode}>
            <Text style={s.countryFlag}>🇮🇳</Text>
            <Text style={s.countryNum}>+91</Text>
          </View>
          <TextInput
            style={[s.input, s.phoneInput]}
            placeholder="10-digit number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>
        {phone.length > 0 && phone.length < 10 && (
          <Text style={s.hint}>{10 - phone.length} more digits needed</Text>
        )}

        {/* Password */}
        <Text style={s.label}>Password *</Text>
        <View style={s.passRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(!showPass)}>
            <Text style={{ fontSize: 20 }}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Confirm Password */}
        <Text style={s.label}>Confirm Password *</Text>
        <View style={s.passRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }, passwordWrong && s.inputError, passwordMatch && s.inputSuccess]}
            placeholder="Re-enter password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConf}
          />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConf(!showConf)}>
            <Text style={{ fontSize: 20 }}>{showConf ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {passwordMatch && <Text style={s.matchOk}>✅ Passwords match</Text>}
        {passwordWrong && <Text style={s.matchNo}>❌ Passwords don't match</Text>}

        {/* Submit */}
        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>Create Account</Text>
          }
        </TouchableOpacity>

        {/* Login link */}
        <TouchableOpacity style={s.loginRow} onPress={() => navigation.navigate('Login')}>
          <Text style={s.loginTxt}>Already have an account? </Text>
          <Text style={s.loginLink}>Login</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  inner:        { padding: 24, paddingTop: 60 },
  header:       { marginBottom: 32, alignItems: 'center' },
  logo:         { fontSize: 32, fontWeight: 'bold', color: '#2563eb', marginBottom: 6 },
  subtitle:     { fontSize: 16, color: '#64748b' },
  label:        { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input:        { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff', marginBottom: 16, color: '#1f2937' },
  inputError:   { borderColor: '#ef4444' },
  inputSuccess: { borderColor: '#10b981' },
  phoneRow:     { flexDirection: 'row', gap: 10, marginBottom: 0 },
  countryCode:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff', gap: 6 },
  countryFlag:  { fontSize: 20 },
  countryNum:   { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInput:   { flex: 1, marginBottom: 16 },
  hint:         { color: '#f59e0b', fontSize: 12, marginBottom: 8, marginTop: -10 },
  passRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  eyeBtn:       { padding: 10 },
  matchOk:      { color: '#10b981', fontSize: 13, marginBottom: 12, marginTop: -10 },
  matchNo:      { color: '#ef4444', fontSize: 13, marginBottom: 12, marginTop: -10 },
  btn:          { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, elevation: 3 },
  btnDisabled:  { backgroundColor: '#93c5fd' },
  btnTxt:       { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  loginRow:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20, paddingBottom: 40 },
  loginTxt:     { color: '#64748b', fontSize: 15 },
  loginLink:    { color: '#2563eb', fontSize: 15, fontWeight: '700' },
});