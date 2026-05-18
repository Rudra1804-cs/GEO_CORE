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
  projectionType?: 'mercator' | 'orthographic';
  isMemoryMode?: boolean;
}

export function WorldMap({ 
  guessedIds, 
  highlightedId, 
  isFinished, 
  focusedContinent, 
  onCountryClick,
  projectionType = 'mercator',
  isMemoryMode = false
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const countriesDataRef = useRef<any>(null);
  const isFinishedRef = useRef(isFinished);
  const guessedIdsRef = useRef(guessedIds);
  const isMemoryModeRef = useRef(isMemoryMode);
  const highlightedIdRef = useRef(highlightedId);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const zoomListenerRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const dimensionsRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  useEffect(() => {
    guessedIdsRef.current = guessedIds;
  }, [guessedIds]);

  useEffect(() => {
    isMemoryModeRef.current = isMemoryMode;
  }, [isMemoryMode]);

  useEffect(() => {
    highlightedIdRef.current = highlightedId;
  }, [highlightedId]);

  const updateMapColors = (immediate = false) => {
    if (!gRef.current) return;

    const selection = gRef.current.selectAll('.country-path');
    const transition = immediate ? selection : selection.transition().duration(300);

    transition
      .attr('fill', (d: any) => {
        const id = String(d.id).padStart(3, '0');
        
        // Highlight the current guess above all else
        if (highlightedIdRef.current === id) return '#facc15';
        
        // If it's finished, show the summary (even in memory mode)
        if (isFinishedRef.current) {
          if (guessedIdsRef.current.has(id)) return '#4ade80';
          return '#ef444433';
        }

        // Memory mode behavior: Hide all marks except current highlight
        if (isMemoryModeRef.current) return '#262626';

        // Normal mode behavior
        if (guessedIdsRef.current.has(id)) return '#4ade80';
        return '#262626';
      })
      .attr('stroke', (d: any) => {
        const id = String(d.id).padStart(3, '0');
        if (highlightedIdRef.current === id) return '#eab308';
        
        if (isFinishedRef.current) {
          if (guessedIdsRef.current.has(id)) return '#059669';
          return '#ef444466';
        }

        if (isMemoryModeRef.current) return '#404040';

        if (guessedIdsRef.current.has(id)) return '#059669';
        return '#404040';
      });

    gRef.current.selectAll('.capital-pin').remove();
    
    if (highlightedIdRef.current && containerRef.current && projectionRef.current) {
      const country = COUNTRIES.find(c => c.id === highlightedIdRef.current);
      if (country && country.capitalCoords) {
        const coords = projectionRef.current([country.capitalCoords.lng, country.capitalCoords.lat]);
        if (coords) {
          let isVisible = true;
          if (projectionType === 'orthographic') {
            const rotate = projectionRef.current.rotate();
            const center: [number, number] = [-rotate[0], -rotate[1]];
            isVisible = d3.geoDistance(center, [country.capitalCoords.lng, country.capitalCoords.lat]) < Math.PI / 2;
          }

          if (isVisible) {
            const worldWidth = 2 * Math.PI * projectionRef.current.scale();
            const instances = projectionType === 'mercator' ? [-1, 0, 1] : [0];
            
            instances.forEach(offset => {
              const pinGroup = gRef.current!.append('g')
                .attr('class', 'capital-pin')
                .attr('transform', `translate(${coords[0] + offset * worldWidth}, ${coords[1]})`);

              pinGroup.append('circle')
                .attr('r', 4)
                .attr('fill', '#3b82f6')
                .attr('opacity', 0.4)
                .append('animate')
                .attr('attributeName', 'r')
                .attr('values', '2;6;2')
                .attr('dur', '1.5s')
                .attr('repeatCount', 'indefinite');

              pinGroup.append('circle')
                .attr('r', 2)
                .attr('fill', '#3b82f6')
                .attr('stroke', 'white')
                .attr('stroke-width', 1);
                
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
    }
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current || !svgRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      if (width === 0 || height === 0) return;
      if (width === dimensionsRef.current.width && height === dimensionsRef.current.height) return;
      dimensionsRef.current = { width, height };

      d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      if (!projectionRef.current) {
        let projection: d3.GeoProjection;
        if (projectionType === 'orthographic') {
          projection = d3.geoOrthographic()
            .scale(Math.min(width, height) / 2.5)
            .translate([width / 2, height / 2])
            .rotate(rotationRef.current)
            .precision(0.1);
        } else {
          projection = d3.geoMercator()
            .scale(width / 2 / Math.PI)
            .translate([width / 2, height / 2])
            .rotate([10, 0])
            .precision(0.1);
        }
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

    let projection: d3.GeoProjection;
    if (projectionType === 'orthographic') {
      projection = d3.geoOrthographic()
        .scale(Math.min(width, height) / 2.5)
        .translate([width / 2, height / 2])
        .rotate(rotationRef.current)
        .clipAngle(90)
        .precision(0.1);
    } else {
      projection = d3.geoMercator()
        .scale(width / 2 / Math.PI)
        .translate([width / 2, height / 2])
        .rotate([10, 0])
        .precision(0.1);
    }
    projectionRef.current = projection;
    const path = d3.geoPath().projection(projection);

    if (projectionType === 'orthographic') {
      g.append('path')
        .datum({ type: 'Sphere' })
        .attr('class', 'globe-sphere')
        .attr('d', path as any)
        .attr('fill', '#0c0c0c')
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.5);
    }

    const zoomListener = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 15])
      .on('zoom', (event) => {
        const { x, y, k } = event.transform;
        if (projectionType === 'orthographic') {
          const baseScale = Math.min(width, height) / 2.5;
          projection.scale(baseScale * k);
          const p = d3.geoPath().projection(projection);
          g.selectAll('path').attr('d', p as any);
          updateMapColors(true);
        } else {
          const worldWidth = 2 * Math.PI * projection.scale() * k;
          let tx = x;
          if (tx < -worldWidth) tx += worldWidth;
          if (tx > 0) tx -= worldWidth;
          g.attr('transform', `translate(${tx}, ${y}) scale(${k})`);
        }
      });
    zoomListenerRef.current = zoomListener;

    if (projectionType === 'orthographic') {
      const drag = d3.drag<SVGSVGElement, unknown>()
        .on('start', () => { svg.style('cursor', 'grabbing'); })
        .on('drag', (event) => {
          const rotate = projection.rotate();
          const k = 75 / projection.scale();
          const nextRotate: [number, number, number] = [
            rotate[0] + event.dx * k,
            rotate[1] - event.dy * k,
            rotate[2]
          ];
          projection.rotate(nextRotate);
          rotationRef.current = nextRotate;
          const p = d3.geoPath().projection(projection);
          g.selectAll('path').attr('d', p as any);
          updateMapColors(true);
        })
        .on('end', () => { svg.style('cursor', 'grab'); });
      svg.call(drag as any);
      zoomListener.filter((event) => {
        return event.type === 'wheel' || event.ctrlKey || event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend';
      });
    }
    svg.call(zoomListener);

    if (projectionType === 'mercator') {
      const isPortrait = height > width;
      const isMobile = width < 768;
      const k = isPortrait ? 1.45 : (isMobile ? 1.1 : 1.35);
      const centerCoords: [number, number] = isPortrait ? [20, 20] : (isMobile ? [30, 20] : [95, 30]);
      const centerPoint = projection(centerCoords)!;
      const tx = width / 2 - centerPoint[0] * k;
      const ty = height / 2 - centerPoint[1] * k;
      const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
      svg.call(zoomListener.transform, initialTransform);
    } else {
      svg.call(zoomListener.transform, d3.zoomIdentity.scale((svg.node() as any).__zoom?.k || 1));
    }

    let isCancelled = false;
    const renderMap = (data: any) => {
      if (isCancelled || !gRef.current) return;
      const countries = topojson.feature(data, data.objects.countries) as any;
      countries.features = countries.features.map((feature: any) => {
        if (feature.id === "732") feature.id = "504"; 
        const name = feature.properties?.name || '';
        if (feature.id === "383" || name === "Kosovo") feature.id = "688";
        if (name === "N. Cyprus" || name === "Northern Cyprus") feature.id = "196";
        if (feature.id === "000" || name === "Somaliland" || name.includes("Somalialand")) feature.id = "706";
        if (feature.id === "630" || name === "Puerto Rico") feature.id = "840";
        if (feature.id === "304" || name === "Greenland") feature.id = "208";
        if (feature.id === "254" || feature.id === "540" || feature.id === "260" || name === "French Guiana" || name === "New Caledonia" || name.includes("French Southern") || name.includes("Antarctic Lands")) feature.id = "250";
        if (feature.id === "238" || name === "Falkland Is." || name === "Falkland Islands") feature.id = "826";
        if (name.includes("Kashmir") || name === "Siachen Glacier" || name.includes("Aksai") || name === "Aksai Chin" || name.includes("Gilgit") || name.includes("Baltistan") || name.includes("Arunachal")) feature.id = "356";
        return feature;
      });
      countriesDataRef.current = countries;
      const worldWidth = 2 * Math.PI * projection.scale();
      const instances = projectionType === 'mercator' ? [-1, 0, 1] : [0];
      g.selectAll('.world-instance').remove();
      const worldInstances = g.selectAll('.world-instance')
        .data(instances)
        .join('g')
        .attr('class', 'world-instance')
        .attr('transform', (d: number) => {
          if (projectionType === 'orthographic') return '';
          return `translate(${d * worldWidth}, 0)`;
        });
      worldInstances.selectAll('path')
        .data(countries.features)
        .join('path')
        .attr('d', path as any)
        .attr('class', (d: any) => `country-path country-${String(d.id).padStart(3, '0')}`)
        .attr('fill', '#262626')
        .attr('stroke', '#404040')
        .attr('stroke-width', 0.5)
        .on('mouseenter', function(event, d: any) {
          if (!isFinishedRef.current) return;
          if (tooltipTimeoutRef.current) { clearTimeout(tooltipTimeoutRef.current); tooltipTimeoutRef.current = null; }
          const id = String(d.id).padStart(3, '0');
          const country = COUNTRIES.find(c => c.id === id);
          if (country) setTooltip({ name: country.name, x: event.clientX, y: event.clientY - 35 });
        })
        .on('mousemove', function(event) {
          if (!isFinishedRef.current) return;
          setTooltip(prev => prev ? { ...prev, x: event.clientX, y: event.clientY - 35 } : null);
        })
        .on('mouseleave', function() {
          if (!isFinishedRef.current) return;
          tooltipTimeoutRef.current = setTimeout(() => { setTooltip(null); }, 2000);
        })
        .on('click', function(event, d: any) {
          if (!isFinishedRef.current || !onCountryClick) return;
          onCountryClick(String(d.id).padStart(3, '0'));
        });
      setMapLoaded(true);
      updateMapColors();
    };
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((data: any) => {
      renderMap(data);
    });
    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
    };
  }, [projectionType]);

  const activeKeys = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(e.key)) activeKeys.current.add(e.key);
    };
    const handleKeyUp = (e: KeyboardEvent) => { activeKeys.current.delete(e.key); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const tick = () => {
      if (activeKeys.current.size > 0 && svgRef.current && zoomListenerRef.current) {
        const svg = d3.select(svgRef.current);
        const zoomListener = zoomListenerRef.current;
        let dx = 0, dy = 0, scaleFactor = 1;
        const panStep = 10, zoomStep = 1.03;
        if (activeKeys.current.has('ArrowLeft')) dx += panStep;
        if (activeKeys.current.has('ArrowRight')) dx -= panStep;
        if (activeKeys.current.has('ArrowUp')) dy += panStep;
        if (activeKeys.current.has('ArrowDown')) dy -= panStep;
        if (activeKeys.current.has('+') || activeKeys.current.has('=')) scaleFactor *= zoomStep;
        if (activeKeys.current.has('-') || activeKeys.current.has('_')) scaleFactor /= zoomStep;

        if (dx !== 0 || dy !== 0) {
          if (projectionType === 'orthographic' && projectionRef.current) {
            const rotate = projectionRef.current.rotate();
            const k = 15 / projectionRef.current.scale();
            const nextRotate: [number, number, number] = [rotate[0] + dx * k * 5, rotate[1] - dy * k * 5, rotate[2]];
            projectionRef.current.rotate(nextRotate);
            rotationRef.current = nextRotate;
            const p = d3.geoPath().projection(projectionRef.current);
            gRef.current?.selectAll('path').attr('d', p as any);
            updateMapColors(true);
          } else {
            svg.call(zoomListener.translateBy, dx, dy);
          }
        }
        if (scaleFactor !== 1) svg.call(zoomListener.scaleBy, scaleFactor);
      }
      animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [projectionType]);

  useEffect(() => {
    if (mapLoaded) updateMapColors();
  }, [mapLoaded, guessedIds, highlightedId, isFinished, focusedContinent, projectionType, isMemoryMode]);

  useEffect(() => {
    if (!highlightedId || isFinished || !gRef.current) return;
    const timer = setTimeout(() => {
      if (gRef.current && !isFinishedRef.current) {
        gRef.current.selectAll('.capital-pin').transition().duration(500).style('opacity', 0).remove();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightedId, isFinished]);

  useEffect(() => {
    if (!mapLoaded || !gRef.current || !countriesDataRef.current || !containerRef.current || !svgRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const g = gRef.current;
    
    if (focusedContinent) {
      const continentCountryIds = COUNTRIES.filter(c => c.continent === focusedContinent).map(c => c.id);
      const continentFeatures = countriesDataRef.current.features.filter((f: any) => continentCountryIds.includes(String(f.id).padStart(3, '0')));
      if (continentFeatures.length > 0) {
        const isMobile = width < 768;
        let projection: d3.GeoProjection;
        if (projectionType === 'orthographic') {
          const centroid = d3.geoCentroid({ type: 'FeatureCollection', features: continentFeatures });
          projection = d3.geoOrthographic().scale(Math.min(width, height) / 1.5).translate([width / 2, height / 2]).rotate([-centroid[0], -centroid[1], 0]).clipAngle(90).precision(0.1);
          rotationRef.current = [-centroid[0], -centroid[1], 0];
        } else {
          projection = d3.geoMercator().scale(width / 2 / Math.PI).translate([width / 2, height / 2]).rotate([10, 0]).precision(0.1);
          let padding = isMobile ? 20 : 60;
          if (focusedContinent === 'North America') padding = isMobile ? 30 : 100;
          else if (focusedContinent === 'Europe') padding = isMobile ? 20 : 80;
          else if (focusedContinent === 'Asia') padding = isMobile ? 15 : 40;
          else if (focusedContinent === 'Oceania') padding = isMobile ? 40 : 120;
          else if (focusedContinent === 'Antarctica') padding = isMobile ? 60 : 150;
          projection.fitExtent([[padding, padding], [width - padding, height - padding]], { type: 'FeatureCollection', features: continentFeatures } as any);
        }
        projectionRef.current = projection;
        const path = d3.geoPath().projection(projection);
        const worldWidth = 2 * Math.PI * projection.scale();
        if (projectionType === 'mercator') g.selectAll('.world-instance').transition().duration(1200).ease(d3.easeCubicInOut).attr('transform', (d: any) => `translate(${d * worldWidth}, 0)`);
        else g.selectAll('.world-instance').transition().duration(1200).ease(d3.easeCubicInOut).attr('transform', 'translate(0, 0)');
        g.selectAll('path').transition().duration(1200).ease(d3.easeCubicInOut).attr('d', path as any).on('end', () => { updateMapColors(); });
        updateMapColors();
      }
    } else {
      let projection: d3.GeoProjection;
      if (projectionType === 'orthographic') projection = d3.geoOrthographic().scale(Math.min(width, height) / 2.5).translate([width / 2, height / 2]).rotate(rotationRef.current).clipAngle(90).precision(0.1);
      else projection = d3.geoMercator().scale(width / 2 / Math.PI).translate([width / 2, height / 2]).rotate([10, 0]).precision(0.1);
      projectionRef.current = projection;
      const path = d3.geoPath().projection(projection);
      const worldWidth = 2 * Math.PI * projection.scale();
      if (projectionType === 'mercator') g.selectAll('.world-instance').transition().duration(1000).ease(d3.easeCubicInOut).attr('transform', (d: any) => `translate(${d * worldWidth}, 0)`);
      else g.selectAll('.world-instance').transition().duration(1000).ease(d3.easeCubicInOut).attr('transform', 'translate(0, 0)');
      g.selectAll('path').transition().duration(1000).ease(d3.easeCubicInOut).attr('d', path as any).on('end', () => { updateMapColors(); });
      updateMapColors();
    }
  }, [focusedContinent, projectionType]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#171717] rounded-xl overflow-hidden shadow-inner border border-neutral-800 relative">
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <AnimatePresence>
        {tooltip && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, pointerEvents: 'none', transform: 'translateX(-50%)' }}
            className="z-[100] px-3 py-1.5 bg-white text-black text-xs font-bold rounded shadow-2xl border border-neutral-200 uppercase tracking-widest"
          >
            {tooltip.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
