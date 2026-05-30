import { COUNTRIES } from './countries';
import { PRECOMPUTED_BORDERS } from './borders_precomputed';

// Predefined true geographic border/proximity relations for high accuracy
const MANUAL_BORDERS: Record<string, string[]> = {
  // United States ("840")
  "840": ["124", "484"], // Canada, Mexico (Strictly no Caribbean/transoceanic jumps to keep paths clean!)
  // Canada ("124")
  "124": ["840", "208"], // US, Denmark (via Greenland/Hans Island water borders)
  // Mexico ("484")
  "484": ["840", "320", "084"], // US, Guatemala, Belize
  // Brazil ("076")
  "076": ["032", "858", "600", "068", "604", "170", "862", "328", "740"], // AG, UY, PY, BO, PE, CO, VE, GY, SR (Removed France 254/French Guiana to prevent South America -> Europe jump!)
  // Argentina ("032")
  "032": ["152", "068", "600", "076", "858"], // CL, BO, PY, BR, UY
  // Colombia ("170")
  "170": ["591", "604", "076", "862", "590"], // EC, PE, BR, VE, PA
  // India ("356")
  "356": ["586", "156", "524", "064", "050", "104", "144", "048"], // PK, CN, NP, BT, BD, MM, LK, MV
  // China ("156")
  "156": ["643", "496", "356", "586", "524", "064", "104", "418", "704", "408", "398", "417", "762", "004", "410", "392", "702"], // RU, MN, IN, PK, NP, BT, MM, LA, VN, KP, KZ, KG, TJ, AF, KR, JP, SG
  // Russia ("643")
  "643": ["156", "496", "398", "804", "112", "246", "233", "428", "440", "616", "578", "268", "031", "408", "792", "752"], // CN, MN, KZ, UA, BY, FI, EE, LV, LT, PL, NO, GE, AZ, KP, TR, SE
  // France ("250")
  "250": ["724", "056", "276", "380", "756", "442", "826", "208"], // ES, BE, DE, IT, CH, LU, GB, DK (Strictly no South America jumps!)
  // United Kingdom ("826")
  "826": ["372", "250", "056", "528", "578", "352"], // IE, FR, BE, NL, NO, IS (Iceland)
  // Germany ("276")
  "276": ["250", "056", "528", "208", "616", "203", "040", "756", "442"], // FR, BE, NL, DK, PL, CZ, AT, CH, LU
  // Italy ("380")
  "380": ["250", "756", "040", "705", "300"], // FR, CH, AT, SI (Slovenia "705"), GR
  // Spain ("724")
  "724": ["620", "250", "430", "504"], // PT, FR, MA, DZ
  // Portugal ("620")
  "620": ["724"],
  // South Africa ("710")
  "710": ["516", "072", "716", "508", "426", "748", "646"], // NA, BW, ZW, MZ, LS, SZ, RW (prox)
  // Egypt ("818")
  "818": ["434", "729", "376", "682", "300"], // LY, SD, IL, SA, GR
  // Australia ("036")
  "036": ["554", "360", "598", "702", "376"], // NZ, ID, PG, SG
  // Japan ("392")
  "392": ["410", "408", "156", "643", "608"], // KR, KP, CN, RU, PH
  // South Korea ("410")
  "410": ["408", "392", "156"], // KP, JP, CN
  // Denmark ("208") (Greenland proxy)
  "208": ["124", "352", "276", "752", "578"], // Canada, Iceland, Germany, Sweden, Norway
  // Iceland ("352")
  "352": ["208", "826", "578", "372"], // Denmark, UK, Norway, Ireland
  // Ireland ("372")
  "372": ["826"], // UK
  // Poland ("616")
  "616": ["276", "203", "703", "804", "112", "440", "643"], // DE, CZ, SK, UA, BY, LT, RU
  // Ukraine ("804")
  "804": ["616", "112", "643", "498", "642", "348", "703"], // PL, BY, RU, MD, RO, HU, SK
  // Belarus ("112")
  "112": ["616", "804", "643", "440", "428"], // PL, UA, RU, LT, LV
  // Lithuania ("440")
  "440": ["616", "112", "428", "643"], // PL, BY, LV, RU
  // Latvia ("428")
  "428": ["440", "112", "643", "233"], // LT, BY, RU, EE
  // Estonia ("233")
  "233": ["428", "643", "246"], // LV, RU, FI
  // Czech Republic ("203")
  "203": ["276", "616", "703", "040"], // DE, PL, SK, AT
  // Slovakia ("703")
  "703": ["203", "616", "804", "348", "040"], // CZ, PL, UA, HU, AT
  // Hungary ("348")
  "348": ["040", "703", "804", "642", "688", "191", "705"], // AT, SK, UA, RO, RS, HR, SI
  // Romania ("642")
  "642": ["804", "498", "100", "688", "348"], // UA, MD, BG, RS, HU
  // Moldova ("498")
  "498": ["642", "804"], // RO, UA
  // Bulgaria ("100")
  "100": ["642", "688", "300", "792"], // RO, RS, GR, TR
  // Austria ("040")
  "040": ["276", "203", "703", "348", "705", "380", "756"] // DE, CZ, SK, HU, SI, IT, CH
};

