import { useState } from 'react'
import './App.css'

function App() {
  // 1. State Management
  const [steamId, setSteamId] = useState(''); // The "Active" Steam ID we are currently looking at
  const [linkedId, setLinkedId] = useState(''); // The logged-in user's own linked Steam ID
  const [profile, setProfile] = useState(null);
  const [serverMessage, setServerMessage] = useState("");
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedAchievements, setSelectedAchievements] = useState(null);
  const [activeGameName, setActiveGameName] = useState("");

  // Search Convenience States
  const [searchQuery, setSearchQuery] = useState(''); // Text typed in the search box
  const [searchResults, setSearchResults] = useState([]); // List of matching players found
  
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jwtToken, setJwtToken] = useState("");

  // 2. API Configuration
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // 3. Auth Functions
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
        if (data.linkedSteamId) {
            setLinkedId(data.linkedSteamId);
            setSteamId(data.linkedSteamId); 
            setSearchQuery(data.linkedSteamId); // Set search box to their ID too
            setServerMessage(`Welcome back, ${data.username}!`);
        } else {
            setServerMessage(`Welcome ${data.username}! Please link your Steam account.`);
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
    setIsLoggedIn(false);
    setJwtToken("");
    setUsername("");
    setPassword("");
    setProfile(null);
    setGamesLibrary([]);
    setLinkedId("");
    setSteamId("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedAchievements(null);
    setLeaderboard([]);
    setServerMessage("Logged out.");
  };
  
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

  // 4. Steam & Search Functions

  // Search for players by name or Vanity URL
  const handleSearch = async () => {
    if (!searchQuery) return;
    setServerMessage("Searching for players...");
    setSearchResults([]);

    // If it's exactly 17 digits, treat it as a direct SteamID
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

  // Select a player from the search dropdown
  const selectPlayer = (selectedId) => {
    setSteamId(selectedId);
    setSearchQuery(selectedId);
    setSearchResults([]);
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
      } else {
        alert(data.message || "Profile not found.");
        setServerMessage("");
      }
    } catch (err) {
      console.error("Error fetching profile", err);
      setServerMessage("Error connecting to server.");
    }
  };

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

  const loadLibrary = async () => {
    if (!steamId) return;
    setServerMessage("Loading games and stats from database...");
    try {
        const res = await fetch(`${API_URL}/api/games/${steamId}`);
        const data = await res.json();
        setGamesLibrary(data);

        const statsRes = await fetch(`${API_URL}/api/stats/${steamId}`);
        const statsData = await statsRes.json();
        setUserStats(statsData);

        setServerMessage(`Loaded ${data.length} games.`);
    } catch (err) {
        setServerMessage("Failed to load data from database.");
    }
  };
  
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

  const loadAchievements = async (appid, gameName) => {
      setServerMessage(`Fetching achievements for ${gameName}...`);
      setActiveGameName(gameName);
      setSelectedAchievements(null);

      try {
          await fetch(`${API_URL}/api/steam/achievements/${steamId}/${appid}`);
          const dbRes = await fetch(`${API_URL}/api/achievements/${steamId}/${appid}`);
          const dbData = await dbRes.json();
          setSelectedAchievements(dbData);
          setServerMessage("");
      } catch (err) {
          console.error("Achievement error", err);
          setServerMessage("Failed to fetch achievements.");
      }
  };

  const backToMyProfile = () => {
      setSteamId(linkedId);
      setSearchQuery(linkedId);
      setServerMessage("Switched back to your profile.");
  };

  return (
    <div className="App">
      <h1>🎮 Giga Game Dashboard</h1>
      
      {/* Top Notification Message */}
      <p style={{ color: 'lightgreen', fontWeight: 'bold', height: '20px' }}>{serverMessage}</p>

      {!isLoggedIn ? (
        /* --- 1. LOGIN / SIGNUP VIEW --- */
        <div className="card" style={{ padding: '30px', backgroundColor: '#1b2838', borderRadius: '10px', width: '320px', margin: '0 auto' }}>
          <h2>Account Access</h2>
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} 
          />
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

          {/* Player Search and Command Panel */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
                <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>Player Tracker & Search</h3>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>
                        Search for tracked players by name, or enter a <strong>SteamID64</strong> or <strong>Custom URL</strong> to track a new player.
                    </p>
                    
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

                    {/* Search Results Dropdown List */}
                    {searchResults.length > 0 && (
                        <div style={{ 
                            backgroundColor: '#171a21', 
                            border: '1px solid #555', 
                            borderRadius: '5px', 
                            width: '310px', 
                            margin: '5px auto', 
                            textAlign: 'left', 
                            position: 'absolute', 
                            zIndex: 10, 
                            left: '50%', 
                            transform: 'translateX(-50%)',
                            maxHeight: '300px', 
                            overflowY: 'auto'
                        }}>
                            {searchResults.map(player => (
                                <div key={player.steamId || player.steamid} onClick={() => selectPlayer(player.steamId || player.steamid)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img src={player.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                                    <span>{player.personaname}</span>
                                    {player.isNew && <span style={{ fontSize: '10px', color: '#888', marginLeft: 'auto', backgroundColor: '#333', padding: '2px 5px', borderRadius: '3px' }}>New to DB</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                        <p>Active Profile: <strong style={{ color: '#66c0f4' }}>{steamId || "None Selected"}</strong></p>
                        
                        {/* Control Buttons */}
                        {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                        {linkedId && steamId !== linkedId && <button onClick={backToMyProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                        <button id="btn-fetch" onClick={fetchSteamProfile}>1. Load Profile</button>
                        <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
                        <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
                        <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', marginLeft: '10px' }}>4. View Leaderboard</button>
                    </div>
                </div>
          </div>
                    
                    <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                        <p>Active ID: <strong style={{ color: '#66c0f4' }}>{steamId || "None Selected"}</strong></p>
                        
                        {/* Control Buttons */}
                        {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                        {linkedId && steamId !== linkedId && <button onClick={backToMyProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                        <button onClick={fetchSteamProfile}>1. Load Profile</button>
                        <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
                        <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
                        <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', marginLeft: '10px' }}>4. View Leaderboard</button>
                    </div>
                </div>
          </div>

          {/* Profile Card and Statistics View */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
              {profile && (
                <div className="profile-card" style={{ padding: '20px', border: '1px solid #66c0f4', borderRadius: '8px', minWidth: '250px' }}>
                  <img src={profile.avatarfull} alt="Avatar" style={{ borderRadius: '50%' }} />
                  <h2>{profile.personaname}</h2>
                  <p>Status: {profile.personastate === 1 ? "Online" : "Offline"}</p>
                  <a href={profile.profileurl} target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>View Steam Profile</a>
                </div>
              )}

              {userStats && (
                <div className="stats-card" style={{ padding: '20px', backgroundColor: '#171a21', border: '1px solid #c7d5e0', borderRadius: '8px', minWidth: '250px', textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 15px 0', color: '#c7d5e0' }}>Data Hub</h2>
                    <h1 style={{ fontSize: '48px', margin: '0', color: '#66c0f4' }}>{userStats.completionRate}%</h1>
                    <p style={{ margin: '0 0 20px 0', color: '#888' }}>Avg. Completion</p>
                    <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div>
                            <h3 style={{ margin: '0', color: '#fff' }}>{userStats.unlocked}</h3>
                            <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Unlocked</p>
                        </div>
                        <div>
                            <h3 style={{ margin: '0', color: '#fff' }}>{userStats.total}</h3>
                            <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Tracked</p>
                        </div>
                    </div>
                </div>
              )}
          </div>

          {/* Game Library Grid Display */}
          {gamesLibrary.length > 0 && (
              <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                  {gamesLibrary.map(game => (
                      <div key={game.appid} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px' }}>
                          <img 
                            src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} 
                            alt={game.name} 
                            style={{ width: '64px', marginBottom: '10px' }} 
                          />
                          <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                          <p style={{ fontSize: '12px', color: '#888' }}>App ID: {game.appid}</p>
                          <button onClick={() => loadAchievements(game.appid, game.name)} style={{ fontSize: '12px', padding: '5px 10px', marginTop: '10px' }}>
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
                    <p>This game does not have Steam achievements.</p>
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