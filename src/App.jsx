import { useState } from 'react'
import './App.css'

function App() {
  // 1. State Management
  const [activeTab, setActiveTab] = useState('Steam'); 
  
  // --- Steam Specific State ---
  const [steamId, setSteamId] = useState(''); 
  const [linkedId, setLinkedId] = useState(''); 
  const [profile, setProfile] = useState(null);
  const [steamSearchQuery, setSearchQuery] = useState(''); 
  const [steamSearchResults, setSteamSearchResults] = useState([]); 
  const [wasSearchPerformed, setWasSearchPerformed] = useState(false);

  // --- PlayStation Specific State ---
  const [npsso, setNpsso] = useState('');
  const [linkedPsnId, setLinkedPsnId] = useState(''); // The logged-in user's personal PSN Account ID
  const [activePsnAccountId, setActivePsnAccountId] = useState(''); // The ID currently being viewed/synced
  const [activePsnOnlineId, setActivePsnOnlineId] = useState(''); // The Username currently being viewed (e.g. xX_Sniper_Xx)
  const [psnProfile, setPsnProfile] = useState(null);
  const [psnStats, setPsnStats] = useState(null);
  const [psnSearchQuery, setPsnSearchQuery] = useState('');
  const [psnSearchResults, setPsnSearchResults] = useState([]);

  // --- Common Data Display State ---
  const [serverMessage, setServerMessage] = useState("");
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [userStats, setUserStats] = useState(null); 
  const [selectedAchievements, setSelectedAchievements] = useState(null);
  const [activeGameName, setActiveGameName] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jwtToken, setJwtToken] = useState("");

  // 2. API Configuration
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
    } catch (err) { setServerMessage("Signup failed."); }
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
        
        // Auto-load linked Steam account
        if (data.linkedSteamId) {
            setLinkedId(data.linkedSteamId);
            setSteamId(data.linkedSteamId); 
            setSearchQuery(data.linkedSteamId); 
            setServerMessage(`Welcome back, ${data.username}!`);
        } else {
            setServerMessage(`Welcome ${data.username}! Please link your accounts.`);
        }

        // Auto-load linked PSN account
        if (data.psnAccountId) {
            setLinkedPsnId(data.psnAccountId);
            setActivePsnAccountId(data.psnAccountId);
            // Default the online ID view to "My Account" if we don't know the exact string name
            setActivePsnOnlineId("My Account"); 
        }
      } else {
        alert(data.message);
        setServerMessage("");
      }
    } catch (err) { setServerMessage("Login failed."); }
  };

  const handleLogout = () => { window.location.reload(); };
  
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
          if (res.ok) setLinkedId(steamId);
      } catch (err) { setServerMessage("Failed to link account."); }
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
            setLinkedPsnId(data.accountId);
            setActivePsnAccountId(data.accountId);
            setActivePsnOnlineId("My Account");
            alert("PSN Linked successfully!");
        } else { alert(data.message); }
        setServerMessage("");
    } catch (err) { setServerMessage("Failed to link PSN."); }
  };

  // ==========================================
  // 5. STEAM SPECIFIC FUNCTIONS
  // ==========================================
  const handleSteamSearch = async () => {
    if (!steamSearchQuery) return;
    setServerMessage("Searching for players...");
    setSteamSearchResults([]);
    setWasSearchPerformed(true);

    if (/^\d{17}$/.test(steamSearchQuery)) {
        setSteamId(steamSearchQuery);
        setServerMessage("Steam ID detected.");
        return;
    }
    try {
        const res = await fetch(`${API_URL}/api/search/players/${steamSearchQuery}`);
        const data = await res.json();
        setSteamSearchResults(data);
        if (data.length === 0) setServerMessage("No players found.");
        else setServerMessage(`Found ${data.length} matches.`);
    } catch (err) { setServerMessage("Search failed."); }
  };

  const selectSteamPlayer = (selectedId) => {
    setSteamId(selectedId);
    setSearchQuery(selectedId);
    setSteamSearchResults([]);
    setServerMessage("Player selected. Click 'Load Profile' to continue.");
  };

  const fetchSteamProfile = async () => {
    if (!steamId) return alert("Please search or enter a Steam ID first.");
    setServerMessage("Fetching profile info...");
    try {
      const res = await fetch(`${API_URL}/api/steam/profile/${steamId}`);
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setServerMessage("Profile loaded.");
      } else { alert(data.message); setServerMessage(""); }
    } catch (err) { setServerMessage("Error connecting to server."); }
  };

  const syncSteamData = async () => {
    if (!steamId) return;
    setServerMessage(`Syncing Steam data for ID: ${steamId}...`);
    try {
      const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || data.error);
      setServerMessage("Sync process finished.");
    } catch (err) { setServerMessage("Sync failed."); }
  };

  const backToMySteamProfile = () => {
      setSteamId(linkedId);
      setSearchQuery(linkedId);
      setServerMessage("Switched back to your profile.");
  };

  // ==========================================
  // 6. PLAYSTATION SPECIFIC FUNCTIONS
  // ==========================================
  const handlePsnSearch = async () => {
    if (!psnSearchQuery || !linkedPsnId) return alert("You must link a PSN account first to use search.");
    setServerMessage("Searching PSN Network...");
    setPsnSearchResults([]);
    try {
        const res = await fetch(`${API_URL}/api/search/psn/${username}/${psnSearchQuery}`);
        const data = await res.json();
        setPsnSearchResults(data);
        if (data.length === 0) setServerMessage("No players found.");
        else setServerMessage(`Found ${data.length} matches.`);
    } catch (err) { setServerMessage("Search failed."); }
  };

  const selectPsnPlayer = (player) => {
    setActivePsnOnlineId(player.onlineId);
    setActivePsnAccountId(player.accountId);
    setPsnSearchQuery(player.onlineId);
    setPsnSearchResults([]);
    setServerMessage("Player selected. Click 'Load Profile'.");
  };

  const fetchPsnProfile = async () => {
    if (!activePsnOnlineId || !activePsnAccountId) return alert("Please search or select a PSN ID first.");
    setServerMessage("Fetching PSN profile...");
    try {
      const res = await fetch(`${API_URL}/api/psn/profile/${username}/${activePsnOnlineId}`);
      const data = await res.json();
      
      const statsRes = await fetch(`${API_URL}/api/psn/trophy-summary/${username}/${data.accountId}`);
      const statsData = await statsRes.json();

      setPsnProfile(data);
      setPsnStats(statsData);
      setServerMessage("PSN Profile loaded.");
    } catch (err) { setServerMessage("Error fetching PSN profile."); }
  };

  const syncPsnData = async () => {
    if (!activePsnAccountId) return alert("Please link or select an account.");
    setServerMessage("Syncing PlayStation games (this takes a moment)...");
    try {
        // Now passing both the auth username AND the target accountId to the backend
        const res = await fetch(`${API_URL}/api/psn/sync/${username}/${activePsnAccountId}`, { method: 'POST' });
        const data = await res.json();
        alert(data.message || data.error);
        setServerMessage("PSN Sync complete.");
    } catch (err) { setServerMessage("PSN Sync failed."); }
  };

  const backToMyPsnProfile = () => {
      setActivePsnAccountId(linkedPsnId);
      setActivePsnOnlineId("My Account");
      setPsnSearchQuery("");
      setServerMessage("Switched back to your PSN profile.");
  };


  // ==========================================
  // 7. COMMON DATA & SOCIAL FUNCTIONS
  // ==========================================
  const loadLibrary = async () => {
    // Determine which ID to fetch based on active tab
    const idToFetch = activeTab === 'Steam' ? steamId : activePsnAccountId;
    if (!idToFetch) return alert(`Please select a ${activeTab} account first.`);

    setServerMessage(`Loading ${activeTab} library and stats from database...`);
    try {
        // Fetch Games
        const res = await fetch(`${API_URL}/api/games/${idToFetch}`);
        const data = await res.json();
        setGamesLibrary(data);

        // Fetch Steam specific stats
        if (activeTab === 'Steam') {
            const statsRes = await fetch(`${API_URL}/api/stats/${idToFetch}`);
            const statsData = await statsRes.json();
            
            const playtimeRes = await fetch(`${API_URL}/api/stats/playtime/${idToFetch}`);
            const playtimeData = await playtimeRes.json();

            setUserStats({ ...statsData, ...playtimeData });
        } else {
            setUserStats(null); // Clear Steam stats when viewing PSN
        }

        setServerMessage(`Loaded ${data.length} games.`);
    } catch (err) { setServerMessage("Failed to load data from database."); }
  };
  
  const loadLeaderboard = async () => {
    setServerMessage("Loading Community Leaderboard...");
    try {
        const res = await fetch(`${API_URL}/api/community/leaderboard`);
        const data = await res.json();
        setLeaderboard(data);
        setServerMessage("Leaderboard loaded!");
    } catch (err) { setServerMessage("Failed to load leaderboard."); }
  };

  const loadAchievements = async (game) => {
      const gameId = game.appid || game.platformGameId;
      const platform = game.platform || 'Steam'; 
      
      setServerMessage(`Fetching ${platform} achievements for ${game.name}...`);
      setActiveGameName(game.name);
      setSelectedAchievements(null);

      try {
          let dbData;
          if (platform === 'PSN') {
              const res = await fetch(`${API_URL}/api/psn/achievements/${username}/${gameId}`);
              dbData = await res.json();
          } else {
              await fetch(`${API_URL}/api/steam/achievements/${steamId}/${gameId}`);
              const dbRes = await fetch(`${API_URL}/api/achievements/${steamId}/${gameId}`);
              dbData = await dbRes.json();
          }
          
          setSelectedAchievements(dbData);
          setServerMessage("");
      } catch (err) {
          console.error("Achievement error", err);
          setServerMessage("Failed to fetch achievements.");
      }
  };

  return (
    <div className="App">
      <h1>🎮 Giga Game Dashboard</h1>
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
          {/* Dashboard Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px', marginBottom: '10px' }}>
              <span>User: <strong>{username}</strong> | Linked Steam: <strong>{linkedId || "None"}</strong></span>
              <button onClick={handleLogout} style={{ backgroundColor: '#cc3333', color: 'white', padding: '5px 15px' }}>Logout</button>
          </div>

          {/* PLATFORM SWITCHER TABS */}
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
                  <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
                        <div>
                            <h3 style={{ margin: '0 0 5px 0' }}>Steam Player Tracker & Search</h3>
                            <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
                                Search for tracked players by name, or enter a <strong>SteamID64</strong> or <strong>Custom URL</strong> to track a new player.
                            </p>
                            
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                <input 
                                    type="text" 
                                    value={steamSearchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    placeholder="e.g. 76561198... or GabeNewell"
                                    style={{ padding: '10px', width: '250px' }}
                                />
                                <button onClick={handleSteamSearch} style={{ backgroundColor: '#66c0f4', color: 'black' }}>Search</button>
                            </div>

                            {/* Search Results Dropdown List */}
                            {steamSearchResults.length > 0 && (
                                <div style={{ backgroundColor: '#171a21', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                                    {steamSearchResults.map(player => (
                                        <div key={player.steamId || player.steamid} onClick={() => selectSteamPlayer(player.steamId || player.steamid)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <img src={player.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                                            <span>{player.personaname}</span>
                                            {player.isNew && <span style={{ fontSize: '10px', color: '#888', marginLeft: 'auto', backgroundColor: '#333', padding: '2px 5px', borderRadius: '3px' }}>New to DB</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {wasSearchPerformed && steamSearchResults.length === 0 && (
                                <div style={{ fontSize: '12px', color: '#ccc', marginTop: '10px', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px' }}>
                                    <p style={{ margin: 0 }}>**No results found.** The Steam API doesn't support partial name searches.</p>
                                </div>
                            )}

                            <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                <p>Active Profile: <strong style={{ color: '#66c0f4' }}>{steamId || "None Selected"}</strong></p>
                                
                                {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                                {linkedId && steamId !== linkedId && <button onClick={backToMySteamProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                                <button onClick={fetchSteamProfile}>1. Load Profile</button>
                                <button onClick={syncSteamData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
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
              <>
                  <div className="card" style={{ padding: '20px', backgroundColor: '#001a4d', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
                        
                        {/* 1. Linking UI (Shows if the user has not pasted a token yet) */}
                        {!linkedPsnId ? (
                            <div>
                                <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>PlayStation Account Setup</h3>
                                <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '15px' }}>To use PlayStation features, you must provide an active <strong>npsso</strong> token. <br/><a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>Click here to get yours.</a></p>
                                <input type="text" placeholder="Paste 64-character token here" value={npsso} onChange={e => setNpsso(e.target.value)} style={{ padding: '10px', width: '250px' }} />
                                <button onClick={handleLinkPsn} style={{ marginLeft: '10px', backgroundColor: '#f5f5f5', color: '#003087' }}>Authenticate with Sony</button>
                            </div>
                        ) : (
                            /* 2. Tracker & Search UI (Shows once linked) */
                            <div>
                                <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>PlayStation Tracker & Search</h3>
                                <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '15px' }}>Search for any PlayStation Network ID.</p>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <input 
                                        type="text" 
                                        value={psnSearchQuery} 
                                        onChange={(e) => setPsnSearchQuery(e.target.value)} 
                                        placeholder="e.g. xX_Sniper_Xx"
                                        style={{ padding: '10px', width: '250px' }}
                                    />
                                    <button onClick={handlePsnSearch} style={{ backgroundColor: '#f5f5f5', color: '#003087' }}>Search PSN</button>
                                </div>

                                {/* PSN Search Results Dropdown List */}
                                {psnSearchResults.length > 0 && (
                                    <div style={{ backgroundColor: '#002266', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                                        {psnSearchResults.map(player => (
                                            <div key={player.accountId} onClick={() => selectPsnPlayer(player)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                                                <img src={player.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                                                <span>{player.onlineId}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                    <p style={{ color: 'white' }}>Active PSN Profile: <strong style={{ color: '#66c0f4' }}>{activePsnOnlineId || "None Selected"}</strong></p>
                                    
                                    {linkedPsnId && activePsnAccountId !== linkedPsnId && <button onClick={backToMyPsnProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                                    <button onClick={fetchPsnProfile} style={{ backgroundColor: '#f5f5f5', color: '#003087' }}>1. Load Profile</button>
                                    <button onClick={syncPsnData} style={{ backgroundColor: '#2a475e', color: 'white', marginLeft: '10px' }}>2. Sync to DB</button>
                                    <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', color: 'white', marginLeft: '10px' }}>3. View Library</button>
                                    <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', color: 'white', marginLeft: '10px' }}>4. View Leaderboard</button>
                                </div>
                            </div>
                        )}
                  </div>

                  {/* Profile Card and Trophy View (PSN) */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                      {psnProfile && (
                        <div className="profile-card" style={{ padding: '20px', border: '1px solid #003087', borderRadius: '8px', minWidth: '250px', backgroundColor: '#001a4d', color: 'white' }}>
                          <img src={psnProfile.avatar} alt="Avatar" style={{ borderRadius: '50%', width: '100px' }} />
                          <h2>{psnProfile.onlineId}</h2>
                          <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#ccc' }}>"{psnProfile.aboutMe}"</p>
                        </div>
                      )}

                      {psnStats && (
                        <div className="stats-card" style={{ padding: '20px', backgroundColor: '#002266', border: '1px solid #003087', borderRadius: '8px', minWidth: '250px', textAlign: 'center', color: 'white' }}>
                            <h2 style={{ margin: '0 0 15px 0', color: '#ccc' }}>Trophy Hub</h2>
                            <h1 style={{ fontSize: '48px', margin: '0', color: '#f5f5f5' }}>Lv. {psnStats.level}</h1>
                            <p style={{ margin: '0 0 20px 0', color: '#888' }}>{psnStats.progress}% to next level</p>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                <div><strong style={{ color: '#b9a3e3' }}>{psnStats.earned.platinum}</strong><br/><small>Platinum</small></div>
                                <div><strong style={{ color: '#e6c300' }}>{psnStats.earned.gold}</strong><br/><small>Gold</small></div>
                                <div><strong style={{ color: '#a6a6a6' }}>{psnStats.earned.silver}</strong><br/><small>Silver</small></div>
                                <div><strong style={{ color: '#cd7f32' }}>{psnStats.earned.bronze}</strong><br/><small>Bronze</small></div>
                            </div>
                        </div>
                      )}
                  </div>
              </>
          )}

          {/* ========================================= */}
          {/*   COMMON UI (Shows for whatever tab is active)  */}
          {/* ========================================= */}

          {/* Game Library Grid Display */}
          {gamesLibrary.length > 0 && (
              <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                  {gamesLibrary.map(game => (
                      <div key={game._id || game.appid} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                          
                          <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: game.platform === 'PSN' ? '#003087' : '#1b2838', color: 'white' }}>
                              {game.platform || 'Steam'}
                          </span>

                          <img 
                            src={game.platform === 'PSN' ? game.img_icon_url : `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid || game.platformGameId}/${game.img_icon_url}.jpg`} 
                            alt={game.name} 
                            style={{ width: '64px', height: '64px', marginBottom: '10px', borderRadius: '5px' }} 
                          />
                          <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                          
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

          {/* Achievements Detail View */}
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
                                backgroundColor: ach.achieved ? '#2a475e' : '#171a21',
                                padding: '10px', 
                                borderRadius: '5px',
                                border: ach.achieved ? '1px solid #66c0f4' : '1px solid #333',
                                opacity: ach.achieved ? 1 : 0.6
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