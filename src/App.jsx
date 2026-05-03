import { useState } from 'react'
import './App.css'

function App() {
  // 1. Core App & Auth State
  const [activeTab, setActiveTab] = useState('Steam'); // Controls which platform view is visible
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  
  // 2. Steam Specific State
  const [steamId, setSteamId] = useState(''); 
  const [linkedSteamId, setLinkedSteamId] = useState('');
  const [steamProfile, setSteamProfile] = useState(null);
  const [steamSearchQuery, setSteamSearchQuery] = useState('');
  const [steamSearchResults, setSteamSearchResults] = useState([]);
  const [wasSearchPerformed, setWasSearchPerformed] = useState(false);

  // 3. PSN Specific State
  const [npsso, setNpsso] = useState('');
  const [psnAccountId, setPsnAccountId] = useState('');
  const [linkedPsnId, setLinkedPsnId] = useState(''); 
  
  // 4. Common Data Display State
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [userStats, setUserStats] = useState(null); // Data Hub Stats
  const [selectedAchievements, setSelectedAchievements] = useState(null);
  const [activeGameName, setActiveGameName] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  // 5. API Configuration
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // --- AUTH & SYSTEM FUNCTIONS ---
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
      if (res.ok && data.token) {
        setIsLoggedIn(true);
        setUsername(data.username);
        // Load linked accounts on login
        if (data.linkedSteamId) {
            setLinkedSteamId(data.linkedSteamId);
            setSteamId(data.linkedSteamId);
            setSteamSearchQuery(data.linkedSteamId);
        }
        if (data.psnAccountId) { // Note: ensure your backend login route returns psnAccountId if you want auto-login for PSN
            setLinkedPsnId(data.psnAccountId);
            setPsnAccountId(data.psnAccountId);
        }
        setServerMessage(`Welcome, ${data.username}!`);
      } else { alert(data.message); setServerMessage(""); }
    } catch (err) { setServerMessage("Login failed."); }
  };

  const handleLogout = () => { window.location.reload(); }; // Hard reset state on logout

  // --- STEAM FUNCTIONS ---
  const handleLinkSteam = async () => {
    if (!steamId) return alert("Please select a Steam ID to link.");
    setServerMessage("Linking account...");
    const res = await fetch(`${API_URL}/api/auth/link-steam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, steamId })
    });
    const data = await res.json();
    if (res.ok) setLinkedSteamId(steamId);
    alert(data.message);
    setServerMessage("");
  };

  const handleSteamSearch = async () => {
    if (!steamSearchQuery) return;
    setServerMessage("Searching for players...");
    setSteamSearchResults([]);
    setWasSearchPerformed(true);

    // If exact 17 digits, fetch directly
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
  
  const selectSteamPlayer = (id) => {
    setSteamId(id);
    setSteamSearchQuery(id);
    setSteamSearchResults([]);
    setServerMessage("Player selected. Load profile to continue.");
  };

  const fetchSteamProfile = async () => {
    if (!steamId) return alert("Please search or enter a Steam ID first.");
    setServerMessage("Fetching profile info...");
    try {
      const res = await fetch(`${API_URL}/api/steam/profile/${steamId}`);
      const data = await res.json();
      if (res.ok) {
        setSteamProfile(data);
        setServerMessage("Profile loaded.");
      } else { alert(data.message); setServerMessage(""); }
    } catch (err) { setServerMessage("Error connecting to server."); }
  };

  const syncSteam = async () => {
    if (!steamId) return alert("Please select a Steam ID first.");
    setServerMessage("Syncing Steam...");
    const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message || data.error);
    setServerMessage("");
  };

  const loadSteamLibrary = async () => {
    if (!steamId) return alert("Please select a Steam ID first.");
    setServerMessage("Loading Steam Library and Stats...");
    try {
        // Fetch Games
        const res = await fetch(`${API_URL}/api/games/${steamId}`);
        const data = await res.json();
        setGamesLibrary(data);

        // Fetch Stats for Data Hub
        const statsRes = await fetch(`${API_URL}/api/stats/${steamId}`);
        const statsData = await statsRes.json();
        const playtimeRes = await fetch(`${API_URL}/api/stats/playtime/${steamId}`);
        const playtimeData = await playtimeRes.json();
        setUserStats({ ...statsData, ...playtimeData });

        setServerMessage(`Library Loaded.`);
    } catch (err) { setServerMessage("Failed to load library."); }
  };

  const backToMySteamProfile = () => {
      setSteamId(linkedSteamId);
      setSteamSearchQuery(linkedSteamId);
      setServerMessage("Switched back to your profile.");
  };

  // --- PLAYSTATION FUNCTIONS ---
  const handleLinkPsn = async () => {
    setServerMessage("Connecting to Sony...");
    const res = await fetch(`${API_URL}/api/auth/link-psn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, npsso })
    });
    const data = await res.json();
    if (res.ok) {
        setLinkedPsnId(data.accountId);
        setPsnAccountId(data.accountId);
    }
    alert(data.message);
    setServerMessage("");
  };

  const syncPsn = async () => {
    if (!linkedPsnId) return alert("PSN account not linked.");
    setServerMessage("Syncing PSN...");
    const res = await fetch(`${API_URL}/api/psn/sync/${username}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message || data.error);
    setServerMessage("");
  };

  const loadPsnLibrary = async () => {
    if (!linkedPsnId) return alert("PSN account not linked.");
    setServerMessage("Loading PSN Library...");
    const res = await fetch(`${API_URL}/api/games/${linkedPsnId}`);
    const data = await res.json();
    setGamesLibrary(data);
    setUserStats(null); // PSN stats not calculated yet
    setServerMessage("Library Loaded.");
  };

  // --- COMMON DATA & SOCIAL FUNCTIONS ---
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
      // FIX: Handles both old MongoDB docs (appid) and new docs (platformGameId)
      const gameId = game.platformGameId || game.appid;
      const platform = game.platform || 'Steam'; 
      const currentUserId = platform === 'PSN' ? linkedPsnId : steamId; // Ensure we use correct ID

      setActiveGameName(game.name);
      setSelectedAchievements(null);
      setServerMessage(`Fetching ${platform} achievements for ${game.name}...`);

      try {
          let dbData;
          if (platform === 'PSN') {
              const res = await fetch(`${API_URL}/api/psn/achievements/${username}/${gameId}`);
              dbData = await res.json();
          } else {
              // 1. Sync from Steam
              await fetch(`${API_URL}/api/steam/achievements/${currentUserId}/${gameId}`);
              // 2. Fetch from DB
              const dbRes = await fetch(`${API_URL}/api/achievements/${currentUserId}/${gameId}`);
              dbData = await dbRes.json();
          }
          setSelectedAchievements(dbData);
          setServerMessage("");
      } catch (err) { 
          console.error(err);
          setServerMessage("Failed to load achievements."); 
      }
  };

  return (
    <div className="App">
      <header style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1>🎮 Giga Game Dashboard</h1>
        <p style={{ color: 'lightgreen', fontWeight: 'bold' }}>{serverMessage}</p>
      </header>

      {!isLoggedIn ? (
        /* --- 1. LOGIN / SIGNUP VIEW --- */
        <div className="card" style={{ width: '320px', margin: '0 auto', padding: '30px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
          <h2>Account Access</h2>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '90%', marginBottom: '15px', padding: '10px' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '90%', marginBottom: '15px', padding: '10px' }} />
          <div style={{ marginTop: '20px' }}>
              <button onClick={handleLogin} style={{ margin: '5px', padding: '10px 20px' }}>Login</button>
              <button onClick={handleSignup} style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#2a475e' }}>Sign Up</button>
          </div>
        </div>
      ) : (
        /* --- 2. MAIN DASHBOARD VIEW (LOGGED IN) --- */
        <div>
          {/* PLATFORM SWITCHER TABS */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={() => { setActiveTab('Steam'); setGamesLibrary([]); setSelectedAchievements(null); }} style={{ backgroundColor: activeTab === 'Steam' ? '#66c0f4' : '#333', color: activeTab === 'Steam' ? 'black' : 'white', padding: '10px 30px', fontWeight: 'bold' }}>Steam View</button>
              <button onClick={() => { setActiveTab('PSN'); setGamesLibrary([]); setSelectedAchievements(null); }} style={{ backgroundColor: activeTab === 'PSN' ? '#003087' : '#333', color: 'white', padding: '10px 30px', marginLeft: '5px', fontWeight: 'bold' }}>PlayStation View</button>
              <button onClick={handleLogout} style={{ float: 'right', backgroundColor: '#cc3333', color: 'white', padding: '10px 20px', marginLeft: 'auto' }}>Logout</button>
          </div>

          {/* DYNAMIC CONTROL PANEL BASED ON ACTIVE TAB */}
          <div className="card" style={{ padding: '20px', backgroundColor: activeTab === 'Steam' ? '#1b2838' : '#001a4d', borderRadius: '10px', position: 'relative' }}>
            {activeTab === 'Steam' ? (
                /* --- STEAM PANEL --- */
                <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>Steam Player Tracker & Search</h3>
                    <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '15px' }}>Search by name, or enter an exact Custom URL / SteamID64 to track a new player.</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <input type="text" placeholder="e.g. GabeNewell or 76561198..." value={steamSearchQuery} onChange={e => setSteamSearchQuery(e.target.value)} style={{ padding: '10px', width: '250px' }} />
                        <button onClick={handleSteamSearch} style={{ backgroundColor: '#66c0f4', color: 'black' }}>Search</button>
                    </div>

                    {/* Search Results Dropdown */}
                    {steamSearchResults.length > 0 && (
                        <div style={{ backgroundColor: '#171a21', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                            {steamSearchResults.map(p => (
                                <div key={p.steamId || p.steamid} onClick={() => selectSteamPlayer(p.steamId || p.steamid)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img src={p.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                                    <span>{p.personaname}</span>
                                    {p.isNew && <span style={{ fontSize: '10px', color: '#888', marginLeft: 'auto', backgroundColor: '#333', padding: '2px 5px', borderRadius: '3px' }}>New to DB</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Helper text for empty search */}
                    {wasSearchPerformed && steamSearchResults.length === 0 && (
                        <div style={{ fontSize: '12px', color: '#ccc', marginTop: '10px', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px' }}>
                            <p style={{ margin: 0 }}>**No results found.** The Steam API doesn't support partial name searches.</p>
                        </div>
                    )}

                    <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '15px' }}>
                        <p>Active Profile: <strong style={{ color: '#66c0f4' }}>{steamId || "None Selected"}</strong></p>
                        
                        {!linkedSteamId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                        {linkedSteamId && steamId !== linkedSteamId && <button onClick={backToMySteamProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                        <button onClick={fetchSteamProfile}>1. Load Profile</button>
                        <button onClick={syncSteam} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
                        <button onClick={loadSteamLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
                    </div>
                </div>
            ) : (
                /* --- PLAYSTATION PANEL --- */
                <div>
                    <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>PlayStation Integration</h3>
                    {!linkedPsnId ? (
                      <div>
                        <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '15px' }}>Get your token from: <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" style={{ color: 'white' }}>Sony SSOCookie</a></p>
                        <input type="text" placeholder="Paste npsso token here" value={npsso} onChange={e => setNpsso(e.target.value)} style={{ padding: '10px', width: '250px' }} />
                        <button onClick={handleLinkPsn} style={{ marginLeft: '10px', backgroundColor: '#f5f5f5', color: '#003087' }}>Link PSN</button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: 'white' }}>PSN Status: <strong style={{ color: 'lightgreen' }}>Connected</strong> (ID: {linkedPsnId})</p>
                        <div style={{ marginTop: '15px' }}>
                            <button onClick={syncPsn} style={{ backgroundColor: '#2a475e', color: 'white' }}>1. Sync PSN Games</button>
                            <button onClick={loadPsnLibrary} style={{ backgroundColor: '#107c10', color: 'white', marginLeft: '10px' }}>2. View Library</button>
                        </div>
                      </div>
                    )}
                </div>
            )}
          </div>

          {/* --- PROFILE & DATA HUB SECTION (Steam Only for now) --- */}
          {activeTab === 'Steam' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                  {steamProfile && (
                    <div className="profile-card" style={{ padding: '20px', border: '1px solid #66c0f4', borderRadius: '8px', minWidth: '250px' }}>
                      <img src={steamProfile.avatarfull} alt="Avatar" style={{ borderRadius: '50%' }} />
                      <h2>{steamProfile.personaname}</h2>
                      <p>Status: {steamProfile.personastate === 1 ? "Online" : "Offline"}</p>
                      <a href={steamProfile.profileurl} target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>View External Steam Profile</a>
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
          )}

          {/* --- COMMON GAME LIBRARY GRID --- */}
          {gamesLibrary.length > 0 && (
              <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                  {gamesLibrary.map(game => (
                      <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: game.platform === 'PSN' ? '#003087' : '#1b2838', color: 'white' }}>
                              {game.platform || 'Steam'}
                          </span>

                          <img 
                            src={game.platform === 'PSN' ? game.img_icon_url : `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid || game.platformGameId}/${game.img_icon_url}.jpg`} 
                            alt={game.name} 
                            style={{ width: '64px', height: '64px', marginBottom: '10px', borderRadius: '5px' }} 
                          />
                          <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                          
                          {/* Playtime only shown for Steam games */}
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

          {/* --- COMMON ACHIEVEMENTS DETAIL VIEW --- */}
          {selectedAchievements && (
            <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
                <h2>🏆 Achievements for {activeGameName}</h2>
                <p>Total: {selectedAchievements.length} | Unlocked: {selectedAchievements.filter(a => a.achieved === 1).length}</p>
                {selectedAchievements.length === 0 ? (
                    <p>This game does not have tracked achievements.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
                        {selectedAchievements.map((ach, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: ach.achieved ? '#2a475e' : '#171a21', padding: '10px', borderRadius: '5px', border: ach.achieved ? '1px solid #66c0f4' : '1px solid #333', opacity: ach.achieved ? 1 : 0.6 }}>
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

          {/* --- GLOBAL COMMUNITY LEADERBOARD --- */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', padding: '10px 20px', fontSize: '16px' }}>Load Global Leaderboard</button>
          </div>
          {leaderboard.length > 0 && (
            <div className="leaderboard-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#171a21', borderRadius: '10px', border: '1px solid #cca43b' }}>
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