// Haversine formula to compute geodesic distance between two capitals
export function getCapitalDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Function to dynamically compute fallback borders for a country
export function getFallbackNeighbors(countryId: string, limit: number = 6): string[] {
  const source = COUNTRIES.find(c => c.id === countryId);
  if (!source) return [];

  const list = COUNTRIES.filter(c => c.id !== countryId)
    .map(c => {
      const dist = getCapitalDistance(
        source.capitalCoords.lat,
        source.capitalCoords.lng,
        c.capitalCoords.lat,
        c.capitalCoords.lng
      );
      // Give same-continent countries a slight proximity bias
      const continentBonus = source.continent === c.continent ? 0.75 : 1.0;
      return {
        id: c.id,
        distance: dist * continentBonus,
      };
    })
    .sort((a, b) => a.distance - b.distance);

  return list.slice(0, limit).map(item => item.id);
}

// Get final combined neighbors
let SYMMETRIC_BORDERS_MAP: Record<string, string[]> | null = null;

export function getSymmetricBordersMap(): Record<string, string[]> {
  if (SYMMETRIC_BORDERS_MAP) {
    return SYMMETRIC_BORDERS_MAP;
  }

  const map: Record<string, Set<string>> = {};

  // Initialize for all countries
  for (const c of COUNTRIES) {
    map[c.id] = new Set<string>();
  }

  // 1. Add all precomputed land topology borders
  for (const [cid, neighbors] of Object.entries(PRECOMPUTED_BORDERS)) {
    if (map[cid]) {
      for (const nid of neighbors) {
        if (map[nid]) {
          map[cid].add(nid);
          map[nid].add(cid); // Keep strictly symmetric
        }
      }
    }
  }

  // 2. Add all hardcoded MANUAL_BORDERS bidirectionally for custom/special adjustments
  for (const [cid, neighbors] of Object.entries(MANUAL_BORDERS)) {
    for (const nid of neighbors) {
      if (map[cid] && map[nid]) {
        map[cid].add(nid);
        map[nid].add(cid); // Force bidirectional!
      }
    }
  }

  // 3. Ensure each country has a healthy number of neighbors by adding nearest capital neighbors
  // as fallbacks if they have less than 3 connections (e.g. islands, highly isolated regions)
  for (const c of COUNTRIES) {
    const currentCount = map[c.id] ? map[c.id].size : 0;
    if (currentCount < 3) {
      const fallbackList = getFallbackNeighbors(c.id, 6 - currentCount);
      for (const nid of fallbackList) {
        if (map[c.id] && map[nid]) {
          map[c.id].add(nid);
          map[nid].add(c.id); // Force bidirectional fallback!
        }
      }
    }
  }

  // Convert Sets to arrays for standard usage
  const result: Record<string, string[]> = {};
  for (const [cid, set] of Object.entries(map)) {
    result[cid] = Array.from(set);
  }

  SYMMETRIC_BORDERS_MAP = result;
  return result;
}

let LAND_ONLY_BORDERS_MAP: Record<string, string[]> | null = null;

