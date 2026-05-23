import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { motion, AnimatePresence } from 'motion/react';
import { CountryData } from '../types';
import { COUNTRIES } from '../data/countries';
import { cn } from '../lib/utils';
import { Gauge, Play, Pause, X, Sliders, Map as MapIcon } from 'lucide-react';

interface WorldMapProps {
  guessedIds: Set<string>;
  highlightedId: string | null;
  isFinished: boolean;
  focusedContinent?: string | null;
  onCountryClick?: (id: string) => void;
  projectionType?: 'mercator' | 'orthographic';
  isMemoryMode?: boolean;
  isPaused?: boolean;
  highlightedAllianceMemberIds?: Set<string> | null;
  plotContinentsColorMode?: boolean;
  gameType?: 'typing' | 'flag' | 'highlight';
  isSatelliteView?: boolean;
}

const CONTINENT_FILL_COLORS: Record<string, string> = {
  'Africa': '#ea580c33', // orange-600 with opacity
  'Asia': '#e11d4833', // rose-600 with opacity
  'Europe': '#2563eb33', // blue-600 with opacity
  'North America': '#05966933', // emerald-600 with opacity
  'South America': '#d9770633', // amber-600 with opacity
  'Oceania': '#0891b233', // cyan-600 with opacity
  'Antarctica': '#38bdf822' // sky-400 with opacity
};

const CONTINENT_STROKE_COLORS: Record<string, string> = {
  'Africa': '#ea580cbb', 
  'Asia': '#e11da8bb', 
  'Europe': '#2563ebbb', 
  'North America': '#059669bb', 
  'South America': '#d97706bb', 
  'Oceania': '#0891b2bb', 
  'Antarctica': '#38bdf899'
};

