import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { motion, AnimatePresence } from 'motion/react';
import { CountryData } from '../types';
import { COUNTRIES } from '../data/countries';

interface WorldMapProps {
  guessedIds: Set<string>;
  highlightedId: string | null;
  isFinished: boolean;
  focusedContinent?: string | null;
  onCountryClick?: (id: string) => void;
}

export function WorldMap({ guessedIds, highlightedId, isFinished, focusedContinent, onCountryClick }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const countriesDataRef = useRef<any>(null);
  const isFinishedRef = useRef(isFinished);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  // Efficient state updates without re-centering
  const updateMapColors = () => {
    if (!gRef.current) return;

    // Update path colors - targeting classes now for multi-instance support
    gRef.current.selectAll('.country-path')
      .transition()
      .duration(300)
      .attr('fill', (d: any) => {
        const id = String(d.id).padStart(3, '0');
        if (guessedIds.has(id)) return '#4ade80';
        if (highlightedId === id) return '#facc15';
        if (isFinishedRef.current && !guessedIds.has(id)) return '#ef444433';
        return '#262626';
      })
      .attr('stroke', (d: any) => {
        const id = String(d.id).padStart(3, '0');
        if (guessedIds.has(id)) return '#059669';
        if (isFinishedRef.current && !guessedIds.has(id)) return '#ef444466';
        return '#404040';
      });

    // Handle Pins - needs to show up on all instances
    gRef.current.selectAll('.capital-pin').remove();
    
    if (highlightedId && containerRef.current && projectionRef.current) {
      const country = COUNTRIES.find(c => c.id === highlightedId);
      if (country && country.capitalCoords) {
        const coords = projectionRef.current([country.capitalCoords.lng, country.capitalCoords.lat]);
        if (coords) {
          const worldWidth = 2 * Math.PI * projectionRef.current.scale();
          // Render pin on the main instance and neighbors
          [-1, 0, 1].forEach(offset => {
            const pinGroup = gRef.current!.append('g')
              .attr('class', 'capital-pin')
              .attr('transform', `translate(${coords[0] + offset * worldWidth}, ${coords[1]})`);

            // Pin Pulse
            pinGroup.append('circle')
              .attr('r', 4)
              .attr('fill', '#3b82f6')
              .attr('opacity', 0.4)
              .append('animate')
              .attr('attributeName', 'r')
              .attr('values', '2;6;2')
              .attr('dur', '1.5s')
              .attr('repeatCount', 'indefinite');

            // Pin Center
            pinGroup.append('circle')
              .attr('r', 2)
              .attr('fill', '#3b82f6')
              .attr('stroke', 'white')
              .attr('stroke-width', 1);
              
            // Label
            pinGroup.append('text')
              .attr('y', -6)
              .attr('text-anchor', 'middle')
              .attr('fill', 'white')
              .attr('font-size', '6px')
              .attr('font-weight', '900')
              .attr('font-family', 'monospace')
              .attr('class', 'uppercase')
              .style('text-shadow', '0 0 10px rgba(0,0,0,0.8)')
              .text(country.capital || '');
          });
        }
      }
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current || !svgRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      if (width === 0 || height === 0) return;
      
      // Avoid ResizeObserver loop by checking if dimensions actually changed
      if (width === dimensionsRef.current.width && height === dimensionsRef.current.height) return;
      
      dimensionsRef.current = { width, height };

      d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      // Re-initialize projection if needed or just handle the first time
      if (!projectionRef.current) {
        const projection = d3.geoMercator()
          .scale(width / 2 / Math.PI)
          .translate([width / 2, height / 2])
          .rotate([10, 0])
          .precision(0.1);
        projectionRef.current = projection;
        
        const path = d3.geoPath().projection(projection);
        if (gRef.current) {
          gRef.current.selectAll('path').attr('d', path as any);
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        updateDimensions();
      });
    });

    resizeObserver.observe(containerRef.current);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    svg.selectAll('g').remove();

    const g = svg.append('g');
    gRef.current = g;

    const projection = d3.geoMercator()
      .scale(width / 2 / Math.PI)
      .translate([width / 2, height / 2])
      .rotate([10, 0])
      .precision(0.1);

    projectionRef.current = projection;

    const path = d3.geoPath().projection(projection);

    const zoomListener = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 15])
      .on('zoom', (event) => {
        let { x, y, k } = event.transform;
        const worldWidth = 2 * Math.PI * projection.scale() * k;
        
        // Horizontal wrapping logic
        if (x < -worldWidth) x += worldWidth;
        if (x > 0) x -= worldWidth;

        g.attr('transform', `translate(${x}, ${y}) scale(${k})`);
      });

    svg.call(zoomListener);

    // Initial transform to center Asia
    const k = 1.35;
    const centerPoint = projection([95, 30])!; // Center of Asia roughly
    const tx = width / 2 - centerPoint[0] * k;
    const ty = height / 2 - centerPoint[1] * k;
    const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
    svg.call(zoomListener.transform, initialTransform);

    let isCancelled = false;
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((data: any) => {
      if (isCancelled) return;
      
      const countries = topojson.feature(data, data.objects.countries) as any;
      
      // Sanitization mapping
      countries.features = countries.features.map((feature: any) => {
        if (feature.id === "732") feature.id = "504"; 
        
        // Handle Kosovo (mapping to Serbia 688)
        const name = feature.properties?.name || '';
        if (feature.id === "383" || name === "Kosovo") {
          feature.id = "688";
        }

        // Handle Northern Cyprus mapping to Cyprus (196)
        if (name === "N. Cyprus" || name === "Northern Cyprus") {
          feature.id = "196";
        }
        
        // Handle Somaliland (id 000 or specific name in some datasets)
        if (feature.id === "000" || name === "Somaliland" || name.includes("Somalialand")) {
          feature.id = "706"; // Map to Somalia
        }

        // Handle Puerto Rico mapping to USA (840)
        if (feature.id === "630" || name === "Puerto Rico") {
          feature.id = "840";
        }

        // Handle Greenland mapping to Denmark (208)
        if (feature.id === "304" || name === "Greenland") {
          feature.id = "208";
        }

        // Handle French Guiana and other territories mapping to France (250)
        if (feature.id === "254" || feature.id === "540" || feature.id === "260" || name === "French Guiana" || name === "New Caledonia" || name.includes("French Southern") || name.includes("Antarctic Lands")) {
          feature.id = "250";
        }

        // Handle Falkland Islands mapping to UK (826)
        if (feature.id === "238" || name === "Falkland Is." || name === "Falkland Islands") {
          feature.id = "826";
        }

        // Handle Kashmir and regional territories mapping to India (356)
        if (name.includes("Kashmir") || name === "Siachen Glacier" || name.includes("Aksai") || name === "Aksai Chin" || name.includes("Gilgit") || name.includes("Baltistan") || name.includes("Arunachal")) {
          feature.id = "356";
        }
        return feature;
      });

      countriesDataRef.current = countries;
      const worldWidth = 2 * Math.PI * projection.scale();

      // Render 3 instances of the world for continuous wrapping
      const instances = [-1, 0, 1];
      g.selectAll('.world-instance').remove();
      
      const worldInstances = g.selectAll('.world-instance')
        .data(instances)
        .join('g')
        .attr('class', 'world-instance')
        .attr('transform', (d: number) => `translate(${d * worldWidth}, 0)`);

      worldInstances.selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('d', path as any)
        .attr('class', (d: any) => `country-path country-${String(d.id).padStart(3, '0')}`)
        .attr('fill', '#262626')
        .attr('stroke', '#404040')
        .attr('stroke-width', 0.5)
        .style('transition', 'fill 0.3s ease, stroke 0.3s ease')
        .on('mouseenter', function(event, d: any) {
          if (!isFinishedRef.current) return;
          
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
          }

          const id = String(d.id).padStart(3, '0');
          const country = COUNTRIES.find(c => c.id === id);
          if (country) {
            setTooltip({
              name: country.name,
              x: event.clientX,
              y: event.clientY - 35
            });
          }
        })
        .on('mousemove', function(event) {
          if (!isFinishedRef.current) return;
          setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY - 35 } : null);
        })
        .on('mouseleave', function() {
          if (!isFinishedRef.current) return;
          tooltipTimeoutRef.current = setTimeout(() => {
            setTooltip(null);
          }, 2000);
        })
        .on('click', function(event, d: any) {
          if (!isFinishedRef.current || !onCountryClick) return;
          const id = String(d.id).padStart(3, '0');
          onCountryClick(id);
        });
      
      setMapLoaded(true);
    });

    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
    };
  }, []);

  // Use mapLoaded to trigger color updates
  useEffect(() => {
    if (mapLoaded) {
      updateMapColors();
    }
  }, [mapLoaded, guessedIds, highlightedId, isFinished, focusedContinent]);

  // Handle pin timeout during active gameplay
  useEffect(() => {
    if (!highlightedId || isFinished || !gRef.current) return;

    const timer = setTimeout(() => {
      if (gRef.current && !isFinishedRef.current) {
        gRef.current.selectAll('.capital-pin')
          .transition()
          .duration(500)
          .style('opacity', 0)
          .remove();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [highlightedId, isFinished]);

  // Improved focus logic for better continent framing
  useEffect(() => {
    if (!mapLoaded || !gRef.current || !countriesDataRef.current || !containerRef.current || !svgRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const g = gRef.current;
    
    const projection = d3.geoMercator()
      .scale(width / 2 / Math.PI)
      .translate([width / 2, height / 1.5])
      .rotate([10, 0]);

    if (focusedContinent) {
      const continentCountryIds = COUNTRIES.filter(c => c.continent === focusedContinent).map(c => c.id);
      const continentFeatures = countriesDataRef.current.features.filter((f: any) => 
        continentCountryIds.includes(String(f.id).padStart(3, '0'))
      );

      if (continentFeatures.length > 0) {
        const projection = d3.geoMercator()
          .scale(width / 2 / Math.PI)
          .translate([width / 2, height / 2])
          .rotate([10, 0])
          .precision(0.1); // Keep same base rotation for consistency if possible, fitExtent overrides mostly

        let padding = 60;
        
        // Special Framing Logic
        if (focusedContinent === 'North America') {
          // Increase padding at top to bring Caribbean/Central America into better view
          padding = 100;
        } else if (focusedContinent === 'Europe') {
          padding = 80;
        } else if (focusedContinent === 'Asia') {
          padding = 40;
        } else if (focusedContinent === 'Oceania') {
          padding = 120;
        } else if (focusedContinent === 'Antarctica') {
          padding = 150;
        }

        projection.fitExtent([[padding, padding], [width - padding, height - padding]], {
          type: 'FeatureCollection',
          features: continentFeatures
        } as any);

        projectionRef.current = projection;
        const path = d3.geoPath().projection(projection);
        const worldWidth = 2 * Math.PI * projection.scale();

        g.selectAll('.world-instance').transition().duration(1200).ease(d3.easeCubicInOut)
          .attr('transform', (d: any) => `translate(${d * worldWidth}, 0)`);

        g.selectAll('path').transition().duration(1200).ease(d3.easeCubicInOut)
          .attr('d', path as any)
          .on('end', () => {
            // Update pin position after focus transition finishes
            updateMapColors();
          });
          
        // Immediate update to pins so they move roughly with the map (though fitExtent is non-linear)
        updateMapColors();
      }
    } else {
      const projection = d3.geoMercator()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 2])
        .rotate([10, 0])
        .precision(0.1);
      
      projectionRef.current = projection;
      const path = d3.geoPath().projection(projection);
      const worldWidth = 2 * Math.PI * projection.scale();
      
      g.selectAll('.world-instance').transition().duration(1000).ease(d3.easeCubicInOut)
        .attr('transform', (d: any) => `translate(${d * worldWidth}, 0)`);

      g.selectAll('path').transition().duration(1000).ease(d3.easeCubicInOut)
        .attr('d', path as any)
        .on('end', () => {
          updateMapColors();
        });
        
      updateMapColors();
    }
  }, [focusedContinent]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#171717] rounded-xl overflow-hidden shadow-inner border border-neutral-800 relative">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      
      {/* Tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ 
              position: 'fixed', 
              left: tooltip.x, 
              top: tooltip.y, 
              pointerEvents: 'none',
              transform: 'translateX(-50%)' 
            }}
            className="z-[100] px-3 py-1.5 bg-white text-black text-xs font-bold rounded shadow-2xl border border-neutral-200 uppercase tracking-widest"
          >
            {tooltip.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
