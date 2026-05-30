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
  Globe2,
  TrendingUp,
  LayoutDashboard,
  Trash2,
  LogIn,
  LogOut,
  HelpCircle,
  Satellite,
  Pause,
  Play,
  ListFilter,
  Brain,
  EyeOff,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Flag,
  Shuffle,
  Target,
  Keyboard,
  ExternalLink,
  Palette,
  Sprout,
  Pickaxe,
  Zap,
  Cpu,
  Users,
  Shield,
  Terminal,
  Gauge,
  Activity,
  Flame
} from 'lucide-react';
import { COUNTRIES, TOTAL_LAND_AREA, TOTAL_GLOBAL_GDP, CONTINENT_STATS } from './data/countries';
import { getCountryNeighbors, getSupplyChainNeighbors, findSupplyChainPath } from './data/borders';
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

import natoLogo from './assets/images/nato_logo_1779266800257.png';
import auLogo from './assets/images/african_union_logo_1779266821461.png';
import opecLogo from './assets/images/opec_logo_1779266769152.png';
import euLogo from './assets/images/european_union_logo_1779266840196.png';
import bricsLogo from './assets/images/brics_logo_1779266857465.png';
import oasLogo from './assets/images/oas_logo_1779266871468.png';
import arabLeagueLogo from './assets/images/arab_league_logo_1779266887517.png';
import unLogo from './assets/images/un_logo_1779269188592.png';
import g7Logo from './assets/images/g7_logo_1779269208379.png';
import scoLogo from './assets/images/sco_logo_1779269228129.png';
import aseanLogo from './assets/images/asean_logo_1779270136171.png';
import cstoLogo from './assets/images/csto_logo_1779271659765.png';
import aesLogo from './assets/images/aes_logo_1779271678816.png';
import mercosurLogo from './assets/images/mercosur_logo_1779271693880.png';
import g20Logo from './assets/images/g20_logo_1779271707249.png';
import gccLogo from './assets/images/gcc_logo_1779271723989.png';
import commonwealthLogo from './assets/images/commonwealth_logo_1779271739639.png';

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

