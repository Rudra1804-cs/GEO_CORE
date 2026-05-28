import * as topojson from 'topojson-client';
import fs from 'fs';

async function run() {
  console.log("Fetching topojson...");
  const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  const data = await res.json();
  
  const geometries = data.objects.countries.geometries;
  const neighs = topojson.neighbors(geometries);
  
  const borders = {};
  
  // Initialize with empty arrays
  geometries.forEach(g => {
    if (g.id) {
      const cid = String(g.id).padStart(3, '0');
      borders[cid] = new Set();
    }
  });

  // Map topological neighbors
  geometries.forEach((g, idx) => {
    if (!g.id) return;
    const cid = String(g.id).padStart(3, '0');
    const nIndices = neighs[idx] || [];
    nIndices.forEach(nIdx => {
      const ng = geometries[nIdx];
      if (ng && ng.id) {
        const nid = String(ng.id).padStart(3, '0');
        borders[cid].add(nid);
        borders[nid].add(cid);
      }
    });
  });

  // Supplement coordinates or common proximity borders (e.g. islands, water separations)
  // to ensure they are connected and playable in Supply Chain mode
  const maritimeConnections = [
    // UK ("826") - France, Ireland, Belgium, Netherlands, Iceland, Norway
    { a: "826", b: "250" }, { a: "826", b: "372" }, { a: "826", b: "056" }, { a: "826", b: "528" }, { a: "826", b: "352" }, { a: "826", b: "578" },
    // Australia ("036") - New Zealand, Indonesia, Papua New Guinea, Singapore
    { a: "036", b: "554" }, { a: "036", b: "360" }, { a: "036", b: "598" }, { a: "036", b: "702" }, 
    // Japan ("392") - South Korea, North Korea, China, Russia, Philippines, Taiwan
    { a: "392", b: "410" }, { a: "392", b: "408" }, { a: "392", b: "156" }, { a: "392", b: "643" }, { a: "392", b: "608" }, { a: "392", b: "158" },
    // Iceland ("352") - UK, Denmark (Greenland prox), Norway
    { a: "352", b: "826" }, { a: "352", b: "208" }, { a: "352", b: "578" },
    // Sri Lanka ("144") - India, Maldives
    { a: "144", b: "356" }, { a: "144", b: "462" },
    // Madagascar ("450") - Mozambique, South Africa, Mauritius, Seychelles, Comoros
    { a: "450", b: "508" }, { a: "450", b: "710" }, { a: "450", b: "480" }, { a: "450", b: "690" }, { a: "450", b: "174" },
    // Philippines ("608") - Japan, Taiwan, Malaysia, Indonesia, Vietnam
    { a: "608", b: "392" }, { a: "608", b: "158" }, { a: "608", b: "458" }, { a: "608", b: "360" }, { a: "608", b: "704" },
    // Cuba ("192") - USA, Mexico, Bahamas, Haiti, Jamaica
    { a: "192", b: "840" }, { a: "192", b: "484" }, { a: "192", b: "044" }, { a: "192", b: "332" }, { a: "192", b: "388" },
    // New Zealand ("554") - Australia, Fiji
    { a: "554", b: "036" }, { a: "554", b: "242" },
    // Taiwan ("158") - China, Japan, Philippines
    { a: "158", b: "156" }, { a: "158", b: "392" }, { a: "158", b: "608" },
    // Cyprus ("196") - Greece, Turkey, Lebanon, Syria, Israel, Egypt
    { a: "196", b: "300" }, { a: "196", b: "792" }, { a: "196", b: "422" }, { a: "196", b: "760" }, { a: "196", b: "376" }, { a: "196", b: "818" },
    // Malta ("470") - Italy, Tunisia, Libya
    { a: "470", b: "380" }, { a: "470", b: "788" }, { a: "470", b: "434" },
    // Singapore ("702") - Malaysia, Indonesia, Australia
    { a: "702", b: "458" }, { a: "702", b: "360" }, { a: "702", b: "036" },
  ];

  maritimeConnections.forEach(conn => {
    if (borders[conn.a] && borders[conn.b]) {
      borders[conn.a].add(conn.b);
      borders[conn.b].add(conn.a);
    }
  });

  // Convert Sets back to arrays
  const finalBorders = {};
  Object.keys(borders).forEach(k => {
    finalBorders[k] = Array.from(borders[k]).sort();
  });

  const content = `// Precomputed 100% precise topological map borders supplemented with maritime connections
export const PRECOMPUTED_BORDERS: Record<string, string[]> = ${JSON.stringify(finalBorders, null, 2)};
`;

  fs.writeFileSync('src/data/borders_precomputed.ts', content);
  console.log("Success! Generated src/data/borders_precomputed.ts");
}

run().catch(err => {
  console.error("Error:", err);
});
