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
  LayoutDashboard,
  Trash2,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { COUNTRIES, TOTAL_LAND_AREA, TOTAL_GLOBAL_GDP, CONTINENT_STATS } from './data/countries';
import { WorldMap } from './components/WorldMap';
import { CountryData } from './types';
import { cn } from './lib/utils';
import { auth, db } from './lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  doc,
  getDocFromServer,
  deleteDoc,
  where
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
};

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
  const [isSaving, setIsSaving] = useState(false);
  const [showRecordsView, setShowRecordsView] = useState(false);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const savingRef = useRef(false);
  const [focusedContinent, setFocusedContinent] = useState<string | null>(null);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showKashmirNotice, setShowKashmirNotice] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [showExpandedDetail, setShowExpandedDetail] = useState(false);
  const [selectedExpandedCountryId, setSelectedExpandedCountryId] = useState<string | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; score: number; date: string; time: string; duration?: number; guessedIds: string[]; userId?: string; userEmail?: string; mode?: 'zen' | 'challenge'; limit?: number }[]>([]);
  const isAdmin = user?.email === 'f20240342@dubai.bits-pilani.ac.in' || user?.email === 'rudrapatra252006@gmail.com';
  const [adminFilter, setAdminFilter] = useState('');
  const [selectedContinentFilter, setSelectedContinentFilter] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typeSoundPool = useRef<HTMLAudioElement[]>([]);
  const returnSoundRef = useRef<HTMLAudioElement | null>(null);

  const [isGuest, setIsGuest] = useState(false);

  const viewingRecord = useMemo(() => {
    if (selectedRecordIndex !== null && leaderboard[selectedRecordIndex]) {
      return leaderboard[selectedRecordIndex];
    }
    if (isFinished) {
      return {
        name: playerName || (isGuest ? 'Guest Operative' : 'Anonymous Agent'),
        score: Math.floor(score),
        guessedIds: Array.from(guessedIds),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: gameMode,
        duration: completionTime || 0,
        limit: gameMode === 'challenge' ? selectedDuration : null
      };
    }
    return null;
  }, [selectedRecordIndex, leaderboard, isFinished, playerName, isGuest, score, guessedIds, gameMode, completionTime, selectedDuration]);

  useEffect(() => {
    // Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsGuest(false);
      if (u?.displayName && !playerName) {
        setPlayerName(u.displayName);
      }
    });

    return () => unsubscribeAuth();
  }, [playerName]);

  useEffect(() => {
    if (!user) {
      setLeaderboard([]);
      return;
    }

    // Leaderboard Listener - Filter by user unless admin
    let q;
    if (isAdmin && adminFilter) {
      q = query(
        collection(db, 'leaderboard'), 
        where('userEmail', '>=', adminFilter),
        where('userEmail', '<=', adminFilter + '\uf8ff'),
        orderBy('userEmail'),
        orderBy('createdAt', 'desc'), 
        limit(100)
      );
    } else if (isAdmin) {
      q = query(collection(db, 'leaderboard'), orderBy('createdAt', 'desc'), limit(100));
    } else {
      q = query(
        collection(db, 'leaderboard'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'), 
        limit(50)
      );
    }

    const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setLeaderboard(entries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leaderboard');
    });

    return () => unsubscribeLeaderboard();
  }, [user, isAdmin]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setIsGuest(false);
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  useEffect(() => {
    // Initialize a pool of audio objects for overlapping sounds (fast typing)
    const soundUrls = [
      'https://www.soundjay.com/communication/sounds/typewriter-key-1.mp3',
      'https://www.soundjay.com/communication/sounds/typewriter-key-2.mp3',
      'https://www.soundjay.com/communication/sounds/typewriter-key-3.mp3'
    ];
    
    for (let i = 0; i < 6; i++) {
      const audio = new Audio(soundUrls[i % soundUrls.length]);
      audio.volume = 0.15;
      typeSoundPool.current.push(audio);
    }

    returnSoundRef.current = new Audio('https://www.soundjay.com/communication/sounds/typewriter-return-1.mp3');
    returnSoundRef.current.volume = 0.15;
  }, []);

  const playTypeSound = () => {
    if (!isSoundEnabled) return;
    const audio = typeSoundPool.current.find(a => a.paused || a.ended) || typeSoundPool.current[Math.floor(Math.random() * typeSoundPool.current.length)];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const playReturnSound = () => {
    if (!isSoundEnabled || !returnSoundRef.current) return;
    returnSoundRef.current.currentTime = 0;
    returnSoundRef.current.play().catch(() => {});
  };

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

  // Start timer
  useEffect(() => {
    if (hasStarted && startTime && !isFinished) {
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
    const value = e.target.value;
    if (value !== inputValue) {
      playTypeSound();
    }
    setInputValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      playReturnSound();
      const normalized = inputValue.trim().toLowerCase();
      
      if (!hasStarted) {
        if (!user && !isGuest) {
          setIsGuest(true);
        }
        setHasStarted(true);
        setStartTime(Date.now());
      }

      if (normalized === 'india') {
        setShowKashmirNotice(true);
        setTimeout(() => setShowKashmirNotice(false), 2000);
      }

      if (normalized === 'final submit' || normalized === 'finish') {
        finishGame();
        setInputValue('');
        return;
      }

      // Check if entry was already correctly guessed
      const alreadyGuessed = COUNTRIES.find(c => {
        if (!guessedIds.has(c.id)) return false;
        const names = [c.name.toLowerCase(), ...c.aliases.map(a => a.toLowerCase())];
        return names.includes(normalized);
      });

      if (alreadyGuessed) {
        setFeedback({ text: 'COUNTRY ENTERED ALREADY', type: 'error' });
        setInputValue('');
        setTimeout(() => setFeedback(null), 2000);
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

        // Flag Feedback
        if (matchedCountry.code) {
          setActiveFlag(matchedCountry.code);
          setTimeout(() => setActiveFlag(null), 2000);
        }
        
        // Scoring logic
        // Reworked scoring: Mix of Landmass (25%), GDP (25%), Count (25%), and Time Efficiency (25%)
        const landmassScore = (matchedCountry.area / TOTAL_LAND_AREA) * 250000;
        const gdpScore = (matchedCountry.gdp / TOTAL_GLOBAL_GDP) * 250000;
        const countScore = (1 / COUNTRIES.length) * 250000;
        
        // Bonus for harder (smaller) countries
        const difficultyBonus = matchedCountry.area < 50000 ? 5000 : 
                                 matchedCountry.area < 200000 ? 2500 : 500;
        
        const points = Math.floor((landmassScore + gdpScore + countScore + difficultyBonus) * currentMultiplier);

        setScore(prev => prev + points);

        setFeedback({ text: `IDENTIFIED: ${matchedCountry.name.toUpperCase()}`, type: 'success' });
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
    if (gameMode === 'zen') {
      setCompletionTime(timeElapsed);
    } else {
      setCompletionTime(selectedDuration * 60 - timeLeft);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setShowNamePrompt(true);
  };

  const saveScoreAndShowResults = async () => {
    if (isSaving || savingRef.current) return;
    
    setIsSaving(true);
    savingRef.current = true;
    const finalName = playerName.trim() || user?.displayName || 'Anonymous Agent';
    const now = new Date();
    const entryData = {
      name: finalName,
      score: Math.floor(score),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: completionTime || 0,
      guessedIds: Array.from(guessedIds),
      mode: gameMode,
      limit: gameMode === 'challenge' ? selectedDuration : null,
      userId: user?.uid || null,
      userEmail: user?.email || null,
      createdAt: serverTimestamp()
    };

    if (user) {
      try {
        await addDoc(collection(db, 'leaderboard'), entryData);
        setFeedback({ text: 'Mission data synchronized with central intelligence.', type: 'success' });
        setTimeout(() => setFeedback(null), 3000);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'leaderboard');
        setFeedback({ text: 'Synchronization failure: Encryption error.', type: 'error' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } else {
      // Fallback for non-logged-in users (maybe show they should login but save anyway)
      // Actually our rules require login now.
      setFeedback({ text: 'Sign in to record mission results globally.', type: 'info' });
      setTimeout(() => setFeedback(null), 3000);
    }

    setIsSaving(false);
    savingRef.current = false;
    setShowNamePrompt(false);
    setShowRecordsView(true);
    setSelectedRecordIndex(0); 
  };

  const deleteRecord = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setConfirmDeleteIndex(index);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteIndex === null) return;
    
    const index = confirmDeleteIndex;
    const entry = leaderboard[index];
    if (!entry || !entry.id) {
      setConfirmDeleteIndex(null);
      return;
    }

    // Optimistic update
    const originalLeaderboard = [...leaderboard];
    const newLeaderboard = leaderboard.filter((_, i) => i !== index);
    setLeaderboard(newLeaderboard);
    setConfirmDeleteIndex(null);
    
    try {
      await deleteDoc(doc(db, 'leaderboard', entry.id));
      setFeedback({ text: 'Data record scrubbed from centralized intelligence.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
      
      if (selectedRecordIndex === index) {
        setSelectedRecordIndex(null);
      } else if (selectedRecordIndex !== null && selectedRecordIndex > index) {
        setSelectedRecordIndex(selectedRecordIndex - 1);
      }
    } catch (error) {
      // Rollback
      setLeaderboard(originalLeaderboard);
      handleFirestoreError(error, OperationType.DELETE, `leaderboard/${entry.id}`);
      setFeedback({ text: 'Access denied: Deletion protocol failed.', type: 'error' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const startGame = () => {
    setHasStarted(true);
    setStartTime(Date.now());
  };

  const resetGame = () => {
    setGuessedIds(new Set());
    setLastGuessedId(null);
    setStartTime(null);
    setHasStarted(false);
    setShowRecordsView(false);
    setSelectedRecordIndex(null);
    setTimeElapsed(0);
    setTimeLeft(selectedDuration * 60);
    setIsFinished(false);
    setShowResults(false);
    setShowNamePrompt(false);
    setScore(0);
    setCompletionTime(null);
    setFocusedContinent(null);
    setInputValue('');
    setFeedback(null);
    setPlayerName('');
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
    <div className="h-[100dvh] bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Header / Mission Control Bar */}
      <header className="h-auto lg:h-16 border-b border-neutral-800 bg-[#121212]/80 backdrop-blur-md flex flex-col lg:flex-row items-center px-4 lg:px-6 py-1 lg:py-0 justify-between z-10 gap-1 lg:gap-0 shrink-0">
        <div className="flex items-center justify-between w-full lg:w-auto gap-3 relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white uppercase">GEO_CORE <span className="text-emerald-500">v2.0</span></h1>
              {user && (
                <p className="text-[8px] text-neutral-500 font-mono uppercase tracking-widest truncate max-w-[120px] hidden sm:block">
                  Agent: {user.email?.split('@')[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex lg:hidden items-center gap-1.5">
             <button 
                onClick={() => setShowRecordsView(!showRecordsView)}
                className="p-1 text-neutral-500 hover:text-white"
              >
                <Trophy className="w-3.5 h-3.5" />
            </button>
             <button 
              onClick={() => setShowHelpModal(true)}
              className="p-1 text-neutral-500 hover:text-white"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
             <button 
              onClick={finishGame}
              disabled={isFinished || guessedIds.size === 0}
              className="px-2 py-0.5 bg-neutral-100 text-neutral-900 rounded font-black text-[7px] uppercase tracking-widest disabled:opacity-50"
            >
              FIN
            </button>
          </div>

          <AnimatePresence>
            {activeFlag && (
              <motion.div
                key={activeFlag}
                initial={{ opacity: 0, scale: 0.5, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
                className="flex items-center pointer-events-none"
              >
                <div className="relative ml-2">
                  <div className="absolute inset-0 bg-emerald-500/30 blur-lg rounded-full scale-125 animate-pulse" />
                  <img 
                    src={`https://flagcdn.com/w160/${activeFlag.toLowerCase()}.png`} 
                    alt="Current Secure Sector Flag"
                    className="h-8 w-auto rounded border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative z-10"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between lg:justify-end w-full lg:w-auto gap-2 lg:gap-6 shrink-0">
          {!hasStarted && !isFinished && (
            <div className="flex items-center gap-1.5 lg:gap-3 scale-90 lg:scale-100">
              <div className="flex bg-neutral-900/50 rounded-lg p-0.5 border border-neutral-800">
                <button 
                  onClick={() => setGameMode('zen')}
                  className={cn(
                    "px-2 lg:px-3 py-1 rounded text-[8px] lg:text-[10px] font-bold uppercase transition-all",
                    gameMode === 'zen' ? "bg-emerald-500 text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  Zen
                </button>
                <button 
                  onClick={() => setGameMode('challenge')}
                  className={cn(
                    "px-2 lg:px-3 py-1 rounded text-[8px] lg:text-[10px] font-bold uppercase transition-all",
                    gameMode === 'challenge' ? "bg-amber-500 text-black shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  Hard
                </button>
              </div>

              {gameMode === 'challenge' && (
                <select 
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-800 rounded px-1 lg:px-2 py-0.5 lg:py-1 text-[8px] lg:text-[10px] font-mono text-amber-500 outline-hidden"
                >
                  {[1, 2, 5, 10, 15, 20, 30, 45, 60].map(m => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 lg:gap-4 ml-auto lg:ml-0">
            <div className="flex flex-col items-end min-w-[40px] lg:min-w-[80px]">
                <span className="text-[7px] lg:text-[10px] text-neutral-500 font-mono uppercase leading-none">Stats</span>
                <div className="flex items-center gap-1 text-white font-mono leading-none">
                  <Globe2 className="w-2.5 h-2.5 lg:w-4 lg:h-4 text-cyan-500" />
                  <span className="text-[12px] lg:text-lg">{percentageCovered.toFixed(0)}%</span>
                </div>
            </div>

            <div className="flex flex-col items-end min-w-[40px] lg:min-w-[80px]">
                <span className="text-[7px] lg:text-[10px] text-neutral-500 font-mono uppercase leading-none">Time</span>
                <div className="flex items-center gap-1 text-white font-mono leading-none">
                  <Timer className="w-2.5 h-2.5 lg:w-4 lg:h-4 text-emerald-500" />
                  <span className="text-[12px] lg:text-lg">{gameMode === 'challenge' ? formatTime(timeLeft) : formatTime(timeElapsed)}</span>
                </div>
            </div>
              
            <div className="flex flex-col items-end min-w-[50px] lg:min-w-[80px]">
              <span className="text-[7px] lg:text-[10px] text-neutral-500 font-mono uppercase leading-none">Score</span>
              <div className="flex items-center gap-1 text-white font-mono leading-none">
                <Trophy className="w-2.5 h-2.5 lg:w-4 lg:h-4 text-yellow-500" />
                <span className="text-[12px] lg:text-lg truncate">{score.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                <div className="px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  {user.displayName || 'Authorized'}
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                <button 
                  onClick={handleLogin}
                  className="px-3 py-1.5 rounded text-[10px] font-black uppercase text-neutral-500 hover:text-white transition-all flex items-center gap-2"
                >
                  <LogIn className="w-3 h-3" />
                  Sign In
                </button>
                <div className="w-px h-4 bg-neutral-800 mx-1" />
                <button 
                  onClick={() => setIsGuest(!isGuest)}
                  className={cn(
                    "px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all flex items-center gap-2",
                    isGuest ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
                  )}
                >
                  <Globe className="w-3 h-3" />
                  {isGuest ? 'Guest Active' : 'Guest'}
                </button>
              </div>
            )}

             <button 
                onClick={() => {
                  if (!user && !isGuest) {
                    setFeedback({ text: 'Access Denied: Authentication required.', type: 'info' });
                    setTimeout(() => setFeedback(null), 3000);
                    return;
                  }
                  if (showRecordsView) {
                    resetGame();
                  } else {
                    setShowRecordsView(true);
                  }
                }}
                className={cn(
                  "px-4 py-1.5 rounded font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                  showRecordsView ? "bg-emerald-500 text-black shadow-lg" : "bg-neutral-800 text-neutral-400 hover:text-white"
                )}
              >
                <Trophy className="w-3 h-3" />
                {showRecordsView ? "BACK" : "RECORDS"}
            </button>

            <button 
              onClick={() => setShowHelpModal(true)}
              className="p-2 text-neutral-500 hover:text-white transition-colors"
              title="How to play"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button 
              onClick={finishGame}
              disabled={isFinished || guessedIds.size === 0}
              className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-900 rounded font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Sidebar Controls */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col bg-[#121212]/50 shrink-0 max-h-fit lg:max-h-full z-20">
          <div className="p-2 lg:p-6 space-y-2 lg:space-y-6">
            <AnimatePresence mode="wait">
              <motion.div key="search" className="space-y-0.5 lg:space-y-2">
                <label className="text-[8px] lg:text-[10px] text-neutral-500 font-mono uppercase tracking-widest hidden lg:block">Identify Global Territory</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 lg:w-4 lg:h-4 text-neutral-500" />
                    <input 
                      type="text"
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={isFinished}
                      placeholder="Type country name..."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-1.5 lg:py-3 pl-9 lg:pl-10 pr-4 text-xs lg:text-sm focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-neutral-700"
                    />
                  </div>
                </div>
                <div className="relative h-4">
                  <AnimatePresence>
                    {feedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className={cn(
                          "absolute inset-0 text-center text-[10px] font-bold uppercase tracking-widest",
                          feedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'
                        )}
                      >
                        {feedback.text}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
            <div className="px-6 pb-6 space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50 space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-neutral-500 font-mono uppercase tracking-widest">Landmass Coverage</span>
                  <span className="font-mono text-emerald-500">{percentageCovered.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentageCovered}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Guessed</span>
                  <span className="text-xl font-bold">
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

            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide space-y-4">
               <div>
                 <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest block mb-4 sticky top-0 bg-[#0a0a0a] lg:bg-[#121212] py-2">Secured Zones</label>
               <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {[...guessedIds].reverse().slice(0, 10).map(id => {
                    const country = COUNTRIES.find(c => c.id === id);
                    return (
                      <motion.div 
                        key={id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-2 rounded bg-neutral-900/30 border border-neutral-800/30 text-[11px] group hover:bg-neutral-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img 
                            src={`https://flagcdn.com/w20/${country?.code.toLowerCase()}.png`} 
                            className="w-4 h-3 rounded-sm object-cover border border-white/10"
                            alt="" 
                          />
                          <span className="truncate">{country?.name}</span>
                        </div>
                        <span className="text-[9px] text-emerald-500 font-mono font-bold">+{Math.floor((country?.area || 0) / 1000 * currentMultiplier)} pts</span>
                      </motion.div>
                    );
                  })}
                  {guessedIds.size === 0 && (
                    <div className="text-center py-6 opacity-20">
                      <Flag className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-[10px] uppercase font-mono tracking-widest">No territory identified</p>
                    </div>
                  )}
               </div>
             </div>

             <AnimatePresence>
               {showKashmirNotice && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.9, y: 10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: 10 }}
                   className="p-8 bg-emerald-600 text-white rounded-2xl border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] text-center mt-auto"
                 >
                   <span className="font-black text-xl leading-tight uppercase tracking-tighter block mb-1">Kashmir</span>
                   <span className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-80">Belongs to India</span>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
          </div>
        </aside>

        {/* Map Area */}
        <section className="flex-1 p-0 lg:p-6 flex flex-col gap-0 lg:gap-6 relative overflow-hidden">
          {/* Mobile Guessed Button */}
          <div className="lg:hidden absolute bottom-4 left-4 z-40">
             <button 
                onClick={() => setFeedback({ text: `IDENTIFIED: ${guessedIds.size} / ${COUNTRIES.length}`, type: 'info' })}
                className="w-10 h-10 bg-[#121212]/90 backdrop-blur-md border border-neutral-800 rounded-full flex items-center justify-center text-emerald-500 shadow-2xl"
             >
                <CheckCircle2 className="w-5 h-5" />
             </button>
          </div>
          <AnimatePresence mode="wait">
            {showRecordsView ? (
              <motion.div 
                key="records"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 bg-[#0a0a0a] border border-neutral-800 rounded-2xl lg:rounded-3xl overflow-hidden flex flex-col"
              >
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden mb-safe">
                  {/* Records List */}
                  <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col bg-[#121212]/50 max-h-[30vh] lg:max-h-full overflow-hidden">
                    <div className="p-4 lg:p-6 border-b border-neutral-800">
                      <div className="flex items-center justify-between mb-4 lg:mb-8">
                        <div>
                          <h2 className="text-xl lg:text-3xl font-black text-white uppercase tracking-tighter italic">Mission Archive</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] text-emerald-500/80 font-mono uppercase tracking-widest">
                              {isAdmin ? 'Global Intelligence Access Active' : 'Personal Records Secure'}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setShowRecordsView(false);
                            if (isFinished) setShowResults(true);
                          }}
                          className="p-2 lg:p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 transition-colors"
                        >
                          <XCircle className="w-4 h-4 lg:w-5 lg:h-5 text-neutral-500" />
                        </button>
                      </div>
                      
                      {isAdmin && (
                        <div className="mb-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                            <input 
                              type="text"
                              placeholder="SEARCH BY OPERATIVE EMAIL..."
                              value={adminFilter}
                              onChange={(e) => setAdminFilter(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-[10px] font-mono text-white placeholder:text-neutral-700 focus:border-emerald-500/50 outline-none transition-all uppercase"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-emerald-500" />
                        <h2 className="text-lg lg:text-xl font-black text-white uppercase tracking-tighter">Mission Logs</h2>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {leaderboard.map((entry, i) => (
                        <div 
                          key={entry.id || `${entry.name}-${i}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedRecordIndex(i)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedRecordIndex(i)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl transition-all border group relative overflow-hidden cursor-pointer outline-none",
                            selectedRecordIndex === i 
                              ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                              : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 focus:border-emerald-500/30"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-colors relative group/num",
                              selectedRecordIndex === i ? "bg-emerald-500 text-black" : "bg-neutral-800 text-neutral-500 group-hover:bg-neutral-700"
                            )}>
                              <span className="group-hover/num:opacity-0 transition-opacity">{i + 1}</span>
                              {entry.userId === user?.uid && (
                                <button
                                  type="button"
                                  onClick={(e) => deleteRecord(e, i)}
                                  className="absolute inset-0 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover/num:opacity-100 transition-all hover:bg-red-600 active:scale-95 z-20 pointer-events-auto shadow-lg"
                                  title="Delete Log"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="text-left flex-1">
                              <h4 className={cn("text-sm font-black uppercase tracking-tighter flex items-center gap-2", selectedRecordIndex === i ? "text-white" : "text-neutral-400 group-hover:text-neutral-200")}>
                                {entry.name}
                                {isAdmin && entry.userEmail && (
                                  <span className="text-[8px] font-mono text-neutral-600 lowercase opacity-60">[{entry.userEmail}]</span>
                                )}
                              </h4>
                              <span className="text-[9px] text-neutral-600 font-mono uppercase">
                                {entry.date} {entry.time} • {entry.guessedIds?.length || 0} Territories 
                                {entry.mode === 'challenge' ? ` • ${entry.limit}m Limit` : ' • Zen'}
                              </span>
                            </div>
                          </div>
                          
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className={cn("text-base font-black leading-none", selectedRecordIndex === i ? "text-emerald-400" : "text-neutral-400")}>{entry.score.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {leaderboard.length === 0 && (
                        <div className="text-center py-24 opacity-10">
                          <Trophy className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[10px] uppercase font-mono tracking-widest">No history found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Record Details / Analysis */}
                  <div className="flex-1 flex flex-col bg-[#0a0a0a] min-h-0 overflow-y-auto">
                    <AnimatePresence mode="wait">
                      {selectedRecordIndex !== null && leaderboard[selectedRecordIndex] ? (
                        <motion.div 
                          key={selectedRecordIndex}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 flex flex-col p-4 lg:p-8 gap-4 lg:gap-8"
                        >
                          <div className="flex-1 relative bg-neutral-900/50 rounded-2xl lg:rounded-3xl border border-neutral-800/50 overflow-hidden shadow-inner order-first min-h-[300px] lg:min-h-[400px]">
                             <WorldMap 
                               guessedIds={new Set(leaderboard[selectedRecordIndex].guessedIds || [])}
                               highlightedId={null}
                               isFinished={true}
                               focusedContinent={null}
                               onCountryClick={(id) => {
                                 setSelectedExpandedCountryId(id);
                                 setShowExpandedDetail(true);
                               }}
                             />
                             <div className="absolute top-4 right-4 bg-[#121212]/90 backdrop-blur-sm border border-neutral-800 p-4 rounded-xl shadow-xl">
                               <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mb-3">Territorial Analysis</div>
                               <div className="space-y-4">
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-3">
                                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                       <span className="text-[11px] font-bold text-white uppercase">{leaderboard[selectedRecordIndex].guessedIds?.length || 0} Captured</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                       <div className="w-2 h-2 rounded-full bg-neutral-800" />
                                       <span className="text-[11px] font-bold text-neutral-500 uppercase">{COUNTRIES.length - (leaderboard[selectedRecordIndex].guessedIds?.length || 0)} Missing</span>
                                     </div>
                                  </div>
                                  <button 
                                    onClick={() => setShowExpandedDetail(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-500 transition-all"
                                  >
                                    <LayoutDashboard className="w-3 h-3" />
                                    Expansion Survey
                                  </button>
                               </div>
                             </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{leaderboard[selectedRecordIndex].name}</h3>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-500">
                                  <Trophy className="w-3 h-3" /> {leaderboard[selectedRecordIndex].score.toLocaleString()} Points
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-500">
                                  <MapIcon className="w-3 h-3" /> {leaderboard[selectedRecordIndex].guessedIds?.length || 0} Territories
                                </div>
                                <div className="text-[10px] font-mono uppercase text-neutral-500">
                                  {leaderboard[selectedRecordIndex].date} at {leaderboard[selectedRecordIndex].time} • {leaderboard[selectedRecordIndex].mode === 'challenge' ? `Challenge (${leaderboard[selectedRecordIndex].limit}m)` : 'Zen Mode'} • {leaderboard[selectedRecordIndex].mode === 'challenge' && (leaderboard[selectedRecordIndex].duration || 0) >= (leaderboard[selectedRecordIndex].limit || 0) * 60 ? <span className="text-rose-500 font-bold">TIMED OUT</span> : `Completed in ${formatTime(leaderboard[selectedRecordIndex].duration || 0)}`}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-20">
                          <LayoutDashboard className="w-16 h-16 mb-4" />
                          <h3 className="text-xl font-black uppercase tracking-tighter">Decline Data Pending</h3>
                          <p className="text-[10px] font-mono uppercase tracking-widest">Select a log entry to inspect mission parameters</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 relative"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Name Prompt Overlay */}
        <AnimatePresence>
          {showNamePrompt && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-100 bg-[#0a0a0a]/90 backdrop-blur-md flex items-center justify-center p-8"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md w-full bg-[#121212] border border-emerald-500/30 p-8 rounded-3xl shadow-2xl text-center space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Mission Success</h3>
                    <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">Input your agent alias for the global record</p>
                  </div>
                  
                  {!user && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono uppercase tracking-widest leading-relaxed">
                      Mission analysis can only be recorded by authenticated agents. Please sign in to sync with command.
                    </div>
                  )}

                  <input 
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value !== playerName) playTypeSound();
                      setPlayerName(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        playReturnSound();
                        saveScoreAndShowResults();
                      }
                    }}
                    autoFocus
                    placeholder="AGENT NAME..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-4 px-6 text-xl font-black tracking-widest text-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 uppercase text-center"
                  />
                  
                  {user ? (
                    <button 
                      onClick={saveScoreAndShowResults}
                      disabled={isSaving}
                      className={`w-full py-4 text-black rounded-xl font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                        isSaving ? 'bg-neutral-700 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95'
                      }`}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                          RECORDING...
                        </>
                      ) : (
                        'Record Achievement'
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleLogin}
                        className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black uppercase tracking-widest transition-all hover:bg-emerald-400 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-5 h-5" />
                        Sign In to Record
                      </button>
                      <button 
                        onClick={() => {
                          setShowNamePrompt(false);
                          setShowResults(true);
                        }}
                        className="w-full py-3 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-neutral-800 hover:text-white"
                      >
                        Mission Analysis (No Sync)
                      </button>
                    </div>
                  )}
                  
                  {user && (
                    <button 
                      onClick={() => {
                        setShowNamePrompt(false);
                        setShowResults(true);
                      }}
                      className="w-full py-2 text-neutral-500 hover:text-neutral-300 text-[10px] font-mono uppercase tracking-widest transition-colors"
                    >
                      Continue without saving
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                      <span className="text-[10px] text-neutral-600 uppercase">Retrieval Unit</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" /> Sector Analysis
                      </h3>
                      <span className="text-[10px] text-neutral-600 font-mono italic">Select a sector to deploy detailed surveillance map</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-8">
                      {/* Left: Sector Selection Grid */}
                      <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-[200px] lg:max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
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
                                    highlightedId={selectedExpandedCountryId} 
                                    onCountryClick={setSelectedExpandedCountryId}
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
                                  <div key={c.id} title={c.name} className="px-2 py-1.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-emerald-200/80 flex items-center gap-2 group hover:bg-emerald-500/10 transition-colors">
                                    <img 
                                      src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} 
                                      className="w-4 h-3 rounded-sm object-cover border border-white/10"
                                      alt="" 
                                    />
                                    <span className="truncate flex-1">{c.name}</span>
                                    <span className="text-[8px] opacity-50 font-mono">${Math.floor(c.gdp).toLocaleString()}M</span>
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
                                  <div key={c.id} title={c.name} className="px-2 py-1.5 rounded bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-200/80 flex items-center gap-2 group hover:bg-rose-500/10 transition-colors">
                                    <img 
                                      src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} 
                                      className="w-4 h-3 rounded-sm object-cover border border-white/10"
                                      alt="" 
                                    />
                                    <span className="truncate flex-1">{c.name}</span>
                                    <span className="text-[8px] opacity-50 font-mono">${Math.floor(c.gdp).toLocaleString()}M</span>
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
                          <div key={c.id} title={c.name} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800/50 text-[10px] flex items-center gap-3 group hover:border-rose-500/30 transition-all shrink-0">
                            <img 
                              src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                              className="w-8 h-6 rounded object-cover border border-white/5 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                              alt="" 
                            />
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-neutral-300 truncate uppercase tracking-widest block">{c.name}</span>
                              <div className="flex justify-between items-center w-full">
                                <span className="text-neutral-600 text-[8px] font-mono">{c.continent}</span>
                                <span className="text-rose-500/50 text-[8px] font-mono">${Math.floor(c.gdp/1000).toLocaleString()}B</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-8 rounded-3xl bg-emerald-500 text-black space-y-6 shadow-2xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Operational Intelligence</div>
                        <h3 className="text-3xl font-black leading-tight uppercase tracking-tighter">Superior Result</h3>
                        <p className="text-emerald-950 text-xs font-bold leading-relaxed italic border-l-2 border-emerald-900 pl-4 py-1">
                          Operational performance exceeded base expectations. Territorial retrieval protocol verified.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            setShowResults(false);
                            setShowExpandedDetail(true);
                          }}
                          className="flex-1 py-4 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-extrabold uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          <LayoutDashboard className="w-4 h-4" /> Expansion
                        </button>
                        <button 
                          onClick={resetGame}
                          className="flex-1 py-3 lg:py-4 bg-black text-emerald-500 font-extrabold uppercase tracking-widest text-[9px] lg:text-[10px] rounded-xl lg:rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                          <RefreshCcw className="w-3 h-3 lg:w-4 lg:h-4" /> Reset
                        </button>
                        <button 
                          onClick={() => setShowResults(false)}
                          className="px-4 lg:px-6 py-3 lg:py-4 bg-emerald-600 text-emerald-950 font-black uppercase tracking-widest text-[9px] lg:text-[10px] rounded-xl lg:rounded-2xl hover:bg-emerald-600/80 transition-all"
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

        {/* Help Modal */}
        <AnimatePresence>
          {showHelpModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[200] bg-[#0a0a0a]/90 backdrop-blur-md flex items-center justify-center p-8"
              onClick={() => setShowHelpModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md w-full bg-[#121212] border border-neutral-800 p-8 rounded-3xl shadow-2xl space-y-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Mission Briefing</h3>
                  </div>
                  <button 
                    onClick={() => setShowHelpModal(false)}
                    className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-500 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-sm text-neutral-400 font-mono uppercase tracking-widest text-[10px]">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                    <p className="text-emerald-500 font-bold tracking-[0.2em]">The Goal</p>
                    <p>Type names to identify countries and secure global territory.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
                    <p className="text-amber-500 font-bold tracking-[0.2em]">Modes</p>
                    <p><span className="text-neutral-200">Zen:</span> Infinite time. <span className="text-neutral-200">Challenge:</span> High-speed timed retrieval.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400/80">
                    <p>TIP: Rotate the globe to find missing sectors. Click continents for tactical analysis.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black uppercase tracking-widest transition-all hover:bg-emerald-400 active:scale-95 shadow-lg"
                >
                  Return to Mission
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isFinished && !showResults && (
          <div className="absolute top-20 right-6 z-40 flex flex-col gap-2 items-end">
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

        <AnimatePresence>
          {showExpandedDetail && viewingRecord && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-100 bg-[#0a0a0a] flex flex-col p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Territorial Expansion Survey</h2>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                       Agent: <span className="text-emerald-500">{viewingRecord.name}</span> 
                       <span className="opacity-30">•</span> 
                       Efficiency: <span className="text-emerald-500">{Math.round(((viewingRecord.guessedIds?.length || 0) / COUNTRIES.length) * 100)}%</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowExpandedDetail(false);
                    setSelectedExpandedCountryId(null);
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex gap-8 overflow-hidden mb-6">
                <div className="w-80 flex flex-col gap-6 overflow-hidden">
                  <div className="flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 shrink-0">
                    <div className="p-3 bg-neutral-900/50 border-b border-neutral-800 flex flex-wrap gap-1">
                      <button 
                        onClick={() => setSelectedContinentFilter(null)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all",
                          selectedContinentFilter === null ? "bg-emerald-500 text-black" : "bg-neutral-800 text-neutral-500"
                        )}
                      >
                        All
                      </button>
                      {Object.keys(CONTINENT_STATS).map(cont => (
                        <button 
                          key={cont}
                          onClick={() => setSelectedContinentFilter(cont)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all",
                            selectedContinentFilter === cont ? "bg-white text-black" : "bg-neutral-800 text-neutral-500"
                          )}
                        >
                          {cont.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                    <div className="p-4 bg-emerald-500/5 border-b border-neutral-800 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Secured ({(viewingRecord.guessedIds || []).filter(id => {
                          const c = COUNTRIES.find(curr => curr.id === id);
                          return !selectedContinentFilter || c?.continent === selectedContinentFilter;
                        }).length})
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {(viewingRecord.guessedIds || [])
                        .filter(id => {
                          const c = COUNTRIES.find(curr => curr.id === id);
                          return !selectedContinentFilter || c?.continent === selectedContinentFilter;
                        })
                        .map(id => {
                          const country = COUNTRIES.find(c => c.id === id);
                          const isSelected = selectedExpandedCountryId === id;
                          return (
                            <button 
                              key={id} 
                              onClick={() => setSelectedExpandedCountryId(isSelected ? null : id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-2 rounded-lg border text-[10px] font-mono group transition-all",
                                isSelected 
                                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                  : "bg-neutral-900/50 border-neutral-800/50 text-neutral-400 hover:border-emerald-500/30 hover:text-emerald-400"
                              )}
                            >
                              <img 
                                src={`https://flagcdn.com/w20/${country?.code.toLowerCase()}.png`} 
                                className="w-4 h-3 rounded-sm object-cover border border-white/10"
                                alt="" 
                              />
                              <span className="flex-1 text-left truncate">{country?.name}</span>
                              <span className="text-[8px] opacity-40 font-mono">${Math.floor((country?.gdp || 0)/1000).toLocaleString()}B</span>
                              <ArrowRight className={cn("w-3 h-3 transition-transform", isSelected ? "rotate-0 text-emerald-400" : "-rotate-45 opacity-0 group-hover:opacity-100")} />
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                    <div className="p-4 bg-red-500/5 border-b border-neutral-800 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                        <XCircle className="w-3 h-3" />
                        Missed ({COUNTRIES.filter(c => {
                          const isMissed = !viewingRecord.guessedIds?.includes(c.id);
                          return isMissed && (!selectedContinentFilter || c.continent === selectedContinentFilter);
                        }).length})
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {COUNTRIES.filter(c => {
                        const isMissed = !viewingRecord.guessedIds?.includes(c.id);
                        return isMissed && (!selectedContinentFilter || c.continent === selectedContinentFilter);
                      }).map(country => {
                        const isSelected = selectedExpandedCountryId === country.id;
                        return (
                          <button 
                            key={country.id} 
                            onClick={() => setSelectedExpandedCountryId(isSelected ? null : country.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-lg border text-[10px] font-mono group transition-all",
                              isSelected 
                                ? "bg-red-500/20 border-red-400 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                                : "bg-neutral-900/50 border-neutral-800/50 text-neutral-500 hover:border-red-500/30 hover:text-red-400"
                            )}
                          >
                            <img 
                              src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} 
                              className="w-4 h-3 rounded-sm object-cover border border-white/10 opacity-60 group-hover:opacity-100 transition-opacity"
                              alt="" 
                            />
                            <span className="flex-1 text-left truncate">{country.name}</span>
                            <span className="text-[8px] opacity-40 font-mono">${Math.floor(country.gdp/1000).toLocaleString()}B</span>
                            <ArrowRight className={cn("w-3 h-3 transition-transform", isSelected ? "rotate-0 text-red-400" : "-rotate-45 opacity-0 group-hover:opacity-100")} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex-1 relative bg-[#0a0a0a] border border-neutral-800 rounded-3xl overflow-hidden">
                  <WorldMap 
                    guessedIds={new Set(viewingRecord.guessedIds || [])}
                    highlightedId={selectedExpandedCountryId}
                    onCountryClick={setSelectedExpandedCountryId}
                    isFinished={true}
                    focusedContinent={null}
                  />

                  {/* Floating Detail Panel */}
                  <AnimatePresence>
                    {selectedExpandedCountryId && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-6 left-6 right-6 p-6 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl z-10"
                      >
                        {(() => {
                          const country = COUNTRIES.find(c => c.id === selectedExpandedCountryId);
                          if (!country) return null;
                          const isGuessed = viewingRecord.guessedIds?.includes(country.id);
                          return (
                            <div className="flex gap-8 items-start">
                              <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-1 h-8 rounded-full", isGuessed ? "bg-emerald-500" : "bg-red-500")} />
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`} 
                                      className="h-8 w-auto rounded border border-white/10 shadow-lg"
                                      alt="" 
                                    />
                                    <div>
                                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{country.name}</h3>
                                      <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-[0.2em]">{country.continent} Sector</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                  <div className="space-y-1">
                                    <p className="text-[9px] text-neutral-500 font-mono uppercase">Capital City</p>
                                    <p className="text-sm font-bold text-white uppercase">{country.capital || "Classified"}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] text-neutral-500 font-mono uppercase">Economic Output</p>
                                    <p className="text-sm font-bold text-emerald-500 uppercase">${(country.gdp / 1000).toFixed(1)}B</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] text-neutral-500 font-mono uppercase">Total Territory</p>
                                    <p className="text-sm font-bold text-white uppercase">{country.area.toLocaleString()} KM²</p>
                                  </div>
                                </div>
                              </div>
                              <div className="w-1/3 p-4 bg-neutral-800/40 rounded-xl border border-neutral-700/30">
                                <p className="text-[9px] text-emerald-500 font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <Globe2 className="w-3 h-3" />
                                  Intelligence Brief
                                </p>
                                <p className="text-xs text-neutral-300 font-medium leading-relaxed italic">
                                  "{(() => {
                                    if (country.facts && country.facts.length > 0) {
                                      return country.facts[Math.floor(Math.random() * country.facts.length)];
                                    }
                                    return country.facts?.[0] || "Territorial intelligence for this sector is currently under command review. Further mission data required.";
                                  })()}"
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-4">
                 {Object.entries(CONTINENT_STATS).map(([continent]) => {
                   const totalInContinent = COUNTRIES.filter(c => c.continent === continent).length;
                   const recordGuessed = viewingRecord.guessedIds || [];
                   const guessedInContinent = recordGuessed.filter(id => 
                     COUNTRIES.find(c => c.id === id)?.continent === continent
                   ).length;
                   const percentage = (guessedInContinent / totalInContinent) * 100;
                   
                   return (
                     <div key={continent} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                       <div className="flex justify-between items-center">
                         <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">{continent}</span>
                         <span className={cn("text-[10px] font-mono", percentage === 100 ? "text-emerald-500" : "text-neutral-400")}>
                           {guessedInContinent}/{totalInContinent}
                         </span>
                       </div>
                       <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${percentage}%` }}
                           className={cn("h-full", percentage === 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-neutral-600")}
                         />
                       </div>
                     </div>
                   );
                 })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mission Log Deletion Confirmation */}
      <AnimatePresence>
        {confirmDeleteIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-neutral-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-red-500/20">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-center text-white uppercase tracking-tighter mb-2">Security Override</h3>
              <p className="text-neutral-400 text-center text-sm mb-8">
                Are you absolutely certain you want to purge mission data for <span className="text-white font-bold">"{leaderboard[confirmDeleteIndex]?.name}"</span>? This action is irreversible.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setConfirmDeleteIndex(null)}
                  className="py-4 bg-neutral-800 text-neutral-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  Abort
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="py-4 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-500 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] shadow-lg active:scale-95"
                >
                  Confirm Purge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[50vh] h-[50vh] bg-emerald-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[50vh] h-[50vh] bg-yellow-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}
