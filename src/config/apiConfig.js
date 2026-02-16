// frontend/src/config/apiConfig.js
// ─────────────────────────────────────────────────────────────────────────────
// AUTO IP DETECTION - No need to manually change IP ever again!
// Works on any WiFi, any network adapter automatically
// ─────────────────────────────────────────────────────────────────────────────

import Constants from 'expo-constants';

const getAPIUrl = () => {
  try {
    // Method 1: Get IP from Expo's manifest (most reliable)
    // This automatically uses the same IP that Expo Go connects to
    const expoHost = Constants.expoConfig?.hostUri
      || Constants.manifest?.debuggerHost
      || Constants.manifest2?.extra?.expoGo?.debuggerHost;

    if (expoHost) {
      // Extract just the IP address (remove port if present)
      const host = expoHost.split(':')[0];
      const url = `http://${host}:5000/api`;
      console.log('✅ Auto-detected API URL:', url);
      return url;
    }

    // Method 2: Fallback to localhost for emulators
    console.log('⚠️ Using localhost fallback');
    return 'http://localhost:5000/api';

  } catch (error) {
    console.log('❌ IP detection error:', error);
    return 'http://localhost:5000/api';
  }
};

const getSocketUrl = () => {
  try {
    const expoHost = Constants.expoConfig?.hostUri
      || Constants.manifest?.debuggerHost
      || Constants.manifest2?.extra?.expoGo?.debuggerHost;

    if (expoHost) {
      const host = expoHost.split(':')[0];
      const url = `http://${host}:5000`;
      console.log('✅ Auto-detected Socket URL:', url);
      return url;
    }

    return 'http://localhost:5000';

  } catch (error) {
    console.log('❌ Socket URL detection error:', error);
    return 'http://localhost:5000';
  }
};

export const API_URL = getAPIUrl();
export const SOCKET_URL = getSocketUrl();

console.log('🌐 API_URL:', API_URL);
console.log('🔌 SOCKET_URL:', SOCKET_URL);
