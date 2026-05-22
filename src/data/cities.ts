export interface CityItem {
  name: string;
  lat: number;
  lng: number;
  countryCode: string;
  minZoom: number;
  description?: string;
  isSecondary?: boolean; // True for non-capitals, false if we also want to dynamically render capitals
}

export const ADDITIONAL_CITIES: CityItem[] = [
  // North America
  { name: "New York", lat: 40.7128, lng: -74.0060, countryCode: "us", minZoom: 2.0, description: "Finance and cultural hub" },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, countryCode: "us", minZoom: 3.2, description: "Entertainment capital on Pacific coast" },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194, countryCode: "us", minZoom: 2.8, description: "Silicon Valley technology high-center" },
  { name: "Chicago", lat: 41.8781, lng: -87.6298, countryCode: "us", minZoom: 3.8, description: "Industrial and architectural focal point" },
  { name: "Miami", lat: 25.7617, lng: -80.1918, countryCode: "us", minZoom: 4.2, description: "Gateway to Latin America" },
  { name: "Seattle", lat: 47.6062, lng: -122.3321, countryCode: "us", minZoom: 4.5, description: "Pacific Northwest tech city" },
  { name: "Toronto", lat: 43.6532, lng: -79.3832, countryCode: "ca", minZoom: 2.5, description: "Canada's financial engine" },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207, countryCode: "ca", minZoom: 3.8, description: "Pacific gateway and filming center" },
  { name: "Montreal", lat: 45.5017, lng: -73.5673, countryCode: "ca", minZoom: 4.2, description: "Francophone cultural heartland" },
  { name: "Cancun", lat: 21.1619, lng: -86.8515, countryCode: "mx", minZoom: 4.5, description: "Carribean coastal hub" },
  { name: "Guadalajara", lat: 20.6597, lng: -103.3496, countryCode: "mx", minZoom: 4.8, description: "Tech and culture heart of Jalisco" },

  // South America
  { name: "São Paulo", lat: -23.5505, lng: -46.6333, countryCode: "br", minZoom: 2.5, description: "Largest economic hub in South America" },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, countryCode: "br", minZoom: 3.0, description: "Cultural coast, harbor and carnival capital" },
  { name: "Medellín", lat: 6.2442, lng: -75.5812, countryCode: "co", minZoom: 4.5, description: "City of eternal spring and innovation" },
  { name: "Guayaquil", lat: -2.1894, lng: -79.8890, countryCode: "ec", minZoom: 4.5, description: "Ecuador's commercial port city" },
  { name: "Córdoba", lat: -31.4135, lng: -64.1811, countryCode: "ar", minZoom: 4.8, description: "Historic academic center" },

  // Europe
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, countryCode: "tr", minZoom: 2.0, description: "Bosphorus spanning Europe and Asia" },
  { name: "Munich", lat: 48.1351, lng: 11.5820, countryCode: "de", minZoom: 3.2, description: "Bavarian high-tech capital" },
  { name: "Frankfurt", lat: 50.1109, lng: 8.6821, countryCode: "de", minZoom: 3.8, description: "Sovereign banking and transit center" },
  { name: "Hamburg", lat: 53.5511, lng: 9.9937, countryCode: "de", minZoom: 4.5, description: "Northern river port gate" },
  { name: "Milan", lat: 45.4642, lng: 9.1900, countryCode: "it", minZoom: 3.0, description: "Fashion, architecture and commerce" },
  { name: "Barcelona", lat: 41.3851, lng: 2.1734, countryCode: "es", minZoom: 2.5, description: "Catalonian artistic coast" },
  { name: "Geneva", lat: 46.2044, lng: 6.1432, countryCode: "ch", minZoom: 4.0, description: "Global diplomacy and physics labs" },
  { name: "Zurich", lat: 47.3769, lng: 8.5417, countryCode: "ch", minZoom: 3.5, description: "Global gold reserves and banking" },
  { name: "St. Petersburg", lat: 59.9343, lng: 30.3351, countryCode: "ru", minZoom: 3.0, description: "Baltic cultural capital" },
  { name: "Manchester", lat: 53.4808, lng: -2.2426, countryCode: "gb", minZoom: 4.0, description: "Birthplace of the industrial shift" },
  { name: "Lyon", lat: 45.7640, lng: 4.8357, countryCode: "fr", minZoom: 4.2, description: "Gastronomy and silk heritage" },

  // Asia
  { name: "Shanghai", lat: 31.2304, lng: 121.4737, countryCode: "cn", minZoom: 2.0, description: "Global finance and deepwater shipping" },
  { name: "Shenzhen", lat: 22.5431, lng: 114.0579, countryCode: "cn", minZoom: 3.2, description: "Hardware capital of the world" },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694, countryCode: "cn", minZoom: 2.5, description: "High-density maritime banking gateway" },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777, countryCode: "in", minZoom: 2.0, description: "Commercial enterprise capital of South Asia" },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946, countryCode: "in", minZoom: 3.0, description: "Silicon valley of the subcontinent" },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, countryCode: "ae", minZoom: 2.2, description: "Global aviation and trade centerpiece" },
  { name: "Osaka", lat: 34.6937, lng: 135.5023, countryCode: "jp", minZoom: 3.0, description: "Industrial powerhouse of central Japan" },
  { name: "Almaty", lat: 43.2220, lng: 76.8512, countryCode: "kz", minZoom: 4.5, description: "Tian Shan scenic tech valley" },
  { name: "Karachi", lat: 24.8607, lng: 67.0011, countryCode: "pk", minZoom: 3.5, description: "Megacity port of Pakistan" },

  // Africa
  { name: "Lagos", lat: 6.5244, lng: 3.3792, countryCode: "ng", minZoom: 2.5, description: "West African entertainment and tech city" },
  { name: "Johannesburg", lat: -26.2041, lng: 28.0473, countryCode: "za", minZoom: 2.5, description: "Sovereign mineral gold deposit capital" },
  { name: "Cape Town", lat: -33.9249, lng: 18.4241, countryCode: "za", minZoom: 3.0, description: "Atlantic-Indian ocean gateway meeting" },
  { name: "Casablanca", lat: 33.5731, lng: -7.5898, countryCode: "ma", minZoom: 3.5, description: "Atlantic maritime port trade center" },
  { name: "Alexandria", lat: 31.2001, lng: 29.9187, countryCode: "eg", minZoom: 4.0, description: "Historic Mediterranean gateway" },

  // Oceania
  { name: "Sydney", lat: -33.8688, lng: 151.2093, countryCode: "au", minZoom: 2.2, description: "Harbor gateway of New South Wales" },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631, countryCode: "au", minZoom: 2.8, description: "Cultural and garden showcase city" },
  { name: "Auckland", lat: -36.8485, lng: 174.7633, countryCode: "nz", minZoom: 3.2, description: "Volcanic harbor cityscape" }
];
