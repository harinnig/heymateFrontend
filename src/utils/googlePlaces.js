// frontend/src/utils/googlePlaces.js

const GOOGLE_API_KEY = 'AIzaSyD7Sok4RtWxOAIXv4xGIQTyfzKy3vxcTyo'; // Your key

// Maps your app categories to Google Places types
const CATEGORY_TO_PLACE_TYPE = {
  'Plumbing':       ['plumber'],
  'Electrical':     ['electrician'],
  'Cleaning':       ['laundry'],
  'Painting':       ['painter'],
  'Carpentry':      ['general_contractor'],
  'AC Repair':      ['electrician'],
  'Car Wash':       ['car_wash'],
  'Moving':         ['moving_company'],
  'Salon':          ['hair_care', 'beauty_salon'],
  'Pet Care':       ['pet_store', 'veterinary_care'],
  'Tutoring':       ['school', 'library'],
  'Food Delivery':  ['restaurant', 'meal_delivery'],
};

// Maps Google place types to search keywords
const CATEGORY_TO_KEYWORD = {
  'Plumbing':       'plumber plumbing service',
  'Electrical':     'electrician electrical service',
  'Cleaning':       'cleaning service home cleaning',
  'Painting':       'painting service painter',
  'Carpentry':      'carpenter carpentry furniture repair',
  'AC Repair':      'AC repair air conditioner service',
  'Car Wash':       'car wash auto detailing',
  'Moving':         'packers movers relocation service',
  'Salon':          'salon hair beauty parlour',
  'Pet Care':       'pet shop veterinary pet care',
  'Tutoring':       'tutor coaching centre education',
  'Food Delivery':  'restaurant food delivery',
};

/**
 * Fetch nearby shops from Google Places API
 */
export const fetchNearbyShops = async (latitude, longitude, category, radius = 10000) => {
  try {
    const keyword = CATEGORY_TO_KEYWORD[category] || category;

    // Use Nearby Search endpoint
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${latitude},${longitude}` +
      `&radius=${radius}` +
      `&keyword=${encodeURIComponent(keyword)}` +
      `&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data     = await response.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return {
        success: true,
        shops:   (data.results || []).map(place => formatPlace(place, latitude, longitude)),
      };
    } else {
      console.error('Places API error:', data.status, data.error_message);
      return { success: false, shops: [], error: data.error_message || data.status };
    }
  } catch (error) {
    console.error('fetchNearbyShops error:', error);
    return { success: false, shops: [], error: error.message };
  }
};

/**
 * Get place photo URL
 */
export const getPlacePhotoUrl = (photoReference, maxWidth = 400) => {
  if (!photoReference) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_API_KEY}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R    = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1); // Distance in km
};

const deg2rad = (deg) => deg * (Math.PI / 180);

/**
 * Format a Google Place result into a clean object
 */
const formatPlace = (place, userLat, userLon) => {
  const photoRef = place.photos?.[0]?.photo_reference;
  const lat      = place.geometry?.location?.lat;
  const lon      = place.geometry?.location?.lng;
  const distance = lat && lon ? calculateDistance(userLat, userLon, lat, lon) : null;

  return {
    id:          place.place_id,
    name:        place.name,
    address:     place.vicinity || place.formatted_address || '',
    rating:      place.rating || null,
    totalRatings: place.user_ratings_total || 0,
    isOpen:      place.opening_hours?.open_now,
    photoUrl:    photoRef ? getPlacePhotoUrl(photoRef) : null,
    latitude:    lat,
    longitude:   lon,
    distance:    distance,
    types:       place.types || [],
    priceLevel:  place.price_level,
    placeId:     place.place_id,
    // For Maps redirect
    mapsUrl:     `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    directionsUrl: lat && lon
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${place.place_id}`
      : null,
  };
};
