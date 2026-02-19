// frontend/src/utils/googlePlaces.js

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

export const fetchNearbyShops = async (latitude, longitude, category, radius = 10000) => {
  try {
    const keyword = CATEGORY_TO_KEYWORD[category] || category;
    
    console.log('🔍 Searching:', keyword, 'at', latitude, longitude);
    
    const url = 'https://places.googleapis.com/v1/places:searchText';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.id',
      },
      body: JSON.stringify({
        textQuery: keyword,
        locationBias: {
          circle: {
            center: { 
              latitude: parseFloat(latitude), 
              longitude: parseFloat(longitude) 
            },
            radius: radius,
          },
        },
        maxResultCount: 20,
      }),
    });

    const data = await response.json();
    
    console.log('📍 Google Places returned:', data.places?.length || 0, 'results');

    if (data.places && data.places.length > 0) {
      const shops = data.places.map(place => {
        const distance = calculateDistance(
          latitude, 
          longitude, 
          place.location?.latitude, 
          place.location?.longitude
        );
        
        return {
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
          distance: distance,
          distanceNum: parseFloat(distance), // for sorting
          placeId: place.id,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || '')}`,
          directionsUrl: place.location?.latitude && place.location?.longitude
            ? `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}`
            : null,
        };
      });

      // Sort by distance - nearest first
      shops.sort((a, b) => a.distanceNum - b.distanceNum);
      
      // Filter out anything more than radius away
      const filtered = shops.filter(shop => shop.distanceNum < radius / 1000);
      
      console.log('✅ Returning', filtered.length, 'nearby shops');
      
      return {
        success: true,
        shops: filtered,
      };
    }
    
    return { success: true, shops: [] };
    
  } catch (error) {
    console.error('❌ fetchNearbyShops error:', error);
    return { success: false, shops: [], error: error.message };
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return '999.9km';
  
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  
  if (d < 1) {
    return `${Math.round(d * 1000)}m`;
  }
  return `${d.toFixed(1)}km`;
};

const deg2rad = (deg) => deg * (Math.PI / 180);