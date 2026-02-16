// frontend/App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import LoginScreen     from './src/screens/LoginScreen';
import RegisterScreen  from './src/screens/RegisterScreen';
import HomeScreen      from './src/screens/HomeScreen';
import RequestScreen   from './src/screens/RequestScreen';
import ProviderScreen  from './src/screens/ProviderScreen';
import ProfileScreen   from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── User Tabs (Customer) ──────────────────────────────────────────────────────
function UserTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.isDarkMode ? '#1e293b' : '#ffffff',
          borderTopColor:  theme.isDarkMode ? '#334155' : '#e2e8f0',
          paddingBottom: 6, paddingTop: 6, height: 62,
        },
        tabBarActiveTintColor:   '#2563eb',
        tabBarInactiveTintColor: theme.isDarkMode ? '#94a3b8' : '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>, tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📋</Text>, tabBarLabel: 'Requests' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>, tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// ── Provider Tabs ─────────────────────────────────────────────────────────────
function ProviderTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.isDarkMode ? '#1e293b' : '#ffffff',
          borderTopColor:  theme.isDarkMode ? '#334155' : '#e2e8f0',
          paddingBottom: 6, paddingTop: 6, height: 62,
        },
        tabBarActiveTintColor:   '#2563eb',
        tabBarInactiveTintColor: theme.isDarkMode ? '#94a3b8' : '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ProviderScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👷</Text>, tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>, tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>, tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user?.role === 'provider' ? (
        <Stack.Screen name="ProviderMain" component={ProviderTabs} />
      ) : (
        <Stack.Screen name="UserMain" component={UserTabs} />
      )}
    </Stack.Navigator>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}