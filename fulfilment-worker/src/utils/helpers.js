/**
 * Utility helper functions
 */

export function generateId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}`;
}

export function successResponse(data, message = null, meta = {}) {
  return {
    success: true,
    message,
    data,
    ...meta,
  };
}

export function errorResponse(message, statusCode = 500, details = null) {
  return {
    success: false,
    error: {
      message,
      statusCode,
      details,
    },
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get coordinates from zipcode (simplified - in production use real geocoding API)
 */
export function getCoordinatesFromZipcode(zipcode) {
  // This is a simplified mapping for demo
  // In production, use a geocoding API like Google Maps or OpenCage
  const zipcodeMap = {
    // Tamil Nadu - Chennai
    600002: { lat: 13.0827, lon: 80.2707 },
    600001: { lat: 13.0878, lon: 80.2785 },
    600003: { lat: 13.0732, lon: 80.2609 },
    600004: { lat: 13.0569, lon: 80.2425 },
    600005: { lat: 13.0732, lon: 80.225 },

    // Tamil Nadu - Coimbatore
    641001: { lat: 11.0168, lon: 76.9558 },
    641002: { lat: 11.0095, lon: 76.964 },
    641003: { lat: 11.0228, lon: 76.9653 },

    // Tamil Nadu - Madurai
    625001: { lat: 9.9252, lon: 78.1198 },
    625002: { lat: 9.9195, lon: 78.1193 },
    625003: { lat: 9.9312, lon: 78.1211 },

    // Tamil Nadu - Tiruchirappalli
    620001: { lat: 10.7905, lon: 78.7047 },
    620002: { lat: 10.8066, lon: 78.6856 },
    620003: { lat: 10.8155, lon: 78.6948 },

    // Tamil Nadu - Salem
    636001: { lat: 11.6643, lon: 78.146 },
    636002: { lat: 11.6548, lon: 78.1532 },

    // Tamil Nadu - Tirunelveli
    627001: { lat: 8.7139, lon: 77.7567 },
    627002: { lat: 8.7289, lon: 77.6889 },

    // Tamil Nadu - Vellore
    632001: { lat: 12.9165, lon: 79.1325 },
    632002: { lat: 12.9075, lon: 79.1456 },

    // Tamil Nadu - Thanjavur
    613001: { lat: 10.7867, lon: 79.1378 },
    613002: { lat: 10.7905, lon: 79.1234 },

    // Tamil Nadu - Erode
    638001: { lat: 11.341, lon: 77.7172 },
    638002: { lat: 11.3528, lon: 77.7289 },

    // Tamil Nadu - Tiruppur
    641601: { lat: 11.1085, lon: 77.3411 },
    641602: { lat: 11.1134, lon: 77.3567 },

    // Default (Tamil Nadu center)
    default: { lat: 11.1271, lon: 78.6569 },
  };

  // If exact match not found, try pattern matching for zones
  if (!zipcodeMap[zipcode]) {
    const prefix = zipcode.substring(0, 3);
    const patterns = {
      600: { lat: 13.0827, lon: 80.2707 }, // Chennai area
      641: { lat: 11.0168, lon: 76.9558 }, // Coimbatore area
      625: { lat: 9.9252, lon: 78.1198 }, // Madurai area
      620: { lat: 10.7905, lon: 78.7047 }, // Trichy area
      636: { lat: 11.6643, lon: 78.146 }, // Salem area
      627: { lat: 8.7139, lon: 77.7567 }, // Tirunelveli area
      632: { lat: 12.9165, lon: 79.1325 }, // Vellore area
      613: { lat: 10.7867, lon: 79.1378 }, // Thanjavur area
      638: { lat: 11.341, lon: 77.7172 }, // Erode area
    };

    return patterns[prefix] || zipcodeMap['default'];
  }

  return zipcodeMap[zipcode] || zipcodeMap['default'];
}
