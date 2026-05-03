import { useState } from 'react'
import './App.css'

function App() {
  // 1. State Management
  const [activeTab, setActiveTab] = useState('Steam'); // 'Steam' or 'PSN'
  const [steamId, setSteamId] = useState(''); 
  const [linkedId, setLinkedId] = useState(''); 
  const [profile, setProfile] = useState(null);
  const [serverMessage, setServerMessage] = useState("");
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedAchievements, setSelectedAchievements] = useState(null);
  const [activeGameName, setActiveGameName] = useState("");

  // Search Convenience States
  const [searchQuery, setSearchQuery] = useState(''); 
  const [searchResults, setSearchResults] = useState([]); 
  
  // PSN Specific State
  const [npsso, setNpsso] = useState('');
  const [psnAccountId, setPsnAccountId] = useState('');

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
            setSearchQuery(data.linkedSteamId); 
            setServerMessage(`Welcome back, ${data.username}!`);
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
    setServerMessage("Logged out.");
  };
  
  // 4. Platform Link Functions
  const handleLinkSteam = async () => {
      if (!steamId) return alert("Please enter a Steam ID to link.");
      const res = await fetch(`${API_URL}/api/auth/link-steam`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, steamId })
      });
      const data = await res.json();
      if (res.ok) setLinkedId(steamId);
      alert(data.message);
  };

  const handleLinkPsn = async () => {
    setServerMessage("Connecting to Sony...");
    const res = await fetch(`${API_URL}/api/auth/link-psn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, npsso })
    });
    const data = await res.json();
    if (res.ok) setPsnAccountId(data.accountId);
    alert(data.message);
    setServerMessage("");
  };

  // 5. Data Sync & Load Functions
  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
        const res = await fetch(`${API_URL}/api/search/players/${searchQuery}`);
        const data = await res.json();
        setSearchResults(data);
    } catch (err) { setServerMessage("Search failed."); }
  };

  const selectPlayer = (selectedId) => {
    setSteamId(selectedId);
    setSearchQuery(selectedId);
    setSearchResults([]);
  };

  const syncSteamData = async () => {
    setServerMessage(`Syncing Steam...`);
    const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    setServerMessage("");
  };

  const syncPsnData = async () => {
    setServerMessage("Syncing PlayStation...");
    const res = await fetch(`${API_URL}/api/psn/sync/${username}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    setServerMessage("");
  };

  const loadLibrary = async () => {
    // Determine which ID to use based on the active tab
    const idToFetch = (activeTab === 'Steam') ? steamId : psnAccountId;
    if (!idToFetch) return alert(`Please link/select a ${activeTab} account first.`);

    setServerMessage(`Loading ${activeTab} Library...`);
    try {
        const res = await fetch(`${API_URL}/api/games/${idToFetch}`);
        const data = await res.json();
        setGamesLibrary(data);

        // Load stats for Steam only for now
        if (activeTab === 'Steam') {
            const statsRes = await fetch(`${API_URL}/api/stats/${idToFetch}`);
            const statsData = await statsRes.json();
            const playtimeRes = await fetch(`${API_URL}/api/stats/playtime/${idToFetch}`);
            const playtimeData = await playtimeRes.json();
            setUserStats({ ...statsData, ...playtimeData });
        }
        setServerMessage(`${activeTab} Library Loaded.`);
    } catch (err) { setServerMessage("Failed to load data."); }
  };

  const loadAchievements = async (game) => {
      const gameId = game.platformGameId;
      setActiveGameName(game.name);
      setSelectedAchievements(null);
      try {
          let data;
          if (activeTab === 'PSN') {
              const res = await fetch(`${API_URL}/api/psn/achievements/${username}/${gameId}`);
              data = await res.json();
          } else {
              await fetch(`${API_URL}/api/steam/achievements/${steamId}/${gameId}`);
              const res = await fetch(`${API_URL}/api/achievements/${steamId}/${gameId}`);
              data = await res.json();
          }
          setSelectedAchievements(data);
      } catch (err) { setServerMessage("Failed to load achievements."); }
  };

  const loadLeaderboard = async () => {
    const res = await fetch(`${API_URL}/api/community/leaderboard`);
    const data = await res.json();
    setLeaderboard(data);
  };

  return (
    <div className="App">
      <h1>🎮 Giga Game Dashboard</h1>
      <p style={{ color: 'lightgreen', fontWeight: 'bold' }}>{serverMessage}</p>

      {!isLoggedIn ? (
        /* --- 1. LOGIN / SIGNUP VIEW --- */
        <div className="card" style={{ padding: '30px', backgroundColor: '#1b2838', width: '320px', margin: '0 auto' }}>
          <h2>Account Access</h2>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleSignup} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>Sign Up</button>
        </div>
      ) : (
        /* --- 2. MAIN DASHBOARD VIEW (LOGGED IN) --- */
        <div>
          {/* PLATFORM SWITCHER TABS */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button onClick={() => { setActiveTab('Steam'); setGamesLibrary([]); setSelectedAchievements(null); }} style={{ backgroundColor: activeTab === 'Steam' ? '#66c0f4' : '#333', color: activeTab === 'Steam' ? 'black' : 'white' }}>Steam View</button>
              <button onClick={() => { setActiveTab('PSN'); setGamesLibrary([]); setSelectedAchievements(null); }} style={{ backgroundColor: activeTab === 'PSN' ? '#003087' : '#333', color: 'white' }}>PlayStation View</button>
              <button onClick={handleLogout} style={{ backgroundColor: 'red' }}>Logout</button>
          </div>

          {/* DYNAMIC CONTROL PANEL */}
          <div className="card" style={{ padding: '20px', backgroundColor: activeTab === 'Steam' ? '#1b2838' : '#001a4d', borderRadius: '10px' }}>
            {activeTab === 'Steam' ? (
                /* STEAM SEARCH & SYNC */
                <div>
                    <h3>Steam Tracker</h3>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Name or SteamID64" style={{ padding: '10px' }} />
                    <button onClick={handleSearch} style={{ marginLeft: '10px' }}>Search</button>
                    {searchResults.length > 0 && (
                        <div style={{ backgroundColor: '#171a21', border: '1px solid #555', width: '250px', margin: '10px auto' }}>
                            {searchResults.map(p => (
                                <div key={p.steamId || p.steamid} onClick={() => selectSteamPlayer(p.steamId || p.steamid)} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #333' }}>{p.personaname}</div>
                            ))}
                        </div>
                    )}
                    <div style={{ marginTop: '15px' }}>
                        <p>Viewing: <strong>{steamId || "None"}</strong></p>
                        {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black' }}>Link to My Account</button>}
                        <button onClick={syncSteamData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>Sync Steam</button>
                        <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>View Library</button>
                    </div>
                </div>
            ) : (
                /* PSN LINK & SYNC */
                <div>
                    <h3>PlayStation Tracker</h3>
                    <input type="text" placeholder="Paste npsso token" value={npsso} onChange={e => setNpsso(e.target.value)} style={{ padding: '10px' }} />
                    <button onClick={handleLinkPsn} style={{ marginLeft: '10px' }}>Link PSN</button>
                    <div style={{ marginTop: '15px' }}>
                        <p>Account ID: <strong>{psnAccountId || "Not Linked"}</strong></p>
                        <button onClick={syncPsnData} style={{ backgroundColor: '#2a475e' }}>Sync PSN</button>
                        <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>View Library</button>
                    </div>
                </div>
            )}
          </div>

          {/* STATS HUB (Shows for Steam) */}
          {activeTab === 'Steam' && userStats && (
            <div className="stats-card" style={{ padding: '20px', backgroundColor: '#171a21', border: '1px solid #c7d5e0', borderRadius: '8px', width: '300px', margin: '20px auto', textAlign: 'center' }}>
                <h2 style={{ color: '#c7d5e0' }}>Data Hub</h2>
                <h1 style={{ fontSize: '48px', margin: '0', color: '#66c0f4' }}>{userStats.completionRate}%</h1>
                <p>Avg. Completion</p>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px' }}>
                    <div><strong>{userStats.unlocked}</strong><br/><small>Unlocked</small></div>
                    <div><strong>{userStats.total}</strong><br/><small>Tracked</small></div>
                    <div><strong>{userStats.totalHours}</strong><br/><small>Total Hours</small></div>
                </div>
            </div>
          )}

          {/* GAME LIBRARY GRID */}
          <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
              {gamesLibrary.map(game => (
                  <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px' }}>
                      <img src={game.img_icon_url.includes('http') ? game.img_icon_url : `http://media.steampowered.com/steamcommunity/public/images/apps/${game.platformGameId}/${game.img_icon_url}.jpg`} alt="game" style={{ width: '64px', borderRadius: '5px' }} />
                      <p style={{ fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                      {activeTab === 'Steam' && <p style={{ color: '#a3cf06' }}>{(game.playtime_forever / 60).toFixed(1)} hrs</p>}
                      <button onClick={() => loadAchievements(game)} style={{ fontSize: '12px' }}>View Achievements</button>
                  </div>
              ))}
          </div>

          {/* ACHIEVEMENT DETAIL SECTION */}
          {selectedAchievements && (
            <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
                <h2>🏆 Achievements: {activeGameName}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                    {selectedAchievements.map((ach, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#171a21', padding: '10px', opacity: ach.achieved ? 1 : 0.5 }}>
                            <img src={ach.iconUrl} alt="icon" style={{ width: '50px', marginRight: '15px' }} />
                            <div style={{ textAlign: 'left' }}>
                                <h4 style={{ margin: 0 }}>{ach.displayName}</h4>
                                <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>{ach.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* COMMUNITY LEADERBOARD */}
          <button onClick={loadLeaderboard} style={{ marginTop: '30px', backgroundColor: '#6600cc' }}>Load Global Leaderboard</button>
          {leaderboard.length > 0 && (
            <div className="leaderboard" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#171a21', borderRadius: '10px' }}>
                <h2>🌍 Global Leaderboard</h2>
                <table style={{ width: '100%' }}>
                    <thead><tr><th>Rank</th><th>User</th><th>Unlocked</th></tr></thead>
                    <tbody>
                        {leaderboard.map((u, i) => (
                            <tr key={i}><td>{i+1}</td><td>{u.username}</td><td>{u.unlockedCount}</td></tr>
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