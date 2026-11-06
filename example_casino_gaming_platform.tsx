import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';

// --- Firebase Configuration Setup ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'example-casino-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-api-key",
      authDomain: "demo-app.firebaseapp.com",
      projectId: "demo-app",
      storageBucket: "demo-app.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:123456789"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getUserDocRef = (uid) => doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data');

// Unified Titles, Expanded Rarities & Strict Color Coding Database
const TITLES_DB = {
  'Novice Gambler': { rarity: 'Common', color: 'text-slate-400 bg-slate-900 border-slate-700' },
  'Lucky Beginner': { rarity: 'Common', color: 'text-slate-400 bg-slate-900 border-slate-700' },
  'Coin Flipper': { rarity: 'Uncommon', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' },
  'Dice Roller': { rarity: 'Uncommon', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' },
  'Card Shark': { rarity: 'Rare', color: 'text-blue-400 bg-blue-950/40 border-blue-800' },
  'High Roller': { rarity: 'Rare', color: 'text-blue-400 bg-blue-950/40 border-blue-800' },
  'Fortune Seeker': { rarity: 'Epic', color: 'text-purple-400 bg-purple-950/40 border-purple-800' },
  'Casino Royale': { rarity: 'Epic', color: 'text-purple-400 bg-purple-950/40 border-purple-800' },
  'Jackpot Master': { rarity: 'Legendary', color: 'text-amber-400 bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]' },
  'The Chosen One': { rarity: 'Legendary', color: 'text-amber-400 bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]' },
  'Mythic Gambler': { rarity: 'Mythic', color: 'text-rose-400 bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]' },
  'God of Chaos': { rarity: 'Mythic', color: 'text-rose-400 bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]' },
  'Cosmic Overlord': { rarity: 'Exotic', color: 'text-indigo-400 bg-indigo-950/50 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.45)] animate-pulse' },
  'Transcendent Entity': { rarity: 'Transcendent', color: 'text-cyan-300 bg-cyan-950/60 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-pulse' }
};

// Crates with Explicit Multi-Tier Drop Odds
const CRATES_DB = [
  { 
    id: 'bronze', 
    name: 'Bronze Crate', 
    price: 50, 
    color: 'border-slate-700 bg-slate-900/60',
    drops: [
      { title: 'Novice Gambler', chance: 60 },
      { title: 'Lucky Beginner', chance: 30 },
      { title: 'Coin Flipper', chance: 10 }
    ]
  },
  { 
    id: 'silver', 
    name: 'Silver Crate', 
    price: 250, 
    color: 'border-blue-800/80 bg-blue-950/20',
    drops: [
      { title: 'Dice Roller', chance: 45 },
      { title: 'Card Shark', chance: 35 },
      { title: 'High Roller', chance: 15 },
      { title: 'Fortune Seeker', chance: 5 }
    ]
  },
  { 
    id: 'gold', 
    name: 'Gold Crate', 
    price: 1000, 
    color: 'border-amber-600/80 bg-amber-950/20',
    drops: [
      { title: 'Casino Royale', chance: 40 },
      { title: 'Jackpot Master', chance: 35 },
      { title: 'The Chosen One', chance: 20 },
      { title: 'Mythic Gambler', chance: 5 }
    ]
  },
  { 
    id: 'diamond', 
    name: 'Diamond Crate', 
    price: 5000, 
    color: 'border-cyan-400 bg-cyan-950/30',
    drops: [
      { title: 'Mythic Gambler', chance: 40 },
      { title: 'God of Chaos', chance: 35 },
      { title: 'Cosmic Overlord', chance: 18 },
      { title: 'Transcendent Entity', chance: 7 }
    ]
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // User Game Data
  const [userData, setUserData] = useState({
    username: 'Guest Player',
    balance: 1000,
    totalBetted: 0,
    totalWon: 0,
    history: [],
    unlockedTitles: ['Novice Gambler'],
    equippedTitle: 'Novice Gambler',
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    messages: {}
  });

  // Navigation & UI
  const [activeTab, setActiveTab] = useState('games');
  const [activeGame, setActiveGame] = useState('slots');
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [lbFilter, setLbFilter] = useState('balance');

  // Crate Opening Animations & Batch Buying State
  const [crateQuantity, setCrateQuantity] = useState(1);
  const [openingCrateModal, setOpeningCrateModal] = useState(false);
  const [animatingTitle, setAnimatingTitle] = useState('Opening...');
  const [crateUnlockedResults, setCrateUnlockedResults] = useState([]);

  // Global Wager Control ($1 min)
  const [currentBet, setCurrentBet] = useState(10);
  const [customBetInput, setCustomBetInput] = useState('10');

  // Firebase Auth & Snapshot Sync
  useEffect(() => {
    let unsubSnapshot = null;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(false);

      if (currentUser) {
        const savedAccount = localStorage.getItem('example_casino_current_user');
        if (savedAccount) {
          const parsed = JSON.parse(savedAccount);
          setUser(currentUser);
          setUserData(parsed);
        }

        const userRef = getUserDocRef(currentUser.uid);
        try {
          unsubSnapshot = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data();
              setUserData(prev => ({ ...prev, ...remoteData }));
            }
          }, (err) => {
            console.warn("Snapshot fallback:", err.message);
          });
        } catch (e) {
          console.warn("Firestore listener skipped:", e);
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, []);

  const saveUserData = async (updated) => {
    if (!user) return;
    localStorage.setItem('example_casino_current_user', JSON.stringify(updated));
    const userRef = getUserDocRef(user.uid);
    try {
      await setDoc(userRef, updated, { merge: true });
    } catch (e) {
      console.warn("Firestore sync skipped:", e);
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    const uName = usernameInput.trim();
    const pWord = passwordInput.trim();

    if (!uName || !pWord) {
      setAuthError('Please fill in both username and password.');
      return;
    }

    const existingAccounts = JSON.parse(localStorage.getItem('example_casino_accounts') || '{}');

    if (isRegistering) {
      if (existingAccounts[uName]) {
        setAuthError('Username already taken! Please choose a unique username.');
        return;
      }

      const newAccount = {
        username: uName,
        password: pWord,
        balance: 1000,
        totalBetted: 0,
        totalWon: 0,
        history: [],
        unlockedTitles: ['Novice Gambler'],
        equippedTitle: 'Novice Gambler',
        friends: [],
        pendingRequests: [],
        sentRequests: [],
        messages: {}
      };

      existingAccounts[uName] = newAccount;
      localStorage.setItem('example_casino_accounts', JSON.stringify(existingAccounts));
      
      setUser(auth.currentUser || { uid: 'local-user-' + uName });
      setUserData(newAccount);
      localStorage.setItem('example_casino_current_user', JSON.stringify(newAccount));
    } else {
      const found = existingAccounts[uName];
      if (!found) {
        setAuthError('Username not found. Please register or check spelling.');
        return;
      }
      if (found.password !== pWord) {
        setAuthError('Incorrect password. Please try again.');
        return;
      }

      setUser(auth.currentUser || { uid: 'local-user-' + uName });
      setUserData(found);
      localStorage.setItem('example_casino_current_user', JSON.stringify(found));
    }
  };

  const handleLogout = async () => {
    setShowLogoutMenu(false);
    localStorage.removeItem('example_casino_current_user');
    setUser(null);
  };

  const recordGameResult = (betAmount, winAmount, gameName) => {
    const isWin = winAmount > betAmount;
    const newBal = Math.max(0, userData.balance - betAmount + winAmount);
    const newBetted = userData.totalBetted + betAmount;
    const newWon = userData.totalWon + winAmount;
    const newHist = [
      { outcome: isWin ? 'win' : 'loss', bet: betAmount, won: winAmount, game: gameName },
      ...(userData.history || [])
    ].slice(0, 50);

    const updated = {
      ...userData,
      balance: newBal,
      totalBetted: newBetted,
      totalWon: newWon,
      history: newHist
    };

    setUserData(updated);
    saveUserData(updated);
  };

  const handlePercentBet = (pct) => {
    const calc = Math.floor((userData.balance * pct) / 100);
    const finalBet = Math.max(1, Math.min(userData.balance, calc));
    setCurrentBet(finalBet);
    setCustomBetInput(finalBet.toString());
  };

  const handleAllIn = () => {
    const finalBet = Math.max(1, userData.balance);
    setCurrentBet(finalBet);
    setCustomBetInput(finalBet.toString());
  };

  const handleCustomBetChange = (e) => {
    const val = e.target.value;
    setCustomBetInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setCurrentBet(Math.max(1, Math.min(userData.balance, num)));
    }
  };

  const equipTitle = (titleName) => {
    const updated = { ...userData, equippedTitle: titleName };
    setUserData(updated);
    saveUserData(updated);
  };

  const openCratesBatch = (crate, qty) => {
    const totalCost = crate.price * qty;
    if (userData.balance < totalCost || openingCrateModal) return;

    setOpeningCrateModal(true);
    setCrateUnlockedResults([]);

    const wonTitlesArr = [];
    for (let q = 0; q < qty; q++) {
      const roll = Math.random() * 100;
      let accum = 0;
      let wonTitle = crate.drops[0].title;
      for (let drop of crate.drops) {
        accum += drop.chance;
        if (roll <= accum) {
          wonTitle = drop.title;
          break;
        }
      }
      wonTitlesArr.push(wonTitle);
    }

    let counter = 0;
    const allTitlesKeys = Object.keys(TITLES_DB);
    const interval = setInterval(() => {
      const randomDisplay = allTitlesKeys[Math.floor(Math.random() * allTitlesKeys.length)];
      setAnimatingTitle(randomDisplay);
      counter++;

      if (counter > 20) {
        clearInterval(interval);
        setAnimatingTitle(wonTitlesArr[wonTitlesArr.length - 1]);
        setCrateUnlockedResults(wonTitlesArr);

        const newUnlocked = Array.from(new Set([...(userData.unlockedTitles || ['Novice Gambler']), ...wonTitlesArr]));
        const updated = {
          ...userData,
          balance: userData.balance - totalCost,
          unlockedTitles: newUnlocked
        };

        setUserData(updated);
        saveUserData(updated);
      }
    }, 80);
  };

  const recentHistory = (userData.history || []).slice(0, 20);
  const winCount = recentHistory.filter(h => h.outcome === 'win').length;
  const winRatePct = recentHistory.length > 0 ? Math.round((winCount / recentHistory.length) * 100) : 0;

  const allAccountsRaw = JSON.parse(localStorage.getItem('example_casino_accounts') || '{}');
  const leaderboardList = Object.values(allAccountsRaw).map((acc) => ({
    id: acc.username,
    username: acc.username,
    balance: acc.balance ?? 1000,
    title: acc.equippedTitle || 'Novice Gambler',
    winRate: (acc.history || []).length > 0 
      ? Math.round(((acc.history || []).filter(h => h.outcome === 'win').length / Math.min(20, (acc.history || []).length)) * 100)
      : 0
  }));

  const sortedLeaderboard = [...leaderboardList].sort((a, b) => {
    if (lbFilter === 'balance') return b.balance - a.balance;
    if (lbFilter === 'winrate') return b.winRate - a.winRate;
    return (TITLES_DB[b.title]?.rarity || '').localeCompare(TITLES_DB[a.title]?.rarity || '');
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono font-bold text-slate-300">Loading Platform...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
              EXAMPLE CASINO
            </h1>
            <p className="text-slate-400 text-xs mt-2 font-medium">
              {isRegistering ? 'Register your player account' : 'Log in to your account'}
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-rose-400 text-xs font-bold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Username
              </label>
              <input 
                type="text" 
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors font-medium"
                placeholder="Enter username..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black py-3.5 rounded-xl hover:opacity-90 transition shadow-lg shadow-amber-500/20 text-sm mt-2"
            >
              {isRegistering ? 'Register Account' : 'Log In'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError('');
              }}
              className="text-xs text-slate-400 hover:text-amber-400 font-semibold transition-colors"
            >
              {isRegistering ? 'Already registered? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <h1 className="text-xl font-black bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent tracking-wider">
          EXAMPLE CASINO
        </h1>

        <div className="flex items-center space-x-4">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl flex items-center space-x-2 shadow-inner">
            <span className="text-amber-400 font-bold">💰</span>
            <span className="font-mono font-black text-emerald-400 text-sm">${userData.balance.toLocaleString()}</span>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              className="flex items-center space-x-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center font-black text-slate-950 text-xs shadow">
                {userData.username.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-xs">{userData.username}</span>
            </button>

            {showLogoutMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-rose-950/30 font-bold transition-colors flex items-center space-x-2"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* TOP TABS */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md px-6 py-3 sticky top-[73px] z-20">
        <nav className="flex items-center gap-2 max-w-[1600px] mx-auto overflow-x-auto">
          {[
            { id: 'games', label: '🎮 Games' },
            { id: 'crates', label: '📦 Crates' },
            { id: 'titles', label: '🏷️ Titles' },
            { id: 'leaderboards', label: '🏆 Leaderboard' },
            { id: 'stats', label: '📊 Stats' },
            { id: 'chat', label: '💬 Chat & Friends', badge: (userData.pendingRequests || []).length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* BODY */}
      <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-72 flex flex-col gap-6 shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-b border-slate-800/60"></div>
            
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center font-black text-slate-950 text-2xl shadow-xl z-10 mt-4 border-4 border-slate-900">
              {userData.username.charAt(0).toUpperCase()}
            </div>

            <h2 className="text-lg font-black mt-3 z-10">{userData.username}</h2>
            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-extrabold border z-10 ${TITLES_DB[userData.equippedTitle]?.color || 'text-slate-400 bg-slate-800'}`}>
              {userData.equippedTitle}
            </div>

            <div className="w-full border-t border-slate-800/80 my-6"></div>

            <div className="w-full space-y-4 text-left font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-sans font-semibold">Win Rate</span>
                <span className="font-bold text-emerald-400">{winRatePct}%</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-sans font-semibold">Wagered</span>
                <span className="font-bold text-amber-400">${userData.totalBetted.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 font-sans font-semibold">Won</span>
                <span className="font-bold text-indigo-400">${userData.totalWon.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          
          {activeTab === 'games' && (
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-sm overflow-x-auto">
                {[
                  { id: 'slots', label: '🎰 Slots' },
                  { id: 'blackjack', label: '🃏 Blackjack' },
                  { id: 'mines', label: '💣 Mines' },
                  { id: 'tower', label: '🗼 Tower' },
                  { id: 'balloon', label: '🎈 Balloon Pump' }
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGame(g.id)}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                      activeGame === g.id
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch">
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-xl overflow-hidden min-h-[460px]">
                  {activeGame === 'slots' && <SlotsGame balance={userData.balance} currentBet={currentBet} onFinish={recordGameResult} />}
                  {activeGame === 'blackjack' && <BlackjackGame balance={userData.balance} currentBet={currentBet} onFinish={recordGameResult} />}
                  {activeGame === 'mines' && <MinesGame balance={userData.balance} currentBet={currentBet} onFinish={recordGameResult} />}
                  {activeGame === 'tower' && <TowerGame balance={userData.balance} currentBet={currentBet} onFinish={recordGameResult} />}
                  {activeGame === 'balloon' && <BalloonPumpGame balance={userData.balance} currentBet={currentBet} onFinish={recordGameResult} />}
                </div>

                <div className="w-full lg:w-72 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl shrink-0">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <span>⚡</span> Wager Control
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[5, 10, 25, 50, 75].map(pct => (
                        <button key={pct} onClick={() => handlePercentBet(pct)} className="bg-slate-950 border border-slate-800 hover:border-amber-500 py-2 rounded-xl text-xs font-bold transition-colors">
                          {pct}%
                        </button>
                      ))}
                      <button onClick={handleAllIn} className="bg-amber-500/20 border border-amber-500/60 text-amber-400 py-2 rounded-xl text-xs font-black hover:bg-amber-500/30 transition-colors">
                        ALL IN
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Custom Bet ($1 Min)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-slate-400 font-bold">$</span>
                        <input 
                          type="number" 
                          min="1" 
                          max={userData.balance}
                          value={customBetInput}
                          onChange={handleCustomBetChange}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl mt-6 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Active Wager</span>
                    <span className="text-base font-mono font-black text-amber-400">${currentBet}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'crates' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-amber-400">Mystery Crates & Titles</h2>
                  <p className="text-xs text-slate-400 mt-1">Select quantity and open crates with spinning animations.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-extrabold uppercase px-2">Quantity:</span>
                  {[1, 3, 5, 10].map(q => (
                    <button
                      key={q}
                      onClick={() => setCrateQuantity(q)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition ${
                        crateQuantity === q ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      x{q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {CRATES_DB.map(crate => {
                  const totalPrice = crate.price * crateQuantity;
                  const canAfford = userData.balance >= totalPrice;

                  return (
                    <div key={crate.id} className={`border ${crate.color} rounded-2xl p-5 flex flex-col justify-between shadow-lg space-y-4`}>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="text-base font-black text-white">{crate.name}</h3>
                          <span className="text-amber-400 font-mono font-bold text-sm">${crate.price}</span>
                        </div>
                        
                        <div className="border-t border-slate-800/80 pt-3 space-y-1.5">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Drop Odds:</span>
                          {crate.drops.map((drop, idx) => {
                            const titleMeta = TITLES_DB[drop.title];
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className={`truncate max-w-[130px] font-bold ${titleMeta ? titleMeta.color.split(' ')[0] : 'text-slate-300'}`}>
                                  {drop.title}
                                </span>
                                <span className="font-mono font-bold text-amber-400">{drop.chance}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button 
                        onClick={() => openCratesBatch(crate, crateQuantity)}
                        disabled={!canAfford}
                        className="w-full bg-slate-950 border border-current hover:bg-amber-500 hover:text-slate-950 font-black py-2.5 rounded-xl text-xs transition-colors disabled:opacity-40"
                      >
                        Buy x{crateQuantity} (${totalPrice.toLocaleString()})
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {openingCrateModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-400 animate-pulse"></div>
                
                <div>
                  <h3 className="text-xl font-black text-white">Opening Mystery Crates...</h3>
                  <p className="text-xs text-slate-400 mt-1">Spinning titles...</p>
                </div>

                <div className="bg-slate-950 border-2 border-amber-500/40 p-6 rounded-2xl flex items-center justify-center shadow-inner">
                  <div className={`text-lg font-black tracking-wide font-mono transition-all ${
                    crateUnlockedResults.length === 0 ? 'scale-110 blur-[0.5px] text-amber-400 animate-pulse' : 'scale-125 text-white'
                  }`}>
                    {animatingTitle}
                  </div>
                </div>

                {crateUnlockedResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400">Unlocked Titles ({crateUnlockedResults.length}):</h4>
                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                      {crateUnlockedResults.map((tName, idx) => {
                        const meta = TITLES_DB[tName];
                        return (
                          <div key={idx} className={`p-2.5 rounded-xl border text-xs font-black ${meta ? meta.color : 'bg-slate-800 text-white'}`}>
                            {tName}
                          </div>
                        );
                      })}
                    </div>
                    <button 
                      onClick={() => setOpeningCrateModal(false)}
                      className="w-full bg-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs hover:bg-amber-400 transition"
                    >
                      Collect Rewards
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'titles' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
              <div>
                <h2 className="text-2xl font-black text-purple-400">Title Collection</h2>
                <p className="text-xs text-slate-400 mt-1">Manage your unlocked titles.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {Object.keys(TITLES_DB).map(tKey => {
                  const tInfo = TITLES_DB[tKey];
                  const unlocked = (userData.unlockedTitles || []).includes(tKey);
                  const isEquipped = userData.equippedTitle === tKey;

                  return (
                    <div key={tKey} className={`border rounded-2xl p-5 flex flex-col justify-between ${tInfo.color} ${!unlocked && 'opacity-40 grayscale border-slate-800 bg-slate-950'}`}>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">{tInfo.rarity}</span>
                        <h3 className="text-base font-bold text-white">{tKey}</h3>
                      </div>

                      <button 
                        onClick={() => unlocked && equipTitle(tKey)}
                        disabled={!unlocked || isEquipped}
                        className="mt-6 w-full bg-slate-950 border border-slate-700 py-2.5 rounded-xl font-bold text-xs hover:border-amber-500 disabled:opacity-50 transition"
                      >
                        {isEquipped ? 'Equipped' : unlocked ? 'Equip Title' : 'Locked'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'leaderboards' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-amber-400">Global Leaderboard</h2>
                  <p className="text-xs text-slate-400">Live rankings computed from registered accounts.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  <span className="text-xs text-slate-400 font-bold px-2">Sort:</span>
                  {[
                    { id: 'balance', label: 'Balance ($)' },
                    { id: 'title', label: 'Title Rarity' },
                    { id: 'winrate', label: 'Win Rate (%)' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setLbFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                        lbFilter === f.id ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto shadow-inner">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4">Equipped Title</th>
                      <th className="py-3 px-4 text-right">Win Rate</th>
                      <th className="py-3 px-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sortedLeaderboard.map((player, idx) => {
                      const isYou = player.username === userData.username;
                      return (
                        <tr key={player.id} className={isYou ? 'bg-amber-500/10' : 'hover:bg-slate-900/50'}>
                          <td className="py-3.5 px-4 font-mono font-bold">
                            {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                            {player.username}
                            {isYou && <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono">YOU</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full border ${TITLES_DB[player.title]?.color || 'text-slate-400 bg-slate-800'}`}>
                              {player.title}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">{player.winRate}%</td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-amber-400">${player.balance.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
              <div>
                <h2 className="text-2xl font-black text-indigo-400">Stats & Analytics</h2>
                <p className="text-xs text-slate-400">Account overview.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm text-slate-300 border-b border-slate-800 pb-3">Performance</h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between"><span className="text-slate-400 font-sans">Total Bets</span><span className="font-bold">{(userData.history || []).length}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-sans">Wagered</span><span className="font-bold text-amber-400">${userData.totalBetted.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-sans">Winnings</span><span className="font-bold text-indigo-400">${userData.totalWon.toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm text-slate-300 border-b border-slate-800 pb-3">Account Details</h3>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between"><span className="text-slate-400 font-sans">Username</span><span className="font-bold text-white">{userData.username}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-sans">Title</span><span className="font-bold text-amber-400">{userData.equippedTitle}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 font-sans">Friends</span><span className="font-bold text-emerald-400">{(userData.friends || []).length}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatAndFriendsTab userData={userData} saveUserData={saveUserData} />
          )}

        </main>
      </div>
    </div>
  );
}

// CHAT & FRIENDS COMPONENT
function ChatAndFriendsTab({ userData, saveUserData }) {
  const [friends, setFriends] = useState(userData.friends || []);
  const [pendingRequests, setPendingRequests] = useState(userData.pendingRequests || []);
  const [friendInput, setFriendInput] = useState('');
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState(userData.messages || {});
  const [textInput, setTextInput] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const allAccounts = JSON.parse(localStorage.getItem('example_casino_accounts') || '{}');
      const currentAcc = allAccounts[userData.username];
      if (currentAcc) {
        if (JSON.stringify(currentAcc.pendingRequests) !== JSON.stringify(pendingRequests)) {
          setPendingRequests(currentAcc.pendingRequests || []);
        }
        if (JSON.stringify(currentAcc.friends) !== JSON.stringify(friends)) {
          setFriends(currentAcc.friends || []);
        }
        if (JSON.stringify(currentAcc.messages) !== JSON.stringify(messages)) {
          setMessages(currentAcc.messages || {});
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userData.username, pendingRequests, friends, messages]);

  const sendFriendRequest = (e) => {
    e.preventDefault();
    setRequestError('');
    setRequestSuccess('');
    const targetName = friendInput.trim();

    if (!targetName) return;
    if (targetName === userData.username) {
      setRequestError("Can't add yourself!");
      return;
    }
    if (friends.includes(targetName)) {
      setRequestError("Already friends.");
      return;
    }

    const allAccounts = JSON.parse(localStorage.getItem('example_casino_accounts') || '{}');
    const targetAccount = allAccounts[targetName];

    if (!targetAccount) {
      setRequestError("User not found.");
      return;
    }

    const targetPending = targetAccount.pendingRequests || [];
    if (targetPending.includes(userData.username)) {
      setRequestError("Request already sent.");
      return;
    }

    targetPending.push(userData.username);
    targetAccount.pendingRequests = targetPending;
    allAccounts[targetName] = targetAccount;
    localStorage.setItem('example_casino_accounts', JSON.stringify(allAccounts));

    setFriendInput('');
    setRequestSuccess(`Request sent to ${targetName}!`);
  };

  const acceptRequest = (requesterName) => {
    const updatedPending = pendingRequests.filter(r => r !== requesterName);
    const updatedFriends = [...friends, requesterName];

    setPendingRequests(updatedPending);
    setFriends(updatedFriends);

    const allAccounts = JSON.parse(localStorage.getItem('example_casino_accounts') || '{}');
    if (allAccounts[userData.username]) {
      allAccounts[userData.username].friends = updatedFriends;
      allAccounts[userData.username].pendingRequests = updatedPending;
    }
    if (allAccounts[requesterName]) {
      if (!allAccounts[requesterName].friends.includes(userData.username)) {
        allAccounts[requesterName].friends.push(userData.username);
      }
    }
    localStorage.setItem('example_casino_accounts', JSON.stringify(allAccounts));

    const updatedData = { ...userData, friends: updatedFriends, pendingRequests: updatedPending };
    saveUserData(updatedData);
    if (!activeFriend) setActiveFriend(requesterName);
  };

  const rejectRequest = (requesterName) => {
    const updatedPending = pendingRequests.filter(r => r !== requesterName);
    setPendingRequests(updatedPending);

    const allAccounts = JSON.parse(localStorage.getItem('example_casino_accounts') || '{}');
    if (allAccounts[userData.username]) {
      allAccounts[userData.username].pendingRequests = updatedPending;
      localStorage.setItem('example_casino_accounts', JSON.stringify(allAccounts));
    }

    const updatedData = { ...userData, pendingRequests: updatedPending };
    saveUserData(updatedData);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!activeFriend || !textInput.trim()) return;

    const msgList = messages[activeFriend] || [];
    const newMsg = { 
      sender: userData.username, 
      text: textInput.trim(), 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };

    const updatedMessages = { ...messages, [activeFriend]: [...msgList, newMsg] };
    setMessages(updatedMessages);
    setTextInput('');

    const updatedData = { ...userData, messages: updatedMessages };
    saveUserData(updatedData);

    const allAccounts = JSON.parse(localStorage.getItem('example_casino_accounts') || '{}');
    if (allAccounts[activeFriend]) {
      if (!allAccounts[activeFriend].messages) allAccounts[activeFriend].messages = {};
      if (!allAccounts[activeFriend].messages[userData.username]) {
        allAccounts[activeFriend].messages[userData.username] = [];
      }
      allAccounts[activeFriend].messages[userData.username].push(newMsg);
      localStorage.setItem('example_casino_accounts', JSON.stringify(allAccounts));
    }
  };

  return (
    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row gap-6 h-[600px]">
      <div className="w-full md:w-80 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">Add Friend</h3>
            <form onSubmit={sendFriendRequest} className="space-y-2">
              <input 
                type="text" 
                placeholder="Enter username..."
                value={friendInput}
                onChange={e => setFriendInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button type="submit" className="w-full bg-amber-500 text-slate-950 font-black py-2 rounded-xl text-xs hover:bg-amber-400">
                Send Request
              </button>
            </form>
            {requestError && <p className="text-[10px] text-rose-400 font-bold">{requestError}</p>}
            {requestSuccess && <p className="text-[10px] text-emerald-400 font-bold">{requestSuccess}</p>}
          </div>

          {pendingRequests.length > 0 && (
            <div className="space-y-2 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl animate-pulse">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase">Requests</span>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">{pendingRequests.length}</span>
              </div>
              <div className="space-y-2">
                {pendingRequests.map(reqName => (
                  <div key={reqName} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{reqName}</span>
                    <div className="flex gap-1">
                      <button onClick={() => acceptRequest(reqName)} className="bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded-lg text-[10px]">Accept</button>
                      <button onClick={() => rejectRequest(reqName)} className="bg-rose-500 text-white font-bold px-2 py-1 rounded-lg text-[10px]">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Friends ({friends.length})</h3>
            <div className="space-y-1.5">
              {friends.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No friends added yet.</p>
              ) : (
                friends.map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFriend(f)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      activeFriend === f ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span>{f}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
        {activeFriend ? (
          <>
            <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span className="font-bold text-sm text-white">Chat with <span className="text-amber-400">{activeFriend}</span></span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">ONLINE</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
              {(!messages[activeFriend] || messages[activeFriend].length === 0) ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Say hello to {activeFriend}!
                </div>
              ) : (
                messages[activeFriend].map((m, idx) => {
                  const isMe = m.sender === userData.username;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs ${isMe ? 'bg-amber-500 text-slate-950 font-bold rounded-br-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'}`}>
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 font-mono">{m.sender} • {m.time}</span>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <input 
                type="text" 
                placeholder={`Message ${activeFriend}...`}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button type="submit" className="bg-amber-500 text-slate-950 font-black px-6 py-3 rounded-xl text-xs hover:bg-amber-400">Send</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select a friend to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}

// SLOTS GAME
function SlotsGame({ balance, currentBet, onFinish }) {
  const SYMBOLS = ['🎰', '💎', '🍒', '🍋', '🔔', '7️⃣'];
  const [reels, setReels] = useState(['7️⃣', '💎', '7️⃣']);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('Match 3 symbols for jackpot!');

  const spinSlots = () => {
    if (balance < currentBet || spinning) return;
    setSpinning(true);
    setMessage('Spinning...');

    let counter = 0;
    const interval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
      ]);
      counter++;
      if (counter > 18) {
        clearInterval(interval);
        const final1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const final2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const final3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const finalResult = [final1, final2, final3];
        setReels(finalResult);
        setSpinning(false);

        let payout = 0;
        if (final1 === final2 && final2 === final3) {
          payout = currentBet * 10;
          setMessage(`🎉 JACKPOT! Won $${payout}!`);
        } else if (final1 === final2 || final2 === final3 || final1 === final3) {
          payout = currentBet * 2;
          setMessage(`✨ Pair match! Won $${payout}!`);
        } else {
          setMessage('❌ No match.');
        }

        onFinish(currentBet, payout, 'Slots');
      }
    }, 70);
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-amber-400">Mechanical Slots</h2>
        <p className="text-xs text-slate-400 mt-1">{message}</p>
      </div>

      <div className="flex items-center gap-4 bg-slate-950 p-6 rounded-3xl border-4 border-slate-800 shadow-inner">
        {reels.map((sym, idx) => (
          <div key={idx} className={`w-24 h-32 sm:w-28 sm:h-36 bg-slate-900 border-2 border-amber-500/30 rounded-2xl flex items-center justify-center text-6xl shadow-xl transition-all ${spinning ? 'blur-[1px] scale-95 opacity-80 animate-pulse' : ''}`}>
            {sym}
          </div>
        ))}
      </div>

      <button onClick={spinSlots} disabled={spinning || balance < currentBet} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-slate-950 font-black px-10 py-4 rounded-2xl shadow-lg transition-all text-sm">
        {spinning ? 'SPINNING...' : `SPIN SLOTS ($${currentBet})`}
      </button>
    </div>
  );
}

// BLACKJACK GAME
function BlackjackGame({ balance, currentBet, onFinish }) {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const drawCard = () => {
    const val = VALUES[Math.floor(Math.random() * VALUES.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    let num = parseInt(val, 10);
    if (['J', 'Q', 'K'].includes(val)) num = 10;
    if (val === 'A') num = 11;
    return { val, suit, num };
  };

  const calcScore = (cards) => {
    let score = cards.reduce((acc, c) => acc + c.num, 0);
    let aces = cards.filter(c => c.val === 'A').length;
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  };

  const [playing, setPlaying] = useState(false);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [msg, setMsg] = useState('Beat dealer to 21.');

  const dealBlackjack = () => {
    if (balance < currentBet) return;
    setPlayerHand([drawCard(), drawCard()]);
    setDealerHand([drawCard(), drawCard()]);
    setPlaying(true);
    setMsg('Hit or Stand?');
  };

  const hit = () => {
    const updated = [...playerHand, drawCard()];
    setPlayerHand(updated);
    if (calcScore(updated) > 21) {
      setPlaying(false);
      setMsg('💥 Bust!');
      onFinish(currentBet, 0, 'Blackjack');
    }
  };

  const stand = () => {
    let curDealer = [...dealerHand];
    while (calcScore(curDealer) < 17) curDealer.push(drawCard());
    setDealerHand(curDealer);

    const pScore = calcScore(playerHand);
    const dScore = calcScore(curDealer);

    let payout = 0;
    if (dScore > 21 || pScore > dScore) {
      payout = currentBet * 2;
      setMsg(`🏆 You Won $${payout}!`);
    } else if (pScore === dScore) {
      payout = currentBet;
      setMsg('🤝 Push.');
    } else {
      setMsg('❌ Dealer wins.');
    }

    setPlaying(false);
    onFinish(currentBet, payout, 'Blackjack');
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-6 w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-black text-emerald-400">Blackjack</h2>
        <p className="text-xs text-slate-400 mt-1">{msg}</p>
      </div>

      <div className="w-full bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-6 shadow-inner">
        <div>
          <div className="flex justify-between items-center mb-2 text-xs font-bold text-slate-400">
            <span>DEALER</span>
            <span className="font-mono text-emerald-400">Score: {playing ? '?' : calcScore(dealerHand)}</span>
          </div>
          <div className="flex gap-2">
            {dealerHand.map((c, i) => (
              <div key={i} className="w-12 h-16 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center font-mono font-bold">
                {playing && i === 1 ? '❓' : `${c.val}${c.suit}`}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2 text-xs font-bold text-slate-400">
            <span>YOU</span>
            <span className="font-mono text-emerald-400">Score: {calcScore(playerHand)}</span>
          </div>
          <div className="flex gap-2">
            {playerHand.map((c, i) => (
              <div key={i} className="w-12 h-16 bg-slate-900 border border-emerald-500/40 rounded-xl flex items-center justify-center font-mono font-bold text-emerald-400">
                {`${c.val}${c.suit}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!playing ? (
        <button onClick={dealBlackjack} disabled={balance < currentBet} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 py-3.5 rounded-2xl transition disabled:opacity-50 text-sm">
          DEAL (${currentBet})
        </button>
      ) : (
        <div className="flex gap-4 w-full">
          <button onClick={hit} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl border border-slate-700">HIT</button>
          <button onClick={stand} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl">STAND</button>
        </div>
      )}
    </div>
  );
}

// MINES GAME
function MinesGame({ balance, currentBet, onFinish }) {
  const [grid, setGrid] = useState(Array(16).fill({ revealed: false, isMine: false }));
  const [inGame, setInGame] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0);
  const [status, setStatus] = useState('Uncover safe tiles!');

  const startMines = () => {
    if (balance < currentBet) return;
    let mines = new Set();
    while (mines.size < 3) mines.add(Math.floor(Math.random() * 16));
    setGrid(Array(16).fill(0).map((_, i) => ({ revealed: false, isMine: mines.has(i) })));
    setInGame(true);
    setMultiplier(1.0);
    setStatus('Pick a tile.');
  };

  const revealTile = (idx) => {
    if (!inGame || grid[idx].revealed) return;
    const tile = grid[idx];
    const newGrid = [...grid];
    newGrid[idx] = { ...tile, revealed: true };
    setGrid(newGrid);

    if (tile.isMine) {
      setInGame(false);
      setStatus('💥 BOOM!');
      setGrid(newGrid.map(t => t.isMine ? { ...t, revealed: true } : t));
      onFinish(currentBet, 0, 'Mines');
    } else {
      setMultiplier(parseFloat((multiplier + 0.3).toFixed(2)));
    }
  };

  const cashout = () => {
    if (!inGame) return;
    const winAmt = Math.floor(currentBet * multiplier);
    setInGame(false);
    setStatus(`💰 Cashed out $${winAmt}!`);
    onFinish(currentBet, winAmt, 'Mines');
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-6 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-black text-purple-400">Mines</h2>
        <p className="text-xs text-slate-400 mt-1">{status}</p>
      </div>

      <div className="grid grid-cols-4 gap-2.5 bg-slate-950 p-4 rounded-3xl border border-slate-800">
        {grid.map((t, i) => (
          <button
            key={i}
            onClick={() => revealTile(i)}
            disabled={!inGame || t.revealed}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl font-bold transition ${
              t.revealed ? t.isMine ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-900 border border-slate-800'
            }`}
          >
            {t.revealed ? (t.isMine ? '💣' : '💎') : ''}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between w-full font-mono text-xs">
        <span className="text-purple-300">Multiplier: <strong className="text-base text-white">{multiplier}x</strong></span>
        {!inGame ? (
          <button onClick={startMines} disabled={balance < currentBet} className="bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-2.5 rounded-xl shadow">START (${currentBet})</button>
        ) : (
          <button onClick={cashout} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow">CASHOUT</button>
        )}
      </div>
    </div>
  );
}

// TOWER GAME
function TowerGame({ balance, currentBet, onFinish }) {
  const [row, setRow] = useState(0);
  const [inGame, setInGame] = useState(false);
  const [mult, setMult] = useState(1.0);
  const [tower, setTower] = useState([]);
  const [status, setStatus] = useState('Climb safely.');

  const startTower = () => {
    if (balance < currentBet) return;
    setRow(0);
    setMult(1.0);
    setInGame(true);
    setStatus('Climbing...');
    setTower(Array(5).fill(0).map(() => ({ trap: Math.floor(Math.random() * 3), chosen: null })));
  };

  const choose = (col) => {
    if (!inGame) return;
    const current = tower[row];
    const isTrap = col === current.trap;
    const updated = [...tower];
    updated[row].chosen = col;
    setTower(updated);

    if (isTrap) {
      setInGame(false);
      setStatus('💥 Trapped!');
      onFinish(currentBet, 0, 'Tower');
    } else {
      const nextM = parseFloat((mult + 0.5).toFixed(2));
      setMult(nextM);
      if (row + 1 >= 5) {
        const win = Math.floor(currentBet * nextM);
        setInGame(false);
        setStatus(`🏆 Summit! Won $${win}!`);
        onFinish(currentBet, win, 'Tower');
      } else {
        setRow(row + 1);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-6 w-full max-w-sm">
      <div className="text-center">
        <h2 className="text-2xl font-black text-blue-400">Tower</h2>
        <p className="text-xs text-slate-400 mt-1">{status}</p>
      </div>

      <div className="flex flex-col-reverse gap-2 bg-slate-950 p-4 rounded-3xl border border-slate-800 w-full">
        {tower.map((rData, rIdx) => (
          <div key={rIdx} className="flex gap-2">
            {[0, 1, 2].map((col) => {
              const active = inGame && rIdx === row;
              const chosen = rData.chosen === col;
              const trap = rData.trap === col;
              return (
                <button
                  key={col}
                  disabled={!active}
                  onClick={() => choose(col)}
                  className={`flex-1 h-12 rounded-xl font-bold transition flex items-center justify-center border text-xs ${
                    chosen ? (trap ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400') : active ? 'bg-slate-900 border-blue-500 text-white' : 'bg-slate-900/40 text-slate-600'
                  }`}
                >
                  {chosen ? (trap ? '💀' : '⭐') : `R${rIdx + 1}`}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!inGame ? (
        <button onClick={startTower} disabled={balance < currentBet} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3 rounded-xl shadow">START (${currentBet})</button>
      ) : (
        <button onClick={() => { setInGame(false); onFinish(currentBet, Math.floor(currentBet * mult), 'Tower'); }} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 py-3 rounded-xl shadow">CASHOUT</button>
      )}
    </div>
  );
}

// BALLOON PUMP GAME
function BalloonPumpGame({ balance, currentBet, onFinish }) {
  const [pumps, setPumps] = useState(0);
  const [popLimit, setPopLimit] = useState(0);
  const [inGame, setInGame] = useState(false);
  const [popped, setPopped] = useState(false);
  const [status, setStatus] = useState('Pump the balloon.');

  const startBalloon = () => {
    if (balance < currentBet) return;
    setPopLimit(Math.floor(Math.random() * 7) + 3);
    setPumps(0);
    setPopped(false);
    setInGame(true);
    setStatus('Inflating...');
  };

  const pump = () => {
    if (!inGame || popped) return;
    const next = pumps + 1;
    setPumps(next);
    if (next >= popLimit) {
      setPopped(true);
      setInGame(false);
      setStatus('💥 POP!');
      onFinish(currentBet, 0, 'Balloon Pump');
    }
  };

  const cashout = () => {
    if (!inGame || pumps === 0) return;
    const mult = 1 + pumps * 0.4;
    const win = Math.floor(currentBet * mult);
    setInGame(false);
    setStatus(`🎈 Cashed out $${win}!`);
    onFinish(currentBet, win, 'Balloon Pump');
  };

  const mult = (1 + pumps * 0.4).toFixed(2);
  const scale = 1 + pumps * 0.12;

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-rose-400">Balloon Pump</h2>
        <p className="text-xs text-slate-400 mt-1">{status}</p>
      </div>

      <div className="h-40 flex items-center justify-center">
        <div style={{ transform: `scale(${popped ? 0 : scale})` }} className="w-20 h-24 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-full flex items-center justify-center shadow-lg transition-all duration-150 relative">
          <span className="text-xs font-mono font-bold text-white">{mult}x</span>
        </div>
      </div>

      {!inGame ? (
        <button onClick={startBalloon} disabled={balance < currentBet} className="bg-rose-500 hover:bg-rose-400 text-white font-black px-8 py-3 rounded-xl shadow">START (${currentBet})</button>
      ) : (
        <div className="flex gap-3">
          <button onClick={pump} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2.5 rounded-xl border border-slate-700">PUMP 🎈</button>
          <button onClick={cashout} disabled={pumps === 0} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow">CASHOUT</button>
        </div>
      )}
    </div>
  );
}