export function WorldMap({ 
  guessedIds, 
  highlightedId, 
  isFinished, 
  focusedContinent, 
  onCountryClick,
  projectionType = 'mercator',
  isMemoryMode = false,
  isPaused = false,
  highlightedAllianceMemberIds = null,
  plotContinentsColorMode = false,
  gameType,
  isSatelliteView = false
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const countriesDataRef = useRef<any>(null);
  const isFinishedRef = useRef(isFinished);
  const guessedIdsRef = useRef(guessedIds);
  const isMemoryModeRef = useRef(isMemoryMode);
  const highlightedIdRef = useRef(highlightedId);
  const isPausedRef = useRef(isPaused);
  const highlightedAllianceMemberIdsRef = useRef(highlightedAllianceMemberIds);
  const plotContinentsColorModeRef = useRef(plotContinentsColorMode);

  const countryContinentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of COUNTRIES) {
      map.set(String(c.id).padStart(3, '0'), c.continent);
    }
    return map;
  }, []);
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const zoomListenerRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const lastInteractionTimeRef = useRef(Date.now());
  const autoRotateRef = useRef(false);
  const [showSpeedDial, setShowSpeedDial] = useState(false);
  const [rotationSpeedFactor, setRotationSpeedFactor] = useState(1.0);
  const rotationSpeedFactorRef = useRef(1.0);
  const [forceCenterTrigger, setForceCenterTrigger] = useState(0);
  const manualPanTriggeredRef = useRef(false);

  const [autoPanEnabled, setAutoPanEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_core_auto_pan_enabled');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleAutoPan = () => {
    setAutoPanEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('geo_core_auto_pan_enabled', String(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  const isCenteringRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isZoomingRef = useRef(false);

  const handleSpeedChange = (val: number) => {
    setRotationSpeedFactor(val);
    rotationSpeedFactorRef.current = val;
  };

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

  useEffect(() => {
    highlightedAllianceMemberIdsRef.current = highlightedAllianceMemberIds;
  }, [highlightedAllianceMemberIds]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (mapLoaded) updateMapColors(true);
  }, [isPaused, mapLoaded]);

  useEffect(() => {
    if (projectionType !== 'orthographic') {
      setShowSpeedDial(false);
    }
  }, [projectionType]);

  useEffect(() => {
    plotContinentsColorModeRef.current = plotContinentsColorMode;
    if (mapLoaded) updateMapColors(true);
  }, [plotContinentsColorMode, mapLoaded]);

  const updateMapColors = (immediate = false) => {
    if (!gRef.current) return;

    const selection = gRef.current.selectAll('.country-path');
    const transition = immediate ? selection : selection.transition().duration(300);

    transition
      .attr('fill', (d: any) => {
        const id = String(d.id).padStart(3, '0');
        
        if (highlightedIdRef.current === id) {
          if (isPausedRef.current && isMemoryModeRef.current) return '#262626';
          return '#facc15';
        }

        if (plotContinentsColorModeRef.current) {
          const continent = countryContinentMap.get(id);
          if (continent && CONTINENT_FILL_COLORS[continent]) {
            return CONTINENT_FILL_COLORS[continent];
          }
        }

        if (highlightedAllianceMemberIdsRef.current && highlightedAllianceMemberIdsRef.current.has(id)) {
          // Tactical alliance blue color
          return '#3b82f6';
        }
        
        if (isFinishedRef.current) {
          if (guessedIdsRef.current.has(id)) return '#4ade80';
          return '#ef444433';
        }

        if (isMemoryModeRef.current) return '#262626';

        if (guessedIdsRef.current.has(id)) return '#4ade80';
        return '#262626';
      })
      .attr('stroke', (d: any) => {
        const id = String(d.id).padStart(3, '0');
        if (highlightedIdRef.current === id) {
          if (isPausedRef.current && isMemoryModeRef.current) return '#404040';
          return '#eab308';
        }

        if (plotContinentsColorModeRef.current) {
          const continent = countryContinentMap.get(id);
          if (continent && CONTINENT_STROKE_COLORS[continent]) {
            return CONTINENT_STROKE_COLORS[continent];
          }
        }

        if (highlightedAllianceMemberIdsRef.current && highlightedAllianceMemberIdsRef.current.has(id)) {
          // Tactical light-blue stroke
          return '#60a5fa';
        }
        
        if (isFinishedRef.current) {
          if (guessedIdsRef.current.has(id)) return '#059669';
          return '#ef444466';
        }

        if (isMemoryModeRef.current) return '#404040';

        if (guessedIdsRef.current.has(id)) return '#059669';
        return '#404040';
      });

    // Optimized Pin Handling
    const pinData = (highlightedIdRef.current && containerRef.current && projectionRef.current) 
      ? (() => {
          const country = COUNTRIES.find(c => c.id === highlightedIdRef.current);
          if (!country || !country.capitalCoords) return [];
          
          const proj = projectionRef.current;
          const coords = proj([country.capitalCoords.lng, country.capitalCoords.lat]);
          if (!coords || isNaN(coords[0])) return [];

          let isVisible = true;
          if (projectionType === 'orthographic') {
            const width = dimensionsRef.current.width;
            const height = dimensionsRef.current.height;
            const center = proj.invert ? proj.invert([width / 2, height / 2]) : null;
            if (center) {
              isVisible = d3.geoDistance(center, [country.capitalCoords.lng, country.capitalCoords.lat]) < Math.PI / 2;
            }
          }
          if (!isVisible) return [];

          const worldScale = proj.scale();
          const worldWidth = projectionType === 'mercator' ? 2 * Math.PI * worldScale : 0;
          const instances = projectionType === 'mercator' ? [-1, 0, 1] : [0];
          
          return instances.map(offset => ({
            id: `pin-${country.id}-${offset}`,
            x: coords[0] + offset * worldWidth,
            y: coords[1],
            capital: country.capital
          }));
        })()
      : [];

    const pins = gRef.current.selectAll<SVGGElement, any>('.capital-pin')
      .data(pinData, d => d.id);

    pins.exit().remove();

    const pinsEnter = pins.enter()
      .append('g')
      .attr('class', 'capital-pin');

    pinsEnter.append('circle')
      .attr('r', 4)
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.4)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', '2;6;2')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');

    pinsEnter.append('circle')
      .attr('r', 2)
      .attr('fill', '#3b82f6')
      .attr('stroke', 'white')
      .attr('stroke-width', 1);
        
    pinsEnter.append('text')
      .attr('y', -6)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '6px')
      .attr('font-weight', '900')
      .attr('font-family', 'monospace')
      .attr('class', 'uppercase pin-label')
      .style('text-shadow', '0 0 10px rgba(0,0,0,0.8)');

    const pinsAll = pinsEnter.merge(pins);
    pinsAll.attr('transform', d => `translate(${d.x}, ${d.y})`);
    
    pinsAll.select('.pin-label')
      .text(d => d.capital || '')
      .attr('font-size', projectionType === 'orthographic' ? '9px' : '6px')
      .attr('y', projectionType === 'orthographic' ? -9 : -6);
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

      if (projectionRef.current) {
        projectionRef.current.translate([width / 2, height / 2]);
        if (projectionType !== 'orthographic') {
          projectionRef.current.scale(width / 2 / Math.PI);
        }
        const path = d3.geoPath().projection(projectionRef.current);
        if (gRef.current) {
          gRef.current.selectAll('path').attr('d', path as any);
        }
        updateMapColors(true);
      } else {
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
      .on('start', () => {
        isZoomingRef.current = true;
        if (isCenteringRef.current) {
          isCenteringRef.current = false;
          d3.select(svgRef.current).interrupt("globe-panning-transition");
        }
      })
      .on('zoom', (event) => {
        lastInteractionTimeRef.current = Date.now();
        const proj = projectionRef.current;
        if (!proj) return;
        const { x, y, k } = event.transform;
        
        if (projectionType === 'orthographic') {
          const baseScale = Math.min(width, height) / 2.5;
          proj.scale(baseScale * k);
          const p = d3.geoPath().projection(proj);
          g.selectAll('path').attr('d', p as any);
          updateMapColors(true);
        } else {
          const worldWidth = 2 * Math.PI * proj.scale() * k;
          let tx = x;
          if (tx < -worldWidth) tx += worldWidth;
          if (tx > 0) tx -= worldWidth;
          g.attr('transform', `translate(${tx}, ${y}) scale(${k})`);
          updateMapColors(true);
        }
      })
      .on('end', () => {
        isZoomingRef.current = false;
      });
    zoomListenerRef.current = zoomListener;

    if (projectionType === 'orthographic') {
      const drag = d3.drag<SVGSVGElement, unknown>()
        .on('start', () => { 
          lastInteractionTimeRef.current = Date.now();
          isDraggingRef.current = true;
          if (isCenteringRef.current) {
            isCenteringRef.current = false;
            d3.select(svgRef.current).interrupt("globe-panning-transition");
          }
          svg.style('cursor', 'grabbing'); 
        })
        .on('drag', (event) => {
          lastInteractionTimeRef.current = Date.now();
          const proj = projectionRef.current;
          if (!proj) return;
          const rotate = proj.rotate();
          const k = 75 / proj.scale();
          const nextRotate: [number, number, number] = [
            rotate[0] + event.dx * k,
            rotate[1] - event.dy * k,
            rotate[2]
          ];
          proj.rotate(nextRotate);
          rotationRef.current = nextRotate;
          const p = d3.geoPath().projection(proj);
          g.selectAll('path').attr('d', p as any);
          updateMapColors(true);
        })
        .on('end', () => { 
          isDraggingRef.current = false;
          svg.style('cursor', 'grab'); 
        });
      svg.call(drag as any);
      zoomListener.filter((event) => {
        return event.type === 'wheel' || event.ctrlKey || event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend';
      });
    } else {
      svg.on('.drag', null);
      zoomListener.filter((event) => {
        return !event.button;
      });
    }
    svg.call(zoomListener);

    if (projectionType === 'mercator') {
      const rotation = rotationRef.current;
      const centerCoords: [number, number] = [-rotation[0], -rotation[1]];
      const centerPoint = projection(centerCoords)!;
      
      const isPortrait = height > width;
      const isMobile = width < 768;
      const k = isPortrait ? 1.45 : (isMobile ? 1.1 : 1.35);
      
      const tx = width / 2 - centerPoint[0] * k;
      const ty = height / 2 - centerPoint[1] * k;
      const initialTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
      svg.call(zoomListener.transform, initialTransform);
    } else {
      const currentZoom = (svg.node() as any).__zoom?.k || 1;
      svg.call(zoomListener.transform, d3.zoomIdentity.scale(currentZoom));
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
      svg.on('.zoom', null);
      svg.on('.drag', null);
    };
  }, [projectionType]);

  const activeKeys = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handleGlobalInteraction = () => {
      lastInteractionTimeRef.current = Date.now();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      handleGlobalInteraction();
      
      // Toggle rotation with Cmd+B or Ctrl+B - works even if typing
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (projectionType === 'orthographic') {
          setShowSpeedDial(prev => {
            const nextShow = !prev;
            if (nextShow) {
              autoRotateRef.current = true;
              handleSpeedChange(1.0);
            } else {
              autoRotateRef.current = false;
              handleSpeedChange(0.0);
            }
            return nextShow;
          });
        }
        return;
      }

      if (document.activeElement?.tagName === 'INPUT') return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(e.key)) {
        activeKeys.current.add(e.key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { activeKeys.current.delete(e.key); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleGlobalInteraction);
    window.addEventListener('mousedown', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleGlobalInteraction);
      window.removeEventListener('mousedown', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const tick = () => {
      let needsRefresh = false;

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
            needsRefresh = true;
          } else {
            svg.call(zoomListener.translateBy, dx, dy);
          }
        }
        if (scaleFactor !== 1) svg.call(zoomListener.scaleBy, scaleFactor);
      }

      // Rotate if auto-rotate is toggled on OR after 5 seconds of inaction
      if (projectionType === 'orthographic' && 
          projectionRef.current && 
          !isPausedRef.current && 
          !isCenteringRef.current && 
          !isDraggingRef.current && 
          !isZoomingRef.current && 
          activeKeys.current.size === 0 && 
          (autoRotateRef.current || Date.now() - lastInteractionTimeRef.current > 5000)) {
        const rotate = projectionRef.current.rotate();
        const speed = 0.015 * rotationSpeedFactorRef.current;
        const nextRotate: [number, number, number] = [rotate[0] + speed, rotate[1], rotate[2]];
        projectionRef.current.rotate(nextRotate);
        rotationRef.current = nextRotate;
        needsRefresh = true;
      }

      if (needsRefresh && gRef.current && projectionRef.current) {
        const p = d3.geoPath().projection(projectionRef.current);
        gRef.current.selectAll('path').attr('d', p as any);
        updateMapColors(true);
      }

      animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [projectionType]);

  useEffect(() => {
    if (mapLoaded) updateMapColors();
  }, [mapLoaded, guessedIds, highlightedId, isFinished, focusedContinent, projectionType, isMemoryMode, isPaused, highlightedAllianceMemberIds]);

  useEffect(() => {
    if (!highlightedId || isFinished || !gRef.current) return;
    const timer = setTimeout(() => {
      if (gRef.current && !isFinishedRef.current) {
        gRef.current.selectAll('.capital-pin').transition().duration(500).style('opacity', 0).remove();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [highlightedId, isFinished]);

  // Handle auto-focus / centering of the globe onto the highlighted nation
  useEffect(() => {
    if (!mapLoaded || projectionType !== 'orthographic' || !highlightedId || !gRef.current || !projectionRef.current || !containerRef.current) return;
    
    // Skip automatic focus during typing/flag modes unless triggered manual pan explicitly OR auto-panning is enabled in selection deck
    if (!manualPanTriggeredRef.current && !autoPanEnabled) {
      return;
    }
    manualPanTriggeredRef.current = false;
    
    // Find target coordinates (prioritize capital city coords, fallback to geoCentroid)
    let targetCoords: [number, number] | null = null;
    const country = COUNTRIES.find(c => c.id === highlightedId);
    if (country && country.capitalCoords) {
      targetCoords = [country.capitalCoords.lng, country.capitalCoords.lat];
    } else if (countriesDataRef.current) {
      const feature = countriesDataRef.current.features.find(
        (f: any) => String(f.id).padStart(3, '0') === highlightedId
      );
      if (feature) {
        try {
          const centroid = d3.geoCentroid(feature);
          if (centroid && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
            targetCoords = centroid as [number, number];
          }
        } catch (e) {
          // ignore centroid error
         }
      }
    }

    if (targetCoords) {
      const g = gRef.current;
      const proj = projectionRef.current;
      const path = d3.geoPath().projection(proj);

      // Disable auto-rotate temporarily and set the state
      lastInteractionTimeRef.current = Date.now();
      isCenteringRef.current = true;

      // Use d3 transition to smoothly rotate to [-lng, -lat] with a slight southward shift to keep the target country up and show the south part more.
      const startRotation = proj.rotate();
      const latShift = isSatelliteView ? 16 : 8;
      const targetLat = Math.max(-65, Math.min(65, targetCoords[1] - latShift));
      const endRotation: [number, number, number] = [-targetCoords[0], -targetLat, 0];

      // Standardize the shortest rotation path
      let diffLng = endRotation[0] - startRotation[0];
      while (diffLng < -180) diffLng += 360;
      while (diffLng > 180) diffLng -= 360;
      
      const shortPathEndRotation: [number, number, number] = [
        startRotation[0] + diffLng,
        endRotation[1],
        0
      ];

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const baseScale = Math.min(width, height) / 2.5;
      const startScale = proj.scale();

      // Determine target focus scale. Avoid zooming too close so users can observe surrounding regions.
      // Zoom nicely to / 2.0 instead of / 1.5 to provide a comfortable, wide-spotlight overview.
      const targetScale = startScale > (Math.min(width, height) / 2.0)
        ? startScale
        : (Math.min(width, height) / 2.0);

      d3.select(svgRef.current)
        .transition("globe-panning-transition")
        .duration(1200)
        .ease(d3.easeCubicInOut)
        .tween("globe-rotate", () => {
          const r = d3.interpolate(startRotation, shortPathEndRotation);
          const s = d3.interpolate(startScale, targetScale);
          return (t) => {
            lastInteractionTimeRef.current = Date.now();
            const currentRotation = r(t) as [number, number, number];
            const currentScale = s(t);
            proj.rotate(currentRotation);
            proj.scale(currentScale);
            rotationRef.current = currentRotation;
            g.selectAll('path').attr('d', path as any);
            updateMapColors(true); // Redraw pin positions and map paths in lockstep to avoid any displacement/lag
          };
        })
        .on("end", () => {
          isCenteringRef.current = false;
          if (svgRef.current && zoomListenerRef.current) {
            const finalK = targetScale / baseScale;
            d3.select(svgRef.current).call(zoomListenerRef.current.transform, d3.zoomIdentity.scale(finalK));
          }
          updateMapColors(true);
        })
        .on("interrupt", () => {
          isCenteringRef.current = false;
        });
    }
  }, [highlightedId, projectionType, mapLoaded, isFinished, forceCenterTrigger, autoPanEnabled, isSatelliteView]);

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
      
      {/* Floating Speed Instrument Trigger - Show only in orthographic/globe mode */}
      {projectionType === 'orthographic' && (
        <div className="absolute top-3 left-3 z-[40]">
          <button
            onClick={() => setShowSpeedDial(p => !p)}
            className="group flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl hover:bg-neutral-800 hover:border-emerald-500/40 text-neutral-300 hover:text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg animate-fade-in"
            title="Configure Globe Spin Rate & Navigation (Shortcut: Cmd+B)"
          >
            <Gauge className={cn("w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-400", rotationSpeedFactor > 0 && "animate-[pulse_1.5s_ease-in-out_infinite]")} />
            <span>Spin: {rotationSpeedFactor === 0 ? "FROZEN" : `${rotationSpeedFactor.toFixed(1)}x`}</span>
            <span className="text-[7.5px] px-1 py-0.5 bg-neutral-800 rounded text-neutral-500 font-black border border-neutral-700/50">⌘B</span>
          </button>
        </div>
      )}

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

        {/* Tactical Surveillance Navigation & Map Control Deck Panel */}
        {showSpeedDial && projectionType === 'orthographic' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-3 left-3 z-50 min-w-[250px] bg-neutral-950/95 backdrop-blur-md border border-neutral-800/80 p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-3.5 font-mono text-white select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800/50 pb-2">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Surveillance Panel</span>
              </div>
              <button 
                onClick={() => setShowSpeedDial(false)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </button>
            </div>

              {/* Tactical Panning Options Section */}
              <div className="flex flex-col gap-2 p-2.5 bg-neutral-900/50 border border-neutral-800/40 rounded-lg">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800/30">
                  <span className="text-[8px] text-neutral-500 uppercase tracking-widest font-black">Auto-Panning (Type/Flag/Guess/Survey)</span>
                  <button
                    onClick={toggleAutoPan}
                    className={cn(
                      "text-[8px] font-mono px-2 py-0.5 rounded transition-all uppercase border font-bold cursor-pointer",
                      autoPanEnabled 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_6px_rgba(16,185,129,0.15)]"
                        : "bg-neutral-950/40 text-neutral-500 border-neutral-850"
                    )}
                  >
                    {autoPanEnabled ? "ON" : "OFF"}
                  </button>
                </div>

               {highlightedId ? (
                 (() => {
                   const country = COUNTRIES.find(c => c.id === highlightedId);
                   return (
                     <div className="flex flex-col gap-1.5 mt-0.5">
                       <div className="text-[8px] text-neutral-500 uppercase tracking-widest mb-0.5">Active Target</div>
                       <div className="flex items-center justify-between text-xs font-bold text-neutral-200">
                         <span className="truncate max-w-[150px]">{country?.name || 'Unknown'}</span>
                         <span className="text-[8px] font-mono text-emerald-400 px-1 py-0.5 bg-emerald-950/50 rounded uppercase border border-emerald-500/20">Active</span>
                       </div>
                       
                       <button
                         onClick={() => {
                           manualPanTriggeredRef.current = true;
                           setForceCenterTrigger(prev => prev + 1);
                           setShowSpeedDial(false);
                         }}
                         className="mt-1 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-pointer"
                       >
                         <MapIcon className="w-3 h-3" />
                         Pan to Country
                       </button>
                     </div>
                   );
                 })()
               ) : (
                 <div className="flex flex-col items-center justify-center border border-neutral-800/25 border-dashed rounded-lg p-2.5 text-neutral-600 text-center text-[8px] font-mono">
                   <div>NO PAN TARGET ACTIVE</div>
                   <div className="mt-0.5 opacity-75">Identify a country first to activate manual coordinates.</div>
                 </div>
               )}
             </div>

            {/* Rotational controls - Only shown in orthographic/globe projection */}
            {projectionType === 'orthographic' && (
              <>
                {/* Tactile Circular Instrument Dial Indicator */}
                <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background arc loop representing max speed limits */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#1c1c1c"
                      strokeWidth="6"
                      strokeDasharray="188 251"
                      strokeLinecap="round"
                    />
                    {/* Active speed level arc tracking */}
                    <path
                      d="M 50,10 A 40,40 0 1,1 49.9,10"
                      fill="none"
                      stroke={rotationSpeedFactor > 0 ? "#10b981" : "#444444"}
                      strokeWidth="6"
                      strokeDasharray={`${(rotationSpeedFactor / 5.0) * 188} 251`}
                      strokeLinecap="round"
                      className="transition-all duration-300 ease-out"
                    />
                    
                    {/* Visual ticks */}
                    {[0, 1.25, 2.5, 3.75, 5.0].map((tickVal, i) => {
                      const tickAngle = -135 + (tickVal / 5.0) * 270;
                      const rad = (tickAngle * Math.PI) / 180;
                      const x1 = 50 + 33 * Math.cos(rad);
                      const y1 = 50 + 33 * Math.sin(rad);
                      const x2 = 50 + 37 * Math.cos(rad);
                      const y2 = 50 + 37 * Math.sin(rad);
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={rotationSpeedFactor >= tickVal ? "#10b981" : "#333"}
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>

                  {/* Central Glowing Tactile Knob */}
                  <div 
                    className="absolute w-16 h-16 bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center"
                    style={{
                      transform: `rotate(${-135 + (rotationSpeedFactor / 5.0) * 270}deg)`,
                      transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                  >
                    {/* Knob Needle Indicator */}
                    <div className="absolute top-1 w-1 h-4 bg-emerald-400 rounded-full shadow-[0_0_8px_#10b981]" />
                    
                    <div className="absolute w-10 h-10 bg-neutral-950/60 rounded-full border border-neutral-800/80 flex items-center justify-center transform hover:scale-105 active:scale-95 transition-all">
                      <span className="text-[10px] font-black text-emerald-400 tracking-tighter uppercase" style={{ transform: `rotate(-${-135 + (rotationSpeedFactor / 5.0) * 270}deg)` }}>
                        {rotationSpeedFactor === 0 ? "OFF" : `${rotationSpeedFactor.toFixed(1)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Readout Details */}
                <div className="flex flex-col gap-1 items-center justify-center bg-black/40 border border-neutral-900/60 rounded-lg p-2">
                  <div className="text-[10px] font-black tracking-widest text-[#10b981] text-center font-bold">
                    {rotationSpeedFactor === 0 ? "ROTATION FROZEN" : `ORBITAL FLIGHT RATE: ${rotationSpeedFactor.toFixed(2)}X`}
                  </div>
                  <div className="text-[7.5px] text-neutral-500 uppercase tracking-wider text-center">
                    Configure via sliders or preset increments
                  </div>
                </div>

                {/* Slider with Precision Multiplier & Pause controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      autoRotateRef.current = !autoRotateRef.current;
                      if (autoRotateRef.current && rotationSpeedFactor === 0) {
                        handleSpeedChange(1.0);
                      }
                    }}
                    className={cn(
                      "p-2 rounded-lg border flex items-center justify-center cursor-pointer transition-all",
                      autoRotateRef.current && rotationSpeedFactor > 0
                        ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/30"
                        : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-white"
                    )}
                    title={autoRotateRef.current ? "Freeze Auto-rotation" : "Activate Auto-rotation"}
                  >
                    {autoRotateRef.current && rotationSpeedFactor > 0 ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.05"
                      value={rotationSpeedFactor}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleSpeedChange(val);
                        if (val > 0) autoRotateRef.current = true;
                      }}
                      className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded-lg cursor-pointer appearance-none outline-none"
                    />
                  </div>
                </div>

                {/* Fast Presets Tactile Buttons */}
                <div className="grid grid-cols-5 gap-1 pt-1 border-t border-neutral-800/40">
                  {[
                    { label: "0x", val: 0.0, desc: "Freeze Dial" },
                    { label: "0.5x", val: 0.5, desc: "Slow Orbit" },
                    { label: "1.0x", val: 1.0, desc: "Standard Cruising" },
                    { label: "2.5x", val: 2.5, desc: "High Orbit" },
                    { label: "5.0x", val: 5.0, desc: "Hyper Warp" }
                  ].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        handleSpeedChange(p.val);
                        if (p.val > 0) autoRotateRef.current = true;
                        else autoRotateRef.current = false;
                      }}
                      className={cn(
                        "py-1 text-[8px] font-bold rounded border transition-all cursor-pointer uppercase text-center",
                        rotationSpeedFactor === p.val
                          ? "bg-emerald-500 text-black border-emerald-400 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          : "bg-neutral-900 border-neutral-800/60 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                      )}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
