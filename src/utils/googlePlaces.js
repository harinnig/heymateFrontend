// frontend/src/utils/googlePlaces.js

// Use environment variable
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

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

export const fetchNearbyShops = async (latitude, longitude, category, radius = 10000) => {
  try {
    const keyword = CATEGORY_TO_KEYWORD[category] || category;
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
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
    console.log('Google Places Response:', data);

    if (data.places && data.places.length > 0) {
      return {
        success: true,
        shops: data.places.map(place => ({
          id: place.id,
          name: place.displayName?.text || 'Unknown',
          address: place.formattedAddress || '',
          rating: place.rating || null,
          totalRatings: place.userRatingCount || 0,
          isOpen: place.currentOpeningHours?.openNow,
          photoUrl: place.photos?.[0]?.name 
            ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`
            : null,
          latitude: place.location?.latitude,
          longitude: place.location?.longitude,
          distance: calculateDistance(latitude, longitude, place.location?.latitude, place.location?.longitude),
          placeId: place.id,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || '')}`,
          directionsUrl: place.location?.latitude && place.location?.longitude
            ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}`
            : null,
        })),
      };
    }
    return { success: true, shops: [] };
  } catch (error) {
    console.error('fetchNearbyShops error:', error);
    return { success: false, shops: [], error: error.message };
  }
};

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