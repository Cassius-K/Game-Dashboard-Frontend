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
  const [npsso, setNpsso] = useState('');
  const [psnAccountId, setPsnAccountId] = useState('');

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
            setSearchQuery(data.linkedSteamId); 
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
              setServerMessage("Account linked!");
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
            alert("PSN Linked!");
        } else {
            alert(data.message);
        }
        setServerMessage("");
    } catch (err) {
        setServerMessage("Failed to link PSN.");
    }
  };

  const syncPsnData = async () => {
    setServerMessage("Syncing PlayStation games...");
    try {
        const res = await fetch(`${API_URL}/api/psn/sync/${username}`, { method: 'POST' });
        const data = await res.json();
        alert(data.message);
        setServerMessage("");
    } catch (err) {
        setServerMessage("PSN Sync failed.");
    }
  };

  // 4. Data Loading Functions (Steam & Search)
  const handleSearch = async () => {
    if (!searchQuery) return;
    setServerMessage("Searching for players...");
    setSearchResults([]);
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
    } catch (err) { setServerMessage("Search failed."); }
  };

  const selectPlayer = (selectedId) => {
    setSteamId(selectedId);
    setSearchQuery(selectedId);
    setSearchResults([]);
    setServerMessage("Player selected.");
  };

  const fetchSteamProfile = async () => {
    if (!steamId) return alert("Please search or enter a Steam ID first.");
    setServerMessage("Fetching profile info...");
    try {
      const res = await fetch(`${API_URL}/api/steam/profile/${steamId}`);
      const data = await res.json();
      if (res.ok) { setProfile(data); setServerMessage("Profile loaded."); }
      else { alert(data.message); setServerMessage(""); }
    } catch (err) { setServerMessage("Error connecting to server."); }
  };

  const syncData = async () => {
    if (!steamId) return;
    setServerMessage(`Syncing Steam data for ID: ${steamId}...`);
    try {
      const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || data.error || "Sync complete!");
      setServerMessage("Sync process finished.");
    } catch (err) { setServerMessage("Sync failed."); }
  };

  const loadLibrary = async () => {
    // This loads games for the current steamId in focus
    if (!steamId && !psnAccountId) return alert("Search for a player or link PSN first.");
    const idToFetch = steamId || psnAccountId; 

    setServerMessage("Loading games and stats from database...");
    try {
        const res = await fetch(`${API_URL}/api/games/${idToFetch}`);
        const data = await res.json();
        setGamesLibrary(data);

        // Fetch Stats
        const statsRes = await fetch(`${API_URL}/api/stats/${idToFetch}`);
        const statsData = await statsRes.json();
        const playtimeRes = await fetch(`${API_URL}/api/stats/playtime/${idToFetch}`);
        const playtimeData = await playtimeRes.json();

        setUserStats({ ...statsData, ...playtimeData });
        setServerMessage(`Loaded ${data.length} games.`);
    } catch (err) { setServerMessage("Failed to load data."); }
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
      } catch (err) { setServerMessage("Failed to fetch achievements."); }
  };

  const backToMyProfile = () => {
      setSteamId(linkedId);
      setSearchQuery(linkedId);
      setServerMessage("Switched back to your profile.");
  };

  // --- MODULAR SUB-RENDER VIEWS ---

  const renderAuthView = () => (
    <div className="card" style={{ padding: '30px', backgroundColor: '#1b2838', borderRadius: '10px', width: '320px', margin: '0 auto' }}>
        <h2>Account Access</h2>
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
        <div style={{ marginTop: '20px' }}>
            <button onClick={handleLogin} style={{ margin: '5px', padding: '10px 20px' }}>Login</button>
            <button onClick={handleSignup} style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#2a475e' }}>Sign Up</button>
        </div>
    </div>
  );

  const renderDashboardHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px', marginBottom: '10px' }}>
        <span>User: <strong>{username}</strong> | Linked Steam: <strong>{linkedId || "None"}</strong></span>
        <button onClick={handleLogout} style={{ backgroundColor: '#cc3333', color: 'white', padding: '5px 15px' }}>Logout</button>
    </div>
  );

  const renderSearchAndControl = () => (
    <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
        <h3 style={{ margin: '0 0 5px 0' }}>Player Tracker & Search</h3>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>Search tracked players by name, or enter a SteamID64/Vanity URL to track a new player.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. 76561198... or GabeNewell" style={{ padding: '10px', width: '250px' }} />
            <button onClick={handleSearch} style={{ backgroundColor: '#66c0f4', color: 'black' }}>Search</button>
        </div>
        {/* Search Results Dropdown List */}
        {searchResults.length > 0 && (
            <div style={{ backgroundColor: '#171a21', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                {searchResults.map(player => (
                    <div key={player.steamId || player.steamid} onClick={() => selectPlayer(player.steamId || player.steamid)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={player.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                        <span>{player.personaname}</span>
                        {player.isNew && <span style={{ fontSize: '10px', color: '#888', marginLeft: 'auto' }}>New to DB</span>}
                    </div>
                ))}
            </div>
        )}
        <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
            <p>Active Profile: <strong style={{ color: '#66c0f4' }}>{steamId || "None Selected"}</strong></p>
            {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
            {linkedId && steamId !== linkedId && <button onClick={backToMyProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}
            <button onClick={fetchSteamProfile}>1. Load Profile</button>
            <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
            <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
            <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', marginLeft: '10px' }}>4. View Leaderboard</button>
        </div>
    </div>
  );

  const renderPlayStationCard = () => (
    <div className="card" style={{ padding: '20px', backgroundColor: '#003087', borderRadius: '10px', marginTop: '10px' }}>
        <h3 style={{ color: 'white' }}>PlayStation Integration</h3>
        {!psnAccountId ? (
            <div>
                <p style={{ fontSize: '11px', color: '#ccc' }}>Get your token from: <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" style={{ color: 'white' }}>Sony SSOCookie</a></p>
                <input type="text" placeholder="Paste npsso token here" value={npsso} onChange={e => setNpsso(e.target.value)} style={{ padding: '10px', width: '250px' }} />
                <button onClick={handleLinkPsn} style={{ marginLeft: '10px', backgroundColor: '#f5f5f5', color: '#003087' }}>Link PSN</button>
            </div>
        ) : (
            <div>
                <p style={{ color: 'white' }}>PSN Status: <strong style={{ color: 'lightgreen' }}>Connected</strong></p>
                <button onClick={syncPsnData} style={{ backgroundColor: '#2a475e', color: 'white' }}>Sync PSN Games</button>
            </div>
        )}
    </div>
  );

  const renderStatsHub = () => userStats && (
    <div className="stats-card" style={{ padding: '20px', backgroundColor: '#171a21', border: '1px solid #c7d5e0', borderRadius: '8px', minWidth: '250px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#c7d5e0' }}>Data Hub</h2>
        <h1 style={{ fontSize: '48px', margin: '0', color: '#66c0f4' }}>{userStats.completionRate}%</h1>
        <p style={{ margin: '0 0 20px 0', color: '#888' }}>Avg. Completion</p>
        <div style={{ display: 'flex', justifyContent: 'space-around', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '15px' }}>
            <div><h3 style={{ margin: '0', color: '#fff' }}>{userStats.unlocked}</h3><p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Unlocked</p></div>
            <div><h3 style={{ margin: '0', color: '#fff' }}>{userStats.total}</h3><p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Tracked</p></div>
        </div>
        <div><h3 style={{ margin: '0', color: '#fff' }}>{userStats.totalHours?.toLocaleString()}</h3><p style={{ margin: '0', fontSize: '12px', color: '#888' }}>Total Hours Played</p></div>
    </div>
  );

  return (
    <div className="App">
      <h1>🎮 Giga Game Dashboard</h1>
      <p style={{ color: 'lightgreen', fontWeight: 'bold', height: '20px' }}>{serverMessage}</p>

      {!isLoggedIn ? renderAuthView() : (
        <div>
          {renderDashboardHeader()}
          {renderSearchAndControl()}
          {renderPlayStationCard()}

          {/* Profile & Stats Display Section */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
              {profile && (
                <div className="profile-card" style={{ padding: '20px', border: '1px solid #66c0f4', borderRadius: '8px', minWidth: '250px' }}>
                  <img src={profile.avatarfull} alt="Avatar" style={{ borderRadius: '50%' }} />
                  <h2>{profile.personaname}</h2>
                  <p>Status: {profile.personastate === 1 ? "Online" : "Offline"}</p>
                </div>
              )}
              {renderStatsHub()}
          </div>

          {/* Game Library Grid Display */}
          {gamesLibrary.length > 0 && (
              <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                  {gamesLibrary.map(game => (
                      <div key={game._id || game.appid} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: game.platform === 'PSN' ? '#003087' : '#1b2838', color: 'white' }}>{game.platform || 'Steam'}</span>