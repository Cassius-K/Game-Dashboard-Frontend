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

  // 4. Steam & Search Functions
  const handleSearch = async () => {
    if (!searchQuery) return;
    setServerMessage("Searching...");
    setSearchResults([]);

    if (/^\d{17}$/.test(searchQuery)) {
        setSteamId(searchQuery);
        setServerMessage("ID selected.");
        return;
    }

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
    setServerMessage("Player selected.");
  };

  const fetchSteamProfile = async () => {
    if (!steamId) return alert("Please select a Steam ID first.");
    setServerMessage("Fetching profile...");
    try {
      const res = await fetch(`${API_URL}/api/steam/profile/${steamId}`);
      const data = await res.json();
      if (res.ok) { setProfile(data); setServerMessage("Profile loaded."); }
      else { alert(data.message); setServerMessage(""); }
    } catch (err) { setServerMessage("Error connecting to server."); }
  };

  const syncData = async () => {
    if (!steamId) return;
    setServerMessage(`Syncing Steam data...`);
    try {
      const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || data.error || "Sync complete!");
      setServerMessage("Sync process finished.");
    } catch (err) { setServerMessage("Sync failed."); }
  };

  const loadLibrary = async () => {
    if (!steamId && !psnAccountId) return alert("No linked ID found.");
    // For library view, we prefer Steam ID if searching, or PSN if linked
    const idToFetch = steamId || psnAccountId;

    setServerMessage("Loading games from database...");
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
        setServerMessage(`Loaded ${data.length} items.`);
    } catch (err) { setServerMessage("Failed to load library."); }
  };
  
  const loadLeaderboard = async () => {
    setServerMessage("Loading Leaderboard...");
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
      setServerMessage(`Loading achievements...`);
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
      } catch (err) { setServerMessage("Failed to load trophies."); }
  };

  const backToMyProfile = () => {
      setSteamId(linkedId);
      setSearchQuery(linkedId);
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
            <button onClick={handleLogin} style={{ margin: '5px' }}>Login</button>
            <button onClick={handleSignup} style={{ margin: '5px', backgroundColor: '#2a475e' }}>Sign Up</button>
          </div>
        </div>
      ) : (
        /* --- 2. MAIN DASHBOARD VIEW --- */
        <div>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px', marginBottom: '10px' }}>
              <span>User: <strong>{username}</strong> | Linked Steam: <strong>{linkedId || "None"}</strong></span>
              <button onClick={handleLogout} style={{ backgroundColor: '#cc3333', color: 'white' }}>Logout</button>
          </div>

          {/* Search Card */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', position: 'relative' }}>
                <h3>Player Tracker & Search</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Name or SteamID64" style={{ padding: '10px', width: '250px' }} />
                    <button onClick={handleSearch} style={{ backgroundColor: '#66c0f4', color: 'black' }}>Search</button>
                </div>

                {/* Dropdown Result List */}
                {searchResults.length > 0 && (
                    <div style={{ backgroundColor: '#171a21', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '200px', overflowY: 'auto' }}>
                        {searchResults.map(p => (
                            <div key={p.steamId || p.steamid} onClick={() => selectPlayer(p.steamId || p.steamid)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={p.avatar} alt="av" style={{ width: '25px' }} />
                                <span>{p.personaname}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                    <p>Active Profile: <strong style={{ color: '#66c0f4' }}>{steamId || "None"}</strong></p>
                    {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                    {linkedId && steamId !== linkedId && <button onClick={backToMyProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}
                    <button onClick={fetchSteamProfile}>1. Load Profile</button>
                    <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
                    <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
                    <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', marginLeft: '10px' }}>4. View Leaderboard</button>
                </div>
          </div>

          {/* PSN Card */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#003087', borderRadius: '10px', marginTop: '10px' }}>
                <h3 style={{ color: 'white' }}>PlayStation Integration</h3>
                {!psnAccountId ? (
                    <div>
                        <p style={{ fontSize: '11px', color: '#ccc' }}>Get token from <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" style={{ color: 'white' }}>Sony SSOCookie</a></p>
                        <input type="text" placeholder="Paste npsso here" value={npsso} onChange={e => setNpsso(e.target.value)} style={{ padding: '10px', width: '250px' }} />
                        <button onClick={handleLinkPsn} style={{ marginLeft: '10px', backgroundColor: '#f5f5f5', color: '#003087' }}>Link PSN</button>
                    </div>
                ) : (
                    <div>
                        <p style={{ color: 'white' }}>PSN Status: <strong style={{ color: 'lightgreen' }}>Connected</strong></p>
                        <button onClick={syncPsnData} style={{ backgroundColor: '#2a475e', color: 'white' }}>Sync PSN Games</button>
                    </div>
                )}
          </div>

          {/* Stats Hub */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
              {profile && (
                <div className="profile-card" style={{ padding: '20px', border: '1px solid #66c0f4', borderRadius: '8px', minWidth: '250px' }}>
                  <img src={profile.avatarfull} alt="Avatar" style={{ borderRadius: '50%' }} />
                  <h2>{profile.personaname}</h2>
                  <a href={profile.profileurl} target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>View Steam</a>
                </div>
              )}
              {userStats && (
                <div className="stats-card" style={{ padding: '20px', backgroundColor: '#171a21', border: '1px solid #c7d5e0', borderRadius: '8px', minWidth: '250px', textAlign: 'center' }}>
                    <h2 style={{ color: '#c7d5e0' }}>Data Hub</h2>
                    <h1 style={{ fontSize: '48px', margin: '0', color: '#66c0f4' }}>{userStats.completionRate}%</h1>
                    <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #333', marginTop: '10px', paddingTop: '10px' }}>
                        <div><strong>{userStats.unlocked}</strong><br/><small>Unlocked</small></div>
                        <div><strong>{userStats.total}</strong><br/><small>Tracked</small></div>
                    </div>
                    <div style={{ marginTop: '10px' }}><strong>{userStats.totalHours?.toLocaleString()}</strong> hrs played</div>
                </div>
              )}
          </div>

          {/* Library Grid */}
          <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
              {gamesLibrary.map(game => {
                  const isPsn = game.platform === 'PSN';
                  const steamImg = `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;
                  return (
                      <div key={game._id || game.appid} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: isPsn ? '#003087' : '#1b2838', color: 'white' }}>{game.platform || 'Steam'}</span>
                          <img src={isPsn ? game.img_icon_url : steamImg} alt="game" style={{ width: '64px', height: '64px', borderRadius: '5px' }} />
                          <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                          {!isPsn && <p style={{ fontSize: '13px', color: '#a3cf06' }}>{(game.playtime_forever / 60).toFixed(1)} hrs played</p>}
                          <button onClick={() => loadAchievements(game)} style={{ fontSize: '12px', marginTop: '10px' }}>View Trophies</button>
                      </div>
                  );
              })}
          </div>

          {/* Achievements Detail View */}
          {selectedAchievements && (
            <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
                <h2>🏆 Achievements: {activeGameName}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', marginTop: '20px' }}>
                    {selectedAchievements.map((ach, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#171a21', padding: '10px', opacity: ach.achieved ? 1 : 0.6, borderRadius: '5px' }}>
                            <img src={ach.iconUrl} alt="icon" style={{ width: '50px', height: '50px', marginRight: '15px' }} />
                            <div style={{ textAlign: 'left' }}>
                                <h4 style={{ margin: 0 }}>{ach.displayName}</h4>
                                <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>{ach.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* Global Community Leaderboard Table */}
          {leaderboard.length > 0 && (
            <div className="leaderboard-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#171a21', borderRadius: '10px', border: '1px solid #cca43b' }}>
                <h2 style={{ color: '#cca43b' }}>🌍 Global Leaderboard</h2>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ color: '#888' }}><th>Rank</th><th>User</th><th>Unlocked</th></tr></thead>
                    <tbody>
                        {leaderboard.map((user, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '10px' }}>#{index + 1}</td>
                                <td style={{ fontWeight: 'bold', color: '#66c0f4' }}>{user.username}</td>
                                <td>{user.unlockedCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;