const ALLIANCES_DATA = [
  {
    id: "UN",
    name: "UN",
    fullName: "United Nations",
    badgeColor: "bg-blue-950/40 border-blue-500/30 hover:bg-blue-900/30",
    textColor: "text-blue-400",
    logoUrl: unLogo,
    description: "An international organization founded in 1945. It is currently made up of 193 Member States.",
    matches: (country: any) => true,
  },
  {
    id: "EU",
    name: "EU",
    fullName: "European Union",
    badgeColor: "bg-indigo-950/40 border-indigo-500/30 hover:bg-indigo-900/30",
    textColor: "text-indigo-300",
    logoUrl: euLogo,
    description: "A unique economic and political union between 27 European countries.",
    matches: (country: any) => ["be", "bg", "cz", "dk", "de", "ee", "ie", "gr", "es", "fr", "hr", "it", "cy", "lv", "lt", "lu", "hu", "mt", "nl", "at", "pl", "pt", "ro", "si", "sk", "fi", "se"].includes(country.code.toLowerCase()),
  },
  {
    id: "NATO",
    name: "NATO",
    fullName: "North Atlantic Treaty",
    badgeColor: "bg-sky-950/40 border-sky-500/35 hover:bg-sky-900/40",
    textColor: "text-sky-300",
    logoUrl: natoLogo,
    description: "A military alliance established by the North Atlantic Treaty in 1949.",
    matches: (country: any) => ["us", "ca", "gb", "fr", "de", "it", "es", "nl", "be", "lu", "dk", "no", "is", "pt", "gr", "tr", "pl", "hu", "cz", "ee", "lv", "lt", "sk", "si", "bg", "ro", "al", "hr", "me", "mk", "fi", "se"].includes(country.code.toLowerCase()),
  },
  {
    id: "G7",
    name: "G7",
    fullName: "Group of Seven",
    badgeColor: "bg-zinc-800/50 border-zinc-700/40 hover:bg-zinc-700/30",
    textColor: "text-slate-300",
    logoUrl: g7Logo,
    description: "An informal forum of seven of the world's advanced economies.",
    matches: (country: any) => ["us", "jp", "de", "fr", "gb", "it", "ca"].includes(country.code.toLowerCase()),
  },
  {
    id: "ASEAN",
    name: "ASEAN",
    fullName: "SE Asian Nations",
    badgeColor: "bg-rose-950/40 border-rose-500/30 hover:bg-rose-900/30",
    textColor: "text-rose-300",
    logoUrl: aseanLogo,
    description: "A political and economic union of 10 member states in Southeast Asia.",
    matches: (country: any) => ["id", "my", "ph", "sg", "th", "vn", "kh", "la", "mm", "bn"].includes(country.code.toLowerCase()),
  },
  {
    id: "AU",
    name: "AU",
    fullName: "African Union",
    badgeColor: "bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-900/30",
    textColor: "text-emerald-300",
    logoUrl: auLogo,
    description: "A continental union consisting of fifty-five member states located on the continent of Africa.",
    matches: (country: any) => country.continent === "Africa",
  },
  {
    id: "BRICS",
    name: "BRICS",
    fullName: "BRICS Alliance",
    badgeColor: "bg-purple-950/40 border-purple-500/30 hover:bg-purple-900/30",
    textColor: "text-purple-300",
    logoUrl: bricsLogo,
    description: "An alliance of major emerging national economies, forming an economic and political bloc.",
    matches: (country: any) => ["br", "ru", "in", "cn", "za", "eg", "et", "ir", "ae"].includes(country.code.toLowerCase()),
  },
  {
    id: "SCO",
    name: "SCO",
    fullName: "Shanghai Cooperation",
    badgeColor: "bg-teal-950/40 border-teal-500/25 hover:bg-teal-900/30",
    textColor: "text-teal-400",
    logoUrl: scoLogo,
    description: "A Eurasian political, economic, international security and defense organization.",
    matches: (country: any) => ["cn", "ru", "kz", "kg", "tj", "uz", "in", "pk", "ir", "by"].includes(country.code.toLowerCase()),
  },
  {
    id: "OPEC",
    name: "OPEC",
    fullName: "Petroleum Exporters",
    badgeColor: "bg-amber-950/40 border-amber-500/30 hover:bg-amber-900/30",
    textColor: "text-amber-300",
    logoUrl: opecLogo,
    description: "An organization of 12 co-operating oil-exporting nations.",
    matches: (country: any) => ["sa", "iq", "ir", "dz", "ao", "ga", "gq", "kw", "ly", "ng", "cg", "ve"].includes(country.code.toLowerCase()),
  },
  {
    id: "Arab League",
    name: "Arab League",
    fullName: "League of Arab States",
    badgeColor: "bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-900/30",
    textColor: "text-emerald-400",
    logoUrl: arabLeagueLogo,
    description: "A regional organization of Arab states in Africa and Western Asia.",
    matches: (country: any) => ["eg", "sa", "ae", "jo", "lb", "sy", "iq", "ir", "kw", "qa", "om", "ye", "ly", "dz", "ma", "tn", "sd", "so", "dj", "mr", "bh"].includes(country.code.toLowerCase()),
  },
  {
    id: "OAS",
    name: "OAS",
    fullName: "American States",
    badgeColor: "bg-blue-950/30 border-blue-500/20 hover:bg-blue-900/30",
    textColor: "text-blue-300",
    logoUrl: oasLogo,
    description: "An international organization for regional solidarity and cooperation among member states in the Americas.",
    matches: (country: any) => country.continent === "North America" || country.continent === "South America",
  },
  {
    id: "MERCOSUR",
    name: "MERCOSUR",
    fullName: "Southern Common Market",
    badgeColor: "bg-teal-950/40 border-teal-500/30 hover:bg-teal-900/30",
    textColor: "text-teal-300",
    logoUrl: mercosurLogo,
    description: "A South American trade bloc established by the Treaty of Asunción in 1991.",
    matches: (country: any) => ["ar", "br", "py", "uy", "ve", "bo"].includes(country.code.toLowerCase()),
  },
  {
    id: "CSTO",
    name: "CSTO",
    fullName: "Collective Security Treaty Org.",
    badgeColor: "bg-blue-950/40 border-blue-500/30 hover:bg-blue-900/40",
    textColor: "text-blue-300",
    logoUrl: cstoLogo,
    description: "An Eurasian intergovernmental military alliance consisting of select post-Soviet states.",
    matches: (country: any) => ["am", "by", "kz", "kg", "ru", "tj"].includes(country.code.toLowerCase()),
  },
  {
    id: "AES",
    name: "AES",
    fullName: "Alliance of Sahel States",
    badgeColor: "bg-emerald-950/40 border-emerald-500/25 hover:bg-emerald-900/30",
    textColor: "text-emerald-300",
    logoUrl: aesLogo,
    description: "A mutual defense pact between Mali, Niger, and Burkina Faso created in September 2023.",
    matches: (country: any) => ["ml", "bf", "ne"].includes(country.code.toLowerCase()),
  },
  {
    id: "G20",
    name: "G20",
    fullName: "Group of Twenty",
    badgeColor: "bg-slate-900/50 border-slate-700/40 hover:bg-slate-800/40",
    textColor: "text-slate-200",
    logoUrl: g20Logo,
    description: "A premier intergovernmental forum comprising 19 sovereign countries and regional unions.",
    matches: (country: any) => ["ar", "au", "br", "ca", "cn", "fr", "de", "in", "id", "it", "jp", "mx", "ru", "sa", "za", "kr", "tr", "gb", "us"].includes(country.code.toLowerCase()),
  },
  {
    id: "GCC",
    name: "GCC",
    fullName: "Gulf Cooperation Council",
    badgeColor: "bg-amber-950/40 border-amber-500/20 hover:bg-amber-900/30",
    textColor: "text-amber-400",
    logoUrl: gccLogo,
    description: "A regional, intergovernmental political and economic union of Arab states in the Persian Gulf.",
    matches: (country: any) => ["bh", "kw", "om", "qa", "sa", "ae"].includes(country.code.toLowerCase()),
  },
  {
    id: "Commonwealth",
    name: "Commonwealth",
    fullName: "Commonwealth of Nations",
    badgeColor: "bg-sky-950/40 border-sky-500/30 hover:bg-sky-900/30",
    textColor: "text-sky-300",
    logoUrl: commonwealthLogo,
    description: "A political association of 56 member states, mostly former territories of the British Empire.",
    matches: (country: any) => ["gb", "ca", "au", "nz", "in", "pk", "bd", "lk", "my", "sg", "za", "ng", "gh", "ke", "bb", "bs", "bn", "cy", "mt", "mz", "rw", "tz", "ug", "zm", "zw", "fj", "gd", "ag", "dm", "lc"].includes(country.code.toLowerCase()),
  }
];

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
  const [lastGuessedId, setLastGuessedId] = useState<string | null>(null);
  const [mostRecentGuessedId, setMostRecentGuessedId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<'zen' | 'challenge'>('zen');
  const [gameType, setGameType] = useState<'typing' | 'flag' | 'highlight'>('typing');
  const [typerMode, setTyperMode] = useState<'default' | 'rogue' | 'supply_chain'>('default');
  const [isPaused, setIsPaused] = useState(false);
  
  // Rogue model state
  const [infectedIds, setInfectedIds] = useState<Set<string>>(new Set());
  const [shieldedIds, setShieldedIds] = useState<Set<string>>(new Set());
  const [rogueEmpCharge, setRogueEmpCharge] = useState<number>(0);
  const [isRogueShaking, setIsRogueShaking] = useState<boolean>(false);
  const [rogueLogs, setRogueLogs] = useState<{ id: string; text: string; type: 'warn' | 'success' | 'info' }[]>([]);
  const [immuneCountryIds, setImmuneCountryIds] = useState<Set<string>>(new Set());
  const [countrySaveCounts, setCountrySaveCounts] = useState<Record<string, number>>({});
  const [continentBreaks, setContinentBreaks] = useState<Record<string, number>>({});
  const [consecutiveContinent, setConsecutiveContinent] = useState<string | null>(null);
  const [consecutiveContinentCount, setConsecutiveContinentCount] = useState<number>(0);
  const [lastSecuredCountryId, setLastSecuredCountryId] = useState<string | null>(null);
  
  // Supply Chain state
  const [supplyChainStartId, setSupplyChainStartId] = useState<string | null>(null);
  const [supplyChainEndId, setSupplyChainEndId] = useState<string | null>(null);
  const [supplyChainActiveId, setSupplyChainActiveId] = useState<string | null>(null);
  const [supplyChainPathIds, setSupplyChainPathIds] = useState<Set<string>>(new Set());
  const [supplyChainPathList, setSupplyChainPathList] = useState<string[]>([]);
  const [supplyChainDecayIds, setSupplyChainDecayIds] = useState<Set<string>>(new Set());
  const [supplyChainChokeIds, setSupplyChainChokeIds] = useState<Set<string>>(new Set());
  const [supplyChainCrisisMessage, setSupplyChainCrisisMessage] = useState<string | null>(null);
  const [supplyChainOverlayMode, setSupplyChainOverlayMode] = useState<'optimal' | 'user'>('user');
  const [supplyDifficulty, setSupplyDifficulty] = useState<number>(3); // Levels: 1 (Easy), 2 (Normal), 3 (Hard), 4 (Expert), 5 (Insane)
  const [supplyOverrideCharges, setSupplyOverrideCharges] = useState<number>(1); // Active ability: Clears decay/chokes
  const [supplyConsecutiveLinks, setSupplyConsecutiveLinks] = useState<number>(0); // Earning override charge combo tracker
  const [supplyRadarScans, setSupplyRadarScans] = useState<number>(2); // Waypoint identifier tools
  const [supplyDisruptors, setSupplyDisruptors] = useState<number>(1); // Airlock release grid disruption tools
  const [selectedSupplyPreset, setSelectedSupplyPreset] = useState<string>('random_dynamic');

  // Synchronous tracker for supply chain state to prevent race-conditions/state-batching errors
  const supplyChainRef = useRef<{
    startId: string | null;
    endId: string | null;
    activeId: string | null;
    pathIds: Set<string>;
    pathList: string[];
    decayIds: Set<string>;
    chokeIds: Set<string>;
  }>({
    startId: null,
    endId: null,
    activeId: null,
    pathIds: new Set(),
    pathList: [],
    decayIds: new Set(),
    chokeIds: new Set()
  });

  const lastGuessTimeRef = useRef<number>(0);

  const SUPPLY_CHAIN_L_CONFIGS: Record<number, {
    level: number;
    name: string;
    badge: string;
    decayInterval: number;
    crisisInterval: number;
    description: string;
    scoreMultiplier: number;
    maxChokes: number;
    color: string;
  }> = {
    1: {
      level: 1,
      name: "Toughest Route",
      badge: "TOUGHEST",
      decayInterval: 2500,
      crisisInterval: 6000,
      description: "Severe choke points and rapid route decay.",
      scoreMultiplier: 2.5,
      maxChokes: 3,
      color: "from-red-600 to-purple-600 text-rose-500 hover:bg-rose-500/5 hover:border-rose-500/60"
    },
    2: {
      level: 2,
      name: "Tactical Route",
      badge: "NORMAL",
      decayInterval: 6500,
      crisisInterval: 14000,
      description: "Moderate threat level with standard routing times.",
      scoreMultiplier: 1.5,
      maxChokes: 2,
      color: "from-amber-500 to-orange-600 text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/60"
    },
    3: {
      level: 3,
      name: "Easiest Route",
      badge: "EASIEST",
      decayInterval: 13000,
      crisisInterval: 28000,
      description: "Relaxed pace with slowly decaying supply sectors.",
      scoreMultiplier: 1.0,
      maxChokes: 1,
      color: "from-emerald-500 to-green-600 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/60"
    }
  };

  const SUPPLY_DIFFICULTY_CONFIGS: Record<number, {
    level: number;
    name: string;
    badge: string;
    decayInterval: number;
    crisisInterval: number;
    description: string;
    scoreMultiplier: number;
    maxChokes: number;
    color: string;
  }> = {
    1: {
      level: 1,
      name: "Black Swan Shock",
      badge: "INSANE",
      decayInterval: 2200,
      crisisInterval: 4500,
      description: "Near-instant decay and chaotic multi-blockades. Pure, frantic geographic reflexes.",
      scoreMultiplier: 3.5,
      maxChokes: 4,
      color: "from-purple-600 to-red-600 text-purple-400"
    },
    2: {
      level: 2,
      name: "Sovereign Embargo",
      badge: "EXPERT",
      decayInterval: 4000,
      crisisInterval: 8000,
      description: "Extreme decay speeds. Blockades trigger rapidly, threatening complete chain collapse.",
      scoreMultiplier: 2.2,
      maxChokes: 3,
      color: "from-rose-500 to-pink-600 text-rose-400"
    },
    3: {
      level: 3,
      name: "Danger Zone",
      badge: "HARD",
      decayInterval: 6000,
      crisisInterval: 12000,
      description: "Fast-moving decay and frequent air embargo blockades requiring detours.",
      scoreMultiplier: 1.5,
      maxChokes: 2,
      color: "from-amber-500 to-orange-600 text-amber-400"
    },
    4: {
      level: 4,
      name: "Strategic Passage",
      badge: "NORMAL",
      decayInterval: 8500,
      crisisInterval: 18000,
      description: "Standard flow with moderate decay rate and basic airspace turbulence.",
      scoreMultiplier: 1.0,
      maxChokes: 1,
      color: "from-cyan-500 to-blue-600 text-cyan-400"
    },
    5: {
      level: 5,
      name: "Safe Passage",
      badge: "EASY",
      decayInterval: 12000,
      crisisInterval: 25000,
      description: "Relaxed pace with very slow decay. Airspace blockades are disabled.",
      scoreMultiplier: 0.7,
      maxChokes: 0,
      color: "from-emerald-500 to-green-600 text-emerald-400"
    }
  };

  const ensureNeighborsAreOperational = (currentActiveId: string | null, activeChokeId: string | null) => {
    if (!currentActiveId) return;
    
    // Get all neighboring countries
    const neighbors = getSupplyChainNeighbors(currentActiveId);
    
    const { decayIds, chokeIds } = supplyChainRef.current;
    
    // Create copies of the state
    const nextDecay = new Set(decayIds);
    const nextChoke = new Set(chokeIds);
    
    let decayChanged = false;
    let chokeChanged = false;
    
    // Clear all neighbors of currentActiveId (except activeChokeId) from choke points and decay points
    for (const neighbor of neighbors) {
      if (neighbor === activeChokeId) {
        if (!nextChoke.has(neighbor)) {
          nextChoke.add(neighbor);
          chokeChanged = true;
        }
      } else {
        if (nextChoke.has(neighbor)) {
          nextChoke.delete(neighbor);
          chokeChanged = true;
        }
      }
      
      // Ensure other neighbors are not in decayIds so they remain operational
      if (nextDecay.has(neighbor)) {
        nextDecay.delete(neighbor);
        decayChanged = true;
      }
    }
    
    // Make sure the activeChokeId is the ONLY chokeId in the whole game to prevent stale blockades
    if (activeChokeId) {
      if (nextChoke.size !== 1 || !nextChoke.has(activeChokeId)) {
        nextChoke.clear();
        nextChoke.add(activeChokeId);
        chokeChanged = true;
      }
    } else {
      if (nextChoke.size > 0) {
        nextChoke.clear();
        chokeChanged = true;
      }
    }
    
    if (decayChanged) {
      supplyChainRef.current.decayIds = nextDecay;
      setSupplyChainDecayIds(nextDecay);
    }
    if (chokeChanged) {
      supplyChainRef.current.chokeIds = nextChoke;
      setSupplyChainChokeIds(nextChoke);
    }
  };

  const syncSupplyChainStart = (id: string | null) => {
    supplyChainRef.current.startId = id;
    setSupplyChainStartId(id);
  };
  const syncSupplyChainEnd = (id: string | null) => {
    supplyChainRef.current.endId = id;
    setSupplyChainEndId(id);
  };
  const syncSupplyChainActive = (id: string | null) => {
    supplyChainRef.current.activeId = id;
    setSupplyChainActiveId(id);
    if (id) {
      // Find what choke point represents the current active blockade (if any)
      const currentChokes = Array.from(supplyChainRef.current.chokeIds) as string[];
      const neighbors = getSupplyChainNeighbors(id);
      const activeChokeId = (currentChokes.find(cId => neighbors.includes(cId)) as string) || null;
      ensureNeighborsAreOperational(id, activeChokeId);
    }
  };
  const syncSupplyChainPathIds = (ids: Set<string>) => {
    supplyChainRef.current.pathIds = ids;
    setSupplyChainPathIds(ids);
  };
  const syncSupplyChainPathList = (list: string[]) => {
    supplyChainRef.current.pathList = list;
    setSupplyChainPathList(list);
  };
  const syncSupplyChainDecayIds = (ids: Set<string>) => {
    supplyChainRef.current.decayIds = ids;
    setSupplyChainDecayIds(ids);
  };
  const syncSupplyChainChokeIds = (ids: Set<string>) => {
    supplyChainRef.current.chokeIds = ids;
    setSupplyChainChokeIds(ids);
  };

  const getDynamicSupplyChainPreset = (): { start: string; end: string; label: string } => {
    // Isolated island and micro-island countries to exclude to avoid fragmented transoceanic supply chain paths
    const EXCLUDED_ISLAND_IDS = new Set<string>([
      // Caribbean Island Nations
      "028", // Antigua and Barbuda
      "044", // Bahamas
      "052", // Barbados
      "192", // Cuba
      "212", // Dominica
      "214", // Dominican Republic
      "308", // Grenada
      "332", // Haiti
      "388", // Jamaica
      "659", // Saint Kitts and Nevis
      "662", // Saint Lucia
      "670", // Saint Vincent and the Grenadines
      "780", // Trinidad and Tobago

      // Oceanic Small Islands (Keeping Australia "036", New Zealand "554", Papua New Guinea "598")
      "242", // Fiji
      "296", // Kiribati
      "584", // Marshall Islands
      "583", // Micronesia
      "520", // Nauru
      "585", // Palau
      "882", // Samoa
      "090", // Solomon Islands
      "776", // Tonga
      "798", // Tuvalu
      "548", // Vanuatu

      // Minor isolated island nations from other regions
      "132", // Cabo Verde
      "462", // Maldives
      "480", // Mauritius
      "690", // Seychelles
    ]);

    const eligible = COUNTRIES.filter(c => 
      getSupplyChainNeighbors(c.id).length > 0 && 
      !EXCLUDED_ISLAND_IDS.has(c.id)
    );
    
    for (let attempt = 0; attempt < 200; attempt++) {
      const startCountry = eligible[Math.floor(Math.random() * eligible.length)];
      const endCountry = eligible[Math.floor(Math.random() * eligible.length)];
      
      if (startCountry.id === endCountry.id) continue;
      
      // Compute actual path using existing findSupplyChainPath helper
      const path = findSupplyChainPath(startCountry.id, endCountry.id);
      // We want a sweet spot of complexity: 4 to 12 sectors
      if (path && path.length >= 4 && path.length <= 11) {
        return {
          start: startCountry.id,
          end: endCountry.id,
          label: `${startCountry.name} to ${endCountry.name} (${startCountry.continent} ➔ ${endCountry.continent} Corridor)`
        };
      }
    }
    
    // Fallback if 200 attempts don't yield (highly unlikely)
    return { start: "724", end: "356", label: "Spain to India (Euro-Asian Corridor)" };
  };

  const loadSupplyChainPreset = (presetKey: string) => {
    let preset: { start: string; end: string; label: string };
    
    if (presetKey === 'random_dynamic') {
      preset = getDynamicSupplyChainPreset();
    } else {
      const presetsMap: Record<string, { start: string; end: string; label: string }> = {
        'sp_in': { start: "724", end: "356", label: "Spain to India (Euro-Asian Corridor)" },
        'fr_za': { start: "250", end: "710", label: "France to South Africa (Trans-African Backbone)" },
        'us_br': { start: "840", end: "076", label: "United States to Brazil (Pan-American Highway)" },
        'eg_ru': { start: "818", end: "643", label: "Egypt to Russia (Suez-Siberian Corridor)" },
        'de_jp': { start: "276", end: "156", label: "Germany to China (Eurasian Silk Network)" },
        'us_fr': { start: "124", end: "590", label: "Canada to Panama (Pan-American Highway)" },
      };
      preset = presetsMap[presetKey] || presetsMap['sp_in'];
    }

    supplyChainRef.current = {
      startId: preset.start,
      endId: preset.end,
      activeId: preset.start,
      pathIds: new Set([preset.start]),
      pathList: [preset.start],
      decayIds: new Set(),
      chokeIds: new Set()
    };

    syncSupplyChainStart(preset.start);
    syncSupplyChainEnd(preset.end);
    syncSupplyChainActive(preset.start);
    syncSupplyChainPathIds(new Set([preset.start]));
    syncSupplyChainPathList([preset.start]);
    syncSupplyChainDecayIds(new Set());
    syncSupplyChainChokeIds(new Set());
    setSupplyChainCrisisMessage(`GRID LINK COMMENCED: Connect ${preset.label}`);
    setSupplyOverrideCharges(1);
    setSupplyConsecutiveLinks(0);
    setSupplyRadarScans(2);
    setSupplyDisruptors(1);
  };
  const [highlightQueue, setHighlightQueue] = useState<string[]>([]);
  const [originalHighlightQueue, setOriginalHighlightQueue] = useState<string[]>([]);
  const [currentTargetHighlightId, setCurrentTargetHighlightId] = useState<string | null>(null);
  const [highlightCountLimit, setHighlightCountLimit] = useState(20);
  const [showHighlightQuantityPrompt, setShowHighlightQuantityPrompt] = useState(false);
  const [skippedHighlightsCount, setSkippedHighlightsCount] = useState<Record<string, number>>({});
  const [deferredHighlights, setDeferredHighlights] = useState<string[]>([]);
  
  const [plotContinentsColorMode, setPlotContinentsColorMode] = useState(false);

  const [showFlagQuantityPrompt, setShowFlagQuantityPrompt] = useState(false);
  const [flagGameMode, setFlagGameMode] = useState<'timed' | 'count'>('timed');
  const [flagCountLimit, setFlagCountLimit] = useState(20);
  const [currentTargetFlagId, setCurrentTargetFlagId] = useState<string | null>(null);
  const [flagQueue, setFlagQueue] = useState<string[]>([]);
  const [originalFlagQueue, setOriginalFlagQueue] = useState<string[]>([]);
  const [skippedFlagsCount, setSkippedFlagsCount] = useState<Record<string, number>>({});
  const [deferredFlags, setDeferredFlags] = useState<string[]>([]);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);

  useEffect(() => {
    const currentTargetId = gameType === 'flag' ? currentTargetFlagId : currentTargetHighlightId;
    if (!currentTargetId) {
      setMultipleChoiceOptions([]);
      return;
    }
    const correctCountry = COUNTRIES.find(c => c.id === currentTargetId);
    if (!correctCountry) {
      setMultipleChoiceOptions([]);
      return;
    }
    
    // Select 3 random distractors from different countries
    const distractors: string[] = [];
    const pool = COUNTRIES.filter(c => c.id !== currentTargetId);
    while (distractors.length < 3 && pool.length > 0) {
      const randIdx = Math.floor(Math.random() * pool.length);
      const chosen = pool.splice(randIdx, 1)[0];
      if (!distractors.includes(chosen.name)) {
        distractors.push(chosen.name);
      }
    }
    
    const options = [correctCountry.name, ...distractors];
    // Shuffle the options
    const shuffled = options.sort(() => Math.random() - 0.5);
    setMultipleChoiceOptions(shuffled);
  }, [currentTargetFlagId, currentTargetHighlightId, gameType]);

  // Dynamic BFS calculation for the pathfinding HUD guidance
  const supplyChainBFSData = useMemo(() => {
    if (gameType === 'typing' && typerMode === 'supply_chain' && supplyChainActiveId && supplyChainEndId) {
      // Find shortest path from the active node to the end node avoiding decayed/choked sectors
      const avoidList = new Set([...supplyChainDecayIds, ...supplyChainChokeIds]);
      const path = findSupplyChainPath(supplyChainActiveId, supplyChainEndId, avoidList);
      
      if (path) {
        const nextHopId = path[1]; // First node in route after activeId
        const nextHopName = COUNTRIES.find(c => c.id === nextHopId)?.name || 'Unknown Hub';
        return {
          solvable: true,
          distance: path.length - 1, // Number of sectors to jump
          nextHop: nextHopName
        };
      } else {
        // Unsolvable under current constraints! Check if solvable if we ignore choke points but keeping decay
        const pathNoChokes = findSupplyChainPath(supplyChainActiveId, supplyChainEndId, supplyChainDecayIds);
        if (pathNoChokes) {
          const nextHopId = pathNoChokes[1];
          const nextHopName = COUNTRIES.find(c => c.id === nextHopId)?.name || 'Unknown Hub';
          return {
            solvable: false,
            hasDetour: true,
            distance: pathNoChokes.length - 1,
            nextHop: `${nextHopName} (Blocked!)`
          };
        }
        return {
          solvable: false,
          hasDetour: false,
          distance: -1,
          nextHop: 'CONNECTION SEVERED'
        };
      }
    }
    return null;
  }, [supplyChainActiveId, supplyChainEndId, supplyChainDecayIds, supplyChainChokeIds, gameType, typerMode]);

  const sanitizeHintText = (text: string, country: any): string => {
    if (!text || !country) return "";
    let sanitizedText = text;
    const namesToSanitize = [country.name, ...(country.aliases || [])];
    namesToSanitize.forEach(name => {
      if (name && name.length > 2) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedName, 'gi');
        sanitizedText = sanitizedText.replace(regex, '[This Territory]');
      }
    });
    return sanitizedText;
  };
  const [flagCacheBuster, setFlagCacheBuster] = useState<number>(0);
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
  const [showSurveyStatsPopup, setShowSurveyStatsPopup] = useState(false);
  const [selectedExpandedCountryId, setSelectedExpandedCountryId] = useState<string | null>(null);
  const [selectedAllianceName, setSelectedAllianceName] = useState<string | null>(null);
  const [expansionPanelTab, setExpansionPanelTab] = useState<'countries' | 'alliances' | 'resources' | 'rogue' | 'supply_route'>('countries');
  const [hideSectorsStats, setHideSectorsStats] = useState(false);
  const [isContinentPanelCollapsed, setIsContinentPanelCollapsed] = useState(false);
  const [showSurveySearch, setShowSurveySearch] = useState(false);
  const [surveySearchQuery, setSurveySearchQuery] = useState("");
  const surveySearchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchAtBottom, setIsSearchAtBottom] = useState(false);
  const [isAllianceHighlighted, setIsAllianceHighlighted] = useState(false);
  const [allianceFlagRefreshKey, setAllianceFlagRefreshKey] = useState(0);
  const [isAllianceFlagRefreshing, setIsAllianceFlagRefreshing] = useState(false);
  const [allianceLogoError, setAllianceLogoError] = useState(false);

  useEffect(() => {
    setIsAllianceHighlighted(false);
    setIsAllianceFlagRefreshing(false);
    setAllianceLogoError(false);
  }, [selectedAllianceName, allianceFlagRefreshKey]);

  useEffect(() => {
    if (typerMode === 'supply_chain' && !hasStarted) {
      loadSupplyChainPreset(selectedSupplyPreset);
    }
  }, [typerMode, selectedSupplyPreset, hasStarted]);

  // Sub-game-modes Loop (Rogue spread & Supply Chain decay/crises)
  useEffect(() => {
    if (!hasStarted || isPaused || isFinished) return;

    let rogueTimer: NodeJS.Timeout | null = null;
    let empChargeTimer: NodeJS.Timeout | null = null;
    let supplyDecayTimer: NodeJS.Timeout | null = null;
    let supplyCrisisTimer: NodeJS.Timeout | null = null;

    if (gameType === 'typing' && typerMode === 'rogue') {
      const rogueIntervals: Record<number, number> = {
        1: 1500,
        2: 2500,
        3: 3500,
        4: 4500,
        5: 5500
      };
      const activeInterval = rogueIntervals[supplyDifficulty] || 3500;

      // Periodic infection spread in Rogue State mode
      rogueTimer = setInterval(() => {
        setInfectedIds(prev => {
          const isContinentOnBreak = (contVal?: string): boolean => {
            if (!contVal) return false;
            const expiry = continentBreaksRef.current[contVal];
            return expiry ? Date.now() < expiry : false;
          };

          if (prev.size === 0) {
            const activeCountries = COUNTRIES.filter(c => {
              if (immuneCountryIdsRef.current.has(c.id)) return false;
              if (isContinentOnBreak(c.continent)) return false;
              
              if (supplyDifficulty >= 3) {
                const subNeighbors = getCountryNeighbors(c.id);
                if (subNeighbors.length > 0 && subNeighbors.every(snid => immuneCountryIdsRef.current.has(snid))) {
                  return false;
                }
              }
              return true;
            }).map(c => c.id);
            if (activeCountries.length === 0) return prev;
            const randomId = activeCountries[Math.floor(Math.random() * activeCountries.length)];
            return new Set([randomId]);
          }

          // Whack-A-Mole collapse check
          if (prev.size >= 120) {
            clearInterval(rogueTimer!);
            setFeedback({ text: "🚨 Rogue Overload: GRID SECURITY COLLAPSED!", type: 'error' });
            setTimeout(() => setFeedback(null), 3000);
            finishGame();
            return prev;
          }

          const next = new Set(prev);
          // Spread to neighbors (45% chance for each infected), but respect defensive firewalls (shieldedIds), immunity, and breaks
          prev.forEach(id => {
            if (immuneCountryIdsRef.current.has(id)) {
              return;
            }
            if (Math.random() < 0.45) {
              const neighbors = getCountryNeighbors(id);
              const uninfectedNeighbors = neighbors.filter(nid => {
                if (next.has(nid) || shieldedIdsRef.current.has(nid) || immuneCountryIdsRef.current.has(nid)) {
                  return false;
                }
                const c = COUNTRIES.find(x => x.id === nid);
                if (c && isContinentOnBreak(c.continent)) {
                  return false;
                }
                if (supplyDifficulty >= 3) {
                  const subNeighbors = getCountryNeighbors(nid);
                  if (subNeighbors.length > 0 && subNeighbors.every(snid => immuneCountryIdsRef.current.has(snid))) {
                    return false;
                  }
                }
                return true;
              });
              if (uninfectedNeighbors.length > 0) {
                const randomNeighbor = uninfectedNeighbors[Math.floor(Math.random() * uninfectedNeighbors.length)];
                next.add(randomNeighbor);
              }
            }
          });

          // Spontaneous outbreak (30% chance), bypassing firewalled / immune / continent-break sectors
          if (Math.random() < 0.3 && next.size < 20) {
            const activeCountries = COUNTRIES.filter(c => {
              if (next.has(c.id) || shieldedIdsRef.current.has(c.id) || immuneCountryIdsRef.current.has(c.id)) {
                return false;
              }
              if (isContinentOnBreak(c.continent)) {
                return false;
              }
              if (supplyDifficulty >= 3) {
                const subNeighbors = getCountryNeighbors(c.id);
                if (subNeighbors.length > 0 && subNeighbors.every(snid => immuneCountryIdsRef.current.has(snid))) {
                  return false;
                }
              }
              return true;
            }).map(c => c.id);

            if (activeCountries.length > 0) {
              const randomId = activeCountries[Math.floor(Math.random() * activeCountries.length)];
              next.add(randomId);
            }
          }

          return next;
        });
      }, activeInterval);

      // Charge EMP naturally
      empChargeTimer = setInterval(() => {
        setRogueEmpCharge(prev => Math.min(100, prev + 2));
      }, 1000);
    }

    if (gameType === 'typing' && typerMode === 'supply_chain') {
      const config = SUPPLY_CHAIN_L_CONFIGS[supplyDifficulty] || SUPPLY_CHAIN_L_CONFIGS[2];

      // 1. Data Decay wave: consumes path link-by-link
      supplyDecayTimer = setInterval(() => {
        const { pathList, startId, pathIds, decayIds, activeId } = supplyChainRef.current;
        if (pathList.length === 0) return;

        const decayedId = pathList[0];
        const nextList = pathList.slice(1);

        const nextPathIds = new Set<string>(pathIds);
        nextPathIds.delete(decayedId);

        const nextDecay = new Set<string>(decayIds);
        nextDecay.add(decayedId);

        const matchedName = COUNTRIES.find(c => c.id === decayedId)?.name || "Sector";
        setSupplyChainCrisisMessage(`⚠️ DATA DECAY OUTBREAK: ${matchedName.toUpperCase()} has collapsed!`);

        syncSupplyChainPathIds(nextPathIds);
        syncSupplyChainDecayIds(nextDecay);
        syncSupplyChainPathList(nextList);

        // 1. Check first if decay caught up to active worker position and update active node
        let finalActive = activeId;
        if (activeId === decayedId) {
          if (nextList.length > 0) {
            finalActive = nextList[nextList.length - 1];
            syncSupplyChainActive(finalActive);
          } else {
            // Total chain sever! Reset the active gate back to the initial start country (startId) which is always entered
            finalActive = startId || "";
            syncSupplyChainActive(finalActive);
            setFeedback({ text: `⚠️ TOTAL PATH SEVERED: ACTIVE GATE RECONNECTING TO START HUB`, type: 'info' });
            setTimeout(() => setFeedback(null), 3000);
          }
        }

        // 2. Keep the final active node's neighbors operational (never decayed)
        const currentChokes = Array.from(supplyChainRef.current.chokeIds) as string[];
        const activeNeighbors = finalActive ? getSupplyChainNeighbors(finalActive) : [];
        const activeChokeId = (currentChokes.find(cId => activeNeighbors.includes(cId)) as string) || null;
        ensureNeighborsAreOperational(finalActive, activeChokeId);
      }, config.decayInterval);

      // 2. Trans-airspace blockades and choke points
      if (config.maxChokes > 0) {
        supplyCrisisTimer = setInterval(() => {
          const { activeId, endId, pathIds, decayIds } = supplyChainRef.current;
          if (!activeId) return;

          const neighbors = getSupplyChainNeighbors(activeId);
          const targetBlockades = neighbors.filter(nid => 
            nid !== endId && 
            !pathIds.has(nid) && 
            !decayIds.has(nid)
          );

          if (targetBlockades.length > 0) {
            const shuffledBlockades = [...targetBlockades].sort(() => Math.random() - 0.5);
            const selectedBlockades = shuffledBlockades.slice(0, Math.min(config.maxChokes, shuffledBlockades.length));
            
            const nextChokes = new Set<string>();
            selectedBlockades.forEach(bid => nextChokes.add(bid));
            syncSupplyChainChokeIds(nextChokes);

            const blockNames = selectedBlockades.map(bid => COUNTRIES.find(c => c.id === bid)?.name || "Airspace").join(", ");
            setSupplyChainCrisisMessage(`🚨 AIRSPACE BLOCKED: [${blockNames.toUpperCase()}] under blockade! Find detour!`);

            ensureNeighborsAreOperational(activeId, selectedBlockades[0]);

            // Clear choke point after 10s to simulate changing weather/crisis dynamics
            setTimeout(() => {
              const currentActive = supplyChainRef.current.activeId;
              syncSupplyChainChokeIds(new Set());
              ensureNeighborsAreOperational(currentActive, null);
            }, 10000);
          }
        }, config.crisisInterval);
      }
    }

    return () => {
      if (rogueTimer) clearInterval(rogueTimer);
      if (empChargeTimer) clearInterval(empChargeTimer);
      if (supplyDecayTimer) clearInterval(supplyDecayTimer);
      if (supplyCrisisTimer) clearInterval(supplyCrisisTimer);
    };
  }, [hasStarted, isPaused, isFinished, gameType, typerMode, supplyDifficulty]);

  const prevInfectedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (gameType === 'typing' && typerMode === 'rogue' && hasStarted && !isPaused && !isFinished) {
      const added = Array.from(infectedIds).filter(id => !prevInfectedIdsRef.current.has(id));
      if (added.length > 0) {
        // Alarm beep sound
        playSynthSound('alarm');
        
        // Shake screen
        setIsRogueShaking(true);
        const t = setTimeout(() => setIsRogueShaking(false), 250);
        
        // Log outbreaks
        added.forEach(id => {
          const name = COUNTRIES.find(c => c.id === id)?.name || id;
          addRogueLog(`⚠️ OUTBREAK: Sector ${name} infected!`, 'warn');
        });
        
        return () => clearTimeout(t);
      }
    }
    prevInfectedIdsRef.current = infectedIds;
  }, [infectedIds, gameType, typerMode, hasStarted, isPaused, isFinished]);

  useEffect(() => {
    if (!showExpandedDetail) return;
    
    const handleSurveyKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setShowSurveySearch(true);
        setTimeout(() => {
          surveySearchInputRef.current?.focus();
          surveySearchInputRef.current?.select();
        }, 50);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setIsSearchAtBottom(prev => {
          const nextVal = !prev;
          setTimeout(() => {
            surveySearchInputRef.current?.focus();
            surveySearchInputRef.current?.select();
          }, 80);
          return nextVal;
        });
      } else if (e.key === 'Escape') {
        setShowSurveySearch(false);
        setSurveySearchQuery("");
        surveySearchInputRef.current?.blur();
      }
    };
    
    window.addEventListener('keydown', handleSurveyKeyDown);
    return () => window.removeEventListener('keydown', handleSurveyKeyDown);
  }, [showExpandedDetail]);



  const highlightedAllianceMemberIds = useMemo(() => {
    if (!selectedAllianceName || !isAllianceHighlighted) return null;
    const alliance = ALLIANCES_DATA.find(a => a.id === selectedAllianceName);
    if (!alliance) return null;
    return new Set(COUNTRIES.filter(c => alliance.matches(c)).map(c => String(c.id).padStart(3, '0')));
  }, [selectedAllianceName, isAllianceHighlighted]);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; score: number; date: string; time: string; duration?: number; guessedIds: string[]; userId?: string; userEmail?: string; mode?: 'zen' | 'challenge'; limit?: number; isMemoryMode?: boolean }[]>([]);
  const isAdmin = user?.email === 'f20240342@dubai.bits-pilani.ac.in' || user?.email === 'rudrapatra252006@gmail.com';
  const [adminFilter, setAdminFilter] = useState('');
  const [selectedContinentFilter, setSelectedContinentFilter] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFlagHintPanel, setShowFlagHintPanel] = useState(false);
  const [isSatelliteView, setIsSatelliteView] = useState(false);
  const [isGlobeMode, setIsGlobeMode] = useState(false);
  const [isTerritorialPanelCollapsed, setIsTerritorialPanelCollapsed] = useState(false);
  const [isMemoryMode, setIsMemoryMode] = useState(false);
  const [expansionSort, setExpansionSort] = useState<'alphabet' | 'wealth'>('alphabet');
  const [allianceSort, setAllianceSort] = useState<'alphabet' | 'size'>('size');

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shieldedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    shieldedIdsRef.current = shieldedIds;
  }, [shieldedIds]);

  const immuneCountryIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    immuneCountryIdsRef.current = immuneCountryIds;
  }, [immuneCountryIds]);

  const continentBreaksRef = useRef<Record<string, number>>({});
  useEffect(() => {
    continentBreaksRef.current = continentBreaks;
  }, [continentBreaks]);
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
        limit: gameMode === 'challenge' ? selectedDuration : null,
        isMemoryMode: isMemoryMode,
        gameType: gameType,
        flagCountLimit: gameType === 'flag' ? flagCountLimit : null,
        flagDuration: gameType === 'flag' ? selectedDuration : null,
        originalFlagQueue: gameType === 'flag' ? originalFlagQueue : null,
        countrySaveCounts: countrySaveCounts,
        immuneCountryIds: Array.from(immuneCountryIds),
        infectedIds: Array.from(infectedIds),
        shieldedIds: Array.from(shieldedIds),
        typerMode: typerMode,
        supplyDifficulty: supplyDifficulty,
        supplyChainStartId: gameType === 'typing' && typerMode === 'supply_chain' ? supplyChainStartId : null,
        supplyChainEndId: gameType === 'typing' && typerMode === 'supply_chain' ? supplyChainEndId : null,
        supplyChainPathList: gameType === 'typing' && typerMode === 'supply_chain' ? supplyChainPathList : null,
        supplyChainDecayIds: gameType === 'typing' && typerMode === 'supply_chain' ? Array.from(supplyChainDecayIds) : null,
        supplyChainChokeIds: gameType === 'typing' && typerMode === 'supply_chain' ? Array.from(supplyChainChokeIds) : null
      };
    }
    return null;
  }, [selectedRecordIndex, leaderboard, isFinished, playerName, isGuest, score, guessedIds, gameMode, completionTime, selectedDuration, gameType, flagCountLimit, originalFlagQueue, countrySaveCounts, immuneCountryIds, infectedIds, shieldedIds, typerMode, supplyDifficulty, supplyChainStartId, supplyChainEndId, supplyChainPathList, supplyChainDecayIds, supplyChainChokeIds]);

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

  const playSynthSound = (type: 'success' | 'error' | 'alarm' | 'shield' | 'purge') => {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'alarm') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'shield') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.3);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'purge') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.8);
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(90, now);
        osc2.frequency.linearRampToValueAtTime(40, now + 0.8);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        gain2.gain.setValueAtTime(0.18, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
        
        osc.start(now);
        osc.stop(now + 0.8);
        osc2.start(now);
        osc2.stop(now + 0.82);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addRogueLog = (text: string, type: 'warn' | 'success' | 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setRogueLogs(prev => [
      { id: Math.random().toString(), text: `[${timeStr}] ${text}`, type },
      ...prev.slice(0, 15)
    ]);
  };

  const triggerRogueEmp = () => {
    setRogueEmpCharge(0);
    playSynthSound('purge');
    
    // Shake screen
    setIsRogueShaking(true);
    setTimeout(() => setIsRogueShaking(false), 500);

    // Clear up to 40% of infected IDs
    setInfectedIds(prev => {
      const list = Array.from(prev);
      const amountToClear = Math.ceil(list.length * 0.4);
      if (amountToClear <= 0) return prev;
      
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      const removed = shuffled.slice(0, amountToClear);
      const next = new Set(prev);
      removed.forEach(id => next.delete(id));
      
      const removedNames = removed.map(id => COUNTRIES.find(c => c.id === id)?.name || id).join(', ');
      addRogueLog(`⚡ EMP BLAST: Quarantined: ${removedNames}`, 'success');
      
      return next;
    });
    
    setFeedback({ text: "⚡ GRID VOLTAGE SPIKE: EMP BLAST DEPLOYED!", type: 'success' });
    setTimeout(() => setFeedback(null), 3000);
  };

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
        const isTimed = (gameType === 'typing' && typerMode === 'supply_chain') || (gameType === 'flag' ? flagGameMode === 'timed' : gameMode === 'challenge');
        if (!isTimed) {
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
  }, [hasStarted, startTime, isFinished, gameMode, isPaused, gameType, flagGameMode]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Satellite View with Meta/Ctrl + X
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setIsSatelliteView(prev => !prev);
      }

      // Toggle Globe View with Meta/Ctrl + G
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsGlobeMode(prev => !prev);
      }

      // Toggle Memory Mode with Meta/Ctrl + M
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMemoryMode(prev => !prev);
      }

      // Toggle Flag Hint Panel with Meta/Ctrl + F
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (gameType === 'flag') {
          setShowFlagHintPanel(prev => !prev);
        }
      }

      // Toggle Pause with Alt key (Option) or Command/Ctrl + Pause/F8
      if (e.key === 'Alt' || ((e.metaKey || e.ctrlKey) && (e.key === 'Pause' || e.key === 'F8'))) {
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
    if (gameType === 'flag') {
      // Adjust the score to the selected quantity and time instead of whole globe properties (area)
      const timeFactor = 10 / Math.max(1, selectedDuration);
      const quantityFactor = 20 / Math.max(1, flagCountLimit);
      return Math.max(100, Math.floor(1000 * timeFactor * quantityFactor));
    }
    // Fixed points based on name length and 'uniqueness' (inverse of area)
    const nameWeight = country.name.length * 150;
    const uniquenessWeight = Math.floor(25000 / Math.pow((country.area + 1), 0.25));
    return nameWeight + uniquenessWeight;
  };

  const currentMultiplier = useMemo(() => {
    const isTimed = gameType === 'flag' ? flagGameMode === 'timed' : gameMode === 'challenge';
    if (!isTimed) {
      return Math.max(0.1, 1 - (timeElapsed / 3600)); // Depletes over 1 hour
    } else {
      const allowedTime = selectedDuration * 60;
      return (timeLeft / Math.max(1, allowedTime)) + 0.5; // Bonus for speed scaled to the selected time limit
    }
  }, [timeElapsed, timeLeft, gameMode, gameType, flagGameMode, selectedDuration]);

  const difficultyMultiplier = isMemoryMode ? 1.5 : 1.0;

  const triggerSupplyOverride = () => {
    if (supplyOverrideCharges <= 0) {
      playSynthSound('error');
      setFeedback({ text: "⚡ ERROR: NO EMP OVERRIDE CHARGES AVAILABLE!", type: 'error' });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }

    const { activeId, chokeIds, decayIds } = supplyChainRef.current;
    let activated = false;

    if (chokeIds.size > 0) {
      const nextChokes = new Set<string>(chokeIds as Set<string>);
      const clearedId = Array.from(chokeIds)[0] as string;
      nextChokes.delete(clearedId);
      syncSupplyChainChokeIds(nextChokes);
      
      ensureNeighborsAreOperational(activeId, nextChokes.size > 0 ? (Array.from(nextChokes)[0] as string) : null);
      activated = true;
      setSupplyChainCrisisMessage(`⚡ OVERRIDE ENGAGED: Blockade in ${COUNTRIES.find(c => c.id === clearedId)?.name || 'Sector'} has been neutralised!`);
      playSynthSound('purge');
    } else if (decayIds.size > 0) {
      const nextDecay = new Set<string>(decayIds as Set<string>);
      const decayList = Array.from(decayIds) as string[];
      const restoredId = decayList[decayList.length - 1];
      nextDecay.delete(restoredId);
      syncSupplyChainDecayIds(nextDecay);

      activated = true;
      setSupplyChainCrisisMessage(`⚡ OVERRIDE ENGAGED: Sector ${COUNTRIES.find(c => c.id === restoredId)?.name || 'Sector'} has been re-polarised!`);
      playSynthSound('purge');
    }

    if (activated) {
      setSupplyOverrideCharges(prev => Math.max(0, prev - 1));
      setFeedback({ text: `⚡ OVERRIDE DEPLOYED SUCCESSFULLY!`, type: 'success' });
      setTimeout(() => setFeedback(null), 2000);
    } else {
      playSynthSound('error');
      setFeedback({ text: `⚡ BYPASS ABORTED: ALL SECTORS ARE CURRENTLY STABLE`, type: 'info' });
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const triggerRadarScan = () => {
    if (supplyRadarScans <= 0) {
      playSynthSound('error');
      setFeedback({ text: `📡 SCAN RADAR FAILURE: NO SCANS REMAINING`, type: 'error' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }
    const { activeId, endId, pathIds, decayIds, chokeIds } = supplyChainRef.current;
    if (!activeId) return;

    const neighbors = getSupplyChainNeighbors(activeId);
    const validNextOptions = neighbors.filter(nid => 
      !pathIds.has(nid) && 
      !decayIds.has(nid) && 
      !chokeIds.has(nid)
    );

    if (validNextOptions.length === 0) {
      playSynthSound('error');
      setFeedback({ text: `📡 SCAN RADAR FAILURE: NO SAFE DIRECT PATH FOUND`, type: 'error' });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }

    // Best Option pathfinding helper (BFS) closest to end
    let bestOption = validNextOptions[0];
    let minDistance = Infinity;

    validNextOptions.forEach(nid => {
      const path = findSupplyChainPath(nid, endId, new Set([...decayIds, ...chokeIds]));
      if (path && path.length < minDistance) {
        minDistance = path.length;
        bestOption = nid;
      }
    });

    const targetCountry = COUNTRIES.find(c => c.id === bestOption);
    if (targetCountry) {
      setSupplyRadarScans(prev => Math.max(0, prev - 1));
      playSynthSound('shield');
      setFeedback({ text: `📡 RADAR DETECTED OPTIMAL SEC-PATH: TRY "${targetCountry.name.toUpperCase()}"`, type: 'info' });
      
      // Instantly light up on map path target
      setLastGuessedId(targetCountry.id);
      setTimeout(() => {
        setFeedback(null);
      }, 5000);
    }
  };

  const triggerChokeDisruptor = () => {
    if (supplyDisruptors <= 0) {
      playSynthSound('error');
      setFeedback({ text: `⚡ DISRUPTOR FAILURE: COMPONENT DEPLEATED`, type: 'error' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    const { activeId, chokeIds } = supplyChainRef.current;
    if (chokeIds.size === 0) {
      playSynthSound('error');
      setFeedback({ text: `⚡ DISRUPTOR ABORTED: NO BLOCKADES ACTIVE`, type: 'info' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    setSupplyDisruptors(prev => Math.max(0, prev - 1));
    syncSupplyChainChokeIds(new Set());
    ensureNeighborsAreOperational(activeId, null);
    playSynthSound('purge');
    setFeedback({ text: `⚡ DISRUPTOR ENGAGED: ALL ACTIVE CHOKE BLOCKADES DISSOLVED!`, type: 'success' });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== inputValue) {
      playTypeSound();
    }
    setInputValue(value);

    if (value.trim() !== '' && !hasStarted && !isFinished && !isPaused) {
      if (!user && !isGuest) {
        setIsGuest(true);
      }
      startGame();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      playReturnSound();
      const normalized = inputValue.trim().toLowerCase();
      
      if (!hasStarted) {
        if (!user && !isGuest) {
          setIsGuest(true);
        }
        startGame();
        setInputValue('');
        return;
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

      if (gameType === 'flag' && currentTargetFlagId) {
        const target = COUNTRIES.find(c => c.id === currentTargetFlagId);
        if (!target) return;
        const names = [target.name.toLowerCase(), ...target.aliases.map(a => a.toLowerCase())];
        
        if (names.includes(normalized)) {
          const newGuessed = new Set(guessedIds);
          if (!newGuessed.has(target.id)) {
            newGuessed.add(target.id);
            setGuessedIds(newGuessed);
            setLastGuessedId(target.id);
            setMostRecentGuessedId(target.id);
            
            const basePoints = getCountryPoints(target);
            const config = SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3];
            const points = Math.floor(basePoints * currentMultiplier * difficultyMultiplier * config.scoreMultiplier * 1.5); 
            setScore(prev => prev + points);
            
            setFeedback({ text: `CORRECT: ${target.name.toUpperCase()}`, type: 'success' });
            setTimeout(() => setFeedback(null), 1500);

            if (target.code) {
              setActiveFlag(target.code);
              setTimeout(() => setActiveFlag(null), 1500);
            }
          }

          setInputValue('');

          const nextQueue = flagQueue.slice(1);
          if (nextQueue.length > 0) {
            setFlagQueue(nextQueue);
            setCurrentTargetFlagId(nextQueue[0]);
          } else if (deferredFlags.length > 0) {
            const shuffledDeferred = [...deferredFlags].sort(() => Math.random() - 0.5);
            setFlagQueue(shuffledDeferred);
            setCurrentTargetFlagId(shuffledDeferred[0]);
            setDeferredFlags([]);
            setFeedback({ text: `INITIATING DEFERRED CHANNELS (SHUFFLED SECOND TRY WITH INTEL)`, type: 'info' });
            setTimeout(() => setFeedback(null), 3000);
          } else {
            finishGame();
          }
        } else {
           setFeedback({ text: `INCORRECT GUESS`, type: 'error' });
           setTimeout(() => setFeedback(null), 1000);
        }
        return;
      }

      if (gameType === 'highlight' && currentTargetHighlightId) {
        const target = COUNTRIES.find(c => c.id === currentTargetHighlightId);
        if (!target) return;
        const names = [target.name.toLowerCase(), ...target.aliases.map(a => a.toLowerCase())];
        
        if (names.includes(normalized)) {
          const newGuessed = new Set(guessedIds);
          if (!newGuessed.has(target.id)) {
            newGuessed.add(target.id);
            setGuessedIds(newGuessed);
            setLastGuessedId(target.id);
            setMostRecentGuessedId(target.id);
            
            const basePoints = getCountryPoints(target);
            const config = SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3];
            const points = Math.floor(basePoints * currentMultiplier * difficultyMultiplier * config.scoreMultiplier * 1.5); 
            setScore(prev => prev + points);
            
            setFeedback({ text: `CORRECT: ${target.name.toUpperCase()}`, type: 'success' });
            setTimeout(() => setFeedback(null), 1500);

            if (target.code) {
              setActiveFlag(target.code);
              setTimeout(() => setActiveFlag(null), 1500);
            }
          }

          setInputValue('');

          const nextQueue = highlightQueue.slice(1);
          if (nextQueue.length > 0) {
            setHighlightQueue(nextQueue);
            setCurrentTargetHighlightId(nextQueue[0]);
          } else if (deferredHighlights.length > 0) {
            const shuffledDeferred = [...deferredHighlights].sort(() => Math.random() - 0.5);
            setHighlightQueue(shuffledDeferred);
            setCurrentTargetHighlightId(shuffledDeferred[0]);
            setDeferredHighlights([]);
            setFeedback({ text: `INITIATING DEFERRED CHANNELS (SHUFFLED SECOND TRY WITH INTEL)`, type: 'info' });
            setTimeout(() => setFeedback(null), 3000);
          } else {
            finishGame();
          }
        } else {
           setFeedback({ text: `INCORRECT GUESS`, type: 'error' });
           setTimeout(() => setFeedback(null), 1000);
        }
        return;
      }

      // Rogue State Containment Mode Input Handling
      if (gameType === 'typing' && typerMode === 'rogue') {
        const normalized = inputValue.trim().toLowerCase();
        
        // EMP Purge command
        if (normalized === 'purge' || normalized === 'emp') {
          if (rogueEmpCharge >= 100) {
            triggerRogueEmp();
          } else {
            playSynthSound('error');
            setFeedback({ text: `⚡ EMP BLAST CHARGING (${rogueEmpCharge}%)`, type: 'error' });
            setTimeout(() => setFeedback(null), 1500);
          }
          setInputValue('');
          return;
        }

        const matched = COUNTRIES.find(c => {
          const names = [c.name.toLowerCase(), ...c.aliases.map(a => a.toLowerCase())];
          return names.includes(normalized);
        });

        if (matched) {
          if (infectedIds.has(matched.id)) {
            const newInfected = new Set(infectedIds);
            newInfected.delete(matched.id);
            setInfectedIds(newInfected);

            const newGuessed = new Set(guessedIds);
            newGuessed.add(matched.id);
            setGuessedIds(newGuessed);
            setLastGuessedId(matched.id);
            setMostRecentGuessedId(matched.id);
            setInputValue('');

            // Fast containment bonus & rewards
            const config = SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3];
            const points = Math.floor(350 * config.scoreMultiplier);
            setScore(p => p + points);
            playSynthSound('success');

            // 1. Rogue game save immunization tracking
            const savesNeeded = 6 - supplyDifficulty;
            const currentSaveCount = (countrySaveCounts[matched.id] || 0) + 1;
            setCountrySaveCounts(prev => ({ ...prev, [matched.id]: currentSaveCount }));

            const isImmunized = currentSaveCount >= savesNeeded;
            if (isImmunized) {
              setImmuneCountryIds(prev => {
                const next = new Set(prev);
                next.add(matched.id);
                return next;
              });
              addRogueLog(`🛡️ IMMUNE: ${matched.name} is now non-contagious & immune to Rogue!`, 'success');
            }

            // 2. Consecutive continent streak tracking for secures
            const streakNeeded = supplyDifficulty === 1 ? 5 : supplyDifficulty === 2 ? 4 : supplyDifficulty === 3 ? 3 : 2;
            let nextCount = 1;
            if (consecutiveContinent === matched.continent) {
              nextCount = consecutiveContinentCount + 1;
            }
            setConsecutiveContinent(matched.continent);

            let triggeredBreak = false;
            let breakDuration = 15;

            if (supplyDifficulty === 1) {
              breakDuration = 15;
              if (nextCount >= 5) {
                setConsecutiveContinentCount(0);
                const expiry = Date.now() + breakDuration * 1000;
                setContinentBreaks(prev => ({ ...prev, [matched.continent]: expiry }));
                addRogueLog(`🛡️ CONTINENT STRIKE SECURED: ${matched.continent.toUpperCase()} gained 15s disease reprieve!`, 'success');
                triggeredBreak = true;
              } else {
                setConsecutiveContinentCount(nextCount);
                addRogueLog(`✓ Contained active infection in ${matched.name} (${matched.continent} streak: ${nextCount}/5)`, 'success');
              }
            } else if (supplyDifficulty === 2) {
              breakDuration = 30;
              if (nextCount >= 4) {
                setConsecutiveContinentCount(0);
                const expiry = Date.now() + breakDuration * 1000;
                setContinentBreaks(prev => ({ ...prev, [matched.continent]: expiry }));
                addRogueLog(`🛡️ CONTINENT STRIKE SECURED: ${matched.continent.toUpperCase()} gained 30s disease reprieve!`, 'success');
                triggeredBreak = true;
              } else {
                setConsecutiveContinentCount(nextCount);
                addRogueLog(`✓ Contained active infection in ${matched.name} (${matched.continent} streak: ${nextCount}/4)`, 'success');
              }
            } else if (supplyDifficulty === 3) {
              breakDuration = 45;
              if (nextCount >= 3) {
                setConsecutiveContinentCount(0);
                const expiry = Date.now() + breakDuration * 1000;
                setContinentBreaks(prev => ({ ...prev, [matched.continent]: expiry }));
                addRogueLog(`🛡️ CONTINENT STRIKE SECURED: ${matched.continent.toUpperCase()} gained 45s disease reprieve!`, 'success');
                triggeredBreak = true;
              } else {
                setConsecutiveContinentCount(nextCount);
                addRogueLog(`✓ Contained active infection in ${matched.name} (${matched.continent} streak: ${nextCount}/3)`, 'success');
              }
            } else if (supplyDifficulty === 4) {
              breakDuration = 60;
              const lastCountry = lastSecuredCountryId ? COUNTRIES.find(c => c.id === lastSecuredCountryId) : null;
              const areBorders = lastSecuredCountryId ? getCountryNeighbors(lastSecuredCountryId).includes(matched.id) : false;
              if (lastCountry && lastCountry.continent === matched.continent && areBorders) {
                setConsecutiveContinentCount(0);
                const expiry = Date.now() + breakDuration * 1000;
                setContinentBreaks(prev => ({ ...prev, [matched.continent]: expiry }));
                addRogueLog(`🛡️ ADJACENT SHIELD SECURED: ${matched.continent.toUpperCase()} gained 60s disease reprieve (Borders cleared)!`, 'success');
                triggeredBreak = true;
              } else {
                setConsecutiveContinentCount(1);
                addRogueLog(`✓ Contained active infection in ${matched.name} (Need bordering ${matched.continent} country to trigger 60s rest)`, 'info');
              }
            } else if (supplyDifficulty === 5) {
              breakDuration = 75;
              const lastCountry = lastSecuredCountryId ? COUNTRIES.find(c => c.id === lastSecuredCountryId) : null;
              const areBorders = lastSecuredCountryId ? getCountryNeighbors(lastSecuredCountryId).includes(matched.id) : false;
              if (lastCountry && lastCountry.continent === matched.continent && !areBorders) {
                setConsecutiveContinentCount(0);
                const expiry = Date.now() + breakDuration * 1000;
                setContinentBreaks(prev => ({ ...prev, [matched.continent]: expiry }));
                addRogueLog(`🛡️ DISTAL SHIELD SECURED: ${matched.continent.toUpperCase()} gained 75s disease reprieve (Non-bordering secured)!`, 'success');
                triggeredBreak = true;
              } else {
                setConsecutiveContinentCount(1);
                addRogueLog(`✓ Contained active infection in ${matched.name} (Need non-bordering ${matched.continent} country to trigger 75s rest)`, 'info');
              }
            }

            setLastSecuredCountryId(matched.id);

            // Increment EMP charge on containment
            setRogueEmpCharge(prev => Math.min(100, prev + 12));

            if (triggeredBreak) {
              setFeedback({ text: `🛡️ CONTINENT SHIELD: ${matched.continent.toUpperCase()} GAINED ${breakDuration}s OUTBREAK REPRIEVE!`, type: 'success' });
            } else if (isImmunized) {
              setFeedback({ text: `🛡️ ${matched.name.toUpperCase()} IMMUNIZED! (SAVED ${currentSaveCount}/${savesNeeded} TIMES)`, type: 'success' });
            } else {
              setFeedback({ text: `CONTAINED ACTIVE ROGUE INFECTION: ${matched.name.toUpperCase()} (${currentSaveCount}/${savesNeeded} SAVES)`, type: 'success' });
            }
            setTimeout(() => setFeedback(null), triggeredBreak ? 3000 : 2000);

            // Play correct alert flag sound if available of course
            if (matched.code) {
              setActiveFlag(matched.code);
              setTimeout(() => setActiveFlag(null), 1500);
            }

            // Reprieve outbreak if they cleared everything
            if (newInfected.size === 0) {
              const activeCountries = COUNTRIES.filter(c => {
                if (immuneCountryIds.has(c.id)) return false;
                if (supplyDifficulty >= 3) {
                  const subNeighbors = getCountryNeighbors(c.id);
                  if (subNeighbors.length > 0 && subNeighbors.every(snid => immuneCountryIds.has(snid))) {
                    return false;
                  }
                }
                return true;
              }).map(c => c.id);
              const chosenCountries = activeCountries.length > 0 ? activeCountries : COUNTRIES.map(c => c.id);
              const randomNext = chosenCountries[Math.floor(Math.random() * chosenCountries.length)];
              setInfectedIds(new Set([randomNext]));
              addRogueLog(`⚠ Anomalies found. New outbreak patient zero in ${COUNTRIES.find(c => c.id === randomNext)?.name}`, 'warn');
              setFeedback({ text: "OUTBREAK CONTAINED. DETECTING SPAWNING SYSTEM ANOMALIES...", type: 'info' });
              setTimeout(() => setFeedback(null), 3000);
            }
          } else if (shieldedIds.has(matched.id)) {
            // Already shielded
            playSynthSound('error');
            setFeedback({ text: `🛡️ SECTOR ${matched.name.toUpperCase()} ALREADY HAS ACTIVE FIREWALL`, type: 'info' });
            setInputValue('');
            setTimeout(() => setFeedback(null), 2000);
          } else {
            // Safe country, let's see if it qualifies for shielding (borders any infected country)
            const neighbors = getCountryNeighbors(matched.id);
            const bordersInfected = neighbors.some(nid => infectedIds.has(nid));

            if (bordersInfected) {
              // Construct firewall!
              setShieldedIds(prev => {
                const next = new Set(prev);
                next.add(matched.id);
                return next;
              });
              playSynthSound('shield');
              const firewallSeconds = (12 + supplyDifficulty * 2) + (matched.gdp >= 500000 ? 4 : matched.gdp >= 50000 ? 2 : 0);
              addRogueLog(`🛡️ Firewall established on ${matched.name}: online for ${firewallSeconds}s (${matched.gdp >= 500000 ? 'High-tier' : matched.gdp >= 50000 ? 'Mid-tier' : 'Low-tier'} budget: +${matched.gdp >= 500000 ? '4' : matched.gdp >= 50000 ? '2' : '0'}s bonus)`, 'info');
              const config = SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3];
              const points = Math.floor(100 * config.scoreMultiplier);
              setScore(p => p + points);

              // Remove shield after calculated duration
              setTimeout(() => {
                setShieldedIds(prev => {
                  const next = new Set(prev);
                  next.delete(matched.id);
                  return next;
                });
                addRogueLog(`✕ Firewall expired: ${matched.name}`, 'warn');
              }, firewallSeconds * 1000);

              setFeedback({ text: `🛡️ FIREWALL ACTIVE ON: ${matched.name.toUpperCase()} (SECURED FOR ${firewallSeconds}s)`, type: 'success' });
              setInputValue('');
              setTimeout(() => setFeedback(null), 2000);
            } else {
              // Stable country - doesn't border any infected country
              playSynthSound('error');
              setScore(p => Math.max(0, p - 10));
              setConsecutiveContinent(null);
              setConsecutiveContinentCount(0);
              addRogueLog(`✕ Incorrect secure attempt: ${matched.name} is stable! Streak reset!`, 'warn');
              setFeedback({ text: `SECTOR ${matched.name.toUpperCase()} STABLE - NO OUTBREAKS (-10 PTS)`, type: 'info' });
              setInputValue('');
              setTimeout(() => setFeedback(null), 2000);
            }
          }
        } else if (normalized !== '') {
          playSynthSound('error');
          setScore(p => Math.max(0, p - 10));
          setConsecutiveContinent(null);
          setConsecutiveContinentCount(0);
          addRogueLog(`✕ Unknown sector typed. Streak reset!`, 'warn');
          setFeedback({ text: `Sector not found: ${inputValue} (-10 PTS)`, type: 'error' });
          setTimeout(() => setFeedback(null), 1500);
        }
        return;
      }

      // Supply Chain Intercept Mode Input Handling
      if (gameType === 'typing' && typerMode === 'supply_chain') {
        if (normalized === 'override' || normalized === 'bypass' || normalized === 'emp') {
          triggerSupplyOverride();
          setInputValue('');
          return;
        }

        const matched = COUNTRIES.find(c => {
          const names = [c.name.toLowerCase(), ...c.aliases.map(a => a.toLowerCase())];
          return names.includes(normalized);
        });

        if (matched) {
          const { activeId, endId, pathIds, decayIds, chokeIds, pathList } = supplyChainRef.current;

          if (decayIds.has(matched.id)) {
            setFeedback({ text: `SECTOR TERMINATED: DEAD DECAY AREA`, type: 'error' });
            setInputValue('');
            setTimeout(() => setFeedback(null), 2000);
            return;
          }
          if (chokeIds.has(matched.id)) {
            setFeedback({ text: `ALERT: BLOCKADE ACTIVE. ACCESS DENIED`, type: 'error' });
            setInputValue('');
            setTimeout(() => setFeedback(null), 2000);
            return;
          }
          if (pathIds.has(matched.id)) {
            setFeedback({ text: `SECTOR SECURED: ALREADY PART OF CHAIN`, type: 'info' });
            setInputValue('');
            setTimeout(() => setFeedback(null), 2000);
            return;
          }

          // Check connectivity to active node using synchronous ref activeId
          const neighbors = activeId ? getSupplyChainNeighbors(activeId) : [];
          if (neighbors.includes(matched.id)) {
            // Valid Link!
            const newPathIds = new Set<string>(pathIds);
            newPathIds.add(matched.id);
            const newList = [...pathList, matched.id];

            syncSupplyChainPathIds(newPathIds);
            syncSupplyChainPathList(newList);
            syncSupplyChainActive(matched.id);

            const newGuessed = new Set(guessedIds);
            newGuessed.add(matched.id);
            setGuessedIds(newGuessed);
            setLastGuessedId(matched.id);
            setMostRecentGuessedId(matched.id);
            setInputValue('');

            // Flag feedback
            if (matched.code) {
              setActiveFlag(matched.code);
              setTimeout(() => setActiveFlag(null), 1500);
            }

            // High-fidelity Scoring System
            const now = Date.now();
            const timeSinceLastGuess = lastGuessTimeRef.current ? (now - lastGuessTimeRef.current) / 1000 : 0;
            lastGuessTimeRef.current = now;

            const basePoints = getCountryPoints(matched);
            const hopMultiplier = 1 + (newList.length * 0.15);

            let speedBonus = 0;
            if (timeSinceLastGuess > 0 && timeSinceLastGuess <= 6) {
              speedBonus = Math.floor((6 - timeSinceLastGuess) * 150);
            } else if (timeSinceLastGuess > 0 && timeSinceLastGuess <= 15) {
              speedBonus = Math.floor((15 - timeSinceLastGuess) * 50);
            }

            const avoidedChokeBonus = chokeIds.size > 0 ? 400 : 0;
            const rawPoints = basePoints + speedBonus + avoidedChokeBonus;
            
            // Multiply score by the respective difficulty settings (Memory Mode, Time, and Supply Difficulty configs)
            const config = (gameType === 'typing' && typerMode === 'supply_chain')
              ? (SUPPLY_CHAIN_L_CONFIGS[supplyDifficulty] || SUPPLY_CHAIN_L_CONFIGS[2])
              : (SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3]);
            const totalScaleMultiplier = currentMultiplier * difficultyMultiplier * config.scoreMultiplier;
            const linkPoints = Math.max(120, Math.floor((rawPoints * hopMultiplier) * totalScaleMultiplier));

            setScore(p => p + linkPoints);
            playSynthSound('success');

            // Handle Combo Accumulator for EMP Override
            setSupplyConsecutiveLinks(prev => {
              const next = prev + 1;
              if (next >= 4) {
                setSupplyOverrideCharges(c => {
                  if (c < 2) {
                    playSynthSound('shield');
                    setFeedback({ text: `⚡ COMBO 4X: INTERCEPT EMP OVERRIDE CHARGED (+1 CHARGE!)`, type: 'success' });
                    setTimeout(() => setFeedback(null), 2500);
                    return c + 1;
                  } else {
                    setFeedback({ text: `⚡ COMBO 4X: EMP CHARGES AT MAXIMUM DENSITY`, type: 'info' });
                    setTimeout(() => setFeedback(null), 2000);
                    return c;
                  }
                });
                return 0;
              }
              return next;
            });
            
            if (matched.id === endId) {
              const timeBonus = timeLeft * 15;
              const efficiencyBonus = Math.max(1000, 5000 - (decayIds.size * 500));
              const finalCompletionPoints = Math.floor((5000 + timeBonus + efficiencyBonus) * totalScaleMultiplier);

              setScore(p => p + finalCompletionPoints);
              setFeedback({ text: `💥 INTERCEPT COMPLETE! +${finalCompletionPoints} PTS COMPLETION BONUS!`, type: 'success' });
              setTimeout(() => setFeedback(null), 4000);
              finishGame();
            } else {
              setFeedback({ text: `LINK SECURED: ${matched.name.toUpperCase()} CONNECTED (+${linkPoints} PTS)`, type: 'success' });
              setTimeout(() => setFeedback(null), 1500);
            }
          } else {
            const activeNode = COUNTRIES.find(c => c.id === activeId);
            setSupplyConsecutiveLinks(0); // Reset consecutive links count on failure
            setScore(p => Math.max(0, p - 50)); // Adjusted to a fair -50 PTS penalty for typos
            setFeedback({ text: `LINK FAILURE: MUST BORDER ${activeNode?.name || 'CURRENT SECTOR'} (-50 PTS)`, type: 'error' });
            setTimeout(() => setFeedback(null), 2000);
          }
        } else if (normalized !== '') {
          setSupplyConsecutiveLinks(0); // Reset combo count on wrong sector name
          setFeedback({ text: `Sector not found: ${inputValue}`, type: 'error' });
          setTimeout(() => setFeedback(null), 1500);
        }
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
        setMostRecentGuessedId(matchedCountry.id);
        setInputValue('');

        // Flag Feedback
        if (matchedCountry.code) {
          setActiveFlag(matchedCountry.code);
          setTimeout(() => setActiveFlag(null), 2000);
        }
        
        // Scoring logic
        const basePoints = getCountryPoints(matchedCountry);
        const config = SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3];
        const points = Math.floor(basePoints * currentMultiplier * difficultyMultiplier * config.scoreMultiplier);

        setScore(prev => prev + points);

        setFeedback({ text: `IDENTIFIED: ${matchedCountry.name.toUpperCase()}`, type: 'success' });
        setTimeout(() => setFeedback(null), 2000);

        // Check win condition
        if (newGuessed.size === COUNTRIES.length) {
          finishGame();
        }
      } else if (normalized !== '') {
        setScore(prev => Math.max(0, prev - 10));
        setFeedback({ text: `Not found: ${inputValue} (-10 PTS)`, type: 'error' });
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
      isMemoryMode: isMemoryMode,
      userId: user?.uid || null,
      userEmail: user?.email || null,
      createdAt: serverTimestamp(),
      gameType: gameType,
      flagCountLimit: gameType === 'flag' ? flagCountLimit : null,
      flagDuration: gameType === 'flag' ? selectedDuration : null,
      originalFlagQueue: gameType === 'flag' ? originalFlagQueue : null,
      countrySaveCounts: gameType === 'typing' && typerMode === 'rogue' ? countrySaveCounts : null,
      immuneCountryIds: gameType === 'typing' && typerMode === 'rogue' ? Array.from(immuneCountryIds) : null,
      infectedIds: gameType === 'typing' && typerMode === 'rogue' ? Array.from(infectedIds) : null,
      shieldedIds: gameType === 'typing' && typerMode === 'rogue' ? Array.from(shieldedIds) : null,
      typerMode: gameType === 'typing' ? typerMode : null,
      supplyDifficulty: gameType === 'typing' ? supplyDifficulty : null,
      supplyChainStartId: gameType === 'typing' && typerMode === 'supply_chain' ? supplyChainStartId : null,
      supplyChainEndId: gameType === 'typing' && typerMode === 'supply_chain' ? supplyChainEndId : null,
      supplyChainPathList: gameType === 'typing' && typerMode === 'supply_chain' ? supplyChainPathList : null,
      supplyChainDecayIds: gameType === 'typing' && typerMode === 'supply_chain' ? Array.from(supplyChainDecayIds) : null,
      supplyChainChokeIds: gameType === 'typing' && typerMode === 'supply_chain' ? Array.from(supplyChainChokeIds) : null
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
    if (gameType === 'typing' && typerMode === 'rogue') {
      setExpansionPanelTab('rogue');
    } else if (gameType === 'typing' && typerMode === 'supply_chain') {
      setExpansionPanelTab('supply_route');
    } else {
      setExpansionPanelTab('countries');
    } 
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

  useEffect(() => {
    if (lastGuessedId) {
      const timer = setTimeout(() => {
        setLastGuessedId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastGuessedId]);

  const skipFlag = () => {
    if (gameType !== 'flag' || !currentTargetFlagId || flagQueue.length === 0) return;
    
    const targetCountry = COUNTRIES.find(c => c.id === currentTargetFlagId);
    const prevSkipCount = skippedFlagsCount[currentTargetFlagId] || 0;
    
    // Guardian check: only 2 skips allowed
    if (prevSkipCount >= 2) {
      setFeedback({ text: "NO MORE SKIPS REMAINING FOR THIS FLAG", type: 'error' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    const newSkipCount = prevSkipCount + 1;
    setSkippedFlagsCount(prev => ({ ...prev, [currentTargetFlagId!]: newSkipCount }));

    if (newSkipCount === 1) {
      setFeedback({ text: 'SKIPPED (DEFERRED)', type: 'error' });
      setTimeout(() => setFeedback(null), 1500);

      // Save current flag country to deferred to be presented later in the 2nd stage
      const nextDeferred = [...deferredFlags, currentTargetFlagId];
      setDeferredFlags(nextDeferred);

      const nextQueue = flagQueue.slice(1);
      if (nextQueue.length > 0) {
        setFlagQueue(nextQueue);
        setCurrentTargetFlagId(nextQueue[0]);
      } else if (nextDeferred.length > 0) {
        // Reached the end of the immediate list, shuffle and show deferred
        const shuffledDeferred = [...nextDeferred].sort(() => Math.random() - 0.5);
        setFlagQueue(shuffledDeferred);
        setCurrentTargetFlagId(shuffledDeferred[0]);
        setDeferredFlags([]);
        setFeedback({ text: `INITIATING DEFERRED CHANNELS (SHUFFLED SECOND TRY WITH INTEL)`, type: 'info' });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        finishGame();
      }
    } else {
      // newSkipCount === 2: We don't defer it. We stay on the current target but show the 4 options
      setFeedback({ text: `DECRYPTION CODES ONLINE: SELECT DECRYPTION PATHWAY`, type: 'info' });
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const skipHighlight = () => {
    if (gameType !== 'highlight' || !currentTargetHighlightId || highlightQueue.length === 0) return;
    
    const targetCountry = COUNTRIES.find(c => c.id === currentTargetHighlightId);
    const prevSkipCount = skippedHighlightsCount[currentTargetHighlightId] || 0;
    
    // Guardian check: only 2 skips allowed
    if (prevSkipCount >= 2) {
      setFeedback({ text: "NO MORE SKIPS REMAINING FOR THIS TARGET", type: 'error' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }

    const newSkipCount = prevSkipCount + 1;
    setSkippedHighlightsCount(prev => ({ ...prev, [currentTargetHighlightId!]: newSkipCount }));

    if (newSkipCount === 1) {
      setFeedback({ text: 'SKIPPED (DEFERRED)', type: 'error' });
      setTimeout(() => setFeedback(null), 1500);

      // Save current highlighted country to deferred to be presented later in the 2nd stage
      const nextDeferred = [...deferredHighlights, currentTargetHighlightId];
      setDeferredHighlights(nextDeferred);

      const nextQueue = highlightQueue.slice(1);
      if (nextQueue.length > 0) {
        setHighlightQueue(nextQueue);
        setCurrentTargetHighlightId(nextQueue[0]);
      } else if (nextDeferred.length > 0) {
        // Reached the end of the immediate list, shuffle and show deferred
        const shuffledDeferred = [...nextDeferred].sort(() => Math.random() - 0.5);
        setHighlightQueue(shuffledDeferred);
        setCurrentTargetHighlightId(shuffledDeferred[0]);
        setDeferredHighlights([]);
        setFeedback({ text: `INITIATING DEFERRED CHANNELS (SHUFFLED SECOND TRY WITH INTEL)`, type: 'info' });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        finishGame();
      }
    } else {
      // newSkipCount === 2: We don't defer it. We stay on the current target but show the 4 options
      setFeedback({ text: `DECRYPTION CODES ONLINE: SELECT DECRYPTION PATHWAY`, type: 'info' });
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  const reshuffleCurrentMission = () => {
    if (!hasStarted || isFinished) {
      setFeedback({ text: "ACTIVATE GAMEPLAY INTERFACE TO RE-ROLL MISSIONS", type: 'info' });
      setTimeout(() => setFeedback(null), 2000);
      return;
    }
    
    // Play synth success
    try {
      playSynthSound('success');
    } catch (_) {}

    if (gameType === 'flag' && currentTargetFlagId) {
      const available = COUNTRIES.filter(c => !guessedIds.has(c.id) && c.id !== currentTargetFlagId);
      if (available.length > 0) {
        const randomCountry = available[Math.floor(Math.random() * available.length)];
        const newQueue = [randomCountry.id, ...flagQueue.filter(id => id !== currentTargetFlagId && id !== randomCountry.id)];
        setFlagQueue(newQueue);
        setCurrentTargetFlagId(randomCountry.id);
        
        const correctName = randomCountry.name;
        const choices = [correctName];
        const otherCountries = COUNTRIES.filter(c => c.id !== randomCountry.id);
        while (choices.length < 4 && otherCountries.length > 0) {
          const randIdx = Math.floor(Math.random() * otherCountries.length);
          const name = otherCountries[randIdx].name;
          if (!choices.includes(name)) {
            choices.push(name);
          }
          otherCountries.splice(randIdx, 1);
        }
        setMultipleChoiceOptions(choices.sort(() => Math.random() - 0.5));
        setFeedback({ text: `FLAG TARGET RE-MUTATED: NEW AGENCY MISSION LOCKED`, type: 'success' });
      } else {
        setFeedback({ text: "NO REMAINING ALTERNATE FLAG AGENTS", type: 'info' });
      }
      setTimeout(() => setFeedback(null), 1500);
    } else if (gameType === 'highlight' && currentTargetHighlightId) {
      const available = COUNTRIES.filter(c => !guessedIds.has(c.id) && c.id !== currentTargetHighlightId);
      if (available.length > 0) {
        const randomCountry = available[Math.floor(Math.random() * available.length)];
        const newQueue = [randomCountry.id, ...highlightQueue.filter(id => id !== currentTargetHighlightId && id !== randomCountry.id)];
        setHighlightQueue(newQueue);
        setCurrentTargetHighlightId(randomCountry.id);

        const correctName = randomCountry.name;
        const choices = [correctName];
        const otherCountries = COUNTRIES.filter(c => c.id !== randomCountry.id);
        while (choices.length < 4 && otherCountries.length > 0) {
          const randIdx = Math.floor(Math.random() * otherCountries.length);
          const name = otherCountries[randIdx].name;
          if (!choices.includes(name)) {
            choices.push(name);
          }
          otherCountries.splice(randIdx, 1);
        }
        setMultipleChoiceOptions(choices.sort(() => Math.random() - 0.5));
        setFeedback({ text: `TACTICAL CODES MUTATED: SECTOR ALIGNMENT SET`, type: 'success' });
      } else {
        setFeedback({ text: "NO SECTORS REMAINING FOR GLOBAL RE-ROLL", type: 'info' });
      }
      setTimeout(() => setFeedback(null), 1500);
    } else if (gameType === 'typing') {
      if (typerMode === 'rogue') {
        const count = infectedIds.size > 0 ? infectedIds.size : 5;
        const available = [...COUNTRIES].sort(() => Math.random() - 0.5).slice(0, count);
        const newInfected = new Set(available.map(c => c.id));
        setInfectedIds(newInfected);
        setRogueEmpCharge(0);
        setFeedback({ text: `INTRUSION CORRIDOR FLUSH: INFILTRATING NEW CHANNELS`, type: 'success' });
      } else if (typerMode === 'supply_chain') {
        loadSupplyChainPreset('random_dynamic');
        setFeedback({ text: `DYNAMIC SUPPLY PATHWAY REDIRECTED`, type: 'success' });
      }
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  const handleOptionSelect = (optionName: string) => {
    playTypeSound();
    playReturnSound();
    
    const normalized = optionName.trim().toLowerCase();
    
    if (gameType === 'flag' && currentTargetFlagId) {
      const target = COUNTRIES.find(c => c.id === currentTargetFlagId);
      if (!target) return;
      const names = [target.name.toLowerCase(), ...target.aliases.map(a => a.toLowerCase())];
      
      if (names.includes(normalized)) {
        const newGuessed = new Set(guessedIds);
        if (!newGuessed.has(target.id)) {
          newGuessed.add(target.id);
          setGuessedIds(newGuessed);
          setLastGuessedId(target.id);
          setMostRecentGuessedId(target.id);
          
          const basePoints = getCountryPoints(target);
          const config = SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3];
          const points = Math.floor(basePoints * currentMultiplier * difficultyMultiplier * config.scoreMultiplier * 1.5); 
          setScore(prev => prev + points);
          
          setFeedback({ text: `CORRECT: ${target.name.toUpperCase()}`, type: 'success' });
          setTimeout(() => setFeedback(null), 1500);

          if (target.code) {
            setActiveFlag(target.code);
            setTimeout(() => setActiveFlag(null), 1500);
          }
        }

        setInputValue('');

        const nextQueue = flagQueue.slice(1);
        if (nextQueue.length > 0) {
          setFlagQueue(nextQueue);
          setCurrentTargetFlagId(nextQueue[0]);
        } else if (deferredFlags.length > 0) {
          const shuffledDeferred = [...deferredFlags].sort(() => Math.random() - 0.5);
          setFlagQueue(shuffledDeferred);
          setCurrentTargetFlagId(shuffledDeferred[0]);
          setDeferredFlags([]);
          setFeedback({ text: `INITIATING DEFERRED CHANNELS (SHUFFLED SECOND TRY WITH INTEL)`, type: 'info' });
          setTimeout(() => setFeedback(null), 3000);
        } else {
          finishGame();
        }
      } else {
         setFeedback({ text: `INCORRECT GUESS`, type: 'error' });
         setTimeout(() => setFeedback(null), 1000);
      }
      return;
    }

    if (gameType === 'highlight' && currentTargetHighlightId) {
      const target = COUNTRIES.find(c => c.id === currentTargetHighlightId);
      if (!target) return;
      const names = [target.name.toLowerCase(), ...target.aliases.map(a => a.toLowerCase())];
      
      if (names.includes(normalized)) {
        const newGuessed = new Set(guessedIds);
        if (!newGuessed.has(target.id)) {
          newGuessed.add(target.id);
          setGuessedIds(newGuessed);
          setLastGuessedId(target.id);
          setMostRecentGuessedId(target.id);
          
          const basePoints = getCountryPoints(target);
          const config = SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty] || SUPPLY_DIFFICULTY_CONFIGS[3];
          const points = Math.floor(basePoints * currentMultiplier * difficultyMultiplier * config.scoreMultiplier * 1.5); 
          setScore(prev => prev + points);
          
          setFeedback({ text: `CORRECT: ${target.name.toUpperCase()}`, type: 'success' });
          setTimeout(() => setFeedback(null), 1500);

          if (target.code) {
            setActiveFlag(target.code);
            setTimeout(() => setActiveFlag(null), 1500);
          }
        }

        setInputValue('');

        const nextQueue = highlightQueue.slice(1);
        if (nextQueue.length > 0) {
          setHighlightQueue(nextQueue);
          setCurrentTargetHighlightId(nextQueue[0]);
        } else if (deferredHighlights.length > 0) {
          const shuffledDeferred = [...deferredHighlights].sort(() => Math.random() - 0.5);
          setHighlightQueue(shuffledDeferred);
          setCurrentTargetHighlightId(shuffledDeferred[0]);
          setDeferredHighlights([]);
          setFeedback({ text: `INITIATING DEFERRED CHANNELS (SHUFFLED SECOND TRY WITH INTEL)`, type: 'info' });
          setTimeout(() => setFeedback(null), 3000);
        } else {
          finishGame();
        }
      } else {
         setFeedback({ text: `INCORRECT GUESS`, type: 'error' });
         setTimeout(() => setFeedback(null), 1000);
      }
      return;
    }
  };

  const startGame = (forcedDuration?: number, forcedGameType?: 'typing' | 'flag' | 'highlight', forcedFlagCountLimit?: number) => {
    setHasStarted(true);
    setStartTime(Date.now());
    
    const duration = forcedDuration !== undefined ? forcedDuration : selectedDuration;
    setTimeLeft(duration * 60);
    
    const activeGameType = forcedGameType || gameType;
    if (activeGameType === 'flag') {
      const countryIds = COUNTRIES.map(c => c.id);
      const shuffled = [...countryIds].sort(() => Math.random() - 0.5);
      const limit = forcedFlagCountLimit !== undefined ? forcedFlagCountLimit : flagCountLimit;
      const initialQueue = shuffled.slice(0, Math.min(limit, COUNTRIES.length));
      setFlagQueue(initialQueue);
      setOriginalFlagQueue(initialQueue);
      setCurrentTargetFlagId(initialQueue[0]);
      setSkippedFlagsCount({});
      setDeferredFlags([]);
      
      setHighlightQueue([]);
      setOriginalHighlightQueue([]);
      setCurrentTargetHighlightId(null);
      setSkippedHighlightsCount({});
      setDeferredHighlights([]);
    } else if (activeGameType === 'highlight') {
      let eligible = COUNTRIES;
      if (selectedContinentFilter && selectedContinentFilter !== 'GLOBAL') {
        eligible = COUNTRIES.filter(c => c.continent.toUpperCase() === selectedContinentFilter.toUpperCase());
      }
      
      const limit = forcedFlagCountLimit !== undefined ? forcedFlagCountLimit : highlightCountLimit;
      
      // Separate small island nations that are often invisible or tiny on map
      const INVISIBLE_ISLANDS_CODES = new Set([
        'ag', 'bh', 'bb', 'cv', 'km', 'dm', 'gd', 'ki', 'mv', 'mt', 'mh', 'mu', 'fm', 'nr', 'pw', 'kn', 'lc', 'vc', 'ws', 'st', 'sc', 'sg', 'to', 'tv'
      ]);
      const eligibleIslands = eligible.filter(c => INVISIBLE_ISLANDS_CODES.has(c.code.toLowerCase()));
      const eligibleNonIslands = eligible.filter(c => !INVISIBLE_ISLANDS_CODES.has(c.code.toLowerCase()));

      let targetIslandCount = 0;
      if (limit === 10) targetIslandCount = 1;
      else if (limit === 20) targetIslandCount = 3;
      else if (limit === 50) targetIslandCount = 7;
      else if (limit === 100) targetIslandCount = 15;
      else {
        targetIslandCount = Math.floor(0.15 * limit);
      }

      // Clamp targets to available pool sizes
      targetIslandCount = Math.min(targetIslandCount, eligibleIslands.length);
      targetIslandCount = Math.min(targetIslandCount, limit);

      let targetNonIslandCount = limit - targetIslandCount;
      targetNonIslandCount = Math.min(targetNonIslandCount, eligibleNonIslands.length);

      // Re-adjust targetIslandCount if non-islands can't fill the remainder
      if (targetIslandCount + targetNonIslandCount < limit) {
        targetIslandCount = Math.min(limit - targetNonIslandCount, eligibleIslands.length);
      }

      const selectedIslands = [...eligibleIslands].sort(() => Math.random() - 0.5).slice(0, targetIslandCount);
      
      let selectedNonIslands: typeof COUNTRIES = [];
      if (!selectedContinentFilter || selectedContinentFilter === 'GLOBAL') {
        // Group by continent to avoid clustering in one place
        const byContinent: Record<string, typeof COUNTRIES> = {};
        eligibleNonIslands.forEach(c => {
          if (!byContinent[c.continent]) {
            byContinent[c.continent] = [];
          }
          byContinent[c.continent].push(c);
        });

        // Shuffle each group
        Object.keys(byContinent).forEach(cont => {
          byContinent[cont].sort(() => Math.random() - 0.5);
        });

        const continents = Object.keys(byContinent).sort(() => Math.random() - 0.5);
        const indices: Record<string, number> = {};
        continents.forEach(cont => { indices[cont] = 0; });

        let continentIndex = 0;
        while (selectedNonIslands.length < targetNonIslandCount) {
          let addedAny = false;
          for (let i = 0; i < continents.length; i++) {
            const cont = continents[(continentIndex + i) % continents.length];
            const idx = indices[cont];
            if (idx < byContinent[cont].length) {
              selectedNonIslands.push(byContinent[cont][idx]);
              indices[cont] = idx + 1;
              addedAny = true;
              if (selectedNonIslands.length >= targetNonIslandCount) break;
            }
          }
          if (!addedAny) break;
          continentIndex = (continentIndex + 1) % continents.length;
        }
      } else {
        selectedNonIslands = [...eligibleNonIslands].sort(() => Math.random() - 0.5).slice(0, targetNonIslandCount);
      }

      // Combine and shuffle the finished queue
      const combined = [...selectedIslands, ...selectedNonIslands];
      const initialQueue = combined.map(c => c.id).sort(() => Math.random() - 0.5);

      setHighlightQueue(initialQueue);
      setOriginalHighlightQueue(initialQueue);
      setCurrentTargetHighlightId(initialQueue[0]);
      setSkippedHighlightsCount({});
      setDeferredHighlights([]);
      
      setFlagQueue([]);
      setOriginalFlagQueue([]);
      setCurrentTargetFlagId(null);
      setSkippedFlagsCount({});
      setDeferredFlags([]);
    } else {
      setFlagQueue([]);
      setOriginalFlagQueue([]);
      setCurrentTargetFlagId(null);
      setSkippedFlagsCount({});
      setDeferredFlags([]);
      
      setHighlightQueue([]);
      setOriginalHighlightQueue([]);
      setCurrentTargetHighlightId(null);
      setSkippedHighlightsCount({});
      setDeferredHighlights([]);

      // Initialize Typing Submodes
      if (typerMode === 'rogue') {
        const activeCountries = COUNTRIES.map(c => c.id);
        const randomId = activeCountries[Math.floor(Math.random() * activeCountries.length)];
        setInfectedIds(new Set([randomId]));
        setShieldedIds(new Set());
        setRogueEmpCharge(0);
        setImmuneCountryIds(new Set());
        setCountrySaveCounts({});
        setContinentBreaks({});
        setConsecutiveContinent(null);
        setConsecutiveContinentCount(0);
        setLastSecuredCountryId(null);
        setRogueLogs([
          { id: 'init', text: '[SYSTEM LOG] Patched Grid. Patient Zero isolated.', type: 'info' }
        ]);
        
        syncSupplyChainStart(null);
        syncSupplyChainEnd(null);
        syncSupplyChainActive(null);
        syncSupplyChainPathIds(new Set());
        syncSupplyChainPathList([]);
        syncSupplyChainDecayIds(new Set());
        syncSupplyChainChokeIds(new Set());
        setSupplyChainCrisisMessage(null);
      } else if (typerMode === 'supply_chain') {
        if (!supplyChainStartId || !supplyChainEndId) {
          loadSupplyChainPreset(selectedSupplyPreset);
        } else {
          setSupplyOverrideCharges(1);
          setSupplyConsecutiveLinks(0);
          setSupplyRadarScans(2);
          setSupplyDisruptors(1);
          syncSupplyChainDecayIds(new Set());
          syncSupplyChainChokeIds(new Set());
          setInfectedIds(new Set());
          syncSupplyChainActive(supplyChainStartId);
          syncSupplyChainPathIds(new Set([supplyChainStartId]));
          syncSupplyChainPathList([supplyChainStartId]);

          const currentStartCountry = COUNTRIES.find(c => c.id === supplyChainStartId);
          const currentEndCountry = COUNTRIES.find(c => c.id === supplyChainEndId);
          const label = `${currentStartCountry?.name || 'Sector Start'} to ${currentEndCountry?.name || 'Sector Destination'}`;
          setSupplyChainCrisisMessage(`GRID LINK COMMENCED: Connect ${label}`);
        }
      } else {
        setInfectedIds(new Set());
        syncSupplyChainStart(null);
        syncSupplyChainEnd(null);
        syncSupplyChainActive(null);
        syncSupplyChainPathIds(new Set());
        syncSupplyChainPathList([]);
        syncSupplyChainDecayIds(new Set());
        syncSupplyChainChokeIds(new Set());
        setSupplyChainCrisisMessage(null);
      }
    }
  };

  const resetGame = () => {
    setGuessedIds(new Set());
    setInfectedIds(new Set());
    setShieldedIds(new Set());
    setRogueEmpCharge(0);
    setRogueLogs([]);
    setImmuneCountryIds(new Set());
    setCountrySaveCounts({});
    setContinentBreaks({});
    setConsecutiveContinent(null);
    setConsecutiveContinentCount(0);
    setLastSecuredCountryId(null);
    syncSupplyChainStart(null);
    syncSupplyChainEnd(null);
    syncSupplyChainActive(null);
    syncSupplyChainPathIds(new Set());
    syncSupplyChainPathList([]);
    syncSupplyChainDecayIds(new Set());
    syncSupplyChainChokeIds(new Set());
    setSupplyChainCrisisMessage(null);
    setSupplyOverrideCharges(1);
    setSupplyConsecutiveLinks(0);
    setSupplyRadarScans(2);
    setSupplyDisruptors(1);
    supplyChainRef.current = {
      startId: null,
      endId: null,
      activeId: null,
      pathIds: new Set(),
      pathList: [],
      decayIds: new Set(),
      chokeIds: new Set()
    };
    setLastGuessedId(null);
    setStartTime(null);
    setHasStarted(false);
    setShowRecordsView(false);
    setShowFlagHintPanel(false);
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
    setCurrentTargetFlagId(null);
    setFlagQueue([]);
    setOriginalFlagQueue([]);
    setSkippedFlagsCount({});
    setDeferredFlags([]);
    
    setCurrentTargetHighlightId(null);
    setHighlightQueue([]);
    setOriginalHighlightQueue([]);
    setSkippedHighlightsCount({});
    setDeferredHighlights([]);
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
            <button 
              onClick={() => setIsGlobeMode(!isGlobeMode)}
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center transition-all",
                isGlobeMode 
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
                  : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
              )}
              title={isGlobeMode ? "Switch to 2D Map" : "Switch to 3D Globe"}
            >
              <Globe className={cn("w-5 h-5", isGlobeMode && "animate-[spin_10s_linear_infinite]")} />
            </button>
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
            <div className="flex flex-wrap items-center gap-1.5 lg:gap-3 scale-90 lg:scale-100">
              <div className="flex bg-neutral-900/50 rounded-lg p-0.5 border border-neutral-800">
                <button 
                  onClick={() => setGameType('typing')}
                  title="Type Mode"
                  className={cn(
                    "p-1.5 rounded-md transition-all flex items-center justify-center",
                    gameType === 'typing' ? "bg-cyan-500 text-black shadow-md" : "text-neutral-500 hover:text-neutral-200"
                  )}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    setShowFlagQuantityPrompt(true);
                  }}
                  title="Flag Mode"
                  className={cn(
                    "p-1.5 rounded-md transition-all flex items-center justify-center",
                    gameType === 'flag' ? "bg-rose-500 text-black shadow-md" : "text-neutral-500 hover:text-neutral-200"
                  )}
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => {
                    setShowHighlightQuantityPrompt(true);
                  }}
                  title="Guess the Highlighted Country Mode"
                  className={cn(
                    "p-1.5 rounded-md transition-all flex items-center justify-center",
                    gameType === 'highlight' ? "bg-amber-500 text-black shadow-md" : "text-neutral-500 hover:text-neutral-200"
                  )}
                >
                  <Target className="w-3.5 h-3.5" />
                </button>
              </div>

              {gameType === 'flag' && (
                <div className="flex items-center gap-1">
                  <span className="text-[7px] lg:text-[9px] text-neutral-500 font-mono uppercase">Qty:</span>
                  <select 
                    value={flagCountLimit}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setFlagCountLimit(count);
                      startGame(selectedDuration, 'flag', count);
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded px-1 lg:px-2 py-0.5 lg:py-1 text-[8px] lg:text-[10px] font-mono text-emerald-500 outline-hidden"
                  >
                    {[5, 10, 20, 50, 100, 199].map(q => (
                      <option key={q} value={q}>{q === 199 ? "All 199" : q} Flags</option>
                    ))}
                  </select>
                </div>
              )}

              {gameType === 'highlight' && (
                <div className="flex items-center gap-1">
                  <span className="text-[7px] lg:text-[9px] text-neutral-500 font-mono uppercase">Qty:</span>
                  <select 
                    value={highlightCountLimit}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setHighlightCountLimit(count);
                      startGame(selectedDuration, 'highlight', count);
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded px-1 lg:px-2 py-0.5 lg:py-1 text-[8px] lg:text-[10px] font-mono text-amber-500 outline-hidden"
                  >
                    {[5, 10, 20, 50, 100, 199].map(q => (
                      <option key={q} value={q}>{q === 199 ? "All 199" : q} Targets</option>
                    ))}
                  </select>
                </div>
              )}

              {gameType === 'typing' && (
                <div className="flex items-center gap-2">
                  <div className="flex bg-neutral-900/50 rounded-lg p-0.5 border border-neutral-800">
                    <select
                      value={typerMode}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setTyperMode(val);
                        if (val === 'supply_chain') {
                          setSupplyDifficulty(2); // default to normal (level 2)
                        } else if (val === 'rogue') {
                          setSupplyDifficulty(3); // default to hard (level 3)
                        }
                      }}
                      className="bg-transparent border-0 text-[8px] lg:text-[10px] font-mono font-bold uppercase text-cyan-400 outline-none px-2 py-1 cursor-pointer"
                    >
                      <option value="default" className="bg-neutral-950 text-white">Classic Terminal</option>
                      <option value="rogue" className="bg-neutral-950 text-white">Rogue Outbreak</option>
                      <option value="supply_chain" className="bg-neutral-950 text-white">Supply Intercept</option>
                    </select>
                  </div>

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
                </div>
              )}

              <button 
                onClick={() => setIsMemoryMode(!isMemoryMode)}
                className={cn(
                  "p-1.5 lg:p-2 rounded-lg transition-all border",
                  isMemoryMode 
                    ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                    : "bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300"
                )}
                title="Toggle Memory Mode (Stealth)"
              >
                <Brain className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>

              {(gameMode === 'challenge' || gameType === 'flag' || (gameType === 'typing' && typerMode === 'supply_chain')) && (
                <div className="flex items-center gap-1">
                  {gameType === 'flag' && <span className="text-[7px] lg:text-[9px] text-neutral-500 font-mono uppercase">Time:</span>}
                  <select 
                    value={selectedDuration}
                    onChange={(e) => {
                      const dur = Number(e.target.value);
                      setSelectedDuration(dur);
                      startGame(dur, gameType);
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded px-1 lg:px-2 py-0.5 lg:py-1 text-[8px] lg:text-[10px] font-mono text-amber-500 outline-hidden"
                  >
                    {[1, 2, 5, 10, 15, 20, 30, 45, 60].map(m => (
                      <option key={m} value={m}>{m}m</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 lg:gap-4 ml-auto lg:ml-0">
            <div className="flex flex-col items-end min-w-[40px] lg:min-w-[80px]">
                <span className="text-[7px] lg:text-[10px] text-neutral-500 font-mono uppercase leading-none">Time</span>
                <div className="flex items-center gap-1 text-white font-mono leading-none">
                  <Timer className="w-2.5 h-2.5 lg:w-4 lg:h-4 text-emerald-500" />
                  <span className="text-[12px] lg:text-lg">{(gameMode === 'challenge' || (gameType === 'flag' && flagGameMode === 'timed') || (gameType === 'typing' && typerMode === 'supply_chain')) ? formatTime(timeLeft) : formatTime(timeElapsed)}</span>
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
           {/* Guess the Highlighted Country Unit */}
           {gameType === 'highlight' && currentTargetHighlightId && hasStarted && !isFinished && (
             <div className="p-4 lg:p-5 pb-2 lg:pb-0 space-y-4 lg:space-y-5 shrink-0">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="p-4 bg-neutral-900/80 backdrop-blur-md border border-amber-500/30 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.1)] space-y-4"
                >
                   <div className="flex justify-between items-center px-1">
                     <span className="text-[9px] text-amber-500 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                       <Target className="w-3 h-3 animate-pulse" />
                       Country Highlight Guess
                     </span>
                     <span className="text-[9px] text-neutral-500 font-mono">
                       {guessedIds.size + 1} / {highlightCountLimit}
                     </span>
                   </div>
                   
                   {/* Description & Guide visual card */}
                   <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2 text-left">
                     <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">
                       A sector has been highlighted on the world map in <span className="text-yellow-400 font-bold font-mono">YELLOW</span>.
                     </p>
                     <p className="text-[10px] text-neutral-400 font-mono leading-relaxed">
                       Identify its sovereign designation. Use the input field below to submit your guess.
                     </p>
                   </div>
                   
                   <div className="px-1 flex items-center justify-between">
                      <span className="text-[8px] text-neutral-600 font-mono uppercase">
                        {(skippedHighlightsCount[currentTargetHighlightId || ''] || 0) > 0 
                          ? `Skips: ${skippedHighlightsCount[currentTargetHighlightId || '']}/2` 
                          : 'Status: Awaiting Input'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={skipHighlight}
                          disabled={(skippedHighlightsCount[currentTargetHighlightId || ''] || 0) >= 2}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all group",
                            (skippedHighlightsCount[currentTargetHighlightId || ''] || 0) >= 2
                              ? "bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed"
                              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white cursor-pointer"
                          )}
                          title={(skippedHighlightsCount[currentTargetHighlightId || ''] || 0) >= 2 ? "No runs of evasion remain for this sector." : "Skip this target"}
                        >
                          <span className="text-[8px] font-bold uppercase tracking-wider">{(skippedHighlightsCount[currentTargetHighlightId || ''] || 0) >= 2 ? "Final Try" : "Skip"}</span>
                          <Shuffle className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                      </div>
                   </div>
                </motion.div>

                {currentTargetHighlightId && (skippedHighlightsCount[currentTargetHighlightId] || 0) === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-neutral-900 border border-amber-500/30 rounded-xl space-y-1.5 text-left mb-4"
                  >
                    <div className="text-[8.5px] font-mono text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                      Intel Hint (Second Chance)
                    </div>
                    <div className="space-y-1 font-mono text-[9px] text-neutral-300">
                      {(() => {
                        const country = COUNTRIES.find(c => c.id === currentTargetHighlightId);
                        return (
                          <>
                            <div className="flex items-start gap-1">
                              <span className="text-amber-500/70 font-bold text-[8px] shrink-0 uppercase">[CAPITAL]:</span> 
                              {country?.capital ? (
                                <span className="text-white font-bold">{country.capital}</span>
                              ) : (
                                <span className="text-white font-bold">Unknown</span>
                              )}
                            </div>
                            {country?.facts && country.facts.length > 0 && (
                              <div className="leading-relaxed mt-1 flex items-start gap-1 text-neutral-400">
                                <span className="text-amber-500/70 font-bold text-[8px] shrink-0 uppercase">[DOSSIER]:</span> 
                                <span>{sanitizeHintText(country.facts[0], country)}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {currentTargetHighlightId && (skippedHighlightsCount[currentTargetHighlightId] || 0) >= 1 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-neutral-900 border border-emerald-500/30 rounded-xl space-y-3 mb-4 text-left"
                  >
                    <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                      Sovereign Decryption Options (4-Choice Interface)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {multipleChoiceOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          id={`decrypt-highlight-option-${idx}`}
                          onClick={() => handleOptionSelect(opt)}
                          className="px-3 py-2 text-center text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-800 hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-neutral-700/50 rounded-xl transition-all cursor-pointer text-neutral-200 hover:text-emerald-300"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
             </div>
           )}

           {/* Flag Decryption Unit - Higher Priority Display */}
           {gameType === 'flag' && currentTargetFlagId && hasStarted && !isFinished && (
             <div className="p-4 lg:p-5 pb-2 lg:pb-0 space-y-4 lg:space-y-5 shrink-0">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="p-4 bg-neutral-900/80 backdrop-blur-md border border-emerald-500/30 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.1)] space-y-4"
                >
                   <div className="flex justify-between items-center px-1">
                     <span className="text-[9px] text-emerald-500 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                       <Flag className="w-3 h-3" />
                       Target Identifier
                     </span>
                     {flagGameMode === 'count' && (
                       <span className="text-[9px] text-neutral-500 font-mono">
                         {guessedIds.size + 1} / {flagCountLimit}
                       </span>
                     )}
                   </div>
                   <div className="relative aspect-[3/2] flex items-center justify-center bg-black/40 rounded-xl border border-white/5 overflow-hidden group">
                      <img 
                         key={`${currentTargetFlagId}-${flagCacheBuster}`}
                         src={`https://flagcdn.com/w640/${COUNTRIES.find(c => c.id === currentTargetFlagId)?.code.toLowerCase()}.png${flagCacheBuster ? `?t=${flagCacheBuster}` : ''}`} 
                         alt="Identify this flag"
                         className="h-full object-contain shadow-2xl transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                   </div>
                   <div className="px-1 flex items-center justify-between">
                      <span className="text-[8px] text-neutral-600 font-mono uppercase">
                        {(skippedFlagsCount[currentTargetFlagId || ''] || 0) > 0 
                          ? 'Status: Second Try (Intel Available)' 
                          : 'Status: Pending Verification'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setFlagCacheBuster(prev => prev + 1)}
                          className="p-1 px-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all flex items-center justify-center"
                          title="Reload flag image (if not displaying)"
                        >
                          <RefreshCcw className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={skipFlag}
                          disabled={(skippedFlagsCount[currentTargetFlagId || ''] || 0) >= 2}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all group",
                            (skippedFlagsCount[currentTargetFlagId || ''] || 0) >= 2
                              ? "bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed"
                              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white cursor-pointer"
                          )}
                          title={(skippedFlagsCount[currentTargetFlagId || ''] || 0) >= 2 ? "No runs of evasion remain for this flag." : "Skip this flag"}
                        >
                          <span className="text-[8px] font-bold uppercase tracking-wider">{(skippedFlagsCount[currentTargetFlagId || ''] || 0) >= 2 ? "Final Try" : "Skip"}</span>
                          <Shuffle className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                      </div>
                   </div>
                </motion.div>

                    {currentTargetFlagId && (skippedFlagsCount[currentTargetFlagId] || 0) === 1 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-3 bg-neutral-900 border border-amber-500/30 rounded-xl space-y-1.5 text-left mb-4"
                      >
                        <div className="text-[8.5px] font-mono text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                          Intel Hint (Second Chance)
                        </div>
                        <div className="space-y-1 font-mono text-[9px] text-neutral-300">
                          {(() => {
                            const country = COUNTRIES.find(c => c.id === currentTargetFlagId);
                            return (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-amber-500/70 font-bold text-[8px] shrink-0 uppercase">[CAPITAL]:</span> 
                                  {country?.capital ? (
                                    <span className="text-white font-bold">{country.capital}</span>
                                  ) : (
                                    <span className="text-white font-bold">Unknown</span>
                                  )}
                                </div>
                                {country?.facts && country.facts.length > 0 && (
                                  <div className="leading-relaxed mt-1 flex items-start gap-1 text-neutral-400">
                                    <span className="text-amber-500/70 font-bold text-[8px] shrink-0 uppercase">[DOSSIER]:</span> 
                                    <span>{sanitizeHintText(country.facts[0], country)}</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}

                    {currentTargetFlagId && (skippedFlagsCount[currentTargetFlagId] || 0) >= 1 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-neutral-900 border border-emerald-500/30 rounded-xl space-y-3 mb-4 text-left"
                      >
                        <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                          Sovereign Decryption Options (4-Choice Interface)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {multipleChoiceOptions.map((opt, idx) => (
                            <button
                              key={idx}
                              id={`decrypt-flag-option-${idx}`}
                              onClick={() => handleOptionSelect(opt)}
                              className="px-3 py-2 text-center text-[10px] font-mono font-bold uppercase tracking-wider bg-neutral-800 hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-neutral-700/50 rounded-xl transition-all cursor-pointer text-neutral-200 hover:text-emerald-300"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                {flagQueue.length > 0 && (
                  <div className="space-y-2 px-1">
                     <div className="flex justify-between items-center">
                       <span className="text-[8px] text-neutral-600 font-mono uppercase tracking-widest">Upcoming Decrypts</span>
                       <span className="text-[8px] text-neutral-700 font-mono">Queue Buffer: {Math.max(0, flagQueue.length - 1)}</span>
                     </div>
                     <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-hide">
                        {flagQueue.slice(1, 6).map((id, idx) => (
                           <motion.div 
                             layoutId={`${id}-${idx}`}
                             key={`${id}-${idx}`} 
                             className="w-12 aspect-[3/2] shrink-0 rounded-md border border-neutral-800/50 bg-neutral-900/50 grayscale opacity-40 overflow-hidden"
                           >
                              <img 
                                 src={`https://flagcdn.com/w160/${COUNTRIES.find(c => c.id === id)?.code.toLowerCase()}.png`} 
                                 className="w-full h-full object-cover"
                                 alt="upcoming"
                              />
                           </motion.div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
           )}

          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 shrink-0">
             {!isSatelliteView && (
               <AnimatePresence mode="wait">
                 <motion.div key="search" className="space-y-0.5 lg:space-y-2">
                   <label className="text-[8px] lg:text-[10px] text-neutral-500 font-mono uppercase tracking-widest hidden lg:block">
                     {gameType === 'flag' ? 'Confirm Identity' : 'Identify Global Territory'}
                   </label>
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
                         placeholder={isPaused ? "MISSION PAUSED" : !hasStarted ? (gameType === 'flag' ? "Type to begin Flag Decryption..." : "Type to begin Territory Identification...") : "Type country name..."}
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
             )}
          </div>


          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="hidden lg:block px-6 pb-6 space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50 space-y-3">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-neutral-500 font-mono uppercase tracking-widest">
                        {gameType === 'flag' ? 'Flag Accuracy' : 'Landmass Coverage'}
                      </span>
                      <span className="font-mono text-emerald-500">
                        {gameType === 'flag' 
                          ? `${((guessedIds.size / flagCountLimit) * 100).toFixed(1)}%` 
                          : `${guessedIds.size === COUNTRIES.length ? '100' : Math.min(99.99, percentageCovered).toFixed(2)}%`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${gameType === 'flag' ? (guessedIds.size / flagCountLimit) * 100 : percentageCovered}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>

                  {gameType === 'flag' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-cyan-500/70 font-mono uppercase tracking-widest">Surveillance Sync</span>
                        <span className="font-mono text-cyan-400">{guessedIds.size} / {flagCountLimit}</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (guessedIds.size / flagCountLimit) * 100)}%` }}
                          className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                        />
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

              {!isSatelliteView && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 animate-fade-in">
                      <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Guessed</span>
                      <span className="text-xl font-bold">
                        {guessedIds.size} <span className="text-[9px] font-normal text-neutral-600">/ {gameType === 'flag' ? flagCountLimit : COUNTRIES.length}</span>
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 animate-fade-in">
                      <span className="text-[9px] text-neutral-500 font-mono uppercase block mb-1">Multiplier</span>
                      <span className="text-xl font-bold text-emerald-500">
                        x{currentMultiplier.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Threat Level Selector Dial */}
                  {gameType === 'typing' && typerMode === 'rogue' && (
                    <div className="p-2 bg-neutral-950/90 border border-neutral-800/80 rounded-xl text-xs font-mono shadow-md flex flex-col gap-2 select-none shrink-0 border-rose-500/10">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-cyan-400" /> THREAT SECTORS
                        </span>
                        <span className="text-[7.5px] font-extrabold text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/50 leading-none">
                          XP Mult: {SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty].scoreMultiplier.toFixed(1)}x
                        </span>
                      </div>

                      {/* Threat selector options grid */}
                      <div className="grid grid-cols-5 gap-1 py-0.5 text-center w-full">
                        {[1, 2, 3, 4, 5].map((lvl) => {
                          const config = SUPPLY_DIFFICULTY_CONFIGS[lvl];
                          const isCurrent = supplyDifficulty === lvl;
                          const colors: Record<number, string> = {
                            1: "border-purple-500/30 text-purple-400 hover:bg-purple-500/5 hover:border-purple-500/60",
                            2: "border-rose-500/30 text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/60",
                            3: "border-amber-500/30 text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/60",
                            4: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/5 hover:border-cyan-500/60",
                            5: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/60",
                          };
                          const activeBg: Record<number, string> = {
                            1: "bg-purple-500/15 border-purple-500 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]",
                            2: "bg-rose-500/15 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]",
                            3: "bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
                            4: "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]",
                            5: "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
                          };
                          return (
                            <button
                              key={`global-threat-lvl-${lvl}`}
                              onClick={() => {
                                setSupplyDifficulty(lvl);
                                try {
                                  playSynthSound('success');
                                } catch (_) {}
                              }}
                              className={cn(
                                "py-1 rounded font-black cursor-pointer border transition-all text-center flex flex-col items-center justify-center gap-0.5",
                                isCurrent 
                                  ? activeBg[lvl] + " font-black scale-[1.03]"
                                  : "bg-neutral-900/60 border-neutral-800 text-neutral-500 " + colors[lvl]
                              )}
                              title={`${config.badge}: ${config.name}`}
                            >
                              <span className="text-[6px] opacity-65 font-bold leading-none tracking-wider font-mono">LVL</span>
                              <span className="text-[10px] leading-none font-extrabold font-mono">{lvl}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Metadata block for the selected threat configuration */}
                      <div className="w-full text-center px-1.5 py-1 bg-neutral-900/40 border border-neutral-800/40 rounded-lg">
                        <div className="flex justify-between items-center text-[8px] mb-0.5 font-bold">
                          <span className={cn(
                            "tracking-wider uppercase",
                            supplyDifficulty === 1 && "text-purple-400",
                            supplyDifficulty === 2 && "text-rose-400",
                            supplyDifficulty === 3 && "text-amber-400",
                            supplyDifficulty === 4 && "text-cyan-400",
                            supplyDifficulty === 5 && "text-emerald-400"
                          )}>
                            SEC {supplyDifficulty} • {SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty].badge}
                          </span>
                          <span className="text-neutral-500 font-mono text-[7px]">
                            {SUPPLY_DIFFICULTY_CONFIGS[supplyDifficulty].name.toUpperCase()}
                          </span>
                        </div>
                        {(() => {
                          const rules: Record<number, string[]> = {
                            1: [
                              "1. IMMUNE: Save a region 5 times to gain permanent Outbreak Immunity on it.",
                              "2. BREAK: 5 consecutive same-continent saves triggers a 15s disease reprieve."
                            ],
                            2: [
                              "1. IMMUNE: Save a region 4 times to gain permanent Outbreak Immunity on it.",
                              "2. BREAK: 4 consecutive same-continent saves triggers a 30s disease reprieve."
                            ],
                            3: [
                              "1. IMMUNE: Save a region 3 times to gain permanent Outbreak Immunity on it.",
                              "2. BREAK: 3 consecutive same-continent saves triggers a 45s disease reprieve."
                            ],
                            4: [
                              "1. IMMUNE: Save a region 2 times to gain permanent Outbreak Immunity on it.",
                              "2. BREAK: Secure adjacent bordering same-continent country for a 60s reprieve."
                            ],
                            5: [
                              "1. IMMUNE: Save a region 1 time (only once!) to gain permanent Outbreak Immunity on it.",
                              "2. BREAK: Secure distal non-bordering country on same continent for a 75s reprieve."
                            ]
                          };
                          const currentRules = rules[supplyDifficulty] || rules[3];
                          return (
                            <p className="text-[7.5px] text-neutral-400 font-mono text-left leading-snug block max-w-full font-medium">
                              {currentRules[0]}<br />
                              {currentRules[1]}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {gameType === 'typing' && typerMode === 'supply_chain' && (
                    <div className="p-2 bg-neutral-950/90 border border-neutral-800/80 rounded-xl text-xs font-mono shadow-md flex flex-col gap-1.5 select-none shrink-0 max-w-full border-amber-500/10">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-amber-400 animate-pulse" /> THREAT SECTORS
                        </span>
                        <span className="text-[7.5px] font-extrabold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/50 leading-none">
                          XP Mult: {(SUPPLY_CHAIN_L_CONFIGS[supplyDifficulty] || SUPPLY_CHAIN_L_CONFIGS[2]).scoreMultiplier.toFixed(1)}x
                        </span>
                      </div>

                      {/* Threat selector options grid */}
                      <div className="grid grid-cols-3 gap-1.5 py-0.5 text-center w-full">
                        {[1, 2, 3].map((lvl) => {
                          const config = SUPPLY_CHAIN_L_CONFIGS[lvl];
                          const isCurrent = supplyDifficulty === lvl;
                          const colors: Record<number, string> = {
                            1: "border-red-500/30 text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/60",
                            2: "border-amber-500/30 text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/60",
                            3: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/60",
                          };
                          const activeBg: Record<number, string> = {
                            1: "bg-rose-500/15 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.3)]",
                            2: "bg-amber-500/15 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
                            3: "bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
                          };
                          return (
                            <button
                              key={`chain-threat-lvl-${lvl}`}
                              onClick={() => {
                                setSupplyDifficulty(lvl);
                                try {
                                  playSynthSound('success');
                                } catch (_) {}
                              }}
                              className={cn(
                                "py-1 rounded font-black cursor-pointer border transition-all text-center flex flex-col items-center justify-center gap-0.5",
                                isCurrent 
                                  ? activeBg[lvl] + " font-black scale-[1.03]"
                                  : "bg-neutral-900/60 border-neutral-800 text-neutral-500 " + colors[lvl]
                              )}
                              title={`${config.badge}: ${config.name}`}
                            >
                              <span className="text-[6px] opacity-65 font-bold leading-none tracking-wider font-mono">LVL</span>
                              <span className="text-[10px] leading-none font-extrabold font-mono">{lvl}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-4 lg:pb-6 custom-scrollbar space-y-4">
               {gameType === 'typing' && typerMode === 'rogue' ? (
                 <div className="space-y-4">
                    {/* Header Notification */}
                    <div className="flex items-center justify-between border-b border-rose-950/40 pb-2">
                      <label className="text-[10px] text-rose-500 font-mono uppercase tracking-widest animate-pulse flex items-center gap-1.5 font-black">
                         <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                         GRID INTRUSION THREAT
                      </label>
                      <span className="text-[9px] font-mono bg-rose-950/50 text-rose-300 border border-rose-900/50 px-1.5 py-0.5 rounded uppercase">
                        Sectors Affected: {infectedIds.size} / 120
                      </span>
                    </div>

                    {/* Tactical EMP Charge Dock */}
                    <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-2.5 relative overflow-hidden shadow-inner">
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-500 animate-pulse shrink-0" />
                          EMP CAPACITOR SHUNT
                        </span>
                        <span className={cn(
                          "text-[10px] font-mono font-black",
                          rogueEmpCharge >= 100 ? "text-yellow-400 animate-bounce" : "text-neutral-500"
                        )}>
                          {rogueEmpCharge}% {rogueEmpCharge >= 100 ? "READY" : "CHARGING"}
                        </span>
                      </div>
                      {/* Progress Bar Container */}
                      <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80 p-0.5">
                        <motion.div 
                          className={cn(
                            "h-full rounded-full",
                            rogueEmpCharge >= 100 
                              ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.65)]" 
                              : "bg-cyan-500"
                          )}
                          style={{ width: `${rogueEmpCharge}%` }}
                          animate={{ width: `${rogueEmpCharge}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      
                      {/* Activation Button */}
                      <button
                        onClick={triggerRogueEmp}
                        disabled={rogueEmpCharge < 100}
                        className={cn(
                          "w-full py-2 px-2.5 rounded-lg font-mono text-[9px] font-black tracking-widest uppercase transition-all duration-300 border",
                          rogueEmpCharge >= 100 
                            ? "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-neutral-950 border-yellow-300 cursor-pointer active:scale-95" 
                            : "bg-neutral-950/50 border-neutral-900 text-neutral-600 cursor-not-allowed"
                        )}
                      >
                        {rogueEmpCharge >= 100 ? "⚡ COMPRESS RADAR [CLICK TO FIRE BLAST]" : "⚡ SECURE ADJACENT ZONES TO ACCELERATE"}
                      </button>
                    </div>

                    {/* Left/Right Grid Lists for Outbreaks and Firewalls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Threat list */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-rose-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                          ⚠️ SECTORS Compromised ({infectedIds.size})
                        </span>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar border border-neutral-900 bg-neutral-950/20 rounded-lg p-2">
                          {[...infectedIds].map((id, index) => {
                            const country = COUNTRIES.find(c => c.id === id);
                            if (!country) return null;
                            const isLastInfected = index === infectedIds.size - 1;
                            const displayName = isLastInfected 
                              ? country.name 
                              : country.name.replace(/[a-zA-Z0-9]/g, 'x');
                            return (
                              <motion.div 
                                key={`infected-list-${id}`}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                  "flex items-center justify-between p-1.5 rounded transition-all border",
                                  isLastInfected 
                                    ? "bg-red-500/10 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.25)] font-bold" 
                                    : "bg-red-950/5 border-red-900/10"
                                )}
                              >
                                <span className={cn(
                                  "text-[10px] font-mono uppercase tracking-wider truncate max-w-[124px]",
                                  isLastInfected ? "text-red-400 font-black animate-pulse" : "text-neutral-600 font-normal"
                                )}>
                                  {displayName}
                                </span>
                                <span className={cn(
                                  "text-[8px] font-mono font-bold shrink-0",
                                  isLastInfected ? "text-red-400 animate-pulse" : "text-red-900"
                                )}>
                                  {isLastInfected ? "NEW!" : "CRIT"}
                                </span>
                              </motion.div>
                            );
                          })}
                          {infectedIds.size === 0 && (
                            <div className="text-center py-4 text-emerald-500 font-mono text-xs">
                              ✓ Isolated. No infection.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Firewall list */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-cyan-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          🛡️ FIREWALL BARRIERS ({shieldedIds.size})
                        </span>
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar border border-neutral-900 bg-neutral-950/20 rounded-lg p-2">
                          {[...shieldedIds].map(id => {
                            const country = COUNTRIES.find(c => c.id === id);
                            if (!country) return null;
                            return (
                              <motion.div 
                                key={`shielded-list-${id}`}
                                initial={{ opacity: 0, x: 5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between p-1.5 rounded bg-cyan-950/20 border border-cyan-900/30 text-cyan-100"
                              >
                                <span className="text-[10px] font-mono uppercase tracking-wider truncate max-w-[120px] font-medium">{country.name}</span>
                                <span className="text-[8px] font-mono text-cyan-400 font-bold shrink-0">SHIELD</span>
                              </motion.div>
                            );
                          })}
                          {shieldedIds.size === 0 && (
                            <div className="text-center py-2.5 text-neutral-500 font-mono text-[9px] leading-relaxed">
                              *No Firewalls. Secure borderline areas to block viral spreads!*
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Grid Log Feed Console */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider block font-bold flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-cyan-500 shrink-0" />
                        SECURE LOGGING TERMINAL
                      </span>
                      <div className="bg-neutral-950 rounded-lg border border-neutral-900 p-2.5 h-[130px] overflow-y-auto font-mono text-[9px] text-neutral-400 space-y-1 custom-scrollbar">
                        {rogueLogs.map(log => (
                          <div 
                            key={log.id} 
                            className={cn(
                              "leading-relaxed break-words border-l-2 pl-1.5 my-0.5",
                              log.type === 'warn' ? 'border-rose-600 text-rose-400 bg-rose-950/5' :
                              log.type === 'success' ? 'border-emerald-600 text-emerald-400 bg-emerald-950/5' :
                              'border-cyan-600 text-cyan-400 bg-cyan-950/5'
                            )}
                          >
                            {log.text}
                          </div>
                        ))}
                        {rogueLogs.length === 0 && (
                          <div className="text-neutral-600 italic py-2">SYSTEM STANDBY. INBOUND METRICS IDLE...</div>
                        )}
                      </div>
                    </div>
                 </div>
               ) : gameType === 'typing' && typerMode === 'supply_chain' ? (
                 <div>
                    <label className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest block mb-2 lg:mb-4 sticky top-0 bg-[#0c0c0c] py-2 z-10 flex items-center gap-1.5 font-bold font-sans">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 font-sans" />
                      🛰️ FLIGHTPATH ROUTER
                    </label>

                    {/* Tactical Flight Profile with Inline Route Shuffling */}
                    <div className="p-3 bg-neutral-950/90 border border-neutral-800 rounded-xl space-y-2 mb-3 text-xs font-mono pb-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5 opacity-80 text-[7.5px] tracking-wider text-neutral-500 font-bold">
                        <span>PROFILE: CORRIDOR-INT</span>
                        {!hasStarted || isFinished ? (
                          <button
                            onClick={() => {
                              loadSupplyChainPreset('random_dynamic');
                              playSynthSound('purge');
                            }}
                            className="text-cyan-400 hover:text-cyan-300 font-extrabold uppercase shrink-0 flex items-center gap-1 transition-colors cursor-pointer select-none"
                            title="Reforge another randomized dynamic route pair"
                          >
                            <RefreshCcw className="w-2.5 h-2.5 hover:animate-spin" /> SHUFFLE ROUTE
                          </button>
                        ) : (
                          <span className="text-cyan-500">ACTIVE LINK</span>
                        )}
                      </div>

                      {supplyChainCrisisMessage && (
                        <div className="text-[9.5px] text-cyan-400 animate-pulse border-b border-cyan-500/25 pb-1.5 mb-1.5 font-bold uppercase tracking-wider">
                          {supplyChainCrisisMessage}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-1 py-1 text-center text-[10px]">
                        <div className="flex flex-col bg-[#111112] p-1.5 rounded border border-neutral-900">
                          <span className="text-[7.5px] text-neutral-500 font-bold mb-0.5">START</span>
                          <span className="text-emerald-400 font-bold truncate">
                            {COUNTRIES.find(c => c.id === supplyChainStartId)?.name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col bg-[#111112] p-1.5 rounded border border-cyan-950/40">
                          <span className="text-[7.5px] text-cyan-400 font-bold mb-0.5">ACTIVE</span>
                          <span className="text-cyan-300 font-extrabold truncate animate-pulse">
                            {COUNTRIES.find(c => c.id === supplyChainActiveId)?.name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col bg-[#111112] p-1.5 rounded border border-neutral-900">
                          <span className="text-[7.5px] text-neutral-500 font-bold mb-0.5">DESTINATION</span>
                          <span className="text-blue-400 font-bold truncate">
                            {COUNTRIES.find(c => c.id === supplyChainEndId)?.name || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {supplyChainBFSData && (
                        <div className="pt-2 border-t border-neutral-900 space-y-1.5 mt-1.5">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-neutral-500 font-semibold">ROUTE STATUS:</span>
                            {supplyChainBFSData.solvable ? (
                              <span className="text-emerald-400 font-bold uppercase">SECURED & SOLVABLE</span>
                            ) : supplyChainBFSData.hasDetour ? (
                              <span className="text-amber-400 font-bold uppercase">DETOUR ADVISORY</span>
                            ) : (
                              <span className="text-red-500 font-bold uppercase animate-pulse">PATH SEVERED</span>
                            )}
                          </div>
                          {supplyChainBFSData.distance >= 0 && (
                            <div className="flex justify-between items-center text-[9px]">
                              <span className="text-neutral-500 font-semibold">EST. SECTOR JUMPS:</span>
                              <span className="text-cyan-400 font-bold font-mono">
                                {supplyChainBFSData.distance} {supplyChainBFSData.distance === 1 ? 'SECTOR' : 'SECTORS'}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-neutral-500 font-semibold">RECOM. WAYPOINT:</span>
                            <span className={cn(
                              "font-bold font-mono text-[9px] tracking-tight text-right shrink-0 max-w-[150px] truncate",
                              supplyChainBFSData.solvable ? "text-amber-400" : "text-red-400 font-semibold"
                            )}>
                              {supplyChainBFSData.nextHop.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tactical Support Grid Dashboard */}
                    <div className="p-3 bg-neutral-950/85 border border-cyan-500/10 rounded-xl mb-3 text-xs font-mono shadow-md">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" /> SUPPORT CONSOLE
                        </span>
                        <span className="text-[8px] text-neutral-500 font-bold bg-neutral-900/50 px-1.5 py-0.5 rounded border border-neutral-800">
                          COMBO: <span className="text-cyan-400 font-bold">{supplyConsecutiveLinks}/4</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* 1. EMP OVERRIDE */}
                        <button
                          onClick={triggerSupplyOverride}
                          disabled={supplyOverrideCharges <= 0}
                          title="EMP Override: Polarize latest decayed node or blockade"
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer relative select-none",
                            supplyOverrideCharges > 0
                              ? "bg-cyan-500/5 hover:bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-sm active:scale-95"
                              : "bg-neutral-900/30 border-neutral-900/50 text-neutral-600 cursor-not-allowed"
                          )}
                        >
                          <Zap className={cn("w-3.5 h-3.5 mb-1.5", supplyOverrideCharges > 0 && "animate-pulse")} />
                          <span className="text-[7.5px] font-bold block leading-none">EMP LINK</span>
                          <span className={cn(
                            "text-[10px] font-extrabold mt-1 px-1.5 py-0.2 rounded font-mono leading-none",
                            supplyOverrideCharges > 0 ? "bg-cyan-950/85 text-cyan-400 border border-cyan-800/40" : "text-neutral-600"
                          )}>{supplyOverrideCharges}</span>
                        </button>

                        {/* 2. RADAR SCAN */}
                        <button
                          onClick={triggerRadarScan}
                          disabled={supplyRadarScans <= 0}
                          title="Optimal Waypoint Radar: Identify target neighboring sector"
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer relative select-none",
                            supplyRadarScans > 0
                              ? "bg-amber-500/5 hover:bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-sm active:scale-95"
                              : "bg-neutral-900/30 border-neutral-900/50 text-neutral-600 cursor-not-allowed"
                          )}
                        >
                          <Satellite className="w-3.5 h-3.5 mb-1.5" />
                          <span className="text-[7.5px] font-bold block leading-none">RADAR MAP</span>
                          <span className={cn(
                            "text-[10px] font-extrabold mt-1 px-1.5 py-0.2 rounded font-mono leading-none",
                            supplyRadarScans > 0 ? "bg-amber-950/85 text-amber-400 border border-amber-800/40" : "text-neutral-600"
                          )}>{supplyRadarScans}</span>
                        </button>

                        {/* 3. CHOKE DISRUPTOR */}
                        <button
                          onClick={triggerChokeDisruptor}
                          disabled={supplyDisruptors <= 0}
                          title="Choke Disruptor: Dissolve active choke blockades"
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer relative select-none",
                            supplyDisruptors > 0
                              ? "bg-rose-500/5 hover:bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-sm active:scale-95"
                              : "bg-neutral-900/30 border-neutral-900/50 text-neutral-600 cursor-not-allowed"
                          )}
                        >
                          <Shield className="w-3.5 h-3.5 mb-1.5" />
                          <span className="text-[7.5px] font-bold block leading-none">DISRUPT</span>
                          <span className={cn(
                            "text-[10px] font-extrabold mt-1 px-1.5 py-0.2 rounded font-mono leading-none",
                            supplyDisruptors > 0 ? "bg-rose-950/85 text-rose-400 border border-rose-800/40" : "text-neutral-600"
                          )}>{supplyDisruptors}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar border-t border-neutral-900/40 pt-2 pb-1">
                      <span className="text-[8.5px] text-neutral-500 font-mono uppercase block mb-1 font-bold">GRID PATH CHANNELS LINKED:</span>
                      {supplyChainPathList.map((id, index) => {
                        const country = COUNTRIES.find(c => c.id === id);
                        if (!country) return null;
                        const isDecaying = supplyChainDecayIds.has(id);
                        const isChoking = supplyChainChokeIds.has(id);
                        return (
                          <div 
                            key={`path-list-${id}-${index}`}
                            className={cn(
                              "flex items-center gap-2 p-1 px-1.5 rounded text-[10.5px] font-mono border transition-all duration-300",
                              isDecaying ? "bg-amber-950/15 border-amber-500/30 text-amber-300" :
                              isChoking ? "bg-red-950/15 border-red-500/30 text-red-300 animate-pulse" :
                              "bg-neutral-900/40 border-cyan-500/10 text-cyan-300"
                            )}
                          >
                            <span className="text-[8.5px] text-neutral-500">#{index+1}</span>
                            <span className="truncate flex-1 font-semibold">{country.name}</span>
                            <span className={cn(
                              "text-[7px] font-extrabold tracking-wider",
                              isDecaying ? "text-amber-500" : isChoking ? "text-red-500" : "text-cyan-400"
                            )}>
                              {isDecaying ? "DECAY" : isChoking ? "CHOKED" : "LINKED"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
               ) : !isMemoryMode ? (
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
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-20 select-none">
                    <Brain className="w-12 h-12 mb-4 text-purple-400" />
                    <span className="text-[10px] font-mono uppercase tracking-widest leading-relaxed">
                      Memory Mode Active<br/>
                      Stealth Protocols Engaged<br/>
                      Lists are Classified
                    </span>
                 </div>
               )}

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
                      placeholder={isPaused ? "MISSION PAUSED" : !hasStarted ? (gameType === 'flag' ? "Press START to identify flag" : "Press ENTER to start mapping") : "Type country name..."}
                      className="w-full bg-black/50 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 transition-all font-semibold placeholder:text-neutral-700"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 bg-black/50 border border-neutral-800 rounded-lg flex flex-col justify-center min-w-[70px]">
                      <span className="text-[7px] text-neutral-500 uppercase font-mono tracking-widest leading-none mb-1">Guessed</span>
                      <span className="text-[11px] font-bold text-white leading-none">{guessedIds.size} / {gameType === 'flag' ? flagCountLimit : COUNTRIES.length}</span>
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
                onClick={() => setFeedback({ text: `IDENTIFIED: ${guessedIds.size} / ${gameType === 'flag' ? flagCountLimit : COUNTRIES.length}`, type: 'info' })}
                className="w-10 h-10 bg-[#121212]/90 backdrop-blur-md border border-neutral-800 rounded-full flex items-center justify-center text-emerald-500 shadow-2xl"
             >
                <CheckCircle2 className="w-5 h-5" />
             </button>
          </div>

          <AnimatePresence>
            {showFlagHintPanel && gameType === 'flag' && !isFinished && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="absolute right-6 top-6 bottom-6 w-72 bg-[#121212]/95 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-5 shrink-0">
                  <div className="flex flex-col">
                    <h3 className="text-md font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                       <Shuffle className="w-4 h-4 text-emerald-500" />
                       Flag Database
                    </h3>
                    <span className="text-[9px] text-emerald-500/60 font-mono font-bold tracking-widest uppercase">Decryption Assistance</span>
                  </div>
                  <button 
                    onClick={() => setShowFlagHintPanel(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-white transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    {COUNTRIES.filter(c => !guessedIds.has(c.id)).sort((a,b) => a.name.localeCompare(b.name)).map(country => (
                      <button
                        key={country.id}
                        onClick={() => {
                          setInputValue(country.name);
                          inputRef.current?.focus();
                        }}
                        className="group relative aspect-[3/2] rounded-xl overflow-hidden border border-white/5 bg-neutral-900 hover:border-emerald-500/50 transition-all active:scale-95"
                      >
                        <img 
                          src={`https://flagcdn.com/w160/${country.code.toLowerCase()}.png`}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          alt={country.name}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[7.5px] font-bold text-white uppercase truncate text-center">{country.name}</p>
                        </div>
                        {isMemoryMode && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                        )}
                      </button>
                    ))}
                  </div>
                  {COUNTRIES.filter(c => !guessedIds.has(c.id)).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                      <Target className="w-10 h-10 mb-4" />
                      <p className="text-[10px] font-mono uppercase">All identities decrypted</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                          key={entry.id ? `${entry.id}-${i}` : `${entry.name}-${i}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedRecordIndex(i);
                            setRecordTerritorySearch('');
                            if (entry.gameType === 'typing' && entry.typerMode === 'rogue') {
                              setExpansionPanelTab('rogue');
                            } else if (entry.gameType === 'typing' && entry.typerMode === 'supply_chain') {
                              setExpansionPanelTab('supply_route');
                            } else {
                              setExpansionPanelTab('countries');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setSelectedRecordIndex(i);
                              setRecordTerritorySearch('');
                              if (entry.gameType === 'typing' && entry.typerMode === 'rogue') {
                                setExpansionPanelTab('rogue');
                              } else if (entry.gameType === 'typing' && entry.typerMode === 'supply_chain') {
                                setExpansionPanelTab('supply_route');
                              } else {
                                setExpansionPanelTab('countries');
                              }
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
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[9px] text-neutral-500 uppercase">
                                {/* Game Type Icon + Label */}
                                <span className={cn(
                                  "flex items-center gap-1 px-1.5 py-0.5 rounded border select-none font-bold",
                                  entry.gameType === 'flag' 
                                    ? "bg-rose-950/40 border-rose-500/20 text-rose-400" 
                                    : entry.gameType === 'highlight' 
                                      ? "bg-amber-950/40 border-amber-500/10 text-amber-400" 
                                      : "bg-cyan-950/40 border-cyan-500/10 text-cyan-400"
                                )}>
                                  {entry.gameType === 'flag' ? (
                                    <>
                                      <Flag className="w-2.5 h-2.5" />
                                      <span>Flag</span>
                                    </>
                                  ) : entry.gameType === 'highlight' ? (
                                    <>
                                      <Target className="w-2.5 h-2.5" />
                                      <span>Country</span>
                                    </>
                                  ) : (
                                    <>
                                      <Keyboard className="w-2.5 h-2.5" />
                                      <span>
                                        {entry.typerMode === 'supply_chain' ? 'TYPER(S)' :
                                         entry.typerMode === 'rogue' ? 'TYPER(R)' : 'TYPER'}
                                      </span>
                                    </>
                                  )}
                                </span>

                                {/* Mode Indicator */}
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded border font-bold",
                                  entry.mode === 'challenge' 
                                    ? "bg-rose-950/20 border-rose-500/10 text-rose-500" 
                                    : "bg-emerald-950/20 border-emerald-500/10 text-emerald-500"
                                )}>
                                  {entry.mode === 'challenge' ? 'Challenge' : 'Zen'}
                                </span>

                                {/* Completion Duration */}
                                <span className="text-neutral-600">
                                  Time: <span className="text-neutral-400 font-bold">{formatTime(entry.duration || 0)}</span>
                                </span>

                                {entry.isMemoryMode && (
                                  <span className="flex items-center gap-1 bg-purple-950/40 border border-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                                    <Brain className="w-2.5 h-2.5" />
                                    <span>Memory</span>
                                  </span>
                                )}
                              </div>
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
                               projectionType={isGlobeMode ? 'orthographic' : 'mercator'}
                               isMemoryMode={false}
                               isPaused={false}
                               isSatelliteView={isSatelliteView}
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
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{leaderboard[selectedRecordIndex].name}</h3>
                                {isAdmin && leaderboard[selectedRecordIndex].userEmail && (
                                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg lowercase select-all">
                                    {leaderboard[selectedRecordIndex].userEmail}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-500">
                                  <Trophy className="w-3 h-3" /> {leaderboard[selectedRecordIndex].score.toLocaleString()} Points
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-neutral-500">
                                  <MapIcon className="w-3 h-3" /> {leaderboard[selectedRecordIndex].guessedIds?.length || 0} Territories
                                </div>
                                <div className="text-[10px] font-mono uppercase text-neutral-500">
                                  {leaderboard[selectedRecordIndex].date} at {leaderboard[selectedRecordIndex].time} • {leaderboard[selectedRecordIndex].mode === 'challenge' ? `Challenge (${leaderboard[selectedRecordIndex].limit}m)` : 'Zen Mode'} • {leaderboard[selectedRecordIndex].isMemoryMode && <span className="text-purple-400 font-bold">STEALTH (1.5X) • </span>}{leaderboard[selectedRecordIndex].mode === 'challenge' && (leaderboard[selectedRecordIndex].duration || 0) >= (leaderboard[selectedRecordIndex].limit || 0) * 60 ? <span className="text-rose-500 font-bold">TIMED OUT</span> : `Completed in ${formatTime(leaderboard[selectedRecordIndex].duration || 0)}`}
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
                animate={
                  (gameType === 'typing' && typerMode === 'rogue' && hasStarted && !isPaused && !isFinished)
                    ? {
                        opacity: 1,
                        x: infectedIds.size >= 80 ? [0, -4.5, 4.5, -4.5, 4.5, -2, 2, 0] :
                           infectedIds.size >= 40 ? [0, -2.5, 2.5, -2.5, 2.5, -1, 1, 0] :
                           infectedIds.size >= 15 ? [0, -1, 1, -1, 1, 0] : 
                           isRogueShaking ? [0, -3, 3, -3, 3, -1, 1, 0] : 0,
                        y: infectedIds.size >= 80 ? [0, 3.5, -3.5, 3.5, -3.5, 1, -1, 0] :
                           infectedIds.size >= 40 ? [0, 1.8, -1.8, 1.8, -1.8, 0.5, -0.5, 0] :
                           infectedIds.size >= 15 ? [0, 0.8, -0.8, 0.8, -0.8, 0] : 
                           isRogueShaking ? [0, 1.5, -1.5, 1.5, -1.5, 0.5, -0.5, 0] : 0,
                      }
                    : isRogueShaking 
                      ? {
                          opacity: 1,
                          x: [0, -3, 3, -3, 3, -1, 1, 0],
                          y: [0, 1.5, -1.5, 1.5, -1.5, 0.5, -0.5, 0],
                        }
                      : { opacity: 1 }
                }
                transition={
                  (gameType === 'typing' && typerMode === 'rogue' && hasStarted && !isPaused && !isFinished && infectedIds.size >= 15)
                    ? {
                        x: { 
                          repeat: Infinity, 
                          duration: infectedIds.size >= 80 ? 0.16 : infectedIds.size >= 40 ? 0.28 : 0.45, 
                          ease: "linear" 
                        },
                        y: { 
                          repeat: Infinity, 
                          duration: infectedIds.size >= 80 ? 0.20 : infectedIds.size >= 40 ? 0.32 : 0.50, 
                          ease: "linear" 
                        }
                      }
                    : isRogueShaking 
                      ? { duration: 0.35, ease: "easeInOut" } 
                      : { duration: 0.3 }
                }
                exit={{ opacity: 0 }}
                className="flex-1 relative"
              >
                <WorldMap 
                  guessedIds={guessedIds} 
                  highlightedId={gameType === 'highlight' ? currentTargetHighlightId : lastGuessedId} 
                  isFinished={isFinished} 
                  focusedContinent={focusedContinent}
                  projectionType={isGlobeMode ? 'orthographic' : 'mercator'}
                  isMemoryMode={isMemoryMode}
                  isPaused={isPaused}
                  highlightedAllianceMemberIds={highlightedAllianceMemberIds}
                  plotContinentsColorMode={plotContinentsColorMode}
                  gameType={gameType}
                  isSatelliteView={isSatelliteView}
                  infectedIds={infectedIds}
                  shieldedIds={shieldedIds}
                  immuneCountryIds={immuneCountryIds}
                  supplyChainStartId={supplyChainStartId}
                  supplyChainEndId={supplyChainEndId}
                  supplyChainActiveId={supplyChainActiveId}
                  supplyChainPathIds={supplyChainPathIds}
                  supplyChainDecayIds={supplyChainDecayIds}
                  supplyChainChokeIds={supplyChainChokeIds}
                  supplyChainOverlayMode={supplyChainOverlayMode}
                />
              
                {/* Interactive Overlays */}
                {!isMemoryMode && (
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <div className="bg-[#121212]/90 backdrop-blur-sm border border-neutral-800 p-3 rounded-lg flex items-center flex-wrap gap-4 shadow-xl">
                      {typerMode === 'rogue' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-mono uppercase">Infected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-[#06b6d4]" />
                            <span className="text-[10px] font-mono uppercase">Firewall</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-[#047857]" />
                            <span className="text-[10px] font-mono uppercase">Immune</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                            <span className="text-[10px] font-mono uppercase">Secured</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-[#262626]" />
                            <span className="text-[10px] font-mono uppercase">Unknown</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
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
                      <span className="text-[10px] text-neutral-500 uppercase block">
                        {gameType === 'flag' ? "Flag Accuracy" : "Mass Clear"}
                      </span>
                      <div className="text-2xl font-black text-emerald-400 leading-none">
                        {gameType === 'flag' 
                          ? `${((guessedIds.size / flagCountLimit) * 100).toFixed(1)}%` 
                          : `${percentageCovered.toFixed(1)}%`}
                      </div>
                      <span className="text-[10px] text-neutral-600 uppercase">
                        {gameType === 'flag' ? "Decrypted" : "Territory"}
                      </span>
                    </div>
                    <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1 text-center font-mono">
                      <span className="text-[10px] text-neutral-500 uppercase block">
                        {gameType === 'flag' ? "Flags Solved" : "Wealth Secured"}
                      </span>
                      <div className="text-2xl font-black text-amber-500 leading-none">
                        {gameType === 'flag' 
                          ? `${guessedIds.size} / ${flagCountLimit}` 
                          : `${percentageWealthCovered.toFixed(1)}%`}
                      </div>
                      <span className="text-[10px] text-neutral-600 uppercase">
                        {gameType === 'flag' ? "Quantity Target" : "Global GDP"}
                      </span>
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

                  {/* Supply Chain Intercept Mode Path Comparison */}
                  {gameType === 'typing' && typerMode === 'supply_chain' && (
                    <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
                        <span>⛓ SUPPLY CHAIN ROUTE OPTIMIZATION BRIEFING</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-neutral-400 uppercase">YOUR INTERCEPT ROUTE</span>
                            <span className="text-amber-400 font-bold">{supplyChainPathList.length > 1 ? supplyChainPathList.length - 1 : 0} STEPS</span>
                          </div>
                          <div className="text-sm font-black text-white flex flex-wrap gap-1.5 pt-1">
                            {supplyChainPathList.map((id, idx) => {
                              const c = COUNTRIES.find(curr => curr.id === id);
                              if (!c) return null;
                              return (
                                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800/80 text-[10px] font-mono border border-neutral-700">
                                  {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" title="Start Point" />}
                                  {idx === supplyChainPathList.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" title="End Point" />}
                                  {idx > 0 && idx < supplyChainPathList.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />}
                                  {c.name.toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-neutral-400 uppercase">THEORETICAL OPTIMAL ROUTE (SHORTEST)</span>
                            {(() => {
                              const actualStart = supplyChainPathList[0] || supplyChainStartId;
                              const bestPath = actualStart && supplyChainEndId ? findSupplyChainPath(actualStart, supplyChainEndId, new Set()) : null;
                              const steps = bestPath && bestPath.length > 1 ? bestPath.length - 1 : 0;
                              return <span className="text-emerald-400 font-bold">{steps} STEPS</span>;
                            })()}
                          </div>
                          <div className="text-sm font-black text-white flex flex-wrap gap-1.5 pt-1">
                            {(() => {
                              const actualStart = supplyChainPathList[0] || supplyChainStartId;
                              const bestPath = actualStart && supplyChainEndId ? findSupplyChainPath(actualStart, supplyChainEndId, new Set()) : null;
                              if (!bestPath) return <span className="text-neutral-600 text-[10px] uppercase font-mono">NO FEASIBLE PATH DETECTED</span>;
                              return bestPath.map((id, idx) => {
                                const c = COUNTRIES.find(curr => curr.id === id);
                                if (!c) return null;
                                return (
                                  <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                                    {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" title="Start Point" />}
                                    {idx === bestPath!.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" title="End Point" />}
                                    {idx > 0 && idx < bestPath!.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                    {c.name.toUpperCase()}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono text-center">
                        🎯 Map Diagnostics: <span className="text-yellow-400 font-bold">[YELLOW]</span> Start point • <span className="text-blue-400 font-bold">[BLUE]</span> End point • <span className="text-emerald-400 font-bold">[GREEN]</span> Best possible route • <span className="text-amber-300 font-bold">[SOFTER YELLOW]</span> My extra detours (not in optimal shortest route)
                      </p>
                    </div>
                  )}

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
                                  projectionType={isGlobeMode ? 'orthographic' : 'mercator'}
                                  isSatelliteView={isSatelliteView}
                                  isMemoryMode={false}
                                  isPaused={false}
                                  gameType={gameType}
                                  supplyChainStartId={supplyChainStartId}
                                  supplyChainEndId={supplyChainEndId}
                                  supplyChainActiveId={supplyChainActiveId}
                                  supplyChainPathIds={supplyChainPathIds}
                                  supplyChainDecayIds={supplyChainDecayIds}
                                  supplyChainChokeIds={supplyChainChokeIds}
                                  supplyChainOverlayMode={supplyChainOverlayMode}
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
                        <span className="text-emerald-500/80">Toggle Satellite View</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[CMD / CTRL] + [F]</span>
                        <span className="text-emerald-500/80">Toggle Flag Database</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[CMD / CTRL] + [G]</span>
                        <span className="text-emerald-500/80">Toggle Globe View</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[CMD / CTRL] + [B]</span>
                        <span className="text-emerald-500/80">Rotation Speed Dial</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">[ALT] or [CMD] + [F8]</span>
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
                    <Flag className="w-5 h-5" />
                  </div>
                  <button 
                    onClick={() => setIsGlobeMode(!isGlobeMode)}
                    className={cn(
                      "p-2 rounded-lg border transition-all h-10 w-10 flex items-center justify-center",
                      isGlobeMode 
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                        : "bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:text-white"
                    )}
                    title="Toggle Globe View"
                  >
                    <Globe2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowSurveyStatsPopup(prev => !prev)}
                    className={cn(
                      "p-2 rounded-lg border transition-all h-10 w-10 flex items-center justify-center cursor-pointer",
                      showSurveyStatsPopup 
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                        : "bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:text-white"
                    )}
                    title="Display Tactical Console Stats"
                  >
                    <Terminal className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Territorial Expansion Survey</h2>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
                       Agent: <span className="text-emerald-500">{viewingRecord.name}</span> 
                       <span className="opacity-30">•</span> 
                       Efficiency: <span className="text-emerald-500">
                         {viewingRecord.gameType === 'flag' 
                           ? `${Math.round(((viewingRecord.guessedIds?.length || 0) / (viewingRecord.flagCountLimit || 20)) * 100)}%`
                           : `${viewingRecord.guessedIds?.length === COUNTRIES.length ? '100' : Math.min(99, Math.round(((viewingRecord.guessedIds?.length || 0) / COUNTRIES.length) * 100))}%`
                         }
                       </span>
                       {viewingRecord.isMemoryMode && (
                         <>
                           <span className="opacity-30">•</span>
                           <span className="text-purple-400 flex items-center gap-1">
                             <Brain className="w-2.5 h-2.5" />
                             Memory Mode (+50% Bonus)
                           </span>
                         </>
                       )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 relative">
                  {!isSearchAtBottom && (
                    <>
                  {/* Always-visible Inline Search Bar */}
                  <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/25 w-48 sm:w-64 lg:w-72 transition-all">
                    <Search className="w-4 h-4 text-neutral-500 mr-2 shrink-0" />
                    <input
                      ref={surveySearchInputRef}
                      type="text"
                      value={surveySearchQuery}
                      onChange={(e) => {
                        setSurveySearchQuery(e.target.value);
                        if (!showSurveySearch) {
                          setShowSurveySearch(true);
                        }
                      }}
                      onFocus={() => {
                        setShowSurveySearch(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const trimmed = surveySearchQuery.trim().toLowerCase();
                          if (trimmed) {
                            const matches = COUNTRIES.filter(c => 
                              c.name.toLowerCase().includes(trimmed) || 
                              (c.capital && c.capital.toLowerCase().includes(trimmed)) ||
                              c.code.toLowerCase().includes(trimmed)
                            );
                            if (matches.length > 0) {
                              setSelectedExpandedCountryId(matches[0].id);
                              surveySearchInputRef.current?.blur();
                              setSurveySearchQuery("");
                              setShowSurveySearch(false);
                            }
                          }
                        } else if (e.key === 'Escape') {
                          surveySearchInputRef.current?.blur();
                          setSurveySearchQuery("");
                          setShowSurveySearch(false);
                        }
                      }}
                      placeholder="Search sectors..."
                      className="w-full bg-transparent border-none text-xs font-mono text-white placeholder-neutral-500 outline-none"
                    />
                    {surveySearchQuery && (
                      <button 
                        onClick={() => {
                          setSurveySearchQuery("");
                          setShowSurveySearch(false);
                        }}
                        className="text-neutral-500 hover:text-white shrink-0 ml-1.5 cursor-pointer"
                        title="Clear query"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Console Search Popover Overlay */}
                  <AnimatePresence>
                    {showSurveySearch && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-12 top-12 z-50 w-80 bg-neutral-950/98 backdrop-blur-md border border-emerald-500/40 p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] font-mono text-xs text-neutral-200"
                      >
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-3 cursor-default">
                          <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 animate-pulse" /> SEARCH SECTORS
                          </span>
                          <button 
                            onClick={() => {
                              setShowSurveySearch(false);
                              setSurveySearchQuery("");
                            }}
                            className="text-neutral-500 hover:text-white cursor-pointer"
                            title="Close Search"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Matching search list results */}
                        <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar text-left pr-1">
                          {(() => {
                            const trimmed = surveySearchQuery.trim().toLowerCase();
                            if (!trimmed) {
                              return (
                                <div className="text-[10px] text-neutral-500 italic text-center py-4 select-none">
                                  Type to search countries...
                                </div>
                              );
                            }
                            
                            const matches = COUNTRIES.filter(c => 
                              c.name.toLowerCase().includes(trimmed) || 
                              (c.capital && c.capital.toLowerCase().includes(trimmed)) ||
                              c.code.toLowerCase().includes(trimmed)
                            );
                            
                            if (matches.length === 0) {
                              return (
                                <div className="text-[10px] text-rose-500 italic text-center py-4 select-none">
                                  No matching sectors found.
                                </div>
                              );
                            }
                            
                            return matches.slice(0, 15).map(country => {
                              const isGuessed = viewingRecord.guessedIds?.includes(country.id);
                              return (
                                <button
                                  key={`search-res-${country.id}`}
                                  onClick={() => {
                                    setSelectedExpandedCountryId(country.id);
                                    setShowSurveySearch(false);
                                    setSurveySearchQuery("");
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between p-1.5 rounded hover:bg-neutral-900 border transition-all text-left truncate cursor-pointer",
                                    selectedExpandedCountryId === country.id 
                                      ? "border-emerald-500/50 bg-emerald-500/10 font-bold" 
                                      : "border-transparent text-neutral-300 hover:text-white"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img 
                                      src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} 
                                      className="h-3.5 w-5 rounded-sm object-cover border border-white/10 shrink-0" 
                                      alt="" 
                                    />
                                    <div className="truncate min-w-0">
                                      <p className="text-[11px] uppercase truncate leading-none mb-0.5">{country.name}</p>
                                      <p className="text-[8px] opacity-40 leading-none truncate">{country.capital || "Classified"}</p>
                                    </div>
                                  </div>
                                  <span className={cn(
                                    "text-[8px] font-mono border px-1 rounded uppercase font-bold shrink-0",
                                    isGuessed 
                                      ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20" 
                                      : "bg-red-950/20 text-red-500 border-red-500/10 opacity-70"
                                  )}>
                                    {isGuessed ? "Guessed" : "Missed"}
                                  </span>
                                </button>
                              );
                            });
                          })()}
                        </div>
                        
                        <div className="text-[8px] text-neutral-600 font-bold tracking-widest uppercase border-t border-neutral-900 pt-2 mt-2 flex justify-between select-none">
                          <span>PRESS ENTER TO CHOOSE</span>
                          <span>{COUNTRIES.length} SECTORS TOTAL</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </>
                  )}

                  <button 
                    onClick={() => {
                      setShowExpandedDetail(false);
                      setSelectedExpandedCountryId(null);
                      setSelectedAllianceName(null);
                      setExpansionPanelTab('countries');
                      setShowSurveyStatsPopup(false);
                      setIsContinentPanelCollapsed(false);
                      setHideSectorsStats(false);
                      setShowSurveySearch(false);
                      setSurveySearchQuery("");
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex gap-8 overflow-hidden mb-6">
                <div className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-300", isContinentPanelCollapsed ? "gap-0" : "gap-6")}>
                  <div className="flex-1 relative bg-[#0a0a0a] border border-neutral-800 rounded-3xl overflow-hidden min-h-[400px]">
                    <WorldMap 
                      guessedIds={new Set(viewingRecord.guessedIds || [])}
                      highlightedId={selectedExpandedCountryId}
                      onCountryClick={setSelectedExpandedCountryId}
                      isFinished={true}
                      focusedContinent={null}
                      projectionType={isGlobeMode ? 'orthographic' : 'mercator'}
                      isMemoryMode={false}
                      isPaused={false}
                      highlightedAllianceMemberIds={highlightedAllianceMemberIds}
                      plotContinentsColorMode={plotContinentsColorMode}
                      isSatelliteView={isSatelliteView}
                      gameType={viewingRecord.gameType}
                      infectedIds={new Set(viewingRecord.infectedIds || [])}
                      shieldedIds={new Set(viewingRecord.shieldedIds || [])}
                      immuneCountryIds={new Set(viewingRecord.immuneCountryIds || [])}
                      supplyChainStartId={viewingRecord.supplyChainStartId || (viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'supply_chain' ? supplyChainStartId : null)}
                      supplyChainEndId={viewingRecord.supplyChainEndId || (viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'supply_chain' ? supplyChainEndId : null)}
                      supplyChainPathIds={viewingRecord.supplyChainPathList ? new Set(viewingRecord.supplyChainPathList) : (viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'supply_chain' ? supplyChainPathIds : new Set())}
                      supplyChainDecayIds={viewingRecord.supplyChainDecayIds ? new Set(viewingRecord.supplyChainDecayIds) : (viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'supply_chain' ? supplyChainDecayIds : new Set())}
                      supplyChainChokeIds={viewingRecord.supplyChainChokeIds ? new Set(viewingRecord.supplyChainChokeIds) : (viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'supply_chain' ? supplyChainChokeIds : new Set())}
                      supplyChainOverlayMode={supplyChainOverlayMode}
                    />

                    {/* Centered Bottom Search Bar */}
                    {isSearchAtBottom && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                        <div className="relative flex items-center bg-neutral-950/95 backdrop-blur-md border border-emerald-500/50 rounded-xl px-4 py-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/25 w-72 sm:w-96 transition-all shadow-[0_15px_35px_rgba(0,0,0,0.95)]">
                          <Search className="w-4 h-4 text-emerald-400 mr-2.5 shrink-0" />
                          <input
                            ref={surveySearchInputRef}
                            type="text"
                            value={surveySearchQuery}
                            onChange={(e) => {
                              setSurveySearchQuery(e.target.value);
                              if (!showSurveySearch) {
                                setShowSurveySearch(true);
                              }
                            }}
                            onFocus={() => {
                              setShowSurveySearch(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const trimmed = surveySearchQuery.trim().toLowerCase();
                                if (trimmed) {
                                  const matches = COUNTRIES.filter(c => 
                                    c.name.toLowerCase().includes(trimmed) || 
                                    (c.capital && c.capital.toLowerCase().includes(trimmed)) ||
                                    c.code.toLowerCase().includes(trimmed)
                                  );
                                  if (matches.length > 0) {
                                    setSelectedExpandedCountryId(matches[0].id);
                                    surveySearchInputRef.current?.blur();
                                    setSurveySearchQuery("");
                                    setShowSurveySearch(false);
                                  }
                                }
                              } else if (e.key === 'Escape') {
                                surveySearchInputRef.current?.blur();
                                setSurveySearchQuery("");
                                setShowSurveySearch(false);
                              }
                            }}
                            placeholder="Search sectors..."
                            className="w-full bg-transparent border-none text-xs font-mono text-white placeholder-neutral-500 outline-none"
                          />
                          {surveySearchQuery && (
                            <button 
                              onClick={() => {
                                setSurveySearchQuery("");
                                setShowSurveySearch(false);
                              }}
                              className="text-neutral-500 hover:text-white shrink-0 ml-1.5 cursor-pointer"
                              title="Clear query"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-[9px] text-neutral-500 font-mono ml-2 border border-neutral-800 rounded px-1.5 py-0.5 select-none uppercase shrink-0">
                            Cmd+X
                          </span>
                        </div>

                        {/* Search list popover directly above the bottom search input! */}
                        <AnimatePresence>
                          {showSurveySearch && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-80 bg-neutral-950/98 backdrop-blur-md border border-emerald-500/40 p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] font-mono text-xs text-neutral-200"
                            >
                              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-3 cursor-default">
                                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                                  <Search className="w-3.5 h-3.5 animate-pulse" /> SEARCH SECTORS
                                </span>
                                <button 
                                  onClick={() => {
                                    setShowSurveySearch(false);
                                    setSurveySearchQuery("");
                                  }}
                                  className="text-neutral-500 hover:text-white cursor-pointer"
                                  title="Close Search"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              
                              {/* Matching search list results */}
                              <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar text-left pr-1">
                                {(() => {
                                  const trimmed = surveySearchQuery.trim().toLowerCase();
                                  if (!trimmed) {
                                    return (
                                      <div className="text-[10px] text-neutral-500 italic text-center py-4 select-none">
                                        Type to search countries...
                                      </div>
                                    );
                                  }
                                  
                                  const matches = COUNTRIES.filter(c => 
                                    c.name.toLowerCase().includes(trimmed) || 
                                    (c.capital && c.capital.toLowerCase().includes(trimmed)) ||
                                    c.code.toLowerCase().includes(trimmed)
                                  );
                                  
                                  if (matches.length === 0) {
                                    return (
                                      <div className="text-[10px] text-rose-500 italic text-center py-4 select-none">
                                        No matching sectors found.
                                      </div>
                                    );
                                  }
                                  
                                  return matches.slice(0, 15).map(country => {
                                    const isGuessed = viewingRecord.guessedIds?.includes(country.id);
                                    return (
                                      <button
                                        key={`search-res-bottom-${country.id}`}
                                        onClick={() => {
                                          setSelectedExpandedCountryId(country.id);
                                          setShowSurveySearch(false);
                                          setSurveySearchQuery("");
                                        }}
                                        className={cn(
                                          "w-full flex items-center justify-between p-1.5 rounded hover:bg-neutral-900 border transition-all text-left truncate cursor-pointer",
                                          selectedExpandedCountryId === country.id 
                                            ? "border-emerald-500/50 bg-emerald-500/10 font-bold" 
                                            : "border-transparent text-neutral-300 hover:text-white"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <img 
                                            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} 
                                            className="h-3.5 w-5 rounded-sm object-cover border border-white/10 shrink-0" 
                                            alt="" 
                                          />
                                          <div className="truncate min-w-0">
                                            <p className="text-[11px] uppercase truncate leading-none mb-0.5">{country.name}</p>
                                            <p className="text-[8px] opacity-40 leading-none truncate">{country.capital || "Classified"}</p>
                                          </div>
                                        </div>
                                        <span className={cn(
                                          "text-[8px] font-mono border px-1 rounded uppercase font-bold shrink-0",
                                          isGuessed 
                                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20" 
                                            : "bg-red-950/20 text-red-500 border-red-500/10 opacity-70"
                                        )}>
                                          {isGuessed ? "Guessed" : "Missed"}
                                        </span>
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                              
                              <div className="text-[8px] text-neutral-600 font-bold tracking-widest uppercase border-t border-neutral-900 pt-2 mt-2 flex justify-between select-none">
                                <span>PRESS ENTER TO CHOOSE</span>
                                <span>{COUNTRIES.length} SECTORS TOTAL</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Console Stats HUD Popover Overlay */}
                    <AnimatePresence>
                      {showSurveyStatsPopup && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-4 left-4 z-40 w-80 bg-neutral-950/95 backdrop-blur-md border border-cyan-500/40 p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] font-mono text-xs text-neutral-200"
                        >
                          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
                            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1.5 animate-pulse">
                              <Terminal className="w-3.5 h-3.5" /> CORE TERMINAL LOGS
                            </span>
                            <button 
                              onClick={() => setShowSurveyStatsPopup(false)}
                              className="text-neutral-500 hover:text-white cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2 text-left">
                            <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 uppercase text-[9px] font-bold">OPERATIVE ID:</span>
                              <span className="text-white font-black">{viewingRecord.name}</span>
                            </div>
                            
                            <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 uppercase text-[9px] font-bold">GAME MODE:</span>
                              <span className="text-cyan-400 font-bold uppercase text-[10px]">
                                {viewingRecord.gameType === 'typing' ? (
                                  viewingRecord.typerMode === 'supply_chain' ? 'TYPER(S)' :
                                  viewingRecord.typerMode === 'rogue' ? 'TYPER(R)' : 'TYPER'
                                ) : 
                                 viewingRecord.gameType === 'flag' ? 'Guess Flag' : 
                                 viewingRecord.gameType === 'highlight' ? 'Guess Country' : 'Surveillance'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 uppercase text-[9px] font-bold">CHALLENGE MODE:</span>
                              <span className={cn(
                                "font-bold uppercase text-[10px]",
                                viewingRecord.mode === 'challenge' ? "text-rose-400" : "text-emerald-400"
                              )}>
                                {viewingRecord.mode === 'challenge' ? 'Challenge' : 'Zen'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 uppercase text-[9px] font-bold">MEMORY STATUS:</span>
                              <span className={cn(
                                "font-bold uppercase text-[10px]",
                                viewingRecord.isMemoryMode ? "text-purple-400" : "text-neutral-500"
                              )}>
                                {viewingRecord.isMemoryMode ? 'On' : 'Off'}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 uppercase text-[9px] font-bold">SECTOR INTEL LIMIT:</span>
                              <span className="text-white font-bold">
                                {viewingRecord.gameType === 'flag' 
                                  ? `${viewingRecord.flagCountLimit || 20} Flags` 
                                  : `${COUNTRIES.length} Sectors`}
                              </span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                              <span className="text-neutral-500 uppercase text-[9px] font-bold">TIME TAKEN:</span>
                              <span className="text-white font-bold font-mono">
                                {formatTime(viewingRecord.duration)}
                              </span>
                            </div>

                            {viewingRecord.mode === 'challenge' && (
                              <div className="flex justify-between items-center py-1 border-b border-neutral-900">
                                <span className="text-neutral-500 uppercase text-[9px] font-bold">TIME LIMIT:</span>
                                <span className="text-rose-400 font-bold font-mono">
                                  {((viewingRecord.gameType === 'flag' ? viewingRecord.flagDuration : viewingRecord.limit) || 5)}:00
                                </span>
                              </div>
                            )}

                            <div className="flex justify-between items-center pt-2">
                              <span className="text-neutral-500 uppercase text-[9px] font-black">CAPTURED SCORE:</span>
                              <span className="text-emerald-500 font-black text-sm">
                                {viewingRecord.score.toLocaleString()} PTS
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Floating Tactical Search Overlay Removed - Relocated to Top Bar Header */}

                    <button 
                      onClick={() => setIsTerritorialPanelCollapsed(!isTerritorialPanelCollapsed)}
                      className={cn(
                        "absolute right-4 top-1/2 -translate-y-1/2 z-30",
                        "w-10 h-10 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center",
                        "text-neutral-500 hover:text-emerald-500 transition-all shadow-2xl",
                        isTerritorialPanelCollapsed ? "right-1" : ""
                      )}
                      title={isTerritorialPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
                    >
                      <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", isTerritorialPanelCollapsed ? "rotate-180" : "rotate-0")} />
                    </button>

                    {/* Sliding Left Alliance Panel */}
                    <AnimatePresence>
                      {selectedAllianceName && (() => {
                        const alliance = ALLIANCES_DATA.find(a => a.id === selectedAllianceName);
                        if (!alliance) return null;
                        const members = COUNTRIES.filter(c => alliance.matches(c));
                        
                        // Calculate rich alliance statistics
                        const totalAllianceGdp = members.reduce((sum, c) => sum + (c.gdp || 0), 0);
                        const totalAllianceArea = members.reduce((sum, c) => sum + (c.area || 0), 0);
                        
                        const gdpShare = totalPossibleGdp > 0 ? (totalAllianceGdp / totalPossibleGdp) * 100 : 0;
                        const areaShare = totalPossibleArea > 0 ? (totalAllianceArea / totalPossibleArea) * 100 : 0;
                        
                        const surveyedMembers = members.filter(m => viewingRecord.guessedIds?.includes(m.id)).length;
                        const surveyedPercent = members.length > 0 ? (surveyedMembers / members.length) * 100 : 0;

                        return (
                          <motion.div
                            key={`alliance-left-panel-${selectedAllianceName}`}
                            initial={{ x: -350, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -350, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute left-6 top-6 bottom-6 w-80 lg:w-[325px] p-5 bg-[#0f0f11]/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl z-25 flex flex-col justify-between overflow-hidden border-emerald-500/20 cursor-pointer"
                            onClick={() => setSelectedAllianceName(null)}
                            title="Click anywhere on background or cards to collapse"
                          >
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAllianceName(null);
                              }}
                              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors z-30 p-1 rounded-md hover:bg-neutral-800/40 cursor-pointer"
                              title="Close Alliance Panel"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>

                            <div 
                              className="flex-1 flex flex-col h-full overflow-hidden cursor-pointer"
                            >
                              {/* Header & Insignia */}
                              <div 
                                className="text-left mb-3 shrink-0 cursor-pointer select-none group/hdr"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAllianceName(null);
                                }}
                                title="Click to collapse alliance profile"
                              >
                                <span className="text-[9px] text-emerald-400 group-hover/hdr:text-rose-400 font-mono uppercase tracking-[0.2em] transition-colors">[ CLICK TO COLLAPSE ]</span>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter mt-1 group-hover/hdr:text-neutral-300 transition-colors">{alliance.fullName}</h3>
                                <p className="text-[10px] text-neutral-400 font-mono">CODE: SEC-ALLIANCE-{alliance.id}</p>
                              </div>

                              {/* Flag / Emblem Container */}
                              <div 
                                className="w-full h-24 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center justify-center mb-3 shrink-0 overflow-hidden relative cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAllianceName(null);
                                }}
                                title="Click to collapse alliance profile"
                              >
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)] animate-pulse" />
                                {allianceLogoError ? (
                                  <div className="flex flex-col items-center justify-center gap-1 relative z-10 animate-fade-in text-center p-3 select-none">
                                    <div className="w-11 h-11 bg-blue-950/80 border border-blue-500/40 text-blue-300 rounded-full flex items-center justify-center font-mono font-black text-sm shadow-[0_0_15px_rgba(59,130,246,0.25)] uppercase">
                                      {alliance.name}
                                    </div>
                                    <span className="text-[7.5px] text-neutral-500 font-mono font-bold tracking-widest uppercase mt-1">EMBLEM UNRETRIEVABLE</span>
                                  </div>
                                ) : (
                                  <img 
                                    key={allianceFlagRefreshKey}
                                    src={`${alliance.logoUrl}?t=${allianceFlagRefreshKey}`} 
                                    onError={() => setAllianceLogoError(true)}
                                    className={cn(
                                      "h-14 w-auto rounded border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] object-contain relative z-10 transition-all duration-300",
                                      isAllianceFlagRefreshing ? "opacity-30 scale-95 rotate-3" : "animate-fade-in"
                                    )} 
                                    alt={alliance.fullName} 
                                    referrerPolicy="no-referrer"
                                  />
                                )}
                              </div>

                              {/* Scrollable Intel Feed Container - Logo is fixed, everything below scrolls together */}
                              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 min-h-0 custom-scrollbar">
                                {/* Member Country Flags Carousel/List - "alliance card, i need to see country flags" */}
                                <div 
                                  className="flex flex-col bg-neutral-950/60 border border-neutral-900 rounded-xl p-2.5"
                                  onClick={(e) => e.stopPropagation()} // Stop bubble up so scroll/clicks on flags won't collapse
                                >
                                  <span className="text-[8px] text-neutral-500 font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1 select-none">
                                    <Flag className="w-2.5 h-2.5 text-blue-400" />
                                    Member Flags ({members.length})
                                  </span>
                                  <div className="flex items-center gap-2 overflow-x-auto py-1.5 pb-2.5 px-1 bg-neutral-900/40 rounded-lg custom-scrollbar">
                                    {members.map((m) => (
                                      <img 
                                        key={`panel-mini-flag-${m.id}`}
                                        src={`https://flagcdn.com/w40/${m.code.toLowerCase()}.png`} 
                                        className={cn(
                                          "h-5 w-8 rounded border shrink-0 object-cover hover:scale-115 hover:border-blue-400 transition-all cursor-pointer shadow-sm",
                                          m.id === selectedExpandedCountryId ? "border-blue-500 ring-1 ring-blue-500/40" : "border-white/10"
                                        )} 
                                        title={`Sector: ${m.name}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedExpandedCountryId(m.id);
                                        }}
                                        alt="" 
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Tactical Actions for Alliance Card */}
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsAllianceFlagRefreshing(true);
                                      setAllianceFlagRefreshKey(prev => prev + 1);
                                      setTimeout(() => {
                                        setIsAllianceFlagRefreshing(false);
                                      }, 600);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 bg-neutral-900/95 hover:bg-[#1a1a1e] border border-neutral-800/80 active:border-neutral-700 rounded-lg text-[9.5px] font-mono text-neutral-400 hover:text-white transition-all active:scale-95 duration-200 cursor-pointer h-8 shadow-md"
                                    title="Force refresh diplomatic alliance logo from secure records"
                                  >
                                    <RefreshCcw className={cn("w-3 h-3 transition-transform", isAllianceFlagRefreshing && "animate-spin text-emerald-400")} />
                                    <span>REFRESH LOGO</span>
                                  </button>

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsAllianceHighlighted(prev => !prev);
                                    }}
                                    className={cn(
                                      "flex-1 flex items-center justify-center gap-1.5 px-2 border rounded-lg text-[9.5px] font-mono transition-all active:scale-95 duration-200 cursor-pointer h-8 shadow-md",
                                      isAllianceHighlighted 
                                        ? "bg-blue-500/25 text-blue-300 border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.3)] font-bold" 
                                        : "bg-neutral-900/90 border-neutral-800/80 text-neutral-400 hover:text-white hover:bg-[#1a1a1e]"
                                    )}
                                    title="Illuminate and plot all alliance territories on the tactical feed"
                                  >
                                    <Globe className={cn("w-3 h-3", isAllianceHighlighted && "animate-pulse text-blue-400")} />
                                    <span>{isAllianceHighlighted ? "PLOTTED" : "SHOW MEMBERS"}</span>
                                  </button>
                                </div>

                                {/* Briefing Text */}
                                <div className="p-2.5 bg-neutral-900/40 border border-neutral-800/60 rounded-xl">
                                  <p className="text-[10px] font-medium leading-normal italic text-neutral-400">
                                    {alliance.description || "No official diplomatic intelligence briefing is presently on file for this diplomatic division."}
                                  </p>
                                </div>

                                {/* Alliance Economic & Intelligence Statistics */}
                                <div 
                                  className="grid grid-cols-2 gap-2"
                                  onClick={(e) => e.stopPropagation()} // Stop propagation here so clicks on stats don't close panel
                                >
                                  <div className="p-2 bg-neutral-900/50 border border-neutral-800/65 rounded-xl text-left">
                                    <span className="text-[7.5px] text-neutral-500 font-mono uppercase tracking-wider block">Combined GDP</span>
                                    <span className="text-[11.5px] font-black text-emerald-400 font-mono">
                                      {totalAllianceGdp >= 1000000 
                                        ? `$${(totalAllianceGdp / 1000000).toFixed(2)}T` 
                                        : `$${(totalAllianceGdp / 1000).toFixed(1)}B`}
                                    </span>
                                    <span className="text-[8px] text-neutral-400 font-mono block mt-0.5">
                                      {gdpShare.toFixed(1)}% of Global GDP
                                    </span>
                                  </div>

                                  <div className="p-2 bg-neutral-900/50 border border-neutral-800/65 rounded-xl text-left">
                                    <span className="text-[7.5px] text-neutral-500 font-mono uppercase tracking-wider block">Territorial Area</span>
                                    <span className="text-[11px] font-black text-slate-300 font-mono">
                                      {totalAllianceArea >= 1000000 
                                        ? `${(totalAllianceArea / 1000000).toFixed(1)}M km²` 
                                        : `${Math.round(totalAllianceArea).toLocaleString()} km²`}
                                    </span>
                                    <span className="text-[8px] text-neutral-400 font-mono block mt-0.5">
                                      {areaShare.toFixed(1)}% of Land Area
                                    </span>
                                  </div>

                                  <div className="p-2 col-span-2 bg-neutral-900/30 border border-neutral-800/40 rounded-xl text-left flex items-center justify-between">
                                    <div>
                                      <span className="text-[7.5px] text-neutral-500 font-mono uppercase tracking-wider block">Union Survey Status</span>
                                      <span className="text-[10px] font-bold text-white font-mono mt-0.5 block">
                                        {surveyedMembers} of {members.length} Sectors
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[12px] font-black font-mono text-emerald-400 block pb-0.5">
                                        {surveyedPercent.toFixed(0)}%
                                      </span>
                                      <div className="w-20 h-1 bg-neutral-800 rounded-full overflow-hidden shrink-0 mt-0.5">
                                        <div 
                                          className="h-full bg-emerald-500 rounded-full" 
                                          style={{ width: `${surveyedPercent}%` }} 
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Member Countries List Header */}
                                <div className="flex justify-between items-center pb-1.5 border-b border-white/5 pt-1">
                                  <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider">Member Sectors ({members.length})</span>
                                  <span className="text-[8px] text-emerald-400 font-mono uppercase font-bold">Survey Status</span>
                                </div>

                                {/* Members Stack (no nested scrollbar, scrolls smoothly inside parent container) */}
                                <div className="space-y-1.5">
                                  {members.map((m) => {
                                    const isMGuessed = viewingRecord.guessedIds?.includes(m.id);
                                    const isCurrent = m.id === selectedExpandedCountryId;
                                    return (
                                      <div 
                                        key={m.id}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            setSelectedExpandedCountryId(m.id);
                                          }
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedExpandedCountryId(m.id);
                                        }}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all outline-none",
                                          isCurrent 
                                            ? "bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.1)] font-bold scale-[1.01]" 
                                            : "bg-neutral-950/50 border-neutral-800/40 hover:bg-neutral-900/50 hover:border-neutral-700/60"
                                        )}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <img 
                                            src={`https://flagcdn.com/w40/${m.code.toLowerCase()}.png`} 
                                            className="h-4.5 w-7 rounded-sm border border-white/5 shrink-0 object-cover" 
                                            alt="" 
                                          />
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-white uppercase truncate leading-none">{m.name}</p>
                                            {m.capital ? (
                                              <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.capital + ", " + m.name)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[8px] text-neutral-500 hover:text-emerald-400 font-mono uppercase leading-none mt-1.5 inline-flex items-center gap-1 transition-colors group/cap"
                                                title={`Click to view ${m.capital} on Google Maps`}
                                              >
                                                <span>{m.capital}</span>
                                                <ExternalLink className="w-2 h-2 text-neutral-600 group-hover/cap:text-emerald-400 transition-colors" />
                                              </a>
                                            ) : (
                                              <p className="text-[8px] text-neutral-500 font-mono uppercase leading-none mt-1">Classified</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="shrink-0 flex items-center">
                                          {isMGuessed ? (
                                            <span className="text-[8px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold">Surveyed</span>
                                          ) : (
                                            <span className="text-[8px] font-mono bg-red-950/40 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase font-bold">Unmapped</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })()}
                    </AnimatePresence>
                    
                    <AnimatePresence>
                      {selectedExpandedCountryId && (
                        <motion.div
                          key={`expanded-country-${selectedExpandedCountryId}-${isTerritorialPanelCollapsed}`}
                          initial={isTerritorialPanelCollapsed ? { opacity: 0, x: 50, scale: 0.95 } : { opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                          exit={isTerritorialPanelCollapsed ? { opacity: 0, x: 50, scale: 0.95 } : { opacity: 0, y: 20, scale: 0.95 }}
                          onClick={() => setSelectedExpandedCountryId(null)}
                          className={cn(
                            "absolute bg-[#0f0f11]/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl z-20 transition-all group/card cursor-pointer hover:bg-neutral-900/40",
                            isTerritorialPanelCollapsed
                              ? "right-16 top-6 bottom-6 w-80 lg:w-[380px] p-6 flex flex-col justify-between overflow-y-auto border-emerald-500/20"
                              : "bottom-6 left-6 right-6 p-6"
                          )}
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExpandedCountryId(null);
                            }}
                            className={cn(
                              "absolute text-neutral-500 hover:text-white transition-colors z-30 p-1 rounded-md hover:bg-neutral-800/40",
                              isTerritorialPanelCollapsed ? "top-5 right-5" : "top-4 right-4 opacity-0 group-hover/card:opacity-100"
                            )}
                            title="Close info panel"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          
                          {(() => {
                            const country = COUNTRIES.find(c => c.id === selectedExpandedCountryId);
                            if (!country) return null;
                            const isGuessed = viewingRecord.guessedIds?.includes(country.id);
                            
                            // Highly informative derived metrics
                            const continentCountries = COUNTRIES.filter(c => c.continent === country.continent);
                            const areaRank = [...continentCountries].sort((a,b) => b.area - a.area).findIndex(c => c.id === country.id) + 1;
                            const gdpRank = [...continentCountries].sort((a,b) => b.gdp - a.gdp).findIndex(c => c.id === country.id) + 1;
                            
                            const landShare = (country.area / totalPossibleArea) * 100;
                            const gdpShare = ((country.gdp || 0) / totalPossibleGdp) * 100;

                            const econDensity = country.area > 0 ? (country.gdp * 1000000) / country.area : 0;

                            let econClass = "PROVINCIAL ECONOMY";
                            if (country.gdp > 1000000) econClass = "CLASS I (HYPER)";
                            else if (country.gdp > 200000) econClass = "CLASS II (MAJOR)";
                            else if (country.gdp > 50000) econClass = "CLASS III (ESTABLISHED)";

                            const alliancesList = ALLIANCES_DATA.filter(a => a.matches(country));

                            if (isTerritorialPanelCollapsed) {
                              return (
                                <div className="flex flex-col h-full justify-between gap-4 text-left">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <div className={cn("w-1 h-8 rounded-full shrink-0", isGuessed ? "bg-emerald-500" : "bg-red-500")} />
                                      <div className="flex items-center gap-3">
                                        <img 
                                          src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`} 
                                          className="h-8 w-auto rounded border border-white/10 shadow-lg"
                                          alt="" 
                                        />
                                        <div>
                                          <a
                                            href={`https://en.wikipedia.org/wiki/${encodeURIComponent(country.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 group/wiki text-white hover:text-emerald-400 transition-colors outline-none"
                                            title={`Learn more about ${country.name} on Wikipedia`}
                                          >
                                            <h3 className="text-xl font-black uppercase tracking-tighter leading-none group-hover/wiki:underline">
                                              {country.name}
                                            </h3>
                                            <ExternalLink className="w-3.5 h-3.5 text-neutral-600 group-hover/wiki:text-emerald-400 transition-colors shrink-0" />
                                          </a>
                                          <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-[0.2em] mt-1.5">{country.continent} Sector</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Rogue State Outbreak Intel Card */}
                                    {viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'rogue' && (() => {
                                      const saveCount = (viewingRecord.countrySaveCounts && viewingRecord.countrySaveCounts[country.id]) || 0;
                                      const difficulty = viewingRecord.supplyDifficulty || 3;
                                      const reqSaves = 6 - difficulty;
                                      const isImm = (viewingRecord.immuneCountryIds && (
                                        Array.isArray(viewingRecord.immuneCountryIds)
                                          ? viewingRecord.immuneCountryIds.includes(country.id)
                                          : (viewingRecord.immuneCountryIds instanceof Set
                                              ? (viewingRecord.immuneCountryIds as Set<string>).has(country.id)
                                              : false)
                                      )) || (immuneCountryIdsRef.current && immuneCountryIdsRef.current.has(country.id));
                                      
                                      const isInf = infectedIds.size > 0 
                                        ? infectedIds.has(country.id)
                                        : (viewingRecord.guessedIds && !viewingRecord.guessedIds.includes(country.id));
                                      const isShield = shieldedIds.has(country.id);

                                      return (
                                        <div className="p-3 bg-red-950/25 border border-red-500/30 rounded-xl space-y-2.5 font-mono text-left">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                                              <Flame className="w-3 h-3 animate-pulse text-red-500" /> OUTBREAK THREAT DOSSIER
                                            </span>
                                            <span className={cn(
                                              "text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border",
                                              isImm ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40" :
                                              isShield ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/40" :
                                              isInf ? "bg-red-950/60 text-red-400 border-red-500/40 animate-pulse" :
                                              "bg-neutral-900 text-neutral-400 border-neutral-800"
                                            )}>
                                              {isImm ? "🛡️ IMMUNE ZONE" :
                                               isShield ? "🛡️ FIREWALL ACTIVE" :
                                               isInf ? "☣️ INFECTED SECTOR" : 
                                               "STABLE SECTOR"}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div className="bg-neutral-950/40 p-1.5 rounded border border-neutral-800/60 text-left">
                                              <span className="text-[7.5px] text-neutral-500 uppercase block leading-none">SECTOR HEALS DESIG</span>
                                              <span className="font-bold text-white leading-none mt-1 block">{saveCount} / {reqSaves} SAVES</span>
                                            </div>
                                            <div className="bg-neutral-950/40 p-1.5 rounded border border-neutral-800/60 text-left">
                                              <span className="text-[7.5px] text-neutral-500 uppercase block leading-none">IMMUNIZATION LEVEL</span>
                                              <span className={cn("font-bold leading-none mt-1 block", isImm ? "text-emerald-400" : "text-amber-400")}>
                                                {isImm ? "100% (SECURED)" : `${Math.min(100, Math.round((saveCount / reqSaves) * 100))}%`}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden font-sans">
                                            <div 
                                              className={cn("h-full rounded-full transition-all duration-300", isImm ? "bg-emerald-500" : "bg-red-500")}
                                              style={{ width: `${Math.min(100, (saveCount / reqSaves) * 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Telemetry Fact Grid */}
                                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 font-mono">
                                      <a
                                        href={country.capital ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(country.capital + ", " + country.name)}` : undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className={cn(
                                          "p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5 text-left block transition-colors",
                                          country.capital ? "hover:bg-emerald-500/10 hover:border-emerald-500/30 group/capital cursor-pointer" : ""
                                        )}
                                      >
                                        <p className="text-[8px] text-neutral-500 uppercase tracking-wider leading-none flex items-center justify-between">
                                          <span>Capital City</span>
                                          {country.capital && <ExternalLink className="w-2 h-2 text-neutral-400 group-hover/capital:text-emerald-400 transition-colors" />}
                                        </p>
                                        <p className="text-[11px] font-bold text-white uppercase truncate group-hover/capital:text-emerald-400 transition-colors">{country.capital || "Classified"}</p>
                                      </a>
                                      
                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5">
                                        <p className="text-[8px] text-neutral-500 uppercase tracking-wider leading-none">Coordinates</p>
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase truncate">
                                          {country.capitalCoords 
                                            ? `${Math.abs(country.capitalCoords.lat).toFixed(1)}°${country.capitalCoords.lat >= 0 ? "N" : "S"} ${Math.abs(country.capitalCoords.lng).toFixed(1)}°${country.capitalCoords.lng >= 0 ? "E" : "W"}` 
                                            : "Classified"}
                                        </p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5">
                                        <p className="text-[8px] text-neutral-500 uppercase tracking-wider leading-none">Economic Output</p>
                                        <p className="text-[11px] font-bold text-emerald-500 uppercase">${(country.gdp / 1000).toFixed(1)}B</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5">
                                        <p className="text-[8px] text-neutral-500 uppercase tracking-wider leading-none">Global Share</p>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">{gdpShare.toFixed(3)}%</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5">
                                        <p className="text-[8px] text-neutral-500 uppercase tracking-wider leading-none">Total Area</p>
                                        <p className="text-[11px] font-bold text-white uppercase truncate">{country.area.toLocaleString()} KM²</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5">
                                        <p className="text-[8px] text-neutral-500 uppercase tracking-wider leading-none">Global Share</p>
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase">{landShare.toFixed(3)}%</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5 col-span-2">
                                        <p className="text-[8px] text-neutral-500 uppercase tracking-wider leading-none">Economic Density</p>
                                        <p className="text-[10.5px] font-bold text-emerald-400 break-all">
                                          ${econDensity.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD / KM²
                                        </p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5 text-left">
                                        <p className="text-[7.5px] text-neutral-500 uppercase tracking-wider leading-none">Area Standings</p>
                                        <p className="text-[10.5px] font-bold text-white uppercase">#{areaRank} in region</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5 text-left">
                                        <p className="text-[7.5px] text-neutral-500 uppercase tracking-wider leading-none">GDP Standings</p>
                                        <p className="text-[10.5px] font-bold text-white uppercase">#{gdpRank} in region</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5 text-left">
                                        <p className="text-[7.5px] text-neutral-500 uppercase tracking-wider leading-none">Wealth Class</p>
                                        <p className="text-[9.5px] font-bold text-emerald-400 uppercase truncate">{econClass}</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg space-y-0.5 text-left">
                                        <p className="text-[7.5px] text-neutral-500 uppercase tracking-wider leading-none">Equator Distance</p>
                                        <p className="text-[9px] font-bold text-sky-400 uppercase truncate">{country.capitalCoords ? `~${Math.round(Math.abs(country.capitalCoords.lat) * 111.12).toLocaleString()} KM` : "CLASSIFIED"}</p>
                                      </div>

                                      <div className="p-2 bg-neutral-900/50 border border-neutral-800/40 rounded-lg col-span-2 space-y-1.5 text-left">
                                        <p className="text-[7.5px] text-neutral-500 uppercase tracking-wider leading-none">Key Alliances</p>
                                        <div className="flex flex-wrap gap-1">
                                          {alliancesList.map((all) => (
                                            <button 
                                              key={all.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAllianceName(prev => prev === all.id ? null : all.id);
                                              }}
                                              className={cn(
                                                "flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[8.5px] font-mono font-bold uppercase tracking-tight transition-all hover:scale-105 active:scale-95 cursor-pointer",
                                                all.badgeColor,
                                                all.textColor
                                              )}
                                              title={`${all.fullName} - Examine Members`}
                                            >
                                              <img src={all.logoUrl} className="w-3.5 h-2 rounded-sm object-cover shrink-0" alt="" referrerPolicy="no-referrer" />
                                              <span>{all.name}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex-1 flex flex-col justify-center min-h-[90px] mt-4">
                                    <p className="text-[8px] text-emerald-500 font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5 font-bold">
                                      <Globe2 className="w-2.5 h-2.5" />
                                      Intelligence Brief
                                    </p>
                                    <p className="text-[11px] text-neutral-300 font-medium leading-relaxed italic overflow-y-auto max-h-[140px]">
                                      "{(() => {
                                        if (country.facts && country.facts.length > 0) {
                                          return country.facts[Math.floor(Math.random() * country.facts.length)];
                                        }
                                        return country.facts?.[0] || "Territorial intelligence for this sector is currently under command review.";
                                      })()}"
                                    </p>
                                  </div>
                                  
                                  <div className="text-center font-mono text-[7px] text-neutral-600 tracking-widest mt-1">
                                    [ CLICK CARDBODY TO DISMISS ]
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="flex gap-8 items-start text-left">
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
                                        <a
                                          href={`https://en.wikipedia.org/wiki/${encodeURIComponent(country.name)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-2 group/wiki text-white hover:text-emerald-400 transition-colors outline-none"
                                          title={`Learn more about ${country.name} on Wikipedia`}
                                        >
                                          <h3 className="text-2xl font-black uppercase tracking-tighter group-hover/wiki:underline">
                                            {country.name}
                                          </h3>
                                          <ExternalLink className="w-4 h-4 text-neutral-600 group-hover/wiki:text-emerald-400 transition-colors shrink-0" />
                                        </a>
                                        <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-[0.2em] mt-1">{country.continent} Sector</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Rogue State Outbreak Intel Card (Expanded inline view) */}
                                  {viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'rogue' && (() => {
                                    const saveCount = (viewingRecord.countrySaveCounts && viewingRecord.countrySaveCounts[country.id]) || 0;
                                    const difficulty = viewingRecord.supplyDifficulty || 3;
                                    const reqSaves = 6 - difficulty;
                                    const isImm = (viewingRecord.immuneCountryIds && (
                                      Array.isArray(viewingRecord.immuneCountryIds)
                                        ? viewingRecord.immuneCountryIds.includes(country.id)
                                        : (viewingRecord.immuneCountryIds instanceof Set
                                            ? (viewingRecord.immuneCountryIds as Set<string>).has(country.id)
                                            : false)
                                    )) || (immuneCountryIdsRef.current && immuneCountryIdsRef.current.has(country.id));
                                    
                                    const isInf = infectedIds.size > 0 
                                      ? infectedIds.has(country.id)
                                      : (viewingRecord.guessedIds && !viewingRecord.guessedIds.includes(country.id));
                                    const isShield = shieldedIds.has(country.id);

                                    return (
                                      <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2.5 font-mono text-left max-w-xl">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <Flame className="w-3 h-3 animate-pulse text-red-500" /> OUTBREAK THREAT DOSSIER
                                          </span>
                                          <span className={cn(
                                            "text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border",
                                            isImm ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40" :
                                            isShield ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/40" :
                                            isInf ? "bg-red-950/60 text-red-400 border-red-500/40 animate-pulse" :
                                            "bg-neutral-900 text-neutral-400 border-neutral-800"
                                          )}>
                                            {isImm ? "🛡️ IMMUNE ZONE" :
                                             isShield ? "🛡️ FIREWALL ACTIVE" :
                                             isInf ? "☣️ INFECTED SECTOR" : 
                                             "STABLE SECTOR"}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                          <div className="bg-neutral-950/40 p-1.5 rounded border border-neutral-800/60 flex justify-between items-center text-left">
                                            <span className="text-[7.5px] text-neutral-500 uppercase">SECTOR HEALS DESIG</span>
                                            <span className="font-bold text-white font-mono">{saveCount} / {reqSaves} SAVES</span>
                                          </div>
                                          <div className="bg-neutral-950/40 p-1.5 rounded border border-neutral-800/60 flex justify-between items-center text-left">
                                            <span className="text-[7.5px] text-neutral-500 uppercase">IMMUNITY VALUE</span>
                                            <span className={cn("font-bold font-mono", isImm ? "text-emerald-400" : "text-amber-400")}>
                                              {isImm ? "100% (SECURED)" : `${Math.round((saveCount/reqSaves)*100)}%`}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="w-full bg-neutral-900 h-1 rounded-full overflow-hidden font-sans">
                                          <div 
                                            className={cn("h-full rounded-full transition-all duration-300", isImm ? "bg-emerald-500" : "bg-red-500")}
                                            style={{ width: `${Math.min(100, (saveCount/reqSaves)*100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  <div className="grid grid-cols-4 gap-4">
                                    <a
                                      href={country.capital ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(country.capital + ", " + country.name)}` : undefined}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className={cn(
                                        "space-y-1 text-left block transition-colors outline-none",
                                        country.capital ? "hover:text-emerald-400 group/capital cursor-pointer" : ""
                                      )}
                                    >
                                      <p className="text-[9px] text-neutral-500 font-mono uppercase flex items-center gap-1.5">
                                        <span>Capital City</span>
                                        {country.capital && <ExternalLink className="w-2.5 h-2.5 text-neutral-600 group-hover/capital:text-emerald-400 transition-colors" />}
                                      </p>
                                      <p className="text-sm font-bold text-white uppercase group-hover/capital:text-emerald-400 transition-colors">{country.capital || "Classified"}</p>
                                    </a>
                                    <div className="space-y-1">
                                      <p className="text-[9px] text-neutral-500 font-mono uppercase">Economic Output</p>
                                      <p className="text-sm font-bold text-emerald-500 uppercase">${(country.gdp / 1000).toFixed(1)}B</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] text-neutral-500 font-mono uppercase">Total Area</p>
                                      <p className="text-sm font-bold text-white uppercase">{country.area.toLocaleString()} KM²</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] text-neutral-500 font-mono uppercase">Key Alliances</p>
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {alliancesList.map((all) => (
                                          <button 
                                            key={all.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedAllianceName(prev => prev === all.id ? null : all.id);
                                            }}
                                            className={cn(
                                              "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-mono font-bold uppercase tracking-tight transition-all hover:scale-105 active:scale-95 cursor-pointer",
                                              all.badgeColor,
                                              all.textColor
                                            )}
                                            title={`${all.fullName} - Examine Members`}
                                          >
                                            <img src={all.logoUrl} className="w-3.5 h-2 rounded-sm object-cover shrink-0" alt="" referrerPolicy="no-referrer" />
                                            <span>{all.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="w-1/3 p-4 bg-neutral-800/40 rounded-xl border border-neutral-700/30 font-mono text-left">
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

                  <AnimatePresence initial={false}>
                    {!isContinentPanelCollapsed ? (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 250 }}
                        className="flex flex-wrap gap-2 shrink-0 overflow-hidden"
                      >
                        {(() => {
                          const continents = Object.keys(CONTINENT_STATS).filter(c => c !== 'Antarctica');
                          const items = ["All", ...continents];
                          return items.map(cont => {
                            const isAll = cont === 'All';
                            const isActive = isAll ? selectedContinentFilter === null : selectedContinentFilter === cont;
                            const stats = isAll ? null : CONTINENT_STATS[cont as keyof typeof CONTINENT_STATS];
                            return (
                              <button
                                key={cont}
                                onClick={() => {
                                  if (isActive) {
                                    setIsContinentPanelCollapsed(true);
                                  } else {
                                    setSelectedContinentFilter(isAll ? null : cont);
                                  }
                                }}
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
                                    if (viewingRecord.gameType === 'flag') {
                                      if (isAll) return `${gIds.length}/${viewingRecord.flagCountLimit || 20}`;
                                      const originalQueue = viewingRecord.originalFlagQueue || [];
                                      const totalInQueue = COUNTRIES.filter(c => originalQueue.includes(c.id) && c.continent === cont).length;
                                      const guessed = gIds.filter(id => COUNTRIES.find(curr => curr.id === id)?.continent === cont).length;
                                      return `${guessed}/${totalInQueue}`;
                                    }
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
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full"
                      >
                        <button
                          onClick={() => setIsContinentPanelCollapsed(false)}
                          className="w-full h-1.5 bg-neutral-950/20 border border-neutral-800/40 hover:bg-emerald-500/20 hover:border-emerald-500/30 rounded-full transition-all flex items-center justify-center cursor-pointer group mt-0.5 mb-0"
                          title="Click to Expand Continent Filters"
                        >
                          <div className="flex items-center gap-1">
                            <ChevronUp className="w-2.5 h-2.5 text-neutral-600 group-hover:text-emerald-400 font-bold transition-all transform group-hover:scale-125" />
                            <span className="text-[6.5px] font-mono tracking-widest text-neutral-600 group-hover:text-emerald-400 uppercase font-bold transition-colors">EXPAND CONTINENT FILTERS</span>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.div 
                  initial={false}
                  animate={{ 
                    width: isTerritorialPanelCollapsed ? 0 : 384,
                    opacity: isTerritorialPanelCollapsed ? 0 : 1,
                    marginRight: isTerritorialPanelCollapsed ? -32 : 0
                  }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="flex flex-col gap-4 shrink-0 overflow-hidden"
                >
                  {/* Tab Selector */}
                  <div className={cn(
                    "grid p-1 bg-neutral-900/60 border border-neutral-800 rounded-xl shrink-0 font-mono",
                    (viewingRecord?.gameType === 'typing' && (viewingRecord?.typerMode === 'rogue' || viewingRecord?.typerMode === 'supply_chain')) ? "grid-cols-4" : "grid-cols-3"
                  )}>
                    <button
                      onClick={() => {
                        setIsContinentPanelCollapsed(false);
                        if (expansionPanelTab === 'countries') {
                          setHideSectorsStats(prev => !prev);
                        } else {
                          setExpansionPanelTab('countries');
                        }
                      }}
                      className={cn(
                        "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center",
                        expansionPanelTab === 'countries'
                          ? "bg-emerald-500 text-black shadow-md font-bold"
                          : "text-neutral-400 hover:text-white"
                      )}
                      title={expansionPanelTab === 'countries' ? (hideSectorsStats ? "Click to Show Global Stats" : "Click to Hide Global Stats") : "View Sectors"}
                    >
                      Sectors
                    </button>
                    <button
                      onClick={() => setExpansionPanelTab('alliances')}
                      className={cn(
                        "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5",
                        expansionPanelTab === 'alliances'
                          ? "bg-emerald-500 text-black shadow-md font-bold"
                          : "text-neutral-400 hover:text-white"
                      )}
                    >
                      <Globe className="w-3 h-3" />
                      Alliances
                    </button>
                    <button
                      onClick={() => setExpansionPanelTab('resources')}
                      className={cn(
                        "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5",
                        expansionPanelTab === 'resources'
                          ? "bg-emerald-500 text-black shadow-md font-bold"
                          : "text-neutral-400 hover:text-white"
                      )}
                    >
                      <Zap className="w-3 h-3" />
                      Resources
                    </button>
                    {viewingRecord?.gameType === 'typing' && viewingRecord?.typerMode === 'rogue' && (
                      <button
                        onClick={() => setExpansionPanelTab('rogue')}
                        className={cn(
                          "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5",
                          expansionPanelTab === 'rogue'
                            ? "bg-red-500 text-black shadow-md font-bold"
                            : "text-red-400 hover:text-red-300"
                        )}
                      >
                        <Shield className="w-3 h-3" />
                        Rogue Intel
                      </button>
                    )}
                    {viewingRecord?.gameType === 'typing' && viewingRecord?.typerMode === 'supply_chain' && (
                      <button
                        onClick={() => setExpansionPanelTab('supply_route')}
                        className={cn(
                          "py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5",
                          expansionPanelTab === 'supply_route'
                            ? "bg-amber-500 text-black shadow-md font-bold animate-pulse"
                            : "text-amber-400 hover:text-amber-300"
                        )}
                      >
                        <Target className="w-3 h-3" />
                        Supply Route
                      </button>
                    )}
                  </div>

                  {expansionPanelTab === 'countries' && (
                    <>
                      {!hideSectorsStats && (
                        <div className="grid grid-cols-1 gap-4 shrink-0 animate-fade-in">
                          {(() => {
                            const continent = selectedContinentFilter;
                            const isGlobal = !continent;
                            
                            if (viewingRecord.gameType === 'flag') {
                              const originalQueue = viewingRecord.originalFlagQueue || [];
                              const continentCountriesInQueue = isGlobal 
                                ? COUNTRIES.filter(c => originalQueue.includes(c.id)) 
                                : COUNTRIES.filter(c => originalQueue.includes(c.id) && c.continent === continent);
                              
                              const recordGuessed = viewingRecord.guessedIds || [];
                              const guessedCountries = continentCountriesInQueue.filter(c => recordGuessed.includes(c.id));
                              
                              const limit = isGlobal ? (viewingRecord.flagCountLimit || 20) : continentCountriesInQueue.length;
                              const correctCount = guessedCountries.length;
                              const flagPercent = limit > 0 ? (correctCount / limit) * 100 : 0;
                              
                              const totalDurationSeconds = (viewingRecord.flagDuration || 10) * 60;
                              const spentDurationSeconds = viewingRecord.duration || 0;
                              const timePercent = totalDurationSeconds > 0 
                                ? Math.max(0, Math.min(100, ((totalDurationSeconds - spentDurationSeconds) / totalDurationSeconds) * 100))
                                : 0;
                              
                              return (
                                <>
                                  <div className="bg-neutral-900/50 border border-neutral-800/50 p-4 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-neutral-500 tracking-widest">
                                      <span>{isGlobal ? "Global" : continent} Accuracy</span>
                                      <span className="text-white">{Math.round(flagPercent)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${flagPercent}%` }} className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-mono text-neutral-600">
                                      <span>{correctCount} / {limit} Flags Solved</span>
                                    </div>
                                  </div>
                                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                                      <span>Time Saved</span>
                                      <span className="text-emerald-500">{Math.round(timePercent)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${timePercent}%` }} className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
                                    </div>
                                    <div className="flex justify-between items-center text-[8px] font-mono text-emerald-600/60">
                                      <span>{formatTime(Math.max(0, totalDurationSeconds - spentDurationSeconds))} / {formatTime(totalDurationSeconds)} Remaining</span>
                                    </div>
                                  </div>
                                </>
                              );
                            }

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
                      )}
                      <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                        <div className="p-4 bg-emerald-500/5 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3" />
                            Secured (
                              {(() => {
                                const originalQueue = viewingRecord.originalFlagQueue || [];
                                const isFlag = viewingRecord.gameType === 'flag';
                                return (viewingRecord.guessedIds || []).filter(id => {
                                  const country = COUNTRIES.find(c => c.id === id);
                                  if (!country) return false;
                                  if (isFlag && !originalQueue.includes(id)) return false;
                                  return !selectedContinentFilter || country.continent === selectedContinentFilter;
                                }).length;
                              })()}
                            )
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
                          {(() => {
                            const originalQueue = viewingRecord.originalFlagQueue || [];
                            const isFlag = viewingRecord.gameType === 'flag';
                            const list = (viewingRecord.guessedIds || [])
                              .map(id => COUNTRIES.find(c => c.id === id))
                              .filter((c): c is typeof COUNTRIES[0] => {
                                if (!c) return false;
                                if (isFlag && !originalQueue.includes(c.id)) return false;
                                return !selectedContinentFilter || c.continent === selectedContinentFilter;
                              });
                            
                            return list
                              .sort((a, b) => {
                                if (expansionSort === 'alphabet') return a.name.localeCompare(b.name);
                                return (b.gdp || 0) - (a.gdp || 0);
                              })
                              .map(country => {
                                const id = country.id;
                                const isSelected = selectedExpandedCountryId === id;

                                const isRogue = viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'rogue';
                                const isInfected = isRogue && viewingRecord.infectedIds?.includes(id);
                                const isShielded = isRogue && viewingRecord.shieldedIds?.includes(id);
                                const isImmune = isRogue && viewingRecord.immuneCountryIds?.includes(id);

                                let customClass = isSelected 
                                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                                  : "bg-neutral-900/50 border-neutral-800/50 text-neutral-400 hover:text-emerald-400";

                                if (isRogue) {
                                  if (isInfected) {
                                    customClass = isSelected
                                      ? "bg-red-500/25 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                                      : "bg-red-950/20 border-red-950/50 text-red-400/80 hover:text-red-400 hover:border-red-500/40";
                                  } else if (isShielded) {
                                    customClass = isSelected
                                      ? "bg-cyan-500/25 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                                      : "bg-cyan-950/20 border-cyan-950/50 text-cyan-400/80 hover:text-cyan-400 hover:border-cyan-500/40";
                                  } else if (isImmune) {
                                    customClass = isSelected
                                      ? "bg-emerald-500/25 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                                      : "bg-emerald-950/20 border-emerald-950/50 text-emerald-400/80 hover:text-emerald-400 hover:border-emerald-500/40";
                                  }
                                }

                                return (
                                  <button 
                                    key={id} 
                                    onClick={() => setSelectedExpandedCountryId(isSelected ? null : id)}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-2.5 rounded-xl border text-[10px] font-mono group transition-all",
                                      customClass
                                    )}
                                  >
                                    <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} className="w-5 h-3.5 rounded-sm object-cover border border-white/10 shrink-0" alt="" />
                                    <span className="flex-grow text-left truncate font-bold flex items-center gap-2">
                                      {isRogue && isInfected && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Infected" />}
                                      {isRogue && isShielded && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Firewall" />}
                                      {isRogue && isImmune && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Immune" />}
                                      {country.name}
                                    </span>
                                    <span className="text-[8px] opacity-40 shrink-0">${Math.floor((country.gdp || 0)/1000).toLocaleString()}B</span>
                                  </button>
                                );
                              });
                          })()}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                        <div className="p-4 bg-red-500/5 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                          <span className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                            <XCircle className="w-3 h-3" />
                            Missed (
                              {(() => {
                                const originalQueue = viewingRecord.originalFlagQueue || [];
                                const isFlag = viewingRecord.gameType === 'flag';
                                return COUNTRIES.filter(c => {
                                  if (isFlag) {
                                    if (!originalQueue.includes(c.id)) return false;
                                  }
                                  return !viewingRecord.guessedIds?.includes(c.id) && (!selectedContinentFilter || c.continent === selectedContinentFilter);
                                }).length;
                              })()}
                            )
                          </span>
                          <button
                            onClick={() => setExpansionSort(expansionSort === 'alphabet' ? 'wealth' : 'alphabet')}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all group flex items-center gap-2"
                            title={expansionSort === 'alphabet' ? 'Switch to Wealth Sort' : 'Switch to Alphabetical Sort'}
                          >
                            <span className="text-[8px] font-mono font-bold text-neutral-500 group-hover:text-red-500 uppercase font-bold">
                              {expansionSort === 'alphabet' ? 'A-Z' : 'Wealth'}
                            </span>
                            <ListFilter className={cn("w-3 h-3 transition-colors", expansionSort === 'alphabet' ? "text-neutral-500 group-hover:text-red-500" : "text-red-500")} />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                          {COUNTRIES.filter(c => {
                              const originalQueue = viewingRecord.originalFlagQueue || [];
                              const isFlag = viewingRecord.gameType === 'flag';
                              if (isFlag) {
                                if (!originalQueue.includes(c.id)) return false;
                              }
                              return !viewingRecord.guessedIds?.includes(c.id) && (!selectedContinentFilter || c.continent === selectedContinentFilter);
                            })
                            .sort((a, b) => {
                              if (expansionSort === 'alphabet') return a.name.localeCompare(b.name);
                              return (b.gdp || 0) - (a.gdp || 0);
                            })
                            .map(country => {
                              const isSelected = selectedExpandedCountryId === country.id;
                              const id = country.id;

                              const isRogue = viewingRecord.gameType === 'typing' && viewingRecord.typerMode === 'rogue';
                              const isInfected = isRogue && viewingRecord.infectedIds?.includes(id);
                              const isShielded = isRogue && viewingRecord.shieldedIds?.includes(id);
                              const isImmune = isRogue && viewingRecord.immuneCountryIds?.includes(id);

                              let customClass = isSelected 
                                ? "bg-red-500/20 border-red-400 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                                : "bg-neutral-900/50 border-neutral-800/50 text-neutral-500 hover:text-red-400";

                              if (isRogue) {
                                if (isInfected) {
                                  customClass = isSelected
                                    ? "bg-red-500/25 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                                    : "bg-red-950/20 border-red-950/50 text-red-400/80 hover:text-red-400 hover:border-red-500/40";
                                } else if (isShielded) {
                                  customClass = isSelected
                                    ? "bg-cyan-500/25 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                                    : "bg-cyan-950/20 border-cyan-950/50 text-cyan-400/80 hover:text-cyan-400 hover:border-cyan-500/40";
                                } else if (isImmune) {
                                  customClass = isSelected
                                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                                    : "bg-emerald-950/20 border-emerald-950/50 text-emerald-400/80 hover:text-emerald-400 hover:border-emerald-500/40";
                                }
                              }

                              return (
                                <button 
                                  key={country.id} 
                                  onClick={() => setSelectedExpandedCountryId(isSelected ? null : country.id)}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-2.5 rounded-xl border text-[10px] font-mono group transition-all",
                                    customClass
                                  )}
                                >
                                  <img src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} className="w-5 h-3.5 rounded-sm object-cover border border-white/10 opacity-60 shrink-0" alt="" />
                                  <span className="flex-grow text-left truncate font-bold flex items-center gap-2">
                                    {isRogue && isInfected && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Infected" />}
                                    {isRogue && isShielded && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Firewall" />}
                                    {isRogue && isImmune && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Immune" />}
                                    {country.name}
                                  </span>
                                  <span className="text-[8px] opacity-40 shrink-0">${Math.floor(country.gdp/1000).toLocaleString()}B</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </>
                  )}

                  {expansionPanelTab === 'alliances' && (
                    <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                      <div className="p-4 bg-emerald-500/5 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2 animate-pulse">
                          <Globe className="w-3 h-3" />
                          Diplomatic Alliances ({ALLIANCES_DATA.length})
                        </span>
                        <button
                          onClick={() => setAllianceSort(allianceSort === 'alphabet' ? 'size' : 'alphabet')}
                          title={allianceSort === 'alphabet' ? 'Sort by Member Size' : 'Sort Alphabetically'}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-900/80 border border-neutral-800/80 text-[8px] font-bold text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all outline-none"
                        >
                          <span className="uppercase text-neutral-500">Sort:</span>
                          <span className="text-neutral-300 font-mono uppercase">{allianceSort === 'alphabet' ? 'A-Z' : 'Size'}</span>
                          <ListFilter className={cn("w-3 h-3 transition-colors", allianceSort === 'alphabet' ? "text-neutral-500" : "text-emerald-400")} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {[...ALLIANCES_DATA]
                          .sort((a, b) => {
                            if (allianceSort === 'alphabet') {
                              return a.name.localeCompare(b.name);
                            } else {
                              const sizeA = COUNTRIES.filter(c => a.matches(c)).length;
                              const sizeB = COUNTRIES.filter(c => b.matches(c)).length;
                              return sizeB - sizeA;
                            }
                          })
                          .map((alliance) => {
                            const allianceCountries = COUNTRIES.filter(c => alliance.matches(c));
                          const guessedInAlliance = allianceCountries.filter(c => (viewingRecord.guessedIds || []).includes(c.id)).length;
                          const totalAllianceMembers = allianceCountries.length;
                          const completionRate = totalAllianceMembers > 0 ? (guessedInAlliance / totalAllianceMembers) * 100 : 0;
                          const isCurrentlySelected = selectedAllianceName === alliance.id;

                          return (
                            <button
                              key={alliance.id}
                              onClick={() => {
                                setSelectedAllianceName(prev => {
                                  if (prev === alliance.id) {
                                    setIsAllianceHighlighted(false);
                                    return null;
                                  } else {
                                    setIsAllianceHighlighted(true);
                                    return alliance.id;
                                  }
                                });
                              }}
                              className={cn(
                                "w-full text-left p-3 rounded-2xl border transition-all duration-200 hover:scale-[1.01] flex flex-col gap-2.5 relative overflow-hidden group/item",
                                isCurrentlySelected
                                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                  : "bg-neutral-900/60 border-neutral-800/80 hover:bg-[#15151a] hover:border-neutral-700/60"
                              )}
                            >
                              <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-7 bg-neutral-950/60 border border-neutral-800 rounded overflow-hidden flex items-center justify-center shrink-0">
                                  <img
                                    src={alliance.logoUrl}
                                    className="h-5 w-auto object-contain"
                                    onError={(e) => {
                                      (e.currentTarget as any).src = "https://flagcdn.com/w20/un.png";
                                    }}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between gap-1.5">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-tight truncate group-hover/item:text-emerald-400 transition-colors">
                                      {alliance.fullName}
                                    </h4>
                                    <span className="text-[9px] font-black font-mono text-emerald-400 shrink-0">
                                      {alliance.name}
                                    </span>
                                  </div>
                                  <p className="text-[8.5px] text-neutral-400 line-clamp-1 mt-0.5 leading-normal">
                                    {alliance.description}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1 relative z-10 font-mono">
                                <div className="flex justify-between items-center text-[8px]">
                                  <span className="text-neutral-500 uppercase">Surveyed Status</span>
                                  <span className={cn(
                                    "font-bold",
                                    completionRate === 100 ? "text-emerald-400" : "text-neutral-300"
                                  )}>
                                    {guessedInAlliance} / {totalAllianceMembers} ({completionRate.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-neutral-950/80 rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      completionRate === 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-blue-500"
                                    )}
                                    style={{ width: `${completionRate}%` }}
                                  />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {expansionPanelTab === 'resources' && (() => {
                    const guessedIds = viewingRecord?.guessedIds || [];
                    const activeContinent = selectedContinentFilter;
                    
                    const allCountriesFiltered = activeContinent 
                      ? COUNTRIES.filter(c => c.continent === activeContinent) 
                      : COUNTRIES;
                    const securedCountriesFiltered = allCountriesFiltered.filter(c => guessedIds.includes(c.id));

                    // Dynamic deterministic generator per country
                    const getRes = (c: typeof COUNTRIES[0]) => {
                      const codeVal = (c.code || "xx").charCodeAt(0) + (c.code || "xx").charCodeAt(1);
                      const gdpVal = (c.gdp || 0) / 1000; // in Billions USD
                      const areaVal = (c.area || 0) / 1000; // in Thousands sq km

                      // Agriculture: Earth/Arable (based on area & latitude multiplier)
                      const lat = c.capitalCoords?.lat ?? 30;
                      const latMultiplier = Math.max(0.4, Math.min(1.4, 1.2 - Math.abs(lat) / 90));
                      const agriculture = areaVal * 0.12 * latMultiplier;

                      // Metals & Critical Minerals: Ore/Mining (based on geological area size + hash multiplier)
                      const mineralsMultiplier = ((codeVal % 8) + 1) * 0.12;
                      const minerals = areaVal * mineralsMultiplier;

                      // Fuel, Gas & Clean Grid: Power/Energy (deterministic resource centers + gdp size)
                      const energyMultiplier = ((codeVal % 12) + 1) * 0.15;
                      const energy = (areaVal * 0.08) + (gdpVal * energyMultiplier);

                      // Computation Grid: Silicon/Nodes (wealth-density & raw gdp scale)
                      const compute = gdpVal * 0.75 + (gdpVal / (areaVal + 1)) * 4.5;

                      // Human workforce power: Capital/Labor force scale
                      const labor = (areaVal * 0.04) + (gdpVal * 1.35);

                      return { agriculture, minerals, energy, compute, labor };
                    };

                    let secured = { agriculture:0, minerals:0, energy:0, compute:0, labor:0 };
                    let global = { agriculture:0, minerals:0, energy:0, compute:0, labor:0 };

                    allCountriesFiltered.forEach(c => {
                      const r = getRes(c);
                      global.agriculture += r.agriculture;
                      global.minerals += r.minerals;
                      global.energy += r.energy;
                      global.compute += r.compute;
                      global.labor += r.labor;
                    });

                    securedCountriesFiltered.forEach(c => {
                      const r = getRes(c);
                      secured.agriculture += r.agriculture;
                      secured.minerals += r.minerals;
                      secured.energy += r.energy;
                      secured.compute += r.compute;
                      secured.labor += r.labor;
                    });

                    // Safeguards
                    const safePercent = (sec: number, glob: number) => glob > 0 ? (sec / glob) * 100 : 0;

                    const agPerc = safePercent(secured.agriculture, global.agriculture);
                    const minPerc = safePercent(secured.minerals, global.minerals);
                    const nrgPerc = safePercent(secured.energy, global.energy);
                    const cpuPerc = safePercent(secured.compute, global.compute);
                    const labPerc = safePercent(secured.labor, global.labor);

                    // Hegemony rating
                    const totalSecuredSum = secured.agriculture + secured.minerals + secured.energy + secured.compute + secured.labor;
                    const totalGlobalSum = global.agriculture + global.minerals + global.energy + global.compute + global.labor;
                    const hegemonyPercent = totalGlobalSum > 0 ? (totalSecuredSum / totalGlobalSum) * 100 : 0;

                    let rating = "Securing Base Outpost";
                    let ratingColor = "text-neutral-500 border-neutral-900";
                    if (hegemonyPercent >= 75) {
                      rating = "Omnipresent Dominum";
                      ratingColor = "text-purple-400 border-purple-500/20 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]";
                    } else if (hegemonyPercent >= 45) {
                      rating = "Sovereign Superpower";
                      ratingColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                    } else if (hegemonyPercent >= 20) {
                      rating = "Regional Hegemon";
                      ratingColor = "text-amber-400 border-amber-500/20 bg-amber-500/5";
                    } else if (hegemonyPercent > 0) {
                      rating = "Fledgling Dominance";
                      ratingColor = "text-sky-400 border-sky-500/20 bg-sky-500/5";
                    }

                    // Top contributing countries for the secured territories
                    const contributors = securedCountriesFiltered
                      .map(c => {
                        const r = getRes(c);
                        const scoreSum = r.agriculture + r.minerals + r.energy + r.compute + r.labor;
                        return { name: c.name, code: c.code, score: scoreSum };
                      })
                      .sort((a,b) => b.score - a.score)
                      .slice(0, 3);

                    return (
                      <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                        {/* Tab header */}
                        <div className="p-4 bg-emerald-500/5 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                          <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            RESOURCES HARVESTED ({securedCountriesFiltered.length})
                          </span>
                        </div>

                        {/* Contents */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left font-mono">
                          {/* Hegemony Dashboard Summary */}
                          <div className={cn("p-4 border rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center", ratingColor)}>
                            <div className="text-[8px] uppercase tracking-widest text-neutral-500">Resource Control Rating</div>
                            <div className="text-sm font-black uppercase tracking-tight">{rating}</div>
                            <div className="text-[11px] font-bold text-neutral-400 mt-1">{hegemonyPercent.toFixed(1)}% of {activeContinent || 'Global'} Yield Secure</div>
                            {/* Unified Resource Progress bar */}
                            <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden mt-1.5 border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${hegemonyPercent}%` }} 
                                className="h-full bg-current" 
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          </div>

                          {/* Individual Resource Grid */}
                          <div className="space-y-3">
                            <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest pl-1">Geopolitical Resource Portals</div>
                            
                            {/* Agriculture Item */}
                            <div className="p-3 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 px-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                    <Sprout className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="text-left">
                                    <h5 className="text-[9px] font-black text-neutral-300 uppercase leading-none">Arable Land Yield</h5>
                                    <p className="text-[7px] text-neutral-500 uppercase leading-normal tracking-wide mt-0.5 font-bold">Agriculture, food production</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-emerald-400">
                                  {agPerc.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1 bg-neutral-950 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${agPerc}%` }} className="h-full bg-emerald-500" />
                              </div>
                              <div className="flex justify-between text-[7px] text-neutral-600">
                                <span>Secured: {secured.agriculture.toFixed(0)} MT / yr</span>
                                <span>Limit: {global.agriculture.toFixed(0)} MT / yr</span>
                              </div>
                            </div>

                            {/* Minerals Item */}
                            <div className="p-3 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 px-1.5 bg-amber-500/10 rounded-lg text-amber-500">
                                    <Pickaxe className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="text-left">
                                    <h5 className="text-[9px] font-black text-neutral-300 uppercase leading-none">Mineral & Metals</h5>
                                    <p className="text-[7px] text-neutral-500 uppercase leading-normal tracking-wide mt-0.5 font-bold">Heavy ore, rare earth elements</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-amber-500">
                                  {minPerc.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1 bg-neutral-950 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${minPerc}%` }} className="h-full bg-amber-500" />
                              </div>
                              <div className="flex justify-between text-[7px] text-neutral-600">
                                <span>Secured: {secured.minerals.toFixed(0)} KT / yr</span>
                                <span>Limit: {global.minerals.toFixed(0)} KT / yr</span>
                              </div>
                            </div>

                            {/* Energy Item */}
                            <div className="p-3 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 px-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                                    <Zap className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="text-left">
                                    <h5 className="text-[9px] font-black text-neutral-300 uppercase leading-none">Grid & Energy Reserves</h5>
                                    <p className="text-[7px] text-neutral-500 uppercase leading-normal tracking-wide mt-0.5 font-bold">Crude, natural gas, power plants</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-rose-400">
                                  {nrgPerc.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1 bg-neutral-950 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${nrgPerc}%` }} className="h-full bg-rose-500" />
                              </div>
                              <div className="flex justify-between text-[7px] text-neutral-600">
                                <span>Secured: {secured.energy.toFixed(0)} GW / hr</span>
                                <span>Limit: {global.energy.toFixed(0)} GW / hr</span>
                              </div>
                            </div>

                            {/* Computing Item */}
                            <div className="p-3 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 px-1.5 bg-sky-500/10 rounded-lg text-sky-400">
                                    <Cpu className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="text-left">
                                    <h5 className="text-[9px] font-black text-neutral-300 uppercase leading-none">Silicon Grid Nodes</h5>
                                    <p className="text-[7px] text-neutral-500 uppercase leading-normal tracking-wide mt-0.5 font-bold">High compute, AI model datacenters</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-sky-400">
                                  {cpuPerc.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1 bg-neutral-950 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${cpuPerc}%` }} className="h-full bg-sky-500" />
                              </div>
                              <div className="flex justify-between text-[7px] text-neutral-600">
                                <span>Secured: {secured.compute.toFixed(0)} EFLOPS</span>
                                <span>Limit: {global.compute.toFixed(0)} EFLOPS</span>
                              </div>
                            </div>

                            {/* Human Resource Item */}
                            <div className="p-3 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 px-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                                    <Users className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="text-left">
                                    <h5 className="text-[9px] font-black text-neutral-300 uppercase leading-none">Labor & Workforce Force</h5>
                                    <p className="text-[7px] text-neutral-500 uppercase leading-normal tracking-wide mt-0.5 font-bold">Engineering talent, high intellect</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-purple-400">
                                  {labPerc.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-1 bg-neutral-950 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${labPerc}%` }} className="h-full bg-purple-500" />
                              </div>
                              <div className="flex justify-between text-[7px] text-neutral-600">
                                <span>Secured: {(secured.labor * 10).toFixed(0)}K Index</span>
                                <span>Limit: {(global.labor * 10).toFixed(0)}K Index</span>
                              </div>
                            </div>
                          </div>

                          {/* Top Contributors */}
                          {contributors.length > 0 && (
                            <div className="space-y-2 border-t border-neutral-800/55 pt-3">
                              <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest pl-1">Primary Resource Hubs (Secured)</div>
                              <div className="space-y-1">
                                {contributors.map((co, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-[#1c1c1e]/40 border border-neutral-800/40 rounded-xl text-[9px]">
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-emerald-500 font-extrabold shrink-0">#{idx+1}</span>
                                      {co.code && (
                                        <img 
                                          src={`https://flagcdn.com/w20/${co.code.toLowerCase()}.png`} 
                                          className="w-4 h-3 rounded-sm object-cover border border-white/5 shrink-0" 
                                          alt="" 
                                        />
                                      )}
                                      <span className="text-neutral-300 font-bold truncate uppercase">{co.name}</span>
                                    </div>
                                    <span className="text-neutral-500 text-[8px] font-extrabold shrink-0">Yield score: {co.score.toFixed(0)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {expansionPanelTab === 'rogue' && (() => {
                    const countrySaveCounts = viewingRecord?.countrySaveCounts || {};
                    const immuneCountryIds = viewingRecord?.immuneCountryIds || [];
                    const infectedIds = viewingRecord?.infectedIds || [];
                    const shieldedIds = viewingRecord?.shieldedIds || [];
                    const difficulty = viewingRecord?.supplyDifficulty || 3;
                    const reqSaves = 6 - difficulty;

                    // Calculate high-level metrics for containment progress
                    const savedCountriesList = Object.keys(countrySaveCounts).filter(cid => (countrySaveCounts as Record<string, number>)[cid] > 0);
                    const totalSavesPerformed = (Object.values(countrySaveCounts) as number[]).reduce((sum, count) => sum + count, 0);
                    const immuneCount = immuneCountryIds.length;
                    const activeInfectedCount = infectedIds.length;
                    const activeShieldedCount = shieldedIds.length;

                    // Group save statistics by Continent
                    const continentStats: Record<string, { totalSaves: number, totalImmune: number, totalStable: number }> = {};
                    COUNTRIES.forEach(c => {
                      if (!continentStats[c.continent]) {
                        continentStats[c.continent] = { totalSaves: 0, totalImmune: 0, totalStable: 0 };
                      }
                      const saves = countrySaveCounts[c.id] || 0;
                      const isImmune = immuneCountryIds.includes(c.id);
                      const isInfected = infectedIds.includes(c.id);

                      continentStats[c.continent].totalSaves += saves;
                      if (isImmune) {
                        continentStats[c.continent].totalImmune += 1;
                      }
                      if (!isInfected && !isImmune) {
                        continentStats[c.continent].totalStable += 1;
                      }
                    });

                    // List top shielded or saved hot-spots
                    const hotspotCountries = COUNTRIES
                      .map(c => ({
                        name: c.name,
                        code: c.code,
                        id: c.id,
                        saves: countrySaveCounts[c.id] || 0,
                        isImmune: immuneCountryIds.includes(c.id),
                        isInfected: infectedIds.includes(c.id),
                        isShielded: shieldedIds.includes(c.id)
                      }))
                      .filter(hc => hc.saves > 0 || hc.isImmune || hc.isShielded || hc.isInfected)
                      .sort((a, b) => b.saves - a.saves)
                      .slice(0, 15);

                    return (
                      <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0">
                        {/* Tab header */}
                        <div className="p-4 bg-red-950/15 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                          <span className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                            <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            ROGUE CONTAINMENT INTEL PANEL
                          </span>
                        </div>

                        {/* Contents */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left font-mono">
                          {/* Main Stats Aggregators */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Containment Tier</span>
                              <span className="text-xs font-black text-rose-400 block uppercase">Difficulty Lvl {difficulty}</span>
                              <span className="text-[7.5px] text-neutral-400 font-bold uppercase mt-1.5 block">
                                requires {reqSaves} saves to immunize
                              </span>
                            </div>

                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Total Interventions</span>
                              <span className="text-xs font-black text-emerald-400 block font-mono">{totalSavesPerformed} Saves</span>
                              <span className="text-[7.5px] text-neutral-400 font-bold uppercase mt-1.5 block">
                                across {savedCountriesList.length} unique sectors
                              </span>
                            </div>

                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Immune Sectors</span>
                              <span className="text-xs font-black text-cyan-400 block font-mono">{immuneCount} immune</span>
                              <span className="text-[7.5px] text-neutral-500 uppercase tracking-wider mt-1.5 block font-bold">
                                {((immuneCount / COUNTRIES.length) * 100).toFixed(0)}% sector immunity
                              </span>
                            </div>

                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Fires & Active Threats</span>
                              <span className="text-xs font-black text-red-400 block font-mono">{activeInfectedCount} infected</span>
                              <span className="text-[7.5px] text-neutral-500 uppercase tracking-wider mt-1.5 block font-bold">
                                {activeShieldedCount} active firewalls
                              </span>
                            </div>
                          </div>

                          {/* Continent Outbreak Breakdown */}
                          <div className="space-y-2 border-t border-neutral-800/60 pt-3">
                            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest pl-1 block">Continent Epidemic Vectors</span>
                            <div className="grid grid-cols-1 gap-2">
                              {Object.entries(continentStats).map(([contName, cst]) => {
                                const totalContSectors = COUNTRIES.filter(c => c.continent === contName).length;
                                const immPercent = (cst.totalImmune / totalContSectors) * 100;
                                return (
                                  <div key={contName} className="p-3 bg-[#151518]/30 border border-neutral-900 rounded-2xl space-y-1.5 text-[9px]">
                                    <div className="flex justify-between items-center">
                                      <span className="text-white font-bold uppercase">{contName}</span>
                                      <span className="text-neutral-500">{cst.totalSaves} Total Saves</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[8px] text-neutral-400">
                                      <span>Immune: {cst.totalImmune} / {totalContSectors}</span>
                                      <span className="text-right">Stable: {cst.totalStable} / {totalContSectors}</span>
                                    </div>
                                    <div className="w-full bg-neutral-900/60 h-1 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-cyan-500 transition-all duration-300"
                                        style={{ width: `${immPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Rogue Hotspots & Sector Dossiers */}
                          <div className="space-y-2 border-t border-neutral-800/60 pt-3">
                            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest pl-1 block">Sector Incident Logs</span>
                            <div className="space-y-1.5">
                              {hotspotCountries.length === 0 ? (
                                <div className="text-center py-4 text-xs italic text-neutral-500">
                                  No incident records logged for this session.
                                </div>
                              ) : (
                                hotspotCountries.map((hc) => (
                                  <button
                                    key={hc.id}
                                    onClick={() => setSelectedExpandedCountryId(hc.id)}
                                    className={cn(
                                      "w-full flex items-center justify-between p-2 rounded-xl border text-[9px] transition-all hover:bg-neutral-900 border-neutral-900/60 text-left",
                                      selectedExpandedCountryId === hc.id ? "bg-red-500/10 border-red-500/30" : "bg-neutral-950/20"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {hc.code && (
                                        <img 
                                          src={`https://flagcdn.com/w20/${hc.code.toLowerCase()}.png`} 
                                          className="w-4 h-3 rounded-sm object-cover border border-white/5 shrink-0" 
                                          alt="" 
                                        />
                                      )}
                                      <span className="text-neutral-300 font-bold truncate uppercase">{hc.name}</span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {hc.isImmune ? (
                                        <span className="text-[7.5px] font-black bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded uppercase font-bold">Immune</span>
                                      ) : hc.isShielded ? (
                                        <span className="text-[7.5px] font-black bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-1 py-0.5 rounded uppercase font-bold">Firewalled</span>
                                      ) : hc.isInfected ? (
                                        <span className="text-[7.5px] font-black bg-red-950/40 text-red-400 border border-red-500/20 px-1 py-0.5 rounded uppercase font-bold animate-pulse">Infected</span>
                                      ) : null}
                                      <span className="text-neutral-500 font-bold">{hc.saves} Saves</span>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {expansionPanelTab === 'supply_route' && (() => {
                    const start = viewingRecord.supplyChainStartId || supplyChainStartId;
                    const end = viewingRecord.supplyChainEndId || supplyChainEndId;
                    const startCountry = COUNTRIES.find(c => c.id === start);
                    const endCountry = COUNTRIES.find(c => c.id === end);

                    const userPath = viewingRecord.supplyChainPathList || [];
                    const chokes = viewingRecord.supplyChainChokeIds || [];
                    const decays = viewingRecord.supplyChainDecayIds || [];
                    const difficultyLvl = viewingRecord.supplyDifficulty || 2;
                    const config = SUPPLY_CHAIN_L_CONFIGS[difficultyLvl] || SUPPLY_CHAIN_L_CONFIGS[2];

                    const actualStart = userPath[0] || start;
                    const bestPath = actualStart && end ? findSupplyChainPath(actualStart, end, new Set()) : null;

                    return (
                      <div className="flex-1 flex flex-col border border-neutral-800 rounded-3xl overflow-hidden bg-[#121212]/30 min-h-0 animate-fade-in text-left">
                        {/* Tab header */}
                        <div className="p-4 bg-amber-950/15 border-b border-neutral-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                          <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            SUPPLY INTERCEPT DETAILED LOGS
                          </span>
                        </div>

                        {/* Contents */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left font-mono">
                          
                          {/* Overview Stats Aggregators */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Routing Tier</span>
                              <span className="text-xs font-black text-amber-400 block uppercase">Level {difficultyLvl} • {config.badge}</span>
                              <span className="text-[7.5px] text-neutral-400 font-bold uppercase mt-1 block">
                                Decay every {(config.decayInterval / 1000).toFixed(1)}s
                              </span>
                            </div>

                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Score Multiplier</span>
                              <span className="text-xs font-black text-emerald-400 block font-mono">x{config.scoreMultiplier.toFixed(1)} XP</span>
                              <span className="text-[7.5px] text-neutral-400 font-bold uppercase mt-1 block">
                                Max concurrent chokes: {config.maxChokes}
                              </span>
                            </div>

                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">User Hop Route</span>
                              <span className="text-xs font-black text-cyan-400 block font-mono">{userPath.length} Steps</span>
                              <span className="text-[7.5px] text-neutral-400 font-bold uppercase mt-1 block">
                                Connected {userPath.length > 0 ? "safely" : "with decay"}
                              </span>
                            </div>

                            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block mb-1">Fastest Possible Path</span>
                              <span className="text-xs font-black text-green-400 block font-mono">{bestPath ? bestPath.length : 0} Steps</span>
                              <span className="text-[7.5px] text-neutral-400 font-bold uppercase mt-1 block">
                                Optimal path solution
                              </span>
                            </div>
                          </div>

                          {/* Map Visualization Toggler */}
                          <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-2xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] text-neutral-500 uppercase tracking-widest block font-bold text-left">ROUTE VISUAL OVERLAY</span>
                              <span className="text-[7px] text-neutral-400 font-mono font-bold bg-neutral-950 px-1 py-0.5 rounded border border-neutral-800 uppercase animate-pulse">
                                Toggle map render
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setSupplyChainOverlayMode('user')}
                                className={cn(
                                  "py-2 px-1.5 rounded-xl border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer",
                                  supplyChainOverlayMode === 'user'
                                    ? "bg-amber-500/10 border-amber-500/60 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                    : "bg-neutral-950/40 border-neutral-900 text-neutral-500 hover:text-white hover:border-neutral-800"
                                )}
                              >
                                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                My Route ({userPath.length} steps)
                              </button>
                              <button
                                onClick={() => setSupplyChainOverlayMode('optimal')}
                                className={cn(
                                  "py-2 px-1.5 rounded-xl border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 cursor-pointer",
                                  supplyChainOverlayMode === 'optimal'
                                    ? "bg-green-500/10 border-green-500/60 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                    : "bg-neutral-950/40 border-neutral-900 text-neutral-500 hover:text-white hover:border-neutral-800"
                                )}
                              >
                                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                Optimal Route ({bestPath ? bestPath.length : 0} steps)
                              </button>
                            </div>
                          </div>

                          {/* Waypoint terminals list */}
                          <div className="space-y-3">
                            <div className="text-[8px] font-black text-neutral-500 uppercase tracking-widest pl-1 header-aligned text-left">Route Terminal Stations</div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {/* Starting station */}
                              {startCountry && (
                                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1">
                                  <span className="text-[7px] text-neutral-500 uppercase block font-black">Supply Depot [START]</span>
                                  <div className="flex items-center gap-1.5">
                                    <img 
                                      src={`https://flagcdn.com/w20/${startCountry.code.toLowerCase()}.png`} 
                                      className="w-4 h-3 rounded-sm object-cover border border-white/5 shrink-0" 
                                      alt="" 
                                    />
                                    <span className="text-[9px] font-bold text-white uppercase truncate">{startCountry.name}</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Ending station */}
                              {endCountry && (
                                <div className="p-2 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1">
                                  <span className="text-[7px] text-cyan-400 uppercase block font-black font-mono">Receiver Hub [END]</span>
                                  <div className="flex items-center gap-1.5">
                                    <img 
                                      src={`https://flagcdn.com/w20/${endCountry.code.toLowerCase()}.png`} 
                                      className="w-4 h-3 rounded-sm object-cover border border-white/5 shrink-0" 
                                      alt="" 
                                    />
                                    <span className="text-[9px] font-bold text-cyan-400 uppercase truncate">{endCountry.name}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Detail Route List Timeline */}
                          <div className="space-y-2 border-t border-neutral-800/60 pt-3">
                            <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest pl-1 block text-left">
                              {supplyChainOverlayMode === 'optimal' ? "Optimal Waypoint Timeline" : "Your Intercept Timeline"}
                            </span>
                            <div className="space-y-1.5 pl-1.5 relative border-l border-neutral-800/80 ml-2">
                              {(() => {
                                const activePathList = supplyChainOverlayMode === 'optimal' ? bestPath : userPath;
                                if (!activePathList || activePathList.length === 0) {
                                  return (
                                    <div className="text-center py-4 text-xs italic text-neutral-500">
                                      No route data available for this timeline.
                                    </div>
                                  );
                                }
                                return activePathList.map((countryId, index) => {
                                  const c = COUNTRIES.find(curr => curr.id === countryId);
                                  if (!c) return null;
                                  return (
                                    <div key={countryId + '-' + index} className="flex items-center gap-2.5 text-[9px] relative pl-4 py-0.5 group">
                                      <div className={cn(
                                        "absolute left-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border bg-neutral-950 transition-all group-hover:scale-125",
                                        supplyChainOverlayMode === 'optimal' ? "border-green-500" : "border-amber-400"
                                      )} />
                                      {c.code && (
                                        <img 
                                          src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} 
                                          className="w-4 h-3 rounded-sm object-cover border border-white/5 shrink-0" 
                                          alt="" 
                                        />
                                      )}
                                      <div className="truncate flex-1">
                                        <span className="text-neutral-300 font-bold truncate uppercase">{c.name}</span>
                                        <span className="text-[7.5px] text-neutral-500 font-mono ml-2 font-black">HOP {index + 1}</span>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}
                </motion.div>


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
                    {!isMemoryMode && mostRecentGuessedId ? (() => {
                      const country = COUNTRIES.find(c => c.id === mostRecentGuessedId);
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
                       <div className="flex items-center justify-center gap-2 text-neutral-600">
                          {isMemoryMode ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              <p className="text-xs font-mono uppercase tracking-[0.2em]">None Detected</p>
                            </>
                          ) : (
                            <p className="text-lg font-bold uppercase">None Detected</p>
                          )}
                       </div>
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

      {/* Flag Quantity Selection Prompt */}
      <AnimatePresence>
        {showFlagQuantityPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#121212] border border-neutral-800 p-8 rounded-[32px] shadow-2xl max-w-md w-full text-center space-y-8 relative overflow-hidden"
            >
              {/* Styling accents */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/5 rounded-full blur-[60px]" />

              <div className="space-y-3">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto text-rose-500 border border-rose-500/20 rotate-3">
                  <Flag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">QUANTITY PROTOCOL</h3>
                  <p className="text-neutral-500 text-[9px] font-mono uppercase tracking-[0.2em] font-bold">Select Flag Count for Decryption</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[5, 10, 20, 50, 100, 199].map((q) => {
                  let badge = "TACTICAL";
                  let color = "hover:border-rose-500/40 hover:bg-rose-500/5 text-rose-400";
                  if (q === 5) { badge = "SABER"; color = "hover:border-emerald-500/40 hover:bg-emerald-500/5 text-emerald-400"; }
                  else if (q === 10) { badge = "STANDARD"; color = "hover:border-cyan-500/40 hover:bg-cyan-500/5 text-cyan-400"; }
                  else if (q === 20) { badge = "ADVANCED"; color = "hover:border-blue-500/40 hover:bg-blue-500/5 text-blue-400"; }
                  else if (q === 50) { badge = "INTENSE"; color = "hover:border-purple-500/40 hover:bg-purple-500/5 text-purple-400"; }
                  else if (q === 100) { badge = "HARDCORE"; color = "hover:border-amber-500/40 hover:bg-amber-500/5 text-amber-400"; }
                  else if (q === 199) { badge = "ALL GLOBE"; color = "hover:border-rose-500/40 hover:bg-rose-500/5 text-rose-500"; }

                  return (
                    <button
                      key={q}
                      onClick={() => {
                        setFlagCountLimit(q);
                        setShowFlagQuantityPrompt(false);
                        setGameType('flag');
                        setFlagGameMode('timed');
                        startGame(selectedDuration, 'flag', q);
                      }}
                      className={cn(
                        "p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] group",
                        color
                      )}
                    >
                      <span className="text-2xl font-black font-mono leading-none">{q}</span>
                      <span className="text-[8px] opacity-60 font-mono tracking-widest font-black uppercase">{badge}</span>
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowFlagQuantityPrompt(false)}
                className="w-full py-2 text-neutral-600 hover:text-neutral-400 transition-colors font-black uppercase tracking-widest text-[9px]"
              >
                Abort Protocol
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Target Highlight Quantity Selection Prompt */}
      <AnimatePresence>
        {showHighlightQuantityPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#121212] border border-neutral-800 p-8 rounded-[32px] shadow-2xl max-w-md w-full text-center space-y-8 relative overflow-hidden"
            >
              {/* Styling accents */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px]" />

              <div className="space-y-3">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto text-amber-500 border border-amber-500/20 rotate-3">
                  <Target className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">TARGET ACQUISITION PROTOCOL</h3>
                  <p className="text-neutral-500 text-[9px] font-mono uppercase tracking-[0.2em] font-bold">Select Active Targets for Guessing</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[5, 10, 20, 50, 100, 199].map((q) => {
                  let badge = "TACTICAL";
                  let color = "hover:border-amber-500/40 hover:bg-amber-500/5 text-amber-400";
                  if (q === 5) { badge = "SABER"; color = "hover:border-emerald-500/40 hover:bg-emerald-500/5 text-emerald-400"; }
                  else if (q === 10) { badge = "STANDARD"; color = "hover:border-cyan-500/40 hover:bg-cyan-500/5 text-cyan-400"; }
                  else if (q === 20) { badge = "ADVANCED"; color = "hover:border-blue-500/40 hover:bg-blue-500/5 text-blue-400"; }
                  else if (q === 50) { badge = "INTENSE"; color = "hover:border-purple-500/40 hover:bg-purple-500/5 text-purple-400"; }
                  else if (q === 100) { badge = "HARDCORE"; color = "hover:border-rose-500/40 hover:bg-rose-500/5 text-rose-400"; }
                  else if (q === 199) { badge = "ALL GLOBE"; color = "hover:border-amber-500/40 hover:bg-amber-500/5 text-amber-500"; }

                  return (
                    <button
                      key={q}
                      onClick={() => {
                        setHighlightCountLimit(q);
                        setShowHighlightQuantityPrompt(false);
                        setGameType('highlight');
                        startGame(selectedDuration, 'highlight', q);
                      }}
                      className={cn(
                        "p-4 bg-neutral-900 border border-neutral-805 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] group",
                        color
                      )}
                    >
                      <span className="text-2xl font-black font-mono leading-none">{q}</span>
                      <span className="text-[8px] opacity-60 font-mono tracking-widest font-black uppercase">{badge}</span>
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowHighlightQuantityPrompt(false)}
                className="w-full py-2 text-neutral-600 hover:text-neutral-400 transition-colors font-black uppercase tracking-widest text-[9px]"
              >
                Abort Protocol
              </button>
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
