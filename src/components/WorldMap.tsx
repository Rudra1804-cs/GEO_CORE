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
}

export function WorldMap({ guessedIds, highlightedId, isFinished, focusedContinent }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const countriesDataRef = useRef<any>(null);
  const isFinishedRef = useRef(isFinished);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  // Initialize Map
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

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
      .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    const zoomListener = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomListener);

    let isCancelled = false;
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((data: any) => {
      if (isCancelled) return;
      
      const countries = topojson.feature(data, data.objects.countries) as any;
      
      // Somaliland mapping to Somalia (706)
      countries.features = countries.features.map((feature: any) => {
        if (feature.id === "732") feature.id = "504"; 
        
        // Handle Kosovo (mapping to Serbia 688)
        const name = feature.properties?.name || '';
        if (feature.id === "383" || name === "Kosovo") {
          feature.id = "688";
        }
        
        // Handle Somaliland (id 000 or specific name in some datasets)
        if (feature.id === "000" || name === "Somaliland" || name.includes("Somalialand")) {
          feature.id = "706"; // Map to Somalia
        }
        return feature;
      });

      countriesDataRef.current = countries;

      g.selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('d', path as any)
        .attr('id', (d: any) => `country-${String(d.id).padStart(3, '0')}`)
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
        });
      
      updateMapColors();
    });

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 15])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    return () => {
      isCancelled = true;
    };
  }, []);

  const updateMapColors = () => {
    if (!gRef.current) return;
    gRef.current.selectAll('path')
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
  };

  // Improved focus logic for better continent framing
  useEffect(() => {
    if (!gRef.current || !countriesDataRef.current || !containerRef.current || !svgRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const g = gRef.current;
    
    const projection = d3.geoMercator()
      .scale(width / 2 / Math.PI)
      .translate([width / 2, height / 1.5]);

    if (focusedContinent) {
      const continentCountryIds = COUNTRIES.filter(c => c.continent === focusedContinent).map(c => c.id);
      const continentFeatures = countriesDataRef.current.features.filter((f: any) => 
        continentCountryIds.includes(String(f.id).padStart(3, '0'))
      );

      if (continentFeatures.length > 0) {
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
        }

        projection.fitExtent([[padding, padding], [width - padding, height - padding]], {
          type: 'FeatureCollection',
          features: continentFeatures
        } as any);

        const path = d3.geoPath().projection(projection);

        g.selectAll('path').transition().duration(1200).ease(d3.easeCubicInOut)
          .attr('d', path as any);
      }
    } else {
      const path = d3.geoPath().projection(projection);
      g.selectAll('path').transition().duration(1000).ease(d3.easeCubicInOut)
        .attr('d', path as any);
    }
  }, [focusedContinent]);

  // Efficient state updates without re-centering
  useEffect(() => {
    if (!gRef.current) return;

    gRef.current.selectAll('path')
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

  }, [guessedIds, highlightedId, isFinished]);

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
