// frontend/src/screens/HomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Switch, TextInput, ActivityIndicator, Alert,
  FlatList, Linking,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NearbyShopsTab from '../components/NearbyShopsTab';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_URL = 'https://heymatebackend-production.up.railway.app/api';

// Nearby shops are fetched via backend API

const CATEGORIES = [
  { id: '1',  icon: '🔧', name: 'Plumbing',      color: '#3b82f6' },
  { id: '2',  icon: '⚡', name: 'Electrical',    color: '#f59e0b' },
  { id: '3',  icon: '🏠', name: 'Cleaning',      color: '#10b981' },
  { id: '4',  icon: '🎨', name: 'Painting',      color: '#8b5cf6' },
  { id: '5',  icon: '🔨', name: 'Carpentry',     color: '#ef4444' },
  { id: '6',  icon: '❄️', name: 'AC Repair',     color: '#06b6d4' },
  { id: '7',  icon: '🚗', name: 'Car Wash',      color: '#84cc16' },
  { id: '8',  icon: '📦', name: 'Moving',        color: '#f97316' },
  { id: '9',  icon: '💇', name: 'Salon',         color: '#ec4899' },
  { id: '10', icon: '🐾', name: 'Pet Care',      color: '#14b8a6' },
  { id: '11', icon: '📚', name: 'Tutoring',      color: '#6366f1' },
  { id: '12', icon: '🍔', name: 'Food Delivery', color: '#f43f5e' },
];

const STATUS_COLORS = {
  completed: '#10b981', active: '#3b82f6', pending: '#f59e0b', cancelled: '#ef4444',
};

// ── Calculate distance ────────────────────────────────────────────────────────
const calcDistance = (lat1, lon1, lat2, lon2) => {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return dist < 1 ? `${(dist * 1000).toFixed(0)}m` : `${dist.toFixed(1)}km`;
};

