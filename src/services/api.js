// frontend/src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── PERMANENT BACKEND URL ─────────────────────────────────────────────────────
const API_URL = 'https://heymatebackend-production.up.railway.app/api';
// ─────────────────────────────────────────────────────────────────────────────

const apiFetch = async (endpoint, method = 'GET', body = null) => {
  const token = await AsyncStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${API_URL}${endpoint}`, opts);
  const data = await res.json();
  return data;
};

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:      (data) => apiFetch('/auth/register', 'POST', data),
  login:         (data) => apiFetch('/auth/login',    'POST', data),
  getProfile:    ()     => apiFetch('/auth/profile'),
  updateProfile: (data) => apiFetch('/auth/profile',  'PUT',  data),
};

// ── REQUESTS ──────────────────────────────────────────────────────────────────
export const requestAPI = {
  create:           (data)          => apiFetch('/requests',                   'POST', data),
  getMyRequests:    ()              => apiFetch('/requests/my-requests'),
  getNearby:        (lat, lng, r)   => apiFetch(`/requests/nearby?latitude=${lat}&longitude=${lng}&radius=${r}`),
  getById:          (id)            => apiFetch(`/requests/${id}`),
  makeOffer:        (id, data)      => apiFetch(`/requests/${id}/offer`,        'POST', data),
  acceptOffer:      (id, data)      => apiFetch(`/requests/${id}/accept-offer`, 'POST', data),
  complete:         (id)            => apiFetch(`/requests/${id}/complete`,     'PUT'),
  cancel:           (id, data)      => apiFetch(`/requests/${id}/cancel`,       'PUT',  data),
  search:           (q, lat, lng)   => apiFetch(`/requests/search?q=${q}&latitude=${lat}&longitude=${lng}&radius=20`),
};

// ── PROVIDERS ─────────────────────────────────────────────────────────────────
export const providerAPI = {
  register:         (data)          => apiFetch('/providers/register',    'POST', data),
  getNearby:        (cat, lat, lng) => apiFetch(`/providers/nearby?category=${cat}&latitude=${lat}&longitude=${lng}&radius=30`),
  getMyProfile:     ()              => apiFetch('/providers/profile'),
  updateProfile:    (data)          => apiFetch('/providers/profile',     'PUT',  data),
  toggleAvailable:  (data)          => apiFetch('/providers/availability', 'PUT', data),
};

// ── REVIEWS ───────────────────────────────────────────────────────────────────
export const reviewAPI = {
  submit:      (data) => apiFetch('/reviews',              'POST', data),
  getProvider: (id)   => apiFetch(`/reviews/provider/${id}`),
};

export default { authAPI, requestAPI, providerAPI, reviewAPI, API_URL };