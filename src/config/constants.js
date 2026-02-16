// frontend/src/config/constants.js
// ── Single place to update backend URL ───────────────────────────────────────
export const API_URL     = 'https://heymatebackend-production.up.railway.app/api';
export const SOCKET_URL  = 'https://heymatebackend-production.up.railway.app';

export const CATEGORIES = [
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

// Google Places API Key — get free at console.cloud.google.com
export const GOOGLE_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';

// Category → Google Places search keyword mapping
export const CATEGORY_SEARCH = {
  'Plumbing':      'plumber plumbing shop',
  'Electrical':    'electrician electrical shop',
  'Cleaning':      'cleaning service',
  'Painting':      'painter painting service',
  'Carpentry':     'carpenter furniture repair',
  'AC Repair':     'AC repair air conditioner service',
  'Car Wash':      'car wash',
  'Moving':        'packers movers transport',
  'Salon':         'salon beauty parlour',
  'Pet Care':      'pet shop veterinary',
  'Tutoring':      'tuition coaching centre',
  'Food Delivery': 'restaurant food',
  'Other':         'home services',
};