export default function HomeScreen() {
  const { user, logout, updateUser } = useAuth();
  const theme = useTheme();

  const [settingsModal, setSettingsModal]       = useState(false);
  const [searchText, setSearchText]             = useState('');
  const [suggestions, setSuggestions]           = useState([]);
  const [searching, setSearching]               = useState(false);
  const [showSugg, setShowSugg]                 = useState(false);
  const [userLocation, setUserLocation]         = useState(null);
  const [locationLabel, setLocationLabel]       = useState('Detecting...');
  const [recentRequests, setRecentRequests]     = useState([]);
  const [stats, setStats]                       = useState({ active: 0, completed: 0, pending: 0 });

  // Browse modal
  const [browseModal, setBrowseModal]           = useState(false);
  const [browseCategory, setBrowseCategory]     = useState(null);
  const [activeTab, setActiveTab]               = useState('nearby');
  const [nearbyShops, setNearbyShops]           = useState([]);
  const [loadingShops, setLoadingShops]         = useState(false);
  const [appProviders, setAppProviders]         = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Shop detail
  const [shopModal, setShopModal]               = useState(false);
  const [selectedShop, setSelectedShop]         = useState(null);

  // Become provider
  const [becomeModal, setBecomeModal]           = useState(false);
  const [provCategory, setProvCategory]         = useState('');
  const [provBio, setProvBio]                   = useState('');
  const [provExp, setProvExp]                   = useState('');
  const [provPrice, setProvPrice]               = useState('');
  const [provSkills, setProvSkills]             = useState('');
  const [becomingProv, setBecomingProv]         = useState(false);

  const searchTimer = useRef(null);

  useEffect(() => { initLocation(); fetchStats(); }, []);

  // ── API helper ──────────────────────────────────────────────────────────────
  const apiCall = async (method, url, data = null) => {
    const token = await AsyncStorage.getItem('token');
    const res = await axios({
      method, url: `${API_URL}${url}`,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      ...(data && { data }),
    });
    return res.data;
  };

  // ── Location ────────────────────────────────────────────────────────────────
  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Try one more time with a prompt
        const { status: status2 } = await Location.requestForegroundPermissionsAsync();
        if (status2 !== 'granted') {
          setLocationLabel('Enable location in Settings');
          return;
        }
      }

      // Try high accuracy first, fall back to low accuracy
      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
      } catch {
        loc = await Location.getLastKnownPositionAsync();
      }

      if (!loc) { setLocationLabel('Location unavailable'); return; }

      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      try {
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        });
        const label = addr
          ? `${addr.city || addr.district || addr.subregion || ''}, ${addr.region || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
          : `${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`;
        setLocationLabel(label || 'Location detected');
      } catch {
        setLocationLabel(`${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`);
      }
    } catch (e) {
      console.log('Location error:', e.message);
      setLocationLabel('Enable location permission');
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const res  = await apiCall('GET', '/requests/my-requests');
      const data = res.data || [];
      setRecentRequests(data.slice(0, 3));
      setStats({
        active:    data.filter(r => r.status === 'active').length,
        completed: data.filter(r => r.status === 'completed').length,
        pending:   data.filter(r => r.status === 'pending').length,
      });
    } catch (e) {}
  };

  // ── Fetch REAL nearby shops via backend (Railway server) ────────────────────
  const fetchNearbyShops = async (cat, location) => {
    if (!location) { setLoadingShops(false); return; }
    setLoadingShops(true);
    setNearbyShops([]);
    try {
      const { latitude, longitude } = location;
      const res = await apiCall('GET',
        `/nearby/shops?latitude=${latitude}&longitude=${longitude}&category=${encodeURIComponent(cat.name)}&radius=5000`
      );
      if (res.success && res.data?.length > 0) {
        setNearbyShops(res.data);
      } else {
        // Try wider 10km search
        const res2 = await apiCall('GET',
          `/nearby/shops?latitude=${latitude}&longitude=${longitude}&category=${encodeURIComponent(cat.name)}&radius=10000`
        );
        setNearbyShops(res2.data || []);
      }
    } catch (e) {
      console.log('Nearby shops error:', e.message);
      setNearbyShops([]);
    } finally {
      setLoadingShops(false);
    }
  };

  // ── Fetch app providers ──────────────────────────────────────────────────────
  const fetchAppProviders = async (cat) => {
    setLoadingProviders(true);
    try {
      const params = userLocation
        ? `?category=${cat.name}&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=30`
        : `?category=${cat.name}`;
      const res = await apiCall('GET', `/providers/nearby${params}`);
      setAppProviders(res.data || []);
    } catch (e) { setAppProviders([]); }
    finally { setLoadingProviders(false); }
  };

  // ── Category press ───────────────────────────────────────────────────────────
  const handleCategoryPress = (cat) => {
    setBrowseCategory(cat);
    setBrowseModal(true);
    setActiveTab('nearby');
    setNearbyShops([]);
    setAppProviders([]);
    fetchNearbyShops(cat, userLocation);
    fetchAppProviders(cat);
  };

  // ── Open in Google Maps ──────────────────────────────────────────────────────
  const openInMaps = (shop) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' ' + shop.address)}`;
    Linking.openURL(url);
  };

  const getDirections = (shop) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lon}&travelmode=driving`;
    Linking.openURL(url);
  };

  const callShop = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  // ── Search ───────────────────────────────────────────────────────────────────
  const handleSearch = (text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setSuggestions([]); setShowSugg(false); return; }
    const catMatches = CATEGORIES.filter(c =>
      c.name.toLowerCase().includes(text.toLowerCase())
    ).map(c => ({ type: 'category', ...c }));
    setSuggestions(catMatches);
    setShowSugg(true);
    searchTimer.current = setTimeout(async () => {
      try {
        setSearching(true);
        const params = userLocation
          ? `?q=${text}&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=20`
          : `?q=${text}`;
        const res = await apiCall('GET', `/requests/search${params}`);
        const nearby = (res.data || []).map(r => ({
          type: 'request', id: r._id, name: r.title,
          icon: CATEGORIES.find(c => c.name === r.category)?.icon || '🛠️',
          color: CATEGORIES.find(c => c.name === r.category)?.color || '#6b7280',
          category: r.category, address: r.location?.address || '', budget: r.budget,
        }));
        setSuggestions([...catMatches, ...nearby]);
      } catch (e) {} finally { setSearching(false); }
    }, 500);
  };

  // ── Become provider ──────────────────────────────────────────────────────────
  const handleBecomeProvider = async () => {
    if (!provCategory) { Alert.alert('Error', 'Select a category'); return; }
    try {
      setBecomingProv(true);
      const res = await apiCall('POST', '/providers/register', {
        category: provCategory, categories: [provCategory],
        bio: provBio, experience: Number(provExp) || 0,
        basePrice: Number(provPrice) || 0,
        skills: provSkills.split(',').map(s => s.trim()).filter(Boolean),
        latitude: userLocation?.latitude, longitude: userLocation?.longitude,
        address: locationLabel,
      });
      if (res.success) {
        await updateUser({ role: 'provider' });
        setBecomeModal(false);
        Alert.alert('🎉 Welcome!', `You are now a ${provCategory} provider!`);
      } else { Alert.alert('Error', res.message); }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not register');
    } finally { setBecomingProv(false); }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '🌅 Good Morning';
    if (h < 17) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  };

  // ── Shop Card ────────────────────────────────────────────────────────────────
  const ShopCard = ({ item }) => (
    <TouchableOpacity
      style={[s.shopCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => { setSelectedShop(item); setShopModal(true); }}
    >
      {/* Distance badge */}
      <View style={s.distBadge}>
        <Text style={s.distTxt}>📍 {item.distance}</Text>
      </View>

      <View style={s.shopTop}>
        <View style={[s.shopIcon, { backgroundColor: browseCategory?.color + '20' }]}>
          <Text style={{ fontSize: 30 }}>{browseCategory?.icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.shopName, { color: theme.textPrimary }]} numberOfLines={2}>
            {item.name}
          </Text>
          {item.address ? (
            <Text style={[s.shopAddr, { color: theme.textSecondary }]} numberOfLines={1}>
              📍 {item.address}
            </Text>
          ) : null}

          {/* Google Rating */}
          {item.rating > 0 && (
            <View style={s.ratingRow}>
              <Text style={s.stars}>
                {'★'.repeat(Math.floor(item.rating))}{'☆'.repeat(5 - Math.floor(item.rating))}
              </Text>
              <Text style={s.ratingNum}>{item.rating.toFixed(1)}</Text>
              {item.reviews > 0 && (
                <Text style={[s.reviewCount, { color: theme.textSecondary }]}>({item.reviews})</Text>
              )}
            </View>
          )}

          {/* Open/Closed */}
          {item.isOpen !== undefined && (
            <View style={[s.openBadge, { backgroundColor: item.isOpen ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[s.openTxt, { color: item.isOpen ? '#16a34a' : '#ef4444' }]}>
                {item.isOpen ? '✅ Open Now' : '❌ Closed'}
              </Text>
            </View>
          )}

          {item.opening ? (
            <Text style={[s.shopOpen, { color: '#10b981' }]} numberOfLines={1}>
              🕐 {item.opening}
            </Text>
          ) : null}
          {item.phone ? (
            <TouchableOpacity onPress={() => callShop(item.phone)}>
              <Text style={s.shopPhone}>📞 {item.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Action buttons */}
      <View style={s.shopBtns}>
        <TouchableOpacity
          style={[s.shopBtn, { backgroundColor: browseCategory?.color + '15', borderColor: browseCategory?.color + '40' }]}
          onPress={() => getDirections(item)}
        >
          <Text style={[s.shopBtnTxt, { color: browseCategory?.color }]}>🗺️ Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.shopBtn, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}
          onPress={() => openInMaps(item)}
        >
          <Text style={[s.shopBtnTxt, { color: '#0369a1' }]}>📌 Map</Text>
        </TouchableOpacity>
        {item.phone && (
          <TouchableOpacity
            style={[s.shopBtn, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}
            onPress={() => callShop(item.phone)}
          >
            <Text style={[s.shopBtnTxt, { color: '#16a34a' }]}>📞 Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  // ── App Provider Card ────────────────────────────────────────────────────────
  const AppProviderCard = ({ item }) => (
    <TouchableOpacity
      style={[s.shopCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => Alert.alert(
        item.user?.name || 'Provider',
        `${item.category} Provider\n⭐ ${item.rating?.average?.toFixed(1) || 'New'}\n💰 From ₹${item.basePrice || 'Negotiable'}\n\nPost a request to hire!`
      )}
    >
      <View style={s.shopTop}>
        <View style={[s.shopIcon, { backgroundColor: browseCategory?.color + '20' }]}>
          <Text style={{ fontSize: 30 }}>{browseCategory?.icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.shopName, { color: theme.textPrimary }]}>{item.user?.name}</Text>
          <Text style={[s.shopAddr, { color: theme.textSecondary }]}>📍 {item.location?.address || 'Nearby'}</Text>
          {item.basePrice > 0 && <Text style={s.shopPhone}>💰 From ₹{item.basePrice}</Text>}
          {item.skills?.length > 0 && (
            <Text style={[s.shopAddr, { color: theme.textSecondary }]} numberOfLines={1}>
              🛠️ {item.skills.join(' · ')}
            </Text>
          )}
        </View>
        <View style={[s.availBadge, { backgroundColor: item.isAvailable ? '#dcfce7' : '#fee2e2' }]}>
          <Text style={[s.availTxt, { color: item.isAvailable ? '#16a34a' : '#ef4444' }]}>
            {item.isAvailable ? 'Available' : 'Busy'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>

      {/* HEADER */}
      <View style={[s.header, { backgroundColor: theme.headerBackground }]}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting()},</Text>
            <Text style={s.userName}>{user?.name?.split(' ')[0] || 'User'} 👋</Text>
            <TouchableOpacity onPress={initLocation}>
              <Text style={s.locTxt} numberOfLines={1}>📍 {locationLabel}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.settingsBtn} onPress={() => setSettingsModal(true)}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
        {/* Search */}
        <View style={{ position: 'relative', zIndex: 100 }}>
          <View style={[s.searchBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search services near you..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchText}
              onChangeText={handleSearch}
              onFocus={() => searchText && setShowSugg(true)}
            />
            {searching && <ActivityIndicator color="#fff" size="small" />}
            {searchText.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setSearchText(''); setSuggestions([]); setShowSugg(false); }}>
                <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {showSugg && suggestions.length > 0 && (
            <View style={s.suggestions}>
              <View style={s.suggHeader}>
                <Text style={s.suggHeaderTxt}>📍 Near {locationLabel}</Text>
              </View>
              {suggestions.map((item, idx) => (
                <TouchableOpacity key={idx} style={s.suggItem}
                  onPress={() => { setShowSugg(false); setSearchText(''); if (item.type === 'category') handleCategoryPress(item); }}>
                  <View style={[s.suggIcon, { backgroundColor: item.color + '22' }]}>
                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.suggName}>{item.name}</Text>
                    <Text style={s.suggSub} numberOfLines={1}>
                      {item.type === 'category' ? 'Find real shops nearby' : `📍 ${item.address || 'Nearby'}`}
                    </Text>
                  </View>
                  <Text style={{ color: item.color, fontSize: 20 }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} onScrollBeginDrag={() => setShowSugg(false)}>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Active',    value: stats.active,    icon: '🔄', color: '#3b82f6' },
            { label: 'Pending',   value: stats.pending,   icon: '🕐', color: '#f59e0b' },
            { label: 'Completed', value: stats.completed, icon: '✅', color: '#10b981' },
          ].map(st => (
            <View key={st.label} style={[s.statCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={{ fontSize: 26 }}>{st.icon}</Text>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
              <Text style={[s.statLabel, { color: theme.textSecondary }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Become Provider Banner */}
        {user?.role !== 'provider' && (
          <View style={s.section}>
            <TouchableOpacity style={s.banner} onPress={() => setBecomeModal(true)}>
              <View>
                <Text style={s.bannerTitle}>💼 Earn with HeyMate</Text>
                <Text style={s.bannerSub}>Register as a provider & get hired!</Text>
              </View>
              <Text style={{ fontSize: 36 }}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>🛠️ Services</Text>
            <Text style={[s.sectionSub, { color: theme.textSecondary }]}>Real shops near you</Text>
          </View>
          <View style={s.grid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catCard, { backgroundColor: theme.cardBackground }]}
                onPress={() => handleCategoryPress(cat)}
              >
                <View style={[s.catIcon, { backgroundColor: cat.color + '20' }]}>
                  <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                </View>
                <Text style={[s.catName, { color: theme.textPrimary }]} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Requests */}
        {recentRequests.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary, marginBottom: 12 }]}>📋 Recent Requests</Text>
            {recentRequests.map(req => (
              <View key={req._id} style={[s.reqCard, { backgroundColor: theme.cardBackground, borderLeftColor: STATUS_COLORS[req.status] }]}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>
                  {CATEGORIES.find(c => c.name === req.category)?.icon || '🛠️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.reqTitle, { color: theme.textPrimary }]} numberOfLines={1}>{req.title}</Text>
                  <Text style={[s.reqCat, { color: theme.textSecondary }]}>{req.category}</Text>
                </View>
                <View style={[s.reqBadge, { backgroundColor: STATUS_COLORS[req.status] + '20' }]}>
                  <Text style={[s.reqBadgeTxt, { color: STATUS_COLORS[req.status] }]}>{req.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ================================================================
          BROWSE MODAL
      ================================================================ */}
      <Modal visible={browseModal} animationType="slide" transparent onRequestClose={() => setBrowseModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground, maxHeight: '93%' }]}>
            <View style={s.modalHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[s.modalIcon, { backgroundColor: browseCategory?.color + '20' }]}>
                  <Text style={{ fontSize: 28 }}>{browseCategory?.icon}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[s.modalTitle, { color: theme.textPrimary }]}>{browseCategory?.name}</Text>
                  <Text style={[s.modalSub, { color: theme.textSecondary }]}>📍 {locationLabel}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setBrowseModal(false)}>
                <Text style={{ fontSize: 28, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[s.tabRow, { backgroundColor: theme.background }]}>
              <TouchableOpacity
                style={[s.tab, activeTab === 'nearby' && { backgroundColor: browseCategory?.color, borderColor: browseCategory?.color }]}
                onPress={() => setActiveTab('nearby')}
              >
                <Text style={[s.tabTxt, { color: activeTab === 'nearby' ? '#fff' : theme.textSecondary }]}>
                  🏪 Nearby Shops {nearbyShops.length > 0 ? `(${nearbyShops.length})` : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, activeTab === 'providers' && { backgroundColor: browseCategory?.color, borderColor: browseCategory?.color }]}
                onPress={() => setActiveTab('providers')}
              >
                <Text style={[s.tabTxt, { color: activeTab === 'providers' ? '#fff' : theme.textSecondary }]}>
                  👷 App Providers {appProviders.length > 0 ? `(${appProviders.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nearby Shops */}
            {activeTab === 'nearby' && (
              loadingShops ? (
                <View style={s.center}>
                  <ActivityIndicator size="large" color={browseCategory?.color} />
                  <Text style={[s.loadTxt, { color: theme.textSecondary }]}>
                    Finding real {browseCategory?.name} shops near you...
                  </Text>
                </View>
              ) : nearbyShops.length === 0 ? (
                <View style={s.center}>
                  <Text style={{ fontSize: 50 }}>🔍</Text>
                  <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No shops found nearby</Text>
                  <Text style={[s.emptySub, { color: theme.textSecondary }]}>
                    No {browseCategory?.name} shops found within 10km
                  </Text>
                  <TouchableOpacity
                    style={[s.becomeBtn, { backgroundColor: browseCategory?.color }]}
                    onPress={() => { setBrowseModal(false); setProvCategory(browseCategory?.name || ''); setBecomeModal(true); }}
                  >
                    <Text style={s.becomeBtnTxt}>💼 Be the first provider!</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={nearbyShops}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => <ShopCard item={item} />}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListHeaderComponent={
                    <View style={{ marginBottom: 8 }}>
                      <Text style={[s.resultsCount, { color: theme.textSecondary }]}>
                        ✅ Found {nearbyShops.length} real shops near you
                      </Text>
                    </View>
                  }
                  ListFooterComponent={
                    <TouchableOpacity
                      style={[s.becomeBtn, { backgroundColor: browseCategory?.color, marginTop: 8 }]}
                      onPress={() => { setBrowseModal(false); setProvCategory(browseCategory?.name || ''); setBecomeModal(true); }}
                    >
                      <Text style={s.becomeBtnTxt}>💼 Join as {browseCategory?.name} Provider</Text>
                    </TouchableOpacity>
                  }
                />
              )
            )}

            {/* App Providers */}
            {activeTab === 'providers' && (
              loadingProviders ? (
                <View style={s.center}>
                  <ActivityIndicator size="large" color={browseCategory?.color} />
                  <Text style={[s.loadTxt, { color: theme.textSecondary }]}>Looking for providers...</Text>
                </View>
              ) : appProviders.length === 0 ? (
                <View style={s.center}>
                  <Text style={{ fontSize: 50 }}>👷</Text>
                  <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>No providers yet</Text>
                  <Text style={[s.emptySub, { color: theme.textSecondary }]}>Be the first {browseCategory?.name} provider!</Text>
                  <TouchableOpacity
                    style={[s.becomeBtn, { backgroundColor: browseCategory?.color }]}
                    onPress={() => { setBrowseModal(false); setProvCategory(browseCategory?.name || ''); setBecomeModal(true); }}
                  >
                    <Text style={s.becomeBtnTxt}>💼 Become a Provider</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={appProviders}
                  keyExtractor={item => item._id}
                  renderItem={({ item }) => <AppProviderCard item={item} />}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )
            )}
          </View>
        </View>
      </Modal>

      {/* SHOP DETAIL MODAL */}
      <Modal visible={shopModal} animationType="slide" transparent onRequestClose={() => setShopModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground }]}>
            {selectedShop && (
              <>
                <View style={s.modalHead}>
                  <Text style={[s.modalTitle, { color: theme.textPrimary, flex: 1 }]} numberOfLines={2}>
                    {browseCategory?.icon} {selectedShop.name}
                  </Text>
                  <TouchableOpacity onPress={() => setShopModal(false)}>
                    <Text style={{ fontSize: 28, color: theme.textSecondary }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={[s.detailIconWrap, { backgroundColor: browseCategory?.color + '15' }]}>
                    <Text style={{ fontSize: 60 }}>{browseCategory?.icon}</Text>
                  </View>
                  <View style={s.distRow}>
                    <View style={[s.distChip, { backgroundColor: '#eff6ff' }]}>
                      <Text style={{ color: '#1d4ed8', fontWeight: 'bold' }}>📍 {selectedShop.distance} away</Text>
                    </View>
                  </View>
                  {selectedShop.address && selectedShop.address !== 'Nearby' && (
                    <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
                      <Text style={[s.infoLabel, { color: theme.textSecondary }]}>📍 Address</Text>
                      <Text style={[s.infoValue, { color: theme.textPrimary }]}>{selectedShop.address}</Text>
                    </View>
                  )}
                  {selectedShop.phone && (
                    <TouchableOpacity
                      style={[s.infoCard, { backgroundColor: theme.cardBackground }]}
                      onPress={() => callShop(selectedShop.phone)}
                    >
                      <Text style={[s.infoLabel, { color: theme.textSecondary }]}>📞 Phone</Text>
                      <Text style={[s.infoValue, { color: '#2563eb' }]}>{selectedShop.phone}</Text>
                    </TouchableOpacity>
                  )}
                  {selectedShop.opening && (
                    <View style={[s.infoCard, { backgroundColor: theme.cardBackground }]}>
                      <Text style={[s.infoLabel, { color: theme.textSecondary }]}>🕐 Hours</Text>
                      <Text style={[s.infoValue, { color: '#10b981' }]}>{selectedShop.opening}</Text>
                    </View>
                  )}
                  {selectedShop.website && (
                    <TouchableOpacity
                      style={[s.infoCard, { backgroundColor: theme.cardBackground }]}
                      onPress={() => Linking.openURL(selectedShop.website)}
                    >
                      <Text style={[s.infoLabel, { color: theme.textSecondary }]}>🌐 Website</Text>
                      <Text style={[s.infoValue, { color: '#2563eb' }]}>{selectedShop.website}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: browseCategory?.color }]}
                    onPress={() => getDirections(selectedShop)}
                  >
                    <Text style={s.actionBtnTxt}>🗺️ Get Directions</Text>
                  </TouchableOpacity>
                  {selectedShop.phone && (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#16a34a', marginTop: 10 }]}
                      onPress={() => callShop(selectedShop.phone)}
                    >
                      <Text style={s.actionBtnTxt}>📞 Call Now</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#0369a1', marginTop: 10 }]}
                    onPress={() => openInMaps(selectedShop)}
                  >
                    <Text style={s.actionBtnTxt}>📌 Open in Google Maps</Text>
                  </TouchableOpacity>
                  <View style={{ height: 20 }} />
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* BECOME PROVIDER MODAL */}
      <Modal visible={becomeModal} animationType="slide" transparent onRequestClose={() => setBecomeModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground, maxHeight: '93%' }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>💼 Become a Provider</Text>
              <TouchableOpacity onPress={() => setBecomeModal(false)}>
                <Text style={{ fontSize: 28, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.infoBox}>
                <Text style={s.infoBoxTxt}>📍 Registering at: {locationLabel}</Text>
              </View>
              <Text style={[s.label, { color: theme.textPrimary }]}>Your Service Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[s.catChip, { borderColor: cat.color, backgroundColor: provCategory === cat.name ? cat.color : 'transparent' }]}
                    onPress={() => setProvCategory(cat.name)}
                  >
                    <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                    <Text style={[s.catChipTxt, { color: provCategory === cat.name ? '#fff' : theme.textPrimary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[s.label, { color: theme.textPrimary }]}>About Yourself</Text>
              <TextInput
                style={[s.inp, s.textarea, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
                placeholder="Describe your experience..." placeholderTextColor={theme.placeholder}
                value={provBio} onChangeText={setProvBio} multiline numberOfLines={3} textAlignVertical="top"
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: theme.textPrimary }]}>Experience (years)</Text>
                  <TextInput
                    style={[s.inp, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="e.g. 3" placeholderTextColor={theme.placeholder}
                    value={provExp} onChangeText={setProvExp} keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: theme.textPrimary }]}>Base Price (₹)</Text>
                  <TextInput
                    style={[s.inp, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="e.g. 500" placeholderTextColor={theme.placeholder}
                    value={provPrice} onChangeText={setProvPrice} keyboardType="number-pad"
                  />
                </View>
              </View>
              <Text style={[s.label, { color: theme.textPrimary }]}>Skills (comma separated)</Text>
              <TextInput
                style={[s.inp, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.inputText }]}
                placeholder="e.g. Pipe fitting, Leak repair" placeholderTextColor={theme.placeholder}
                value={provSkills} onChangeText={setProvSkills}
              />
              <TouchableOpacity
                style={[s.submitBtn, becomingProv && { backgroundColor: '#93c5fd' }]}
                onPress={handleBecomeProvider} disabled={becomingProv}
              >
                {becomingProv ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnTxt}>🚀 Register as Provider</Text>}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal visible={settingsModal} animationType="slide" transparent onRequestClose={() => setSettingsModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { backgroundColor: theme.modalBackground }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: theme.textPrimary }]}>⚙️ Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModal(false)}>
                <Text style={{ fontSize: 28, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.settingRow, { borderBottomColor: theme.divider }]}>
              <View style={s.settingLeft}>
                <Text style={{ fontSize: 26, marginRight: 14 }}>{theme.isDarkMode ? '🌙' : '☀️'}</Text>
                <View>
                  <Text style={[s.settingLabel, { color: theme.textPrimary }]}>{theme.isDarkMode ? 'Dark Mode' : 'Light Mode'}</Text>
                  <Text style={[s.settingHint, { color: theme.textSecondary }]}>Toggle theme</Text>
                </View>
              </View>
              <Switch value={theme.isDarkMode} onValueChange={theme.toggleTheme}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor={theme.isDarkMode ? '#2563eb' : '#f3f4f6'} />
            </View>
            <TouchableOpacity style={[s.settingRow, { borderBottomColor: theme.divider }]} onPress={initLocation}>
              <View style={s.settingLeft}>
                <Text style={{ fontSize: 26, marginRight: 14 }}>📍</Text>
                <View>
                  <Text style={[s.settingLabel, { color: theme.textPrimary }]}>Refresh Location</Text>
                  <Text style={[s.settingHint, { color: theme.textSecondary }]} numberOfLines={1}>{locationLabel}</Text>
                </View>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 22 }}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.logoutBtn} onPress={() => { setSettingsModal(false); Alert.alert('Logout', 'Sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }]); }}>
              <Text style={s.logoutTxt}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1 },
  header:        { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  greeting:      { color: '#e0e7ff', fontSize: 13 },
  userName:      { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  locTxt:        { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  settingsBtn:   { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchBar:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:   { flex: 1, color: '#fff', fontSize: 14 },
  suggestions:   { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 16, elevation: 20, zIndex: 999, maxHeight: 350, overflow: 'hidden' },
  suggHeader:    { backgroundColor: '#eff6ff', padding: 10 },
  suggHeaderTxt: { color: '#1d4ed8', fontSize: 12, fontWeight: '600' },
  suggItem:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggIcon:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  suggName:      { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  suggSub:       { fontSize: 12, color: '#6b7280', marginTop: 1 },
  statsRow:      { flexDirection: 'row', padding: 16, gap: 10 },
  statCard:      { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', elevation: 3 },
  statValue:     { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  statLabel:     { fontSize: 11, marginTop: 2 },
  section:       { paddingHorizontal: 16, marginBottom: 8 },
  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold' },
  sectionSub:    { fontSize: 11 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard:       { width: '22%', borderRadius: 14, padding: 10, alignItems: 'center', elevation: 2 },
  catIcon:       { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  catName:       { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  banner:        { backgroundColor: '#1e3a8a', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bannerTitle:   { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bannerSub:     { color: '#bfdbfe', fontSize: 13 },
  reqCard:       { borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, borderLeftWidth: 4 },
  reqTitle:      { fontSize: 14, fontWeight: '600' },
  reqCat:        { fontSize: 12, marginTop: 2 },
  reqBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reqBadgeTxt:   { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalIcon:     { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  modalTitle:    { fontSize: 20, fontWeight: 'bold' },
  modalSub:      { fontSize: 12, marginTop: 2 },
  tabRow:        { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 12, gap: 6 },
  tab:           { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabTxt:        { fontSize: 13, fontWeight: '600' },
  center:        { alignItems: 'center', padding: 40 },
  loadTxt:       { marginTop: 14, fontSize: 14, textAlign: 'center' },
  emptyTitle:    { fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  emptySub:      { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  resultsCount:  { fontSize: 12, marginBottom: 8 },
  becomeBtn:     { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  becomeBtnTxt:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  shopCard:      { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 3 },
  distBadge:     { position: 'absolute', top: 12, right: 12, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  distTxt:       { color: '#1d4ed8', fontSize: 11, fontWeight: '700' },
  shopTop:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  shopIcon:      { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  shopName:      { fontSize: 15, fontWeight: '700', marginBottom: 4, paddingRight: 50 },
  shopAddr:      { fontSize: 12, marginBottom: 4 },
  shopOpen:      { fontSize: 12, marginBottom: 4 },
  shopPhone:     { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  shopBtns:      { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  shopBtn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  shopBtnTxt:    { fontSize: 12, fontWeight: '600' },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 3 },
  stars:         { color: '#f59e0b', fontSize: 13 },
  ratingNum:     { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  reviewCount:   { fontSize: 11 },
  openBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginVertical: 2 },
  openTxt:       { fontSize: 11, fontWeight: '700' },
  availBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  availTxt:      { fontSize: 11, fontWeight: '700' },
  detailIconWrap:{ height: 120, justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginBottom: 16 },
  distRow:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  distChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  infoCard:      { borderRadius: 12, padding: 14, marginBottom: 10 },
  infoLabel:     { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue:     { fontSize: 15, lineHeight: 22 },
  actionBtn:     { borderRadius: 14, padding: 16, alignItems: 'center' },
  actionBtnTxt:  { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  label:         { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inp:           { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  textarea:      { height: 90, textAlignVertical: 'top' },
  catChip:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 2 },
  catChipTxt:    { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  infoBox:       { backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoBoxTxt:    { color: '#1d4ed8', fontSize: 13 },
  submitBtn:     { backgroundColor: '#2563eb', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3 },
  submitBtnTxt:  { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  settingRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  settingLeft:   { flexDirection: 'row', alignItems: 'center' },
  settingLabel:  { fontSize: 16, fontWeight: '600' },
  settingHint:   { fontSize: 12, marginTop: 2 },
  logoutBtn:     { backgroundColor: '#fee2e2', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  logoutTxt:     { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
});