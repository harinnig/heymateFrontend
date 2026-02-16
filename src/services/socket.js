// frontend/src/services/socket.js
// ─────────────────────────────────────────────────────────────────────────────
// AUTO IP - Automatically detects server IP on any WiFi
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config/apiConfig';

console.log('🔌 Socket connecting to:', SOCKET_URL);

class SocketService {
  constructor() {
    this.socket = null;
    this.ioLib = null;
  }

  async loadIO() {
    try {
      if (!this.ioLib) {
        const socketIO = await import('socket.io-client');
        this.ioLib = socketIO.io || socketIO.default;
      }
      return true;
    } catch (error) {
      console.log('socket.io-client not available:', error.message);
      return false;
    }
  }

  async connect() {
    try {
      const loaded = await this.loadIO();
      if (!loaded || !this.ioLib) {
        console.log('Socket.io not available');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token, skipping socket connection');
        return;
      }

      // Use auto-detected SOCKET_URL
      this.socket = this.ioLib(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.log('Socket error:', error.message);
      });

    } catch (error) {
      console.log('Socket connect error:', error.message);
    }
  }

  disconnect() {
    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    } catch (error) {
      console.log('Socket disconnect error:', error);
    }
  }

  emit(event, data) {
    try {
      if (this.socket && this.socket.connected) {
        this.socket.emit(event, data);
      }
    } catch (error) {
      console.log('Socket emit error:', error);
    }
  }

  on(event, callback) {
    try {
      if (this.socket) {
        this.socket.on(event, callback);
      }
    } catch (error) {
      console.log('Socket on error:', error);
    }
  }

  off(event) {
    try {
      if (this.socket) {
        this.socket.off(event);
      }
    } catch (error) {
      console.log('Socket off error:', error);
    }
  }

  updateLocation(latitude, longitude, requestId = null) {
    this.emit('update-location', { latitude, longitude, requestId });
  }

  onProviderLocationUpdate(callback) { this.on('provider-location-update', callback); }
  sendMessage(requestId, message) { this.emit('send-message', { requestId, message }); }
  onNewMessage(callback) { this.on('new-message', callback); }
  onMessageSent(callback) { this.on('message-sent', callback); }
  emitTyping(requestId, recipientId) { this.emit('typing', { requestId, recipientId }); }
  emitStopTyping(requestId, recipientId) { this.emit('stop-typing', { requestId, recipientId }); }
  onUserTyping(callback) { this.on('user-typing', callback); }
  onUserStopTyping(callback) { this.on('user-stop-typing', callback); }
  onNewRequest(callback) { this.on('new-request-nearby', callback); }
  onNewOffer(callback) { this.on('new-offer', callback); }
  onOfferAccepted(callback) { this.on('offer-accepted', callback); }
  onJobStarted(callback) { this.on('job-started', callback); }
  onJobCompleted(callback) { this.on('job-completed', callback); }
  updateAvailability(isAvailable) { this.emit('update-availability', { isAvailable }); }
  onAvailabilityUpdated(callback) { this.on('availability-updated', callback); }
  broadcastRequest(requestId, serviceType, location, radius) {
    this.emit('broadcast-request', { requestId, serviceType, location, radius });
  }
  removeAllListeners() {
    try {
      if (this.socket) this.socket.removeAllListeners();
    } catch (error) {
      console.log('removeAllListeners error:', error);
    }
  }
}

export default new SocketService();