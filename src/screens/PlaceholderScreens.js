/* 
 * This file contains placeholder screens.
 * In production, each screen would be in its own file with full functionality.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Register Screen (placeholder)
export const RegisterScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Register Screen</Text>
    <Text>Implement registration form here</Text>
  </View>
);

// Home Screen (placeholder)
export const HomeScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Home Screen</Text>
    <Text>Search for services, browse categories</Text>
  </View>
);

// Request Screen (placeholder)
export const RequestScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Requests Screen</Text>
    <Text>View your service requests or job offers</Text>
  </View>
);

// Profile Screen (placeholder)
export const ProfileScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Profile Screen</Text>
    <Text>Manage your profile and settings</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
