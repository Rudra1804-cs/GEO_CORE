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
  Edit2,
  Check,
  X,
  BarChart3,
  Map as MapIcon,
  RefreshCcw,
  Flag,
  Globe2,
  TrendingUp,
  LayoutDashboard,
  Trash2,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  HelpCircle,
  Satellite,
  Pause,
  Play,
  ListFilter
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
  updateDoc,
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

const LOCAL_RECORDS_KEY = 'global_surveillance_guest_records';

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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecordsView, setShowRecordsView] = useState(false);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [recordTerritorySearch, setRecordTerritorySearch] = useState('');
  const [expansionSearch, setExpansionSearch] = useState('');
  const [score, setScore] = useState(0);
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const savingRef = useRef(false);
  const [focusedContinent, setFocusedContinent] = useState<string | null>("GLOBAL");
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
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; score: number; date: string; time: string; duration?: number; guessedIds: string[]; userId?: string; userEmail?: string; mode?: 'zen' | 'challenge'; limit?: number }[]>([]);
  const isAdmin = user?.email === 'f20240342@dubai.bits-pilani.ac.in' || user?.email === 'rudrapatra252006@gmail.com';
  const [adminFilter, setAdminFilter] = useState('');
  const [selectedContinentFilter, setSelectedContinentFilter] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [expansionSort, setExpansionSort] = useState<'alphabet' | 'wealth'>('alphabet');
  const [isPaused, setIsPaused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
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
      // Load local records for guests
      const stored = localStorage.getItem(LOCAL_RECORDS_KEY);
      if (stored) {
        try {
          setLeaderboard(JSON.parse(stored));
        } catch (e) {
          setLeaderboard([]);
        }
      } else {
        setLeaderboard([]);
      }
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
      provider.setCustomParameters({ prompt: 'select_account' });
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

  const continentTotals = useMemo(() => {
    const totals: Record<string, { area: number; gdp: number; total: number }> = {};
    COUNTRIES.forEach(c => {
      if (!totals[c.continent]) totals[c.continent] = { area: 0, gdp: 0, total: 0 };
      totals[c.continent].area += c.area;
      totals[c.continent].gdp += (c.gdp || 0);
      totals[c.continent].total += 1;
    });
    return totals;
  }, []);

  const totalPossibleArea = useMemo(() => COUNTRIES.reduce((acc, c) => acc + c.area, 0), []);
  const totalPossibleGdp = useMemo(() => COUNTRIES.reduce((acc, c) => acc + (c.gdp || 0), 0), []);

  const percentageCovered = guessedIds.size === COUNTRIES.length ? 100 : Math.min(99.9, (coveredArea / totalPossibleArea) * 100);
  
  const coveredWealth = useMemo(() => {
    return Array.from(guessedIds).reduce((acc: number, id) => {
      const country = COUNTRIES.find(c => c.id === id);
      return acc + (country?.gdp || 0);
    }, 0);
  }, [guessedIds]);

  const percentageWealthCovered = guessedIds.size === COUNTRIES.length ? 100 : Math.min(99.9, (coveredWealth / totalPossibleGdp) * 100);
  
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
    if (hasStarted && startTime && !isFinished && !isPaused) {
      timerRef.current = setInterval(() => {
        if (gameMode === 'zen') {
          setTimeElapsed(prev => prev + 1);
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
  }, [hasStarted, startTime, isFinished, gameMode, isPaused]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Satellite View with Meta/Ctrl + X
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setIsSatelliteView(prev => !prev);
      }

      // Toggle Pause with Alt key (Option)
      if (e.key === 'Alt') {
        if (hasStarted && !isFinished) {
          e.preventDefault();
          setIsPaused(prev => !prev);
        }
      }

      // Focus input on Enter or Space if not in a modal/paused state
      if ((e.key === 'Enter' || e.key === ' ') && !isPaused && !isFinished && !showNamePrompt && !showResults && !showRecordsView) {
        // Only focus and prevent default if not already typing in an input
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isPaused, isFinished, showNamePrompt, showResults, showRecordsView, setIsSatelliteView, hasStarted, setIsPaused]);

  // Scoring logic
  const getCountryPoints = (country: CountryData) => {
    // Fixed points based on name length and 'uniqueness' (inverse of area)
    const nameWeight = country.name.length * 150;
    const uniquenessWeight = Math.floor(25000 / Math.pow((country.area + 1), 0.25));
    return nameWeight + uniquenessWeight;
  };

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
        const basePoints = getCountryPoints(matchedCountry);
        const points = Math.floor(basePoints * currentMultiplier);

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
      // Local storage for guests
      const localEntry = { ...entryData, id: `local-${Date.now()}` };
      const stored = localStorage.getItem(LOCAL_RECORDS_KEY);
      let localRecords = [];
      if (stored) {
        try {
          localRecords = JSON.parse(stored);
        } catch (e) {}
      }
      const updatedRecords = [localEntry, ...localRecords].slice(0, 50);
      localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(updatedRecords));
      setLeaderboard(updatedRecords);
      setFeedback({ text: 'Mission record secured locally.', type: 'success' });
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
    
    if (entry.id?.startsWith('local-') || !user) {
      // Delete from localStorage
      localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(newLeaderboard));
      setFeedback({ text: 'Local record erased.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

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

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingRecordId(null);
      return;
    }
    
    // Optimistic update
    const previousLeaderboard = [...leaderboard];
    const updatedLeaderboard = leaderboard.map(entry => 
      entry.id === id ? { ...entry, name: newName.trim() } : entry
    );
    setLeaderboard(updatedLeaderboard);
    setEditingRecordId(null);

    if (id.startsWith('local-')) {
      localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(updatedLeaderboard));
      setFeedback({ text: 'Local record renamed.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    try {
      await updateDoc(doc(db, 'leaderboard', id), { name: newName.trim() });
      setFeedback({ text: 'Intelligence log updated.', type: 'success' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setLeaderboard(previousLeaderboard);
      handleFirestoreError(error, OperationType.UPDATE, `leaderboard/${id}`);
      setFeedback({ text: 'Update failed: Data transmission error.', type: 'error' });
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
    setRecordTerritorySearch('');
    setExpansionSearch('');
    setCompletionTime(null);
    setFocusedContinent(null);
    setInputValue('');
    setFeedback(null);
    setPlayerName('');
    setIsPaused(false);
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
    <div className="h-[100dvh] bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col relative">
      {/* Header / Mission Control Bar */}
      <header className="h-auto lg:h-16 border-b border-neutral-800 bg-[#121212]/80 backdrop-blur-md flex flex-col lg:flex-row items-center px-4 lg:px-6 py-1 lg:py-0 justify-between z-10 gap-1 lg:gap-0 shrink-0">
        <div className="flex items-center justify-between w-full lg:w-auto gap-3 relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-tight text-white uppercase">GEO_CORE <span className="text-emerald-500">v2.0</span></h1>
                <button 
                  onClick={() => setIsSatelliteView(!isSatelliteView)}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    isSatelliteView 
                      ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                      : "bg-neutral-800 text-neutral-500 hover:text-white"
                  )}
                  title="Satellite View"
                >
                  <Satellite className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsPaused(!isPaused)}
                  disabled={!hasStarted || isFinished}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    isPaused 
                      ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]" 
                      : "bg-neutral-800 text-neutral-500 hover:text-white disabled:opacity-30"
                  )}
                  title={isPaused ? "Resume Mission" : "Pause Mission"}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
              </div>
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
                  onClick={() => setShowLoginModal(true)}
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
        <aside className={cn(
          "w-full border-b lg:border-b-0 lg:border-r border-neutral-800 flex flex-col bg-[#121212]/50 shrink-0 h-[35dvh] lg:h-auto lg:max-h-full z-20 transition-all duration-500",
          isSatelliteView ? "lg:w-64" : "lg:w-80"
        )}>
          {!isSatelliteView && (
            <div className="p-2 lg:p-6 space-y-2 lg:space-y-6 shrink-0">
              <AnimatePresence mode="wait">
                <motion.div key="search" className="space-y-0.5 lg:space-y-2">
                  <label className="text-[8px] lg:text-[10px] text-neutral-500 font-mono uppercase tracking-widest hidden lg:block">Identify Global Territory</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 lg:w-4 lg:h-4 text-neutral-500" />
                      <input 
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isFinished || isPaused}
                        placeholder={isPaused ? "MISSION PAUSED" : "Type country name..."}
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
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="hidden lg:block px-6 pb-6 space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50 space-y-3">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-neutral-500 font-mono uppercase tracking-widest">Landmass Coverage</span>
                      <span className="font-mono text-emerald-500">{guessedIds.size === COUNTRIES.length ? '100' : Math.min(99.99, percentageCovered).toFixed(2)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentageCovered}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-yellow-500/70 font-mono uppercase tracking-widest">Wealth Retrieval</span>
                      <span className="font-mono text-yellow-500">{guessedIds.size === COUNTRIES.length ? '100' : percentageWealthCovered.toFixed(2)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentageWealthCovered}%` }}
                        className="h-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {!isSatelliteView && (
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
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-4 lg:pb-6 custom-scrollbar space-y-4">
               <div>
                 <label className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest block mb-2 lg:mb-4 sticky top-0 bg-[#121212] lg:bg-[#121212] py-1 lg:py-2 z-10">Secured Zones</label>
               <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {[...guessedIds].reverse().map(id => {
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
                        <span className="text-[9px] text-emerald-500 font-mono font-bold">+{getCountryPoints(country!)} pts</span>
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
          {isSatelliteView && !isFinished && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-6">
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-[#121212]/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4"
              >
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input 
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={isPaused}
                      placeholder={isPaused ? "MISSION PAUSED" : "Type country name..."}
                      className="w-full bg-black/50 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 transition-all font-semibold placeholder:text-neutral-700"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-black/50 border border-neutral-800 rounded-lg flex flex-col justify-center min-w-[70px]">
                      <span className="text-[7px] text-neutral-500 uppercase font-mono tracking-widest leading-none mb-1">Guessed</span>
                      <span className="text-[11px] font-bold text-white leading-none">{guessedIds.size} / {COUNTRIES.length}</span>
                    </div>
                    <div className="px-3 py-1.5 bg-black/50 border border-neutral-800 rounded-lg flex flex-col justify-center min-w-[70px]">
                      <span className="text-[7px] text-emerald-500/70 uppercase font-mono tracking-widest leading-none mb-1">Multiplier</span>
                      <span className="text-[11px] font-bold text-emerald-500 leading-none">x{currentMultiplier.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => setIsPaused(!isPaused)}
                      className={cn(
                        "p-1 rounded-lg flex items-center justify-center transition-all",
                        isPaused 
                          ? "bg-yellow-500 text-black" 
                          : "bg-black/50 border border-neutral-800 text-neutral-500 hover:text-white"
                      )}
                      title={isPaused ? "Resume Operation" : "Pause Operation"}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <AnimatePresence>
                  {feedback && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "text-center text-[10px] font-black uppercase tracking-widest",
                        feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {feedback.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
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
                              {isAdmin ? 'Global Intelligence Access Active' : user ? 'Personal Records Sync Active' : 'Local Temporary Intelligence Only'}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setShowRecordsView(false);
                            setRecordTerritorySearch('');
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
                          onClick={() => {
                            setSelectedRecordIndex(i);
                            setRecordTerritorySearch('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setSelectedRecordIndex(i);
                              setRecordTerritorySearch('');
                            }
                          }}
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
                              {(entry.userId === user?.uid || (!user && entry.id?.startsWith('local-'))) && (
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
                            <div className="text-left flex-1 min-w-0">
                              {editingRecordId === entry.id ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRename(entry.id, editingName);
                                      if (e.key === 'Escape') setEditingRecordId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-black/50 border border-emerald-500/50 rounded px-2 py-0.5 text-xs font-bold text-white outline-none w-full uppercase"
                                  />
                                  <div className="flex items-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRename(entry.id, editingName);
                                      }}
                                      className="p-1 hover:text-emerald-500 text-emerald-600 transition-colors"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingRecordId(null);
                                      }}
                                      className="p-1 hover:text-red-500 text-red-600 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group/name">
                                  <h4 className={cn(
                                    "text-sm font-black uppercase tracking-tighter truncate",
                                    selectedRecordIndex === i ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"
                                  )}>
                                    {entry.name}
                                  </h4>
                                  {(entry.userId === user?.uid || (!user && entry.id?.startsWith('local-'))) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingRecordId(entry.id);
                                        setEditingName(entry.name);
                                      }}
                                      className="opacity-0 group-hover/name:opacity-100 p-1 text-neutral-500 hover:text-emerald-500 transition-all shrink-0"
                                      title="Rename Mission"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                  {isAdmin && entry.userEmail && (
                                    <span className="text-[8px] font-mono text-neutral-600 lowercase opacity-60 truncate">[{entry.userEmail}]</span>
                                  )}
                                </div>
                              )}
                              <span className="text-[9px] text-neutral-600 font-mono uppercase block truncate">
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
                               highlightedId={recordTerritorySearch ? (
                                 COUNTRIES.find(c => 
                                   c.name.toLowerCase().includes(recordTerritorySearch.toLowerCase()) || 
                                   c.aliases.some(a => a.toLowerCase().includes(recordTerritorySearch.toLowerCase()))
                                 )?.id || null
                               ) : null}
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
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500" />
                                    <input 
                                      type="text"
                                      placeholder="Identify Territory..."
                                      value={recordTerritorySearch}
                                      onChange={(e) => setRecordTerritorySearch(e.target.value)}
                                      className="w-full bg-black/50 border border-neutral-800 rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-mono text-white placeholder:text-neutral-700 focus:border-emerald-500/50 outline-none transition-all uppercase"
                                    />
                                    {recordTerritorySearch && (
                                      <div className="absolute top-full left-0 w-full mt-1 bg-black border border-neutral-800 rounded-lg p-2 z-20 shadow-2xl">
                                        {(() => {
                                          const term = recordTerritorySearch.toLowerCase();
                                          const match = COUNTRIES.find(c => 
                                            c.name.toLowerCase().includes(term) || 
                                            c.aliases.some(a => a.toLowerCase().includes(term))
                                          );
                                          
                                          if (!match) return <div className="text-[8px] text-neutral-600 font-mono uppercase">Unrecognized Sector</div>;
                                          
                                          const isSecured = leaderboard[selectedRecordIndex].guessedIds?.includes(match.id);
                                          
                                          return (
                                            <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] font-black text-white truncate uppercase">{match.name}</span>
                                                <span className={isSecured ? "text-emerald-500 text-[8px] font-mono font-bold" : "text-red-500 text-[8px] font-mono font-bold"}>
                                                  {isSecured ? "SECURED" : "MISSING"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <img 
                                                  src={`https://flagcdn.com/w20/${match.code.toLowerCase()}.png`} 
                                                  className="w-4 h-2.5 rounded-sm object-cover border border-white/10"
                                                  alt="" 
                                                />
                                                <span className="text-[8px] text-neutral-500 font-mono">Area: {(match.area / 1000).toLocaleString()}K KM²</span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>

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
                        onClick={() => setShowLoginModal(true)}
                        className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black uppercase tracking-widest transition-all hover:bg-emerald-400 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-5 h-5" />
                        Sign In to Record
                      </button>
                      <button 
                        onClick={saveScoreAndShowResults}
                        className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-emerald-500 hover:text-black active:scale-95"
                      >
                        Store Guest Record locally
                      </button>
                      <button 
                        onClick={() => {
                          setShowNamePrompt(false);
                          setShowExpandedDetail(true);
                        }}
                        className="w-full py-2 text-neutral-500 hover:text-neutral-300 text-[8px] font-mono uppercase tracking-widest transition-colors"
                      >
                        Exit without recording
                      </button>
                    </div>
                  )}
                  
                  {user && (
                    <button 
                      onClick={() => {
                        setShowNamePrompt(false);
                        setShowExpandedDetail(true);
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
                    
                    <div className="flex flex-col gap-6">
                      {/* Map: Now Full Width */}
                      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden relative h-[450px] shadow-inner w-full">
                        {focusedContinent ? (
                          <div className="absolute inset-0 flex flex-col">
                              <div className="p-3 bg-black/40 border-b border-neutral-800 flex justify-between items-center backdrop-blur-sm z-10">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full animate-pulse", CONTINENT_STATS[focusedContinent as keyof typeof CONTINENT_STATS]?.color.replace('text-', 'bg-') || "bg-emerald-500")} />
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
                                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 w-48">
                                  <div className="relative group">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500 group-hover:text-emerald-500 transition-colors" />
                                    <input 
                                      type="text"
                                      placeholder="Track Sector..."
                                      value={expansionSearch}
                                      onChange={(e) => setExpansionSearch(e.target.value)}
                                      className="w-full bg-[#121212]/90 backdrop-blur-md border border-neutral-800 rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-mono text-white placeholder:text-neutral-700 focus:border-emerald-500/50 outline-none transition-all uppercase shadow-2xl"
                                    />
                                    {expansionSearch && (
                                      <div className="absolute top-full left-0 w-full mt-1 bg-black border border-neutral-800 rounded-lg p-2 z-20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                                        {(() => {
                                          const term = expansionSearch.toLowerCase();
                                          const match = COUNTRIES.find(c => 
                                            c.name.toLowerCase().includes(term) || 
                                            c.aliases.some(a => a.toLowerCase().includes(term))
                                          );
                                          
                                          if (!match) return <div className="text-[8px] text-neutral-600 font-mono uppercase">Unknown sector</div>;
                                          
                                          const isSecured = guessedIds.has(match.id);
                                          
                                          return (
                                            <div 
                                              className="flex flex-col gap-1.5 cursor-pointer"
                                              onClick={() => {
                                                setSelectedExpandedCountryId(match.id);
                                                setExpansionSearch('');
                                              }}
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] font-black text-white truncate uppercase">{match.name}</span>
                                                <span className={isSecured ? "text-emerald-500 text-[8px] font-mono font-bold" : "text-red-500 text-[8px] font-mono font-bold"}>
                                                  {isSecured ? "SECURED" : "MISSING"}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <img 
                                                  src={`https://flagcdn.com/w20/${match.code.toLowerCase()}.png`} 
                                                  className="w-3 h-2 rounded-xs object-cover border border-white/10"
                                                  alt="" 
                                                />
                                                <span className="text-[8px] text-neutral-500 font-mono">CODE: {match.code}</span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <WorldMap 
                                  guessedIds={guessedIds} 
                                  highlightedId={expansionSearch ? (
                                    COUNTRIES.find(c => 
                                      c.name.toLowerCase().includes(expansionSearch.toLowerCase()) || 
                                      c.aliases.some(a => a.toLowerCase().includes(expansionSearch.toLowerCase()))
                                    )?.id || selectedExpandedCountryId
                                  ) : selectedExpandedCountryId} 
                                  onCountryClick={setSelectedExpandedCountryId}
                                  isFinished={true} 
                                  focusedContinent={focusedContinent === "GLOBAL" ? null : focusedContinent}
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
                                  Select a continental sector below to deploy detailed tactical retrieval reports.
                                </p>
                            </div>
                          </div>
                        )}
                                            {/* Detailed Stats & Reports Row */}
                        <AnimatePresence mode="wait">
                          {focusedContinent && (
                            <motion.div
                              key={focusedContinent}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              className="grid grid-cols-1 lg:grid-cols-4 gap-6"
                            >
                              {/* Summary Stats Box */}
                              <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 flex flex-col justify-center">
                                {(() => {
                                  const isGlobal = focusedContinent === "GLOBAL" || !focusedContinent;
                                  const areaGuessed = isGlobal ? Array.from(guessedIds).reduce((acc: number, id) => acc + (COUNTRIES.find(c => c.id === id)?.area || 0), 0) : continentStats[focusedContinent].areaGuessed;
                                  const areaTotal = isGlobal ? totalPossibleArea : (continentTotals[focusedContinent]?.area || 1);
                                  const gdpGuessed = isGlobal ? Array.from(guessedIds).reduce((acc: number, id) => acc + (COUNTRIES.find(c => c.id === id)?.gdp || 0), 0) : continentStats[focusedContinent].gdpGuessed;
                                  const gdpTotal = isGlobal ? totalPossibleGdp : (continentTotals[focusedContinent]?.gdp || 0);
                                  
                                  const areaPercent = isGlobal 
                                    ? (guessedIds.size === COUNTRIES.length ? 100 : Math.min(99.9, Math.round((areaGuessed / areaTotal) * 100)))
                                    : (guessedIds.size === COUNTRIES.length ? Math.round((areaGuessed / areaTotal) * 100) : Math.min(99.9, Math.round((areaGuessed / areaTotal) * 100)));
                                  const gdpPercent = isGlobal 
                                    ? (guessedIds.size === COUNTRIES.length ? 100 : Math.min(99.9, gdpTotal > 0 ? Math.round((gdpGuessed / gdpTotal) * 100) : 0))
                                    : (guessedIds.size === COUNTRIES.length ? (gdpTotal > 0 ? Math.round((gdpGuessed / gdpTotal) * 100) : 0) : Math.min(99.9, gdpTotal > 0 ? Math.round((gdpGuessed / gdpTotal) * 100) : 0));

                                  return (
                                    <>
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Territory Secured</span>
                                            <span className="text-xl font-black text-white font-mono">{areaPercent}%</span>
                                          </div>
                                          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${areaPercent}%` }}
                                              className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-emerald-500 font-bold uppercase tracking-widest">Economic Control</span>
                                            <span className="text-xl font-black text-emerald-500 font-mono">{gdpPercent}%</span>
                                          </div>
                                          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${gdpPercent}%` }}
                                              className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="pt-6 border-t border-neutral-800 grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <span className="text-[8px] text-neutral-600 font-mono uppercase block">Landmass</span>
                                          <span className="text-sm text-neutral-300 font-bold font-mono">{(areaGuessed / 1000).toLocaleString()}K KM²</span>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-[8px] text-neutral-600 font-mono uppercase block">GDP Output</span>
                                          <span className="text-sm text-emerald-500 font-bold font-mono">${(gdpGuessed / 1000).toFixed(1)}B</span>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              {/* Identification Reports */}
                              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
                                <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden font-mono">
                                  <div className="px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Secured Territories ({(focusedContinent === "GLOBAL" || !focusedContinent) ? guessedIds.size : continentStats[focusedContinent]?.guessedList.length || 0})
                                    </span>
                                    <button
                                      onClick={() => setExpansionSort(expansionSort === 'alphabet' ? 'wealth' : 'alphabet')}
                                      className="p-1 hover:bg-emerald-500/10 rounded transition-all group flex items-center gap-2"
                                      title={expansionSort === 'alphabet' ? 'Sort by Wealth' : 'Sort Alphabetically'}
                                    >
                                      <span className="text-[8px] font-mono text-neutral-500 group-hover:text-emerald-500 uppercase">{expansionSort === 'alphabet' ? 'A-Z' : 'Wealth'}</span>
                                      <ListFilter className={cn("w-3 h-3", expansionSort === 'alphabet' ? "text-neutral-500" : "text-emerald-500")} />
                                    </button>
                                  </div>
                                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-1.5">
                                    {((focusedContinent === "GLOBAL" || !focusedContinent) 
                                      ? Array.from(guessedIds).map(id => COUNTRIES.find(c => c.id === id)!) 
                                      : (continentStats[focusedContinent]?.guessedList || []))
                                      .sort((a, b) => {
                                        if (expansionSort === 'alphabet') return a.name.localeCompare(b.name);
                                        return (b.gdp || 0) - (a.gdp || 0);
                                      })
                                      .map(c => (
                                      <div key={c.id} title={c.name} className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-200/80 flex items-center gap-3 group hover:bg-emerald-500/10 transition-colors">
                                        <img 
                                          src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} 
                                          className="w-5 h-3.5 rounded-sm object-cover border border-white/10"
                                          alt="" 
                                        />
                                        <span className="truncate flex-1 font-bold">{c.name}</span>
                                        <span className="text-[9px] opacity-50 font-mono">${Math.floor(c.gdp).toLocaleString()}M</span>
                                      </div>
                                    ))}
                                    {((focusedContinent === "GLOBAL" || !focusedContinent) ? guessedIds.size === 0 : continentStats[focusedContinent].guessedList.length === 0) && (
                                      <div className="flex items-center justify-center h-full text-[10px] text-neutral-600 italic">No sectors reclaimed</div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden font-mono text-sm">
                                  <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/20 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                      <XCircle className="w-3 h-3" />
                                      Security Gaps ({(focusedContinent === "GLOBAL" || !focusedContinent) ? (COUNTRIES.length - guessedIds.size) : (continentStats[focusedContinent]?.missedList.length || 0)})
                                    </span>
                                    <button
                                      onClick={() => setExpansionSort(expansionSort === 'alphabet' ? 'wealth' : 'alphabet')}
                                      className="p-1 hover:bg-rose-500/10 rounded transition-all group flex items-center gap-2"
                                      title={expansionSort === 'alphabet' ? 'Sort by Wealth' : 'Sort Alphabetically'}
                                    >
                                      <span className="text-[8px] font-mono text-neutral-500 group-hover:text-rose-500 uppercase">{expansionSort === 'alphabet' ? 'A-Z' : 'Wealth'}</span>
                                      <ListFilter className={cn("w-3 h-3", expansionSort === 'alphabet' ? "text-neutral-500" : "text-rose-500")} />
                                    </button>
                                  </div>
                                  <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-1.5">
                                    {((focusedContinent === "GLOBAL" || !focusedContinent) 
                                      ? COUNTRIES.filter(c => !guessedIds.has(c.id)) 
                                      : (continentStats[focusedContinent]?.missedList || []))
                                      .sort((a, b) => {
                                        if (expansionSort === 'alphabet') return a.name.localeCompare(b.name);
                                        return (b.gdp || 0) - (a.gdp || 0);
                                      })
                                      .map(c => (
                                      <div key={c.id} title={c.name} className="px-3 py-2 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[11px] text-rose-200/80 flex items-center gap-3 group hover:bg-rose-500/10 transition-colors">
                                        <img 
                                          src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} 
                                          className="w-5 h-3.5 rounded-sm object-cover border border-white/10"
                                          alt="" 
                                        />
                                        <span className="truncate flex-1 font-bold">{c.name}</span>
                                        <span className="text-[9px] opacity-50 font-mono">${Math.floor(c.gdp).toLocaleString()}M</span>
                                      </div>
                                    ))}
                                    {((focusedContinent === "GLOBAL" || !focusedContinent) ? (guessedIds.size === COUNTRIES.length) : (continentStats[focusedContinent].missedList.length === 0)) && (
                                      <div className="flex items-center justify-center h-full text-[10px] text-emerald-500 italic font-black uppercase">100% Global Capture Verified</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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

                  <div className="p-3 rounded-xl bg-[#1a1a1a] border border-neutral-800 space-y-2">
                    <p className="text-white font-bold tracking-[0.2em]">Strategic Shortcuts</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[ENTER] or [SPACE]</span>
                        <span className="text-emerald-500/80">Focus Input</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[CMD / CTRL] + [X]</span>
                        <span className="text-emerald-500/80">Toggle Satellite</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[OPTION] / [ALT]</span>
                        <span className="text-emerald-500/80">Pause / Resume</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-1.5">
                        <span className="text-neutral-500">[ARROWS]</span>
                        <span className="text-emerald-500/80">Pan Map</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[+] / [-]</span>
                        <span className="text-emerald-500/80">Zoom Zoom</span>
                      </div>
                    </div>
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
                       Efficiency: <span className="text-emerald-500">{viewingRecord.guessedIds?.length === COUNTRIES.length ? '100' : Math.min(99, Math.round(((viewingRecord.guessedIds?.length || 0) / COUNTRIES.length) * 100))}%</span>
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
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                  <div className="flex-1 relative bg-[#0a0a0a] border border-neutral-800 rounded-3xl overflow-hidden min-h-[400px]">
                    <WorldMap 
                      guessedIds={new Set(viewingRecord.guessedIds || [])}
                      highlightedId={selectedExpandedCountryId}
                      onCountryClick={setSelectedExpandedCountryId}
                      isFinished={true}
                      focusedContinent={null}
                    />
                    
                    <AnimatePresence>
                      {selectedExpandedCountryId && (
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.95 }}
                          onClick={() => setSelectedExpandedCountryId(null)}
                          className="absolute bottom-6 left-6 right-6 p-6 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl z-20 cursor-pointer hover:bg-neutral-900 transition-colors group/card"
                        >
                          <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <XCircle className="w-4 h-4 text-neutral-500" />
                          </div>
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
                                      <p className="text-[9px] text-neutral-500 font-mono uppercase">Total Area</p>
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

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {(() => {
                      const continents = Object.keys(CONTINENT_STATS);
                      const items = ["All", ...continents];
                      return items.map(cont => {
                        const isAll = cont === 'All';
                        const isActive = isAll ? selectedContinentFilter === null : selectedContinentFilter === cont;
                        const stats = isAll ? null : CONTINENT_STATS[cont as keyof typeof CONTINENT_STATS];
                        return (
                          <button
                            key={cont}
                            onClick={() => setSelectedContinentFilter(isAll ? null : cont)}
                            className={cn(
                              "px-6 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3",
                              isActive
                                ? "bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                : "bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                            )}
                          >
                            <span>{isAll ? 'Global' : (stats?.name || cont)}</span>
                            <span className={cn("text-[9px]", isActive ? "text-black/50" : (stats?.color || "text-emerald-500"))}>
                              {(() => {
                                const gIds = viewingRecord.guessedIds || [];
                                if (isAll) return `${gIds.length}/${COUNTRIES.length}`;
                                const total = COUNTRIES.filter(c => c.continent === cont).length;
                                const guessed = gIds.filter(id => COUNTRIES.find(curr => curr.id === id)?.continent === cont).length;
                                return `${guessed}/${total}`;
                              })()}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="w-96 flex flex-col gap-4 shrink-0 overflow-hidden">
                  <div className="grid grid-cols-1 gap-4 shrink-0">
                    {(() => {
                      const continent = selectedContinentFilter;
                      const isGlobal = !continent;
                      const continentCountries = isGlobal ? COUNTRIES : COUNTRIES.filter(c => c.continent === continent);
                      const recordGuessed = viewingRecord.guessedIds || [];
                      const guessedCountries = continentCountries.filter(c => recordGuessed.includes(c.id));
                      
                      const totalArea = isGlobal ? totalPossibleArea : (continentTotals[continent || ""]?.area || 1);
                      const coveredArea = guessedCountries.reduce((sum, c) => sum + c.area, 0);
                      const areaPercent = (coveredArea / totalArea) * 100;

                      const totalGdp = isGlobal ? totalPossibleGdp : (continentTotals[continent || ""]?.gdp || 1);
                      const coveredGdp = guessedCountries.reduce((sum, c) => sum + (c.gdp || 0), 0);
                      const gdpPercent = (coveredGdp / totalGdp) * 100;

                      return (
                        <>
                          <div className="bg-neutral-900/50 border border-neutral-800/50 p-4 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-neutral-500 tracking-widest">
                              <span>{isGlobal ? "Global" : continent} Secured</span>
                              <span className="text-white">{Math.round(areaPercent)}%</span>
                            </div>
                            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${areaPercent}%` }} className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                            </div>
                            <div className="flex justify-between items-center text-[8px] font-mono text-neutral-600">
                              <span>{(coveredArea/1000).toLocaleString()}K / {(totalArea/1000).toLocaleString()}K KM²</span>
                            </div>
                          </div>
                          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                              <span>Economic Output</span>
                              <span className="text-emerald-500">{Math.round(gdpPercent)}%</span>
                            </div>
                            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${gdpPercent}%` }} className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
                            </div>
                            <div className="flex justify-between items-center text-[8px] font-mono text-emerald-600/60">
                              <span>${(coveredGdp/1000).toFixed(1)}B / ${(totalGdp/1000).toFixed(1)}B</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                    <div className="p-4 bg-emerald-500/5 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                      <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Secured ({(viewingRecord.guessedIds || []).filter(id => !selectedContinentFilter || COUNTRIES.find(c => c.id === id)?.continent === selectedContinentFilter).length})
                      </span>
                      <button
                        onClick={() => setExpansionSort(expansionSort === 'alphabet' ? 'wealth' : 'alphabet')}
                        className="p-1.5 hover:bg-emerald-500/10 rounded-lg transition-all group flex items-center gap-2"
                        title={expansionSort === 'alphabet' ? 'Switch to Wealth Sort' : 'Switch to Alphabetical Sort'}
                      >
                        <span className="text-[8px] font-mono font-bold text-neutral-500 group-hover:text-emerald-500 uppercase">
                          {expansionSort === 'alphabet' ? 'A-Z' : 'Wealth'}
                        </span>
                        <ListFilter className={cn("w-3 h-3 transition-colors", expansionSort === 'alphabet' ? "text-neutral-500 group-hover:text-emerald-500" : "text-emerald-500")} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {(viewingRecord.guessedIds || [])
                        .map(id => COUNTRIES.find(c => c.id === id))
                        .filter((c): c is typeof COUNTRIES[0] => !!c && (!selectedContinentFilter || c.continent === selectedContinentFilter))
                        .sort((a, b) => {
                          if (expansionSort === 'alphabet') return a.name.localeCompare(b.name);
                          return (b.gdp || 0) - (a.gdp || 0);
                        })
                        .map(country => {
                          const id = country.id;
                          const isSelected = selectedExpandedCountryId === id;
                          return (
                            <button 
                              key={id} 
                              onClick={() => setSelectedExpandedCountryId(isSelected ? null : id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-2.5 rounded-xl border text-[10px] font-mono group transition-all",
                                isSelected ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-neutral-900/50 border-neutral-800/50 text-neutral-400 hover:text-emerald-400"
                              )}
                            >
                              <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} className="w-5 h-3.5 rounded-sm object-cover border border-white/10" alt="" />
                              <span className="flex-1 text-left truncate font-bold">{country.name}</span>
                              <span className="text-[8px] opacity-40">${Math.floor((country.gdp || 0)/1000).toLocaleString()}B</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                    <div className="p-4 bg-red-500/5 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                      <span className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                        <XCircle className="w-3 h-3" />
                        Missed ({COUNTRIES.filter(c => !viewingRecord.guessedIds?.includes(c.id) && (!selectedContinentFilter || c.continent === selectedContinentFilter)).length})
                      </span>
                      <button
                        onClick={() => setExpansionSort(expansionSort === 'alphabet' ? 'wealth' : 'alphabet')}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all group flex items-center gap-2"
                        title={expansionSort === 'alphabet' ? 'Switch to Wealth Sort' : 'Switch to Alphabetical Sort'}
                      >
                        <span className="text-[8px] font-mono font-bold text-neutral-500 group-hover:text-red-500 uppercase">
                          {expansionSort === 'alphabet' ? 'A-Z' : 'Wealth'}
                        </span>
                        <ListFilter className={cn("w-3 h-3 transition-colors", expansionSort === 'alphabet' ? "text-neutral-500 group-hover:text-red-500" : "text-red-500")} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {COUNTRIES.filter(c => !viewingRecord.guessedIds?.includes(c.id) && (!selectedContinentFilter || c.continent === selectedContinentFilter))
                        .sort((a, b) => {
                          if (expansionSort === 'alphabet') return a.name.localeCompare(b.name);
                          return (b.gdp || 0) - (a.gdp || 0);
                        })
                        .map(country => {
                          const isSelected = selectedExpandedCountryId === country.id;
                          return (
                            <button 
                              key={country.id} 
                              onClick={() => setSelectedExpandedCountryId(isSelected ? null : country.id)}
                              className={cn(
                                "w-full flex items-center gap-3 p-2.5 rounded-xl border text-[10px] font-mono group transition-all",
                                isSelected ? "bg-red-500/20 border-red-400 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-neutral-900/50 border-neutral-800/50 text-neutral-500 hover:text-red-400"
                              )}
                            >
                              <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} className="w-5 h-3.5 rounded-sm object-cover border border-white/10 opacity-60" alt="" />
                              <span className="flex-1 text-left truncate font-bold">{country.name}</span>
                              <span className="text-[8px] opacity-40">${Math.floor(country.gdp/1000).toLocaleString()}B</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>


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

      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] backdrop-blur-md bg-black/60 flex flex-col items-center justify-center p-6 text-center"
          >
             <motion.div
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               className="space-y-6"
             >
               <div className="space-y-2">
                 <h2 className="text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter italic leading-none">PAUSED</h2>
                 <div className="flex items-center justify-center gap-4">
                   <div className="h-px w-12 bg-emerald-500/50" />
                   <p className="text-emerald-500 font-mono text-[10px] lg:text-xs uppercase tracking-[0.4em] font-bold">Mission in Standby</p>
                   <div className="h-px w-12 bg-emerald-500/50" />
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/10 w-full max-w-lg">
                  <div>
                    <p className="text-neutral-500 font-mono text-[9px] uppercase tracking-widest mb-2">Last Identified</p>
                    {lastGuessedId ? (() => {
                      const country = COUNTRIES.find(c => c.id === lastGuessedId);
                      return (
                        <div className="flex items-center gap-3 justify-center">
                          <img 
                            src={`https://flagcdn.com/w80/${country?.code.toLowerCase()}.png`} 
                            className="h-6 rounded-sm shadow-lg border border-white/10"
                            alt="" 
                          />
                          <p className="text-xl font-bold text-white uppercase tracking-tight">{country?.name}</p>
                        </div>
                      );
                    })() : (
                      <p className="text-lg font-bold text-neutral-600 uppercase">None Detected</p>
                    )}
                  </div>
                  <div>
                    <p className="text-neutral-500 font-mono text-[9px] uppercase tracking-widest mb-2">Current Score</p>
                    <p className="text-3xl font-black text-emerald-500 font-mono leading-none flex items-center justify-center h-6">{score.toLocaleString()}</p>
                  </div>
               </div>

               <div className="flex flex-col items-center justify-center">
                 <button 
                   onClick={() => setIsPaused(false)}
                   className="group relative px-10 py-4 bg-white text-black font-black uppercase text-sm tracking-widest rounded-xl hover:bg-emerald-500 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                 >
                   Resume Operation
                   <div className="absolute -inset-1 rounded-xl bg-white/20 blur-lg group-hover:bg-emerald-500/20 transition-all" />
                 </button>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#121212] border border-white/10 p-8 rounded-[32px] shadow-2xl max-w-sm w-full text-center space-y-8 relative overflow-hidden"
            >
              {/* Accents */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px]" />
              
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-500 border border-emerald-500/20 rotate-3">
                  <LogIn className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">IDENTITY SELECTOR</h3>
                  <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-[0.2em] font-bold">Choose your mission profile</p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    await handleLogin();
                    setShowLoginModal(false);
                  }}
                  className="w-full p-5 bg-white text-black rounded-2xl flex flex-col items-center gap-1 transition-all hover:bg-emerald-500 active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] group border-2 border-transparent hover:border-black/5"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="font-black uppercase tracking-tight text-sm">Cloud Agent (Google)</span>
                  </div>
                  <span className="text-[9px] opacity-60 font-mono font-bold tracking-widest">SECURE DATA SYNCHRONIZATION</span>
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest font-black">OR</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <button 
                  onClick={() => {
                    setIsGuest(true);
                    setShowLoginModal(false);
                  }}
                  className="w-full p-4 bg-neutral-900 text-neutral-400 rounded-2xl border border-neutral-800 flex flex-col items-center gap-1 transition-all hover:bg-neutral-800 hover:text-white active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 transition-transform group-hover:rotate-12" />
                    <span className="font-black uppercase tracking-tight text-sm">Guest Operative</span>
                  </div>
                  <span className="text-[9px] opacity-40 font-mono font-bold tracking-widest">LOCAL TEMPORARY STORAGE</span>
                </button>
                
                <button 
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-2 text-neutral-600 hover:text-neutral-400 transition-colors font-black uppercase tracking-widest text-[9px] mt-2"
                >
                  Cancel Authorization
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