export function getLandOnlyBordersMap(): Record<string, string[]> {
  if (LAND_ONLY_BORDERS_MAP) {
    return LAND_ONLY_BORDERS_MAP;
  }

  const map: Record<string, Set<string>> = {};

  // Initialize for all countries
  for (const c of COUNTRIES) {
    map[c.id] = new Set<string>();
  }

  // Precomputed or manual connections we want to strictly filter out as maritime jumps
  const maritimePairs = new Set<string>([
    // UK ("826")
    "826-250", "250-826", // France
    "826-056", "056-826", // Belgium
    "826-528", "528-826", // Netherlands
    "826-352", "352-826", // Iceland
    "826-578", "578-826", // Norway
    
    // Canada / Greenland / Denmark
    "124-208", "208-124", // Canada - Denmark
    "208-352", "352-208", // Denmark - Iceland
    "208-578", "578-208", // Denmark - Norway
    "208-752", "752-208", // Denmark - Sweden
    
    // Iceland ("352")
    "352-578", "578-352", // Norway
    "352-372", "372-352", // Ireland
    
    // Spain ("724") / France / Italy / Greece / Egypt
    "724-012", "012-724", // Spain - Algeria
    "250-208", "208-250", // France - Denmark
    "380-300", "300-380", // Italy - Greece
    "818-300", "300-818", // Egypt - Greece
    "818-682", "682-818", // Egypt - Saudi Arabia
    "710-646", "646-710", // South Africa - Rwanda
    "643-792", "792-643", // Russia - Turkey
    "643-752", "752-643", // Russia - Sweden

    // Australia ("036")
    "036-554", "554-036", // NZ
    "036-360", "360-036", // Indonesia
    "036-598", "598-036", // PNG
    "036-702", "702-036", // Singapore

    // Japan ("392")
    "392-410", "410-392", // South Korea
    "392-408", "408-392", // North Korea
    "392-156", "156-392", // China
    "392-643", "643-392", // Russia
    "392-608", "608-392", // Philippines
    "392-158", "158-392", // Taiwan

    // Sri Lanka ("144")
    "144-356", "356-144", // India
    "144-462", "462-144", // Maldives

    // Madagascar ("450")
    "450-508", "508-450", // Mozambique
    "450-710", "710-450", // South Africa
    "450-480", "480-450", // Mauritius
    "450-690", "690-450", // Seychelles
    "450-174", "174-450", // Comoros

    // Philippines ("608")
    "608-158", "158-608", // Taiwan
    "608-458", "458-608", // Malaysia
    "608-360", "360-608", // Indonesia
    "608-704", "704-608", // Vietnam

    // Cuba ("192")
    "192-840", "840-192", // USA
    "192-484", "484-192", // Mexico
    "192-044", "044-192", // Bahamas
    "192-332", "332-192", // Haiti
    "192-388", "388-192", // Jamaica

    // New Zealand ("554")
    "554-242", "242-554", // Fiji

    // Taiwan ("158")
    "158-156", "156-158", // China

    // Cyprus ("196")
    "196-300", "300-196", // Greece
    "196-792", "792-196", // Turkey
    "196-422", "422-196", // Lebanon
    "196-760", "760-196", // Syria
    "196-376", "376-196", // Israel
    "196-818", "818-196", // Egypt

    // Malta ("470")
    "470-380", "380-470", // Italy
    "470-788", "788-470", // Tunisia
    "470-434", "434-470", // Libya

    // Singapore ("702")
    "702-458", "458-702", // Malaysia
    "702-360", "360-702", // Indonesia
  ]);

  // 1. Add all precomputed land topology borders, excluding maritime
  for (const [cid, neighbors] of Object.entries(PRECOMPUTED_BORDERS)) {
    if (map[cid]) {
      for (const nid of neighbors) {
        if (map[nid]) {
          const key = `${cid}-${nid}`;
          if (!maritimePairs.has(key)) {
            map[cid].add(nid);
            map[nid].add(cid);
          }
        }
      }
    }
  }

  // 2. Add manual borders, excluding maritime
  for (const [cid, neighbors] of Object.entries(MANUAL_BORDERS)) {
    for (const nid of neighbors) {
      if (map[cid] && map[nid]) {
        const key = `${cid}-${nid}`;
        if (!maritimePairs.has(key)) {
          map[cid].add(nid);
          map[nid].add(cid);
        }
      }
    }
  }

  // Note: We completely skip nearest-capital fallbacks because we strictly ignore maritime boundaries!

  const result: Record<string, string[]> = {};
  for (const [cid, set] of Object.entries(map)) {
    result[cid] = Array.from(set);
  }

  LAND_ONLY_BORDERS_MAP = result;
  return result;
}

export function getCountryNeighbors(countryId: string): string[] {
  const map = getSymmetricBordersMap();
  return map[countryId] || [];
}

// Return complete country neighbors in supply chain mode, strictly land-only
export function getSupplyChainNeighbors(id: string): string[] {
  const map = getLandOnlyBordersMap();
  return map[id] || [];
}

/**
 * BFS-based pathfinding on unweighted graph using getSupplyChainNeighbors adjacency.
 * Returns the path (array of IDs from start to end, inclusive) or null if no path exists.
 */
export function findSupplyChainPath(
  startId: string,
  endId: string,
  avoidIds: Set<string> = new Set()
): string[] | null {
  if (startId === endId) return [startId];
  
  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const lastId = path[path.length - 1];
    
    // Get playable neighbors
    const neighbors = getSupplyChainNeighbors(lastId);
    
    for (const neighbor of neighbors) {
      if (neighbor === endId) {
        return [...path, neighbor];
      }
      
      if (!visited.has(neighbor) && !avoidIds.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  
  return null;
}

