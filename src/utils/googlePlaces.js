// frontend/src/utils/googlePlaces.js (NEW API version)

const GOOGLE_API_KEY = 'AIzaSyARowVxUYFFpNsj9-SC8U6I5xX4-aYqYTk';

const CATEGORY_TO_KEYWORD = {
  'Plumbing':       'plumber',
  'Electrical':     'electrician',
  'Cleaning':       'cleaning service',
  'Painting':       'painter',
  'Carpentry':      'carpenter',
  'AC Repair':      'AC repair',
  'Car Wash':       'car wash',
  'Moving':         'movers',
  'Salon':          'salon',
  'Pet Care':       'pet shop',
  'Tutoring':       'tutor',
  'Food Delivery':  'restaurant',
};

/**
 * Fetch nearby shops using NEW Places API
 */
export const fetchNearbyShops = async (latitude, longitude, category, radius = 10000) => {
  try {
    const keyword = CATEGORY_TO_KEYWORD[category] || category;

    // Use Text Search (New) - works without legacy API
    const url = `https://places.googleapis.com/v1/places:searchText`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.id',
      },
      body: JSON.stringify({
        textQuery: `${keyword} near me`,
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: radius,
          },
        },
        maxResultCount: 20,
      }),
    });

    const data = await response.json();

    if (data.places && data.places.length > 0) {
      return {
        success: true,
        shops: data.places.map(place => formatPlaceV2(place, latitude, longitude)),
      };
    } else {
      return { success: true, shops: [] }; // No results is not an error
    }
  } catch (error) {
    console.error('fetchNearbyShops error:', error);
    return { success: false, shops: [], error: error.message };
  }
};

/**
 * Get place photo URL (NEW API)
 */
export const getPlacePhotoUrl = (photoName, maxWidth = 400) => {
  if (!photoName) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;
};

/**
 * Calculate distance (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

const deg2rad = (deg) => deg * (Math.PI / 180);

/**
 * Format NEW API place result
 */
const formatPlaceV2 = (place, userLat, userLon) => {
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  const distance = lat && lon ? calculateDistance(userLat, userLon, lat, lon) : null;
  const photoName = place.photos?.[0]?.name;

  return {
    id: place.id,
    name: place.displayName?.text || 'Unknown',
    address: place.formattedAddress || '',
    rating: place.rating || null,
    totalRatings: place.userRatingCount || 0,
    isOpen: place.currentOpeningHours?.openNow,
    photoUrl: photoName ? getPlacePhotoUrl(photoName) : null,
    latitude: lat,
    longitude: lon,
    distance: distance,
    placeId: place.id,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || '')}&query_place_id=${place.id}`,
    directionsUrl: lat && lon
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
      : null,
  };
};