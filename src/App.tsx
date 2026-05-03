/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Timer, 
  Trophy, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  Map as MapIcon,
  RefreshCcw,
  Flag,
  Globe2,
  LayoutDashboard
} from 'lucide-react';
import { COUNTRIES, TOTAL_LAND_AREA, TOTAL_GLOBAL_GDP, CONTINENT_STATS } from './data/countries';
import { WorldMap } from './components/WorldMap';
import { CountryData } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
  const [lastGuessedId, setLastGuessedId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<'zen' | 'challenge'>('zen');
  const [selectedDuration, setSelectedDuration] = useState(10); // Minutes
  const [timeLeft, setTimeLeft] = useState(600); // Seconds
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [focusedContinent, setFocusedContinent] = useState<string | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stats calculations
  const coveredArea = useMemo(() => {
    return Array.from(guessedIds).reduce((acc: number, id) => {
      const country = COUNTRIES.find(c => c.id === id);
      return acc + (country?.area || 0);
    }, 0);
  }, [guessedIds]);

  const percentageCovered = (coveredArea / TOTAL_LAND_AREA) * 100;
  
  const coveredWealth = useMemo(() => {
    return Array.from(guessedIds).reduce((acc: number, id) => {
      const country = COUNTRIES.find(c => c.id === id);
      return acc + (country?.gdp || 0);
    }, 0);
  }, [guessedIds]);

  const percentageWealthCovered = (coveredWealth / TOTAL_GLOBAL_GDP) * 100;
  
  const continentStats = useMemo(() => {
    const stats: Record<string, { guessed: number; total: number; areaGuessed: number; gdpGuessed: number; guessedList: CountryData[]; missedList: CountryData[] }> = {};
    
    Object.keys(CONTINENT_STATS).forEach(cont => {
      stats[cont] = { guessed: 0, total: 0, areaGuessed: 0, gdpGuessed: 0, guessedList: [], missedList: [] };
    });

    COUNTRIES.forEach(country => {
      const cont = country.continent;
      if (stats[cont]) {
        stats[cont].total += 1;
        if (guessedIds.has(country.id)) {
          stats[cont].guessed += 1;
          stats[cont].areaGuessed += country.area;
          stats[cont].gdpGuessed += country.gdp;
          stats[cont].guessedList.push(country);
        } else {
          stats[cont].missedList.push(country);
        }
      }
    });

    return stats;
  }, [guessedIds]);

  const missedCountries = useMemo(() => {
    if (!isFinished) return [];
    return COUNTRIES.filter(c => !guessedIds.has(c.id)).sort((a, b) => b.area - a.area);
  }, [isFinished, guessedIds]);

  // Start timer on first guess
  useEffect(() => {
    if (startTime && !isFinished) {
      timerRef.current = setInterval(() => {
        if (gameMode === 'zen') {
          setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
        } else {
          setTimeLeft(prev => {
            if (prev <= 1) {
              finishGame();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, isFinished, gameMode]);

  // Scoring logic
  const currentMultiplier = useMemo(() => {
    if (gameMode === 'zen') {
      return Math.max(0.1, 1 - (timeElapsed / 3600)); // Depletes over 1 hour
    } else {
      return (timeLeft / 600) + 0.5; // Bonus for speed in challenge
    }
  }, [timeElapsed, timeLeft, gameMode]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const normalized = inputValue.trim().toLowerCase();
      
      if (normalized === 'final submit' || normalized === 'finish') {
        finishGame();
        setInputValue('');
        return;
      }

      const matchedCountry = COUNTRIES.find(c => {
        if (guessedIds.has(c.id)) return false;
        const names = [c.name.toLowerCase(), ...c.aliases.map(a => a.toLowerCase())];
        return names.includes(normalized);
      });

      if (matchedCountry) {
        if (!startTime) setStartTime(Date.now());
        
        const newGuessed = new Set(guessedIds);
        newGuessed.add(matchedCountry.id);
        setGuessedIds(newGuessed);
        setLastGuessedId(matchedCountry.id);
        setInputValue('');
        
        // Add to score
        const points = Math.floor(matchedCountry.area / 1000 * currentMultiplier);
        setScore(prev => prev + points);

        setFeedback({ text: `Correct! ${matchedCountry.name} added.`, type: 'success' });
        setTimeout(() => setFeedback(null), 2000);

        // Check win condition
        if (newGuessed.size === COUNTRIES.length) {
          finishGame();
        }
      } else if (normalized !== '') {
        setFeedback({ text: `Not found: ${inputValue}`, type: 'error' });
        setTimeout(() => setFeedback(null), 2000);
      }
    }
  };

  const finishGame = () => {
    setIsFinished(true);
    setShowResults(true);
    if (gameMode === 'zen') {
      setCompletionTime(timeElapsed);
    } else {
      setCompletionTime(selectedDuration * 60 - timeLeft);
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resetGame = () => {
    setGuessedIds(new Set());
    setLastGuessedId(null);
    setStartTime(null);
    setTimeElapsed(0);
    setTimeLeft(selectedDuration * 60);
    setIsFinished(false);
    setShowResults(false);
    setScore(0);
    setCompletionTime(null);
    setFocusedContinent(null);
    setInputValue('');
    setFeedback(null);
  };

  useEffect(() => {
    if (!startTime && !isFinished) {
      setTimeLeft(selectedDuration * 60);
    }
  }, [selectedDuration, startTime, isFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Header / Mission Control Bar */}
      <header className="h-16 border-bottom border-neutral-800 bg-[#121212]/80 backdrop-blur-md flex items-center px-6 justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Globe className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm tracking-tight text-white uppercase">GeoGamer <span className="text-emerald-500">v2.0</span></h1>
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Global Landmass Retrieval Protocol</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {!startTime && !isFinished && (
            <div className="flex items-center gap-2">
              <div className="flex bg-neutral-900/50 rounded-lg p-1 border border-neutral-800">
                <button 
                  onClick={() => setGameMode('zen')}
                  className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold uppercase transition-all",
                    gameMode === 'zen' ? "bg-emerald-500 text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  Zen
                </button>
                <button 
                  onClick={() => setGameMode('challenge')}
                  className={cn(
                    "px-3 py-1 rounded text-[10px] font-bold uppercase transition-all",
                    gameMode === 'challenge' ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  Challenge
                </button>
              </div>

              {gameMode === 'challenge' && (
                <select 
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-[10px] font-mono text-amber-500 outline-hidden"
                >
                  {[1, 2, 5, 10, 15, 20, 30, 45, 60].map(m => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-col items-end min-w-[80px]">
            <span className="text-[10px] text-neutral-500 font-mono uppercase">Protocol Time</span>
            <div className="flex items-center gap-2 text-white font-mono">
              <Timer className="w-4 h-4 text-emerald-500" />
              <span className="text-lg">{gameMode === 'challenge' ? formatTime(timeLeft) : formatTime(timeElapsed)}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-neutral-500 font-mono uppercase">Retrieval Score</span>
            <div className="flex items-center gap-2 text-white font-mono">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-lg">{score.toLocaleString()}</span>
            </div>
          </div>

          <button 
            onClick={finishGame}
            disabled={isFinished || guessedIds.size === 0}
            className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-900 rounded font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Final Submit
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex">
        {/* Sidebar Controls */}
        <aside className="w-80 border-right border-neutral-800 flex flex-col bg-[#121212]/50">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Input Country Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isFinished}
                  placeholder="Type country and press Enter..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-3 pl-10 pr-4 text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-neutral-600"
                />
                <AnimatePresence>
                  {feedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={cn(
                        "absolute -bottom-8 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-widest",
                        feedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'
                      )}
                    >
                      {feedback.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Landmass Coverage</span>
                  <span className="text-xs font-mono text-emerald-500">{percentageCovered.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentageCovered}%` }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Wealth Retrieval</span>
                  <span className="text-xs font-mono text-amber-500">{percentageWealthCovered.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentageWealthCovered}%` }}
                    className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  />
                </div>
                <p className="text-[10px] text-neutral-600 font-mono italic">
                  Extracted {coveredArea.toLocaleString()} km² total area
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Guessed</span>
                  <span className="text-xl font-bold flex items-baseline gap-1">
                    {guessedIds.size} <span className="text-[9px] font-normal text-neutral-600">/ {COUNTRIES.length}</span>
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Multiplier</span>
                  <span className="text-xl font-bold text-emerald-500">
                    x{currentMultiplier.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
             <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest block mb-4 sticky top-0 bg-[#121212]/50 py-2">Recently Secured</label>
             <div className="space-y-2">
                {[...guessedIds].reverse().slice(0, 20).map(id => {
                  const country = COUNTRIES.find(c => c.id === id);
                  return (
                    <motion.div 
                      key={id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-2 rounded bg-neutral-900/30 border border-neutral-800/30 text-[11px]"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="flex-1 truncate">{country?.name}</span>
                      <span className="text-[9px] text-neutral-600 font-mono">+{Math.floor((country?.area || 0) / 1000 * currentMultiplier)}</span>
                    </motion.div>
                  );
                })}
                {guessedIds.size === 0 && (
                  <div className="text-center py-12 opacity-20">
                    <Flag className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[10px] uppercase font-mono tracking-widest">No territory identified</p>
                  </div>
                )}
             </div>
          </div>
        </aside>

        {/* Map Area */}
        <section className="flex-1 p-6 flex flex-col gap-6">
          <div className="flex-1 relative">
            <WorldMap 
              guessedIds={guessedIds} 
              highlightedId={lastGuessedId} 
              isFinished={isFinished} 
              focusedContinent={focusedContinent}
            />
           
            {/* Interactive Overlays */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <div className="bg-[#121212]/90 backdrop-blur-sm border border-neutral-800 p-3 rounded-lg flex items-center gap-4 shadow-xl">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                   <span className="text-[10px] font-mono uppercase">Secured</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-sm bg-[#262626]" />
                   <span className="text-[10px] font-mono uppercase">Unknown</span>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Overlay */}
        <AnimatePresence>
          {showResults && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl flex items-center justify-center p-8 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="max-w-6xl w-full bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="p-8 md:p-12 space-y-8">
                  <header className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono uppercase tracking-widest border border-emerald-500/20">
                      Mission Analysis Complete
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">Mission Results</h2>
                    <p className="text-neutral-500 text-sm max-w-md mx-auto">Global hegemony evaluation complete. Review your performance data across all terrestrial sectors.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1 text-center font-mono">
                      <span className="text-[10px] text-neutral-500 uppercase block">Mass Clear</span>
                      <div className="text-2xl font-black text-emerald-400 leading-none">{percentageCovered.toFixed(1)}%</div>
                      <span className="text-[10px] text-neutral-600 uppercase">Territory</span>
                    </div>
                    <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1 text-center font-mono">
                      <span className="text-[10px] text-neutral-500 uppercase block">Wealth Secured</span>
                      <div className="text-2xl font-black text-amber-500 leading-none">{percentageWealthCovered.toFixed(1)}%</div>
                      <span className="text-[10px] text-neutral-600 uppercase">Global GDP</span>
                    </div>
                    <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1 text-center font-mono">
                      <span className="text-[10px] text-neutral-500 uppercase block">Protocol Time</span>
                      <div className="text-2xl font-black text-white leading-none">{formatTime(completionTime || 0)}</div>
                      <span className="text-[10px] text-neutral-600 uppercase">Duration</span>
                    </div>
                    <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1 text-center font-mono">
                      <span className="text-[10px] text-neutral-500 uppercase block">Total Points</span>
                      <div className="text-2xl font-black text-yellow-500 leading-none">{Math.floor(score).toLocaleString()}</div>
                      <span className="text-[10px] text-neutral-600 uppercase">Verdict Unit</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" /> Sector Analysis
                      </h3>
                      <span className="text-[10px] text-neutral-600 font-mono italic">Select a sector to deploy detailed surveillance map</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                      {/* Left: Sector Selection Grid */}
                      <div className="lg:col-span-1 grid grid-cols-1 gap-2 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(CONTINENT_STATS).map(([name, stats]) => {
                          const contData = continentStats[name];
                          const efficiency = (contData.guessed / contData.total) * 100;
                          const isSelected = focusedContinent === name;

                          return (
                            <button
                              key={name}
                              onClick={() => setFocusedContinent(isSelected ? null : name)}
                              className={cn(
                                "text-left p-3 rounded-xl border transition-all relative overflow-hidden group font-mono",
                                isSelected ? "bg-emerald-500 border-emerald-400 scale-[1.02]" : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                              )}
                            >
                              <div className="relative z-10 flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <span className={cn("text-[8px] font-black uppercase tracking-widest", isSelected ? "text-emerald-950" : "text-neutral-500")}>
                                    {stats.name}
                                  </span>
                                  <div className={cn("text-xs font-black", isSelected ? "text-emerald-950" : "text-white")}>
                                    {contData.guessed} <span className="opacity-40">/</span> {contData.total}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={cn("text-sm font-black", isSelected ? "text-emerald-950" : stats.color)}>
                                    {Math.floor(efficiency)}%
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right: Detailed Continent Analysis Rendering */}
                      <div className="lg:col-span-3 space-y-6">
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden relative h-[350px] shadow-inner">
                          {focusedContinent ? (
                            <div className="absolute inset-0 flex flex-col">
                                <div className="p-3 bg-black/40 border-b border-neutral-800 flex justify-between items-center backdrop-blur-sm z-10">
                                  <div className="flex items-center gap-3">
                                      <div className={cn("w-2 h-2 rounded-full animate-pulse", CONTINENT_STATS[focusedContinent as keyof typeof CONTINENT_STATS]?.color.replace('text-', 'bg-'))} />
                                      <div>
                                        <h4 className="text-sm font-black text-white uppercase tracking-tighter">{focusedContinent} Sector Analysis</h4>
                                      </div>
                                  </div>
                                  <button 
                                    onClick={() => setFocusedContinent(null)}
                                    className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500 hover:text-white group"
                                  >
                                      <RefreshCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                                  </button>
                                </div>
                                <div className="flex-1 relative">
                                  <WorldMap 
                                    guessedIds={guessedIds} 
                                    highlightedId={null} 
                                    isFinished={true} 
                                    focusedContinent={focusedContinent}
                                  />
                                </div>
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-6">
                              <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                                <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center border border-neutral-700/50 relative">
                                    <LayoutDashboard className="w-6 h-6 text-neutral-600" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-base font-black text-white uppercase tracking-tighter">Sector Feed Standby</h4>
                                <p className="text-[10px] text-neutral-500 font-mono max-w-xs mx-auto leading-relaxed uppercase">
                                    Select a continental sector to view detailed tactical retrieval reports.
                                  </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {focusedContinent && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[200px]"
                          >
                            <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden font-mono">
                              <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex justify-between items-center">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Identified</span>
                                <span className="text-[9px] font-bold text-emerald-600">{continentStats[focusedContinent].guessedList.length} Units</span>
                              </div>
                              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-1">
                                {continentStats[focusedContinent].guessedList.map(c => (
                                  <div key={c.id} className="px-2 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-200/80 flex items-center gap-2 group hover:bg-emerald-500/10 transition-colors">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                    <span className="truncate">{c.name}</span>
                                  </div>
                                ))}
                                {continentStats[focusedContinent].guessedList.length === 0 && (
                                  <div className="flex items-center justify-center h-full text-[9px] text-neutral-600 italic">No sectors reclaimed</div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden font-mono text-sm">
                              <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex justify-between items-center">
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Missing Coverage</span>
                                <span className="text-[9px] font-bold text-rose-600">{continentStats[focusedContinent].missedList.length} Units</span>
                              </div>
                              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-1">
                                {continentStats[focusedContinent].missedList.map(c => (
                                  <div key={c.id} className="px-2 py-1.5 rounded bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-200/80 flex items-center gap-2 group hover:bg-rose-500/10 transition-colors">
                                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                                    <span className="truncate">{c.name}</span>
                                  </div>
                                ))}
                                {continentStats[focusedContinent].missedList.length === 0 && (
                                  <div className="flex items-center justify-center h-full text-[9px] text-emerald-500 italic font-black uppercase">100% Regional Capture</div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end border-bottom border-neutral-800 pb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Retrieval Failures</h3>
                        <span className="text-[10px] font-mono text-rose-500">{missedCountries.length} Remaining</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {missedCountries.map(c => (
                          <div key={c.id} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800/50 text-[10px] flex flex-col justify-between group hover:border-rose-500/30 transition-all">
                            <span className="font-bold text-neutral-300 truncate uppercase tracking-widest">{c.name}</span>
                            <span className="text-neutral-600 text-[8px] font-mono">{c.continent} • {Math.floor(c.area/1000).toLocaleString()}k km²</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-emerald-500 text-black space-y-6 shadow-2xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Verdict Algorithm</div>
                        <h3 className="text-3xl font-black leading-tight uppercase tracking-tighter">Superior Result</h3>
                        <p className="text-emerald-950 text-xs font-bold leading-relaxed italic border-l-2 border-emerald-900 pl-4 py-1">
                          Operational performance exceeded base expectations. Territorial retrieval protocol verified.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={resetGame}
                          className="flex-1 py-4 bg-black text-emerald-500 font-extrabold uppercase tracking-widest text-[10px] rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                          <RefreshCcw className="w-4 h-4" /> Reset Sync
                        </button>
                        <button 
                          onClick={() => setShowResults(false)}
                          className="px-6 py-4 bg-emerald-600 text-emerald-950 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-600/80 transition-all"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isFinished && !showResults && (
          <div className="absolute top-20 right-6 z-40 flex flex-col gap-2 items-end">
            <button 
              onClick={() => setShowResults(true)}
              className="px-4 py-2 bg-emerald-500 text-black rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-400 transition-colors flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" /> View Verdict
            </button>
            {focusedContinent && (
              <button 
                onClick={() => setFocusedContinent(null)}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg hover:bg-neutral-800 transition-colors flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" /> Global View
              </button>
            )}
          </div>
        )}
      </main>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[50vh] h-[50vh] bg-emerald-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[50vh] h-[50vh] bg-yellow-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}
