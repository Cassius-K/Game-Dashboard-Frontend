import { useState } from 'react'
import './App.css'

function App() {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  
  const [activeTab, setActiveTab] = useState('Steam'); // Controls which platform view is visible ('Steam' or 'PSN')
  
  // --- Steam Specific State ---
  const [steamId, setSteamId] = useState(''); // The "Active" Steam ID we are currently looking at
  const [linkedId, setLinkedId] = useState(''); // The logged-in user's own linked Steam ID
  const [profile, setProfile] = useState(null); // Stores the Steam profile object (avatar, name)

  // --- PlayStation Specific State ---
  const [npsso, setNpsso] = useState(''); // The raw 64-character token pasted by the user
  const [psnAccountId, setPsnAccountId] = useState(''); // The raw number ID Sony uses under the hood
  const [activePsnOnlineId, setActivePsnOnlineId] = useState(''); // The PlayStation username currently being viewed
  const [linkedPsnId, setLinkedPsnId] = useState(''); // To remember if the user has successfully linked PSN
  const [psnProfile, setPsnProfile] = useState(null); // Stores PSN profile data
  const [psnStats, setPsnStats] = useState(null); // Stores PSN Trophy data (Level, Gold/Silver/Bronze counts)

  // --- Search Convenience States ---
  const [searchQuery, setSearchQuery] = useState(''); // Text currently typed in the search box
  const [searchResults, setSearchResults] = useState([]); // List of matching players found in DB or via API
  const [wasSearchPerformed, setWasSearchPerformed] = useState(false); // Used to show helper text if search fails
  
  // --- Common Data Display State ---
  const [serverMessage, setServerMessage] = useState(""); // Top green notification bar text
  const [gamesLibrary, setGamesLibrary] = useState([]); // Array holding the active user's games
  const [userStats, setUserStats] = useState(null); // Data Hub Stats (Completion rate, playtime, etc.)
  const [selectedAchievements, setSelectedAchievements] = useState(null); // The specific trophies for the clicked game
  const [activeGameName, setActiveGameName] = useState(""); // Title of the game currently being viewed
  const [leaderboard, setLeaderboard] = useState([]); // Array holding global community rankings
  
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jwtToken, setJwtToken] = useState("");


  // ==========================================
  // 2. API CONFIGURATION
  // ==========================================
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


  // ==========================================
  // 3. AUTH & SYSTEM FUNCTIONS
  // ==========================================
  
  const handleSignup = async () => {
    setServerMessage("Signing up...");
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      alert(data.message);
      setServerMessage("");
    } catch (err) {
      setServerMessage("Signup failed.");
    }
  };

  const handleLogin = async () => {
    setServerMessage("Logging in...");
    try {
      const res = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (data.token) {
        setJwtToken(data.token);
        setIsLoggedIn(true);
        setUsername(data.username);
        
        // Auto-load linked Steam account if it exists in DB
        if (data.linkedSteamId) {
            setLinkedId(data.linkedSteamId);
            setSteamId(data.linkedSteamId); 
            setSearchQuery(data.linkedSteamId); // Pre-fill search box
            setServerMessage(`Welcome back, ${data.username}!`);
        } else {
            setServerMessage(`Welcome ${data.username}! Please link your Steam account.`);
        }

        // Auto-load linked PSN account if it exists in DB
        if (data.psnAccountId) {
            setPsnAccountId(data.psnAccountId);
            setLinkedPsnId(data.psnAccountId);
        }
      } else {
        alert(data.message);
        setServerMessage("");
      }
    } catch (err) {
      setServerMessage("Login failed.");
    }
  };

  const handleLogout = () => {
    // A full page reload is the safest way to wipe all state clean
    window.location.reload();
  };
  
  // ==========================================
  // 4. PLATFORM LINKING FUNCTIONS
  // ==========================================

  const handleLinkSteam = async () => {
      if (!steamId) return alert("Please enter a Steam ID to link.");
      setServerMessage("Linking account...");
      try {
          const res = await fetch(`${API_URL}/api/auth/link-steam`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, steamId })
          });
          const data = await res.json();
          alert(data.message);
          if (res.ok) {
              setLinkedId(steamId);
              setServerMessage("Account linked! This is now your primary Steam ID.");
          }
      } catch (err) {
          setServerMessage("Failed to link account.");
      }
  };
  
  const handleLinkPsn = async () => {
    setServerMessage("Connecting to Sony...");
    try {
        const res = await fetch(`${API_URL}/api/auth/link-psn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, npsso })
        });
        const data = await res.json();
        if (res.ok) {
            setPsnAccountId(data.accountId);
            setLinkedPsnId(data.accountId);
            alert("PSN Linked!");
        } else {
            alert(data.message);
        }
        setServerMessage("");
    } catch (err) {
        setServerMessage("Failed to link PSN.");
    }
  };


  // ==========================================
  // 5. STEAM SPECIFIC FUNCTIONS
  // ==========================================

  // Searches our local DB or asks Steam to resolve a custom Vanity URL
  const handleSearch = async () => {
    if (!searchQuery) return;
    setServerMessage("Searching for players...");
    setSearchResults([]);
    setWasSearchPerformed(true);

    // If it's exactly 17 digits, treat it as a direct SteamID lookup
    if (/^\d{17}$/.test(searchQuery)) {
        setSteamId(searchQuery);
        setServerMessage("Steam ID detected.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/search/players/${searchQuery}`);
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) setServerMessage("No players found.");
        else setServerMessage(`Found ${data.length} matches.`);
    } catch (err) {
        setServerMessage("Search failed.");
    }
  };

  // Called when a user clicks a player in the search dropdown
  const selectPlayer = (selectedId) => {
    setSteamId(selectedId);
    setSearchQuery(selectedId);
    setSearchResults([]);
    setServerMessage("Player selected. Click 'Load Profile' to continue.");
  };

  // Fetches basic public data (Avatar, Display Name) from Steam
  const fetchSteamProfile = async () => {
    if (!steamId) return alert("Please search or enter a Steam ID first.");
    setServerMessage("Fetching profile info...");
    try {
      const res = await fetch(`${API_URL}/api/steam/profile/${steamId}`);
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setServerMessage("Profile loaded.");
      } else {
        alert(data.message || "Profile not found.");
        setServerMessage("");
      }
    } catch (err) {
      console.error("Error fetching profile", err);
      setServerMessage("Error connecting to server.");
    }
  };

  // Triggers the backend loop to pull all games from Steam and save to DB
  const syncData = async () => {
    if (!steamId) return;
    setServerMessage(`Syncing Steam data for ID: ${steamId}...`);
    try {
      const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || data.error || "Sync complete!");
      setServerMessage("Sync process finished.");
    } catch (err) {
      console.error("Sync error", err);
      setServerMessage("Sync failed.");
    }
  };


  // ==========================================
  // 6. PLAYSTATION SPECIFIC FUNCTIONS
  // ==========================================

  // Triggers the backend to fetch PSN titles using the npsso token
  const syncPsnData = async () => {
    if (!psnAccountId) return alert("Please link or select a PSN account first.");
    setServerMessage("Syncing PlayStation games (this takes a moment)...");
    try {
        const res = await fetch(`${API_URL}/api/psn/sync/${username}`, { method: 'POST' });
        const data = await res.json();
        alert(data.message || data.error);
        setServerMessage("PSN Sync complete.");
    } catch (err) {
        setServerMessage("PSN Sync failed.");
    }
  };

  // Fetches Avatar and Trophy Summary (Platinum/Gold counts) from Sony
  const fetchPsnProfile = async () => {
    if (!activePsnOnlineId || !psnAccountId) return alert("Please link PSN or select an ID first.");
    setServerMessage("Fetching PSN profile...");
    try {
      // 1. Get avatar and bio
      const res = await fetch(`${API_URL}/api/psn/profile/${username}/${activePsnOnlineId}`);
      const data = await res.json();
      
      // 2. Get Trophy Level and Counts
      const statsRes = await fetch(`${API_URL}/api/psn/trophy-summary/${username}/${data.accountId}`);
      const statsData = await statsRes.json();

      setPsnProfile(data);
      setPsnStats(statsData);
      setServerMessage("PSN Profile loaded.");
    } catch (err) {
      setServerMessage("Error fetching PSN profile.");
    }
  };


  // ==========================================
  // 7. COMMON & SOCIAL FUNCTIONS (Used by both)
  // ==========================================

  // Loads the grid of games from MongoDB based on which tab is active
  const loadLibrary = async () => {
    const idToFetch = activeTab === 'Steam' ? steamId : psnAccountId;
    if (!idToFetch) return alert(`Please link or select a ${activeTab} account first.`);

    setServerMessage(`Loading ${activeTab} library from database...`);
    try {
        // Fetch Games
        const res = await fetch(`${API_URL}/api/games/${idToFetch}`);
        const data = await res.json();
        setGamesLibrary(data);

        // Fetch specialized stats only if on the Steam tab
        if (activeTab === 'Steam') {
            const statsRes = await fetch(`${API_URL}/api/stats/${idToFetch}`);
            const statsData = await statsRes.json();
            
            const playtimeRes = await fetch(`${API_URL}/api/stats/playtime/${idToFetch}`);
            const playtimeData = await playtimeRes.json();

            // Combine both datasets into one stats object
            setUserStats({ ...statsData, ...playtimeData });
        } else {
            setUserStats(null); // Clear Steam stats when viewing PSN
        }

        setServerMessage(`Loaded ${data.length} games.`);
    } catch (err) {
        setServerMessage("Failed to load data from database.");
    }
  };

  // Pulls the top users by total unlocked trophies across the platform
  const loadLeaderboard = async () => {
    setServerMessage("Loading Community Leaderboard...");
    try {
        const res = await fetch(`${API_URL}/api/community/leaderboard`);
        const data = await res.json();
        setLeaderboard(data);
        setServerMessage("Leaderboard loaded!");
    } catch (err) {
        setServerMessage("Failed to load leaderboard.");
    }
  };

  // Determines platform, syncs specific game trophies from external API, then loads from DB
  const loadAchievements = async (game) => {
      const gameId = game.appid || game.platformGameId;
      const platform = game.platform || 'Steam'; 
      
      setServerMessage(`Fetching ${platform} achievements for ${game.name}...`);
      setActiveGameName(game.name);
      setSelectedAchievements(null); // Clear previous view

      try {
          let dbData;
          if (platform === 'PSN') {
              // Hit PSN Backend Route
              const res = await fetch(`${API_URL}/api/psn/achievements/${username}/${gameId}`);
              dbData = await res.json();
          } else {
              // Hit Steam Backend Routes
              await fetch(`${API_URL}/api/steam/achievements/${steamId}/${gameId}`); // Tell server to sync
              const dbRes = await fetch(`${API_URL}/api/achievements/${steamId}/${gameId}`); // Tell server to send data back
              dbData = await dbRes.json();
          }
          
          setSelectedAchievements(dbData);
          setServerMessage("");
      } catch (err) {
          console.error("Achievement error", err);
          setServerMessage("Failed to fetch achievements.");
      }
  };

  // Helper function to quick-swap the viewed profile back to the logged-in user
  const backToMyProfile = () => {
      setSteamId(linkedId);
      setSearchQuery(linkedId);
      setServerMessage("Switched back to your profile.");
  };

  // ==========================================
  // RENDER (JSX)
  // ==========================================

  return (
    <div className="App">
      <h1>🎮 Giga Game Dashboard</h1>
      
      {/* Top Notification Message Bar */}
      <p style={{ color: 'lightgreen', fontWeight: 'bold', height: '20px' }}>{serverMessage}</p>

      {!isLoggedIn ? (
        /* --- 1. LOGIN / SIGNUP VIEW --- */
        <div className="card" style={{ padding: '30px', backgroundColor: '#1b2838', borderRadius: '10px', width: '320px', margin: '0 auto' }}>
          <h2>Account Access</h2>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
          <div style={{ marginTop: '20px' }}>
            <button onClick={handleLogin} style={{ margin: '5px', padding: '10px 20px' }}>Login</button>
            <button onClick={handleSignup} style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#2a475e' }}>Sign Up</button>
          </div>
        </div>
      ) : (
        /* --- 2. MAIN DASHBOARD VIEW (LOGGED IN) --- */
        <div>
          {/* Dashboard Header Bar (Shows logged in user and global logout) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px', marginBottom: '10px' }}>
              <span>User: <strong>{username}</strong> | Linked Steam: <strong>{linkedId || "None"}</strong></span>
              <button onClick={handleLogout} style={{ backgroundColor: '#cc3333', color: 'white', padding: '5px 15px' }}>Logout</button>
          </div>

          {/* --- PLATFORM SWITCHER TABS --- */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button 
                  onClick={() => { setActiveTab('Steam'); setGamesLibrary([]); setSelectedAchievements(null); }} 
                  style={{ backgroundColor: activeTab === 'Steam' ? '#66c0f4' : '#333', color: activeTab === 'Steam' ? 'black' : 'white', padding: '10px 30px', fontWeight: 'bold' }}>
                  Steam View
              </button>
              <button 
                  onClick={() => { setActiveTab('PSN'); setGamesLibrary([]); setSelectedAchievements(null); }} 
                  style={{ backgroundColor: activeTab === 'PSN' ? '#003087' : '#333', color: 'white', padding: '10px 30px', fontWeight: 'bold' }}>
                  PlayStation View
              </button>
          </div>

          {/* ========================================= */}
          {/*             STEAM TAB VIEW                */}
          {/* ========================================= */}
          {activeTab === 'Steam' && (
              <>
                  {/* Player Search and Command Panel (STEAM) */}
                  <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
                        <div>
                            <h3 style={{ margin: '0 0 5px 0' }}>Player Tracker & Search</h3>
                            <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
                                Search for tracked players by name, or enter an <strong>exact SteamID64</strong> to track a new player.
                            </p>
                            
                            {/* Search Input Area */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                <input 
                                    type="text" 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    placeholder="e.g. 76561198... or GabeNewell"
                                    style={{ padding: '10px', width: '250px' }}
                                />
                                <button onClick={handleSearch} style={{ backgroundColor: '#66c0f4', color: 'black' }}>Search</button>
                            </div>

                            {/* Floating Search Results Dropdown List */}
                            {searchResults.length > 0 && (
                                <div style={{ backgroundColor: '#171a21', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                                    {searchResults.map(player => (
                                        <div key={player.steamId || player.steamid} onClick={() => selectPlayer(player.steamId || player.steamid)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <img src={player.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                                            <span>{player.personaname}</span>
                                            {player.isNew && <span style={{ fontSize: '10px', color: '#888', marginLeft: 'auto', backgroundColor: '#333', padding: '2px 5px', borderRadius: '3px' }}>New to DB</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Helper text for empty search */}
                            {wasSearchPerformed && searchResults.length === 0 && (
                                <div style={{ fontSize: '12px', color: '#ccc', marginTop: '10px', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px' }}>
                                    <p style={{ margin: 0 }}>**No results found.** The Steam API doesn't support partial name searches.</p>
                                </div>
                            )}

                            {/* Steam Control Buttons */}
                            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                <p>Active Profile: <strong style={{ color: '#66c0f4' }}>{steamId || "None Selected"}</strong></p>
                                
                                {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                                {linkedId && steamId !== linkedId && <button onClick={backToMyProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                                <button id="btn-fetch" onClick={fetchSteamProfile}>1. Load Profile</button>
                                <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
                                <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
                                <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', marginLeft: '10px' }}>4. View Leaderboard</button>
                            </div>
                        </div>
                  </div>

                  {/* Profile Card and Statistics View (STEAM) */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                      {profile && (
                        <div className="profile-card" style={{ padding: '20px', border: '1px solid #66c0f4', borderRadius: '8px', minWidth: '250px' }}>
                          <img src={profile.avatarfull} alt="Avatar" style={{ borderRadius: '50%' }} />
                          <h2>{profile.personaname}</h2>
                          <p>Status: {profile.personastate === 1 ? "Online" : "Offline"}</p>
                          <a href={profile.profileurl} target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>View External Steam Profile</a>
                        </div>
                      )}

                      {/* Steam Data Hub Stats */}
                      {userStats && (
                        <div className="stats-card" style={{ padding: '20px', backgroundColor: '#171a21', border: '1px solid #c7d5e0', borderRadius: '8px', minWidth: '250px', textAlign: 'center' }}>
                            <h2 style={{ margin: '0 0 15px 0', color: '#c7d5e0' }}>Data Hub</h2>
                            <h1 style={{ fontSize: '48px', margin: '0', color: '#66c0f4' }}>{userStats.completionRate}%</h1>
                            <p style={{ margin: '0 0 20px 0', color: '#888' }}>Avg. Completion</p>
                            <div style={{ display: 'flex', justifyContent: 'space-around', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>
                                <div>
                                    <h3 style={{ margin: '0', color: '#fff' }}>{userStats.unlocked}</h3>
                                    <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Unlocked</p>
                                </div>
                                <div>
                                    <h3 style={{ margin: '0', color: '#fff' }}>{userStats.total}</h3>
                                    <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Tracked</p>
                                </div>
                            </div>
                            {/* Total Playtime Display */}
                            <div>
                                <h3 style={{ margin: '0', color: '#fff' }}>{userStats.totalHours?.toLocaleString()}</h3>
                                <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Total Hours Played</p>
                            </div>
                        </div>
                      )}
                  </div>
              </>
          )}

          {/* ========================================= */}
          {/*          PLAYSTATION TAB VIEW             */}
          {/* ========================================= */}
          {activeTab === 'PSN' && (
              <div className="card" style={{ padding: '20px', backgroundColor: '#003087', borderRadius: '10px', marginTop: '10px' }}>
                    <h3 style={{ color: 'white' }}>PlayStation Integration</h3>
                    
                    {/* LOGIC FIX: Check if either a local token is typed OR the DB confirmed linkage */}
                    {!(psnAccountId || linkedPsnId) ? (
                        /* PSN Linking Instructions UI */
                        <div>
                            <p style={{ fontSize: '11px', color: '#ccc' }}>Get your token from: <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" style={{ color: 'white' }}>Sony SSOCookie</a></p>
                            <input 
                                type="text" 
                                placeholder="Paste npsso token here" 
                                value={npsso} 
                                onChange={e => setNpsso(e.target.value)} 
                                style={{ padding: '10px', width: '250px' }} 
                            />
                            <button onClick={handleLinkPsn} style={{ marginLeft: '10px', backgroundColor: '#f5f5f5', color: '#003087' }}>Link PSN</button>
                        </div>
                    ) : (
                        /* PSN Command Buttons */
                        <div>
                            <p style={{ color: 'white' }}>PSN Status: <strong style={{ color: 'lightgreen' }}>Connected</strong> (ID: {psnAccountId || linkedPsnId})</p>
                            
                            <div style={{ marginTop: '15px' }}>
                                {/* Note: Profile fetching requires an onlineId (username), which we don't have yet just from npsso. For now, we skip fetching generic profile and just sync games. */}
                                <button onClick={syncPsnData} style={{ backgroundColor: '#2a475e', color: 'white' }}>1. Sync PSN Games</button>
                                <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', color: 'white', marginLeft: '10px' }}>2. View PSN Library</button>
                            </div>
                        </div>
                    )}
              </div>
          )}

          {/* ========================================= */}
          {/* --- COMMON COMPONENTS (Shows for both tabs) --- */}
          {/* ========================================= */}

          {/* Game Library Grid Display */}
          {gamesLibrary.length > 0 && (
              <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                  {gamesLibrary.map(game => (
                      <div key={game._id || game.appid} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                          
                          {/* Dynamic Platform Badge (Dark Blue for PSN, Dark Grey for Steam) */}
                          <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: game.platform === 'PSN' ? '#003087' : '#1b2838', color: 'white' }}>
                              {game.platform || 'Steam'}
                          </span>

                          <img 
                            src={game.platform === 'PSN' ? game.img_icon_url : `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid || game.platformGameId}/${game.img_icon_url}.jpg`} 
                            alt={game.name} 
                            style={{ width: '64px', height: '64px', marginBottom: '10px', borderRadius: '5px' }} 
                          />
                          <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                          
                          {/* Playtime calculation (Only shown for Steam since PSN API doesn't provide playtime here) */}
                          {game.platform !== 'PSN' && (
                              <p style={{ fontSize: '13px', color: '#a3cf06', margin: '5px 0', fontWeight: 'bold' }}>
                                  {(game.playtime_forever / 60).toFixed(1)} hrs played
                              </p>
                          )}

                          <p style={{ fontSize: '12px', color: '#888' }}>ID: {game.appid || game.platformGameId}</p>
                          <button onClick={() => loadAchievements(game)} style={{ fontSize: '12px', padding: '5px 10px', marginTop: '10px' }}>
                            View Achievements
                          </button>
                      </div>
                  ))}
              </div>
          )}

          {/* Achievements Detail View (Loads beneath the game library grid) */}
          {selectedAchievements && (
            <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
                <h2>🏆 Achievements for {activeGameName}</h2>
                <p>Total: {selectedAchievements.length} | Unlocked: {selectedAchievements.filter(a => a.achieved === 1).length}</p>
                {selectedAchievements.length === 0 ? (
                    <p>This game does not have tracked achievements.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
                        {selectedAchievements.map((ach, index) => (
                            <div key={index} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                backgroundColor: ach.achieved ? '#2a475e' : '#171a21', // Dark blue if unlocked, dark grey if locked
                                padding: '10px', 
                                borderRadius: '5px',
                                border: ach.achieved ? '1px solid #66c0f4' : '1px solid #333',
                                opacity: ach.achieved ? 1 : 0.6 // Dim the icon slightly if it hasn't been unlocked
                            }}>
                                <img src={ach.iconUrl} alt={ach.apiname} style={{ width: '50px', height: '50px', marginRight: '15px', borderRadius: '5px' }} />
                                <div style={{ textAlign: 'left' }}>
                                    <h4 style={{ margin: '0 0 5px 0', color: ach.achieved ? '#fff' : '#888' }}>{ach.displayName}</h4>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{ach.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}

          {/* Global Community Leaderboard Table */}
          {leaderboard.length > 0 && (
            <div className="leaderboard-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#171a21', borderRadius: '10px', border: '1px solid #cca43b' }}>
                <h2 style={{ color: '#cca43b' }}>🌍 Global Leaderboard</h2>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #555', color: '#888' }}>
                            <th style={{ padding: '10px' }}>Rank</th>
                            <th style={{ padding: '10px' }}>Giga Username</th>
                            <th style={{ padding: '10px' }}>Total Unlocked Trophies</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((user, index) => (
                            <tr key={user.username} style={{ borderBottom: '1px solid #333', backgroundColor: index === 0 ? '#2a2000' : 'transparent' }}>
                                <td style={{ padding: '15px 10px', fontSize: index === 0 ? '24px' : '16px' }}>
                                    {/* Helper to show cool emoji medals for the top 3 users */}
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </td>
                                <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#66c0f4' }}>{user.username}</td>
                                <td style={{ padding: '15px 10px', color: '#fff' }}>{user.unlockedCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App;