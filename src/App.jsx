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

  // 3. PSN Specific State
  const [npsso, setNpsso] = useState('');
  const [psnAccountId, setPsnAccountId] = useState('');
  const [linkedPsnId, setLinkedPsnId] = useState(''); // To know if PSN is linked
  
  // 4. Common Data Display State
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [selectedAchievements, setSelectedAchievements] = useState(null);
  const [activeGameName, setActiveGameName] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  // 5. API Configuration
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // --- AUTH & SYSTEM FUNCTIONS ---
  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setIsLoggedIn(true);
        setUsername(data.username);
        // Load linked accounts on login
        if (data.linkedSteamId) setLinkedSteamId(data.linkedSteamId);
        if (data.psnAccountId) setLinkedPsnId(data.psnAccountId);
        setServerMessage(`Welcome, ${data.username}!`);
      } else { alert(data.message); }
    } catch (err) { setServerMessage("Login failed."); }
  };

  const handleLogout = () => { window.location.reload(); }; // Simple page reload to reset all state

  // --- STEAM FUNCTIONS ---
  const handleLinkSteam = async () => {
    if (!steamId) return alert("Please select a Steam ID to link.");
    const res = await fetch(`${API_URL}/api/auth/link-steam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, steamId })
    });
    const data = await res.json();
    if (res.ok) setLinkedSteamId(steamId);
    alert(data.message);
  };

  const handleSteamSearch = async () => {
    if (!steamSearchQuery) return;
    const res = await fetch(`${API_URL}/api/search/players/${steamSearchQuery}`);
    const data = await res.json();
    setSteamSearchResults(data);
  };
  
  const selectSteamPlayer = (id) => {
    setSteamId(id);
    setSteamSearchResults([]);
  };

  const syncSteam = async () => {
    if (!steamId) return alert("Please select a Steam ID first.");
    setServerMessage("Syncing Steam...");
    const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    setServerMessage("");
  };

  const loadSteamLibrary = async () => {
    if (!steamId) return alert("Please select a Steam ID first.");
    setServerMessage("Loading Steam Library...");
    const res = await fetch(`${API_URL}/api/games/${steamId}`);
    const data = await res.json();
    setGamesLibrary(data);
    setServerMessage("Library Loaded.");
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
    alert(data.message);
    setServerMessage("");
  };

  const loadPsnLibrary = async () => {
    if (!linkedPsnId) return alert("PSN account not linked.");
    setServerMessage("Loading PSN Library...");
    const res = await fetch(`${API_URL}/api/games/${linkedPsnId}`);
    const data = await res.json();
    setGamesLibrary(data);
    setServerMessage("Library Loaded.");
  };

  // --- COMMON ACHIEVEMENT FUNCTION ---
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
              // This logic is now fixed and simpler
              await fetch(`${API_URL}/api/steam/achievements/${steamId}/${gameId}`);
              const res = await fetch(`${API_URL}/api/achievements/${steamId}/${gameId}`);
              data = await res.json();
          }
          setSelectedAchievements(data);
      } catch (err) { setServerMessage("Failed to load achievements."); }
  };

  return (
    <div className="App">
      <header>
        <h1>🎮 Giga Game Dashboard</h1>
        <p style={{ color: 'lightgreen' }}>{serverMessage}</p>
      </header>

      {!isLoggedIn ? (
        <div className="card" style={{ width: '300px', margin: '0 auto', padding: '20px' }}>
          <h2>Sign In</h2>
          <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
          <button onClick={handleLogin}>Login</button>
        </div>
      ) : (
        <div>
          {/* --- TABS --- */}
          <div className="tabs">
              <button onClick={() => setActiveTab('Steam')} className={activeTab === 'Steam' ? 'active' : ''}>Steam</button>
              <button onClick={() => setActiveTab('PSN')} className={activeTab === 'PSN' ? 'active' : ''}>PlayStation</button>
              <button onClick={handleLogout} style={{ float: 'right', backgroundColor: 'red' }}>Logout</button>
          </div>

          {/* --- CONDITIONAL VIEW BASED ON TAB --- */}
          <div className="content">
            {activeTab === 'Steam' ? (
                /* --- STEAM VIEW --- */
                <div className="card platform-steam">
                    <h3>Steam Player Search</h3>
                    <input type="text" placeholder="Name or SteamID64" onChange={e => setSteamSearchQuery(e.target.value)} />
                    <button onClick={handleSteamSearch}>Search</button>
                    {steamSearchResults.length > 0 && (
                        <div className="search-results">
                            {steamSearchResults.map(p => <div key={p.steamId || p.steamid} onClick={() => selectSteamPlayer(p.steamId || p.steamid)}>{p.personaname}</div>)}
                        </div>
                    )}
                    <p>Selected ID: <strong>{steamId || "None"}</strong></p>
                    {!linkedSteamId && steamId && <button onClick={handleLinkSteam}>Link to My Account</button>}
                    <button onClick={syncSteam}>Sync Games</button>
                    <button onClick={loadSteamLibrary}>View Library</button>
                </div>
            ) : (
                /* --- PLAYSTATION VIEW --- */
                <div className="card platform-psn">
                    <h3>PlayStation Account Link</h3>
                    {!linkedPsnId ? (
                      <div>
                        <p style={{fontSize: '12px'}}>Get token from <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank">Sony</a></p>
                        <input type="text" placeholder="Paste npsso token" onChange={e => setNpsso(e.target.value)} />
                        <button onClick={handleLinkPsn}>Link Account</button>
                      </div>
                    ) : (
                      <div>
                        <p>PSN Linked! Account ID: <strong>{linkedPsnId}</strong></p>
                        <button onClick={syncPsn}>Sync Games</button>
                        <button onClick={loadPsnLibrary}>View Library</button>
                      </div>
                    )}
                </div>
            )}
          </div>
          
          {/* --- COMMON DISPLAY AREAS --- */}
          {gamesLibrary.length > 0 && (
            <div className="games-grid">
              {gamesLibrary.map(game => (
                <div key={game._id} className="game-card">
                  <span className={`platform-badge ${game.platform}`}>{game.platform}</span>
                  <img src={game.img_icon_url.includes('http') ? game.img_icon_url : `http://media.steampowered.com/steamcommunity/public/images/apps/${game.platformGameId}/${game.img_icon_url}.jpg`} alt="game" />
                  <p>{game.name}</p>
                  <button onClick={() => loadAchievements(game)}>View Achievements</button>
                </div>
              ))}
            </div>
          )}

          {selectedAchievements && (
            <div className="achievements-section card">
                <h3>🏆 Achievements for {activeGameName}</h3>
                <div className="achievements-grid">
                    {selectedAchievements.map((ach, i) => (
                        <div key={i} className={`achievement-item ${ach.achieved ? 'unlocked' : ''}`}>
                            <img src={ach.iconUrl} alt="icon" />
                            <div>
                                <h4>{ach.displayName}</h4>
                                <p>{ach.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App;