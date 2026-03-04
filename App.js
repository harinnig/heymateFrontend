// App.js - Main Entry Point for HeyMate Application

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Import Screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RequestScreen from './src/screens/RequestScreen';
import ProviderDashboard from './src/screens/ProviderDashboard';
import NearbySettingsScreen from './src/screens/NearbySettingsScreen';
import WomanSafetyScreen from './src/screens/WomanSafetyScreen';
import BloodDonationScreen from './src/screens/BloodDonationScreen';

// Import Context Providers
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator 
            initialRouteName="Login"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#007AFF',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            {/* Authentication Screens */}
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            
            {/* Main App Screens */}
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'HeyMate - Services' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
            <Stack.Screen 
              name="Requests" 
              component={RequestScreen}
              options={{ title: 'My Requests' }}
            />
            <Stack.Screen 
              name="ProviderDashboard" 
              component={ProviderDashboard}
              options={{ title: 'Provider Dashboard' }}
            />
            
            {/* Settings & Features */}
            <Stack.Screen 
              name="NearbySettings" 
              component={NearbySettingsScreen}
              options={{ title: 'Nearby Settings' }}
            />
            
            {/* Safety Features */}
            <Stack.Screen 
              name="WomanSafety" 
              component={WomanSafetyScreen}
              options={{ 
                title: 'Woman Safety',
                headerStyle: { backgroundColor: '#FF3B30' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
            <Stack.Screen 
              name="BloodDonation" 
              component={BloodDonationScreen}
              options={{ 
                title: 'Blood Donation',
                headerStyle: { backgroundColor: '#FF3B30' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}