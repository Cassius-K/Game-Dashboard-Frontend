import { useState } from 'react'
import './App.css'

function App() {
  // 1. State Management
  const [steamId, setSteamId] = useState('76561198035414121'); // Default test ID
  const [profile, setProfile] = useState(null);
  const [serverMessage, setServerMessage] = useState("");
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [selectedAchievements, setSelectedAchievements] = useState(null);
  const [activeGameName, setActiveGameName] = useState("");
  
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
        setServerMessage(`Welcome back, ${data.username}!`);
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
    setSelectedAchievements(null);
    setServerMessage("Logged out.");
  };

  // 4. Steam Dashboard Functions
  const fetchSteamProfile = async () => {
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
    setServerMessage("Syncing with Steam... this may take a moment.");
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
    setServerMessage("Loading games from database...");
    try {
        const res = await fetch(`${API_URL}/api/games/${steamId}`);
        const data = await res.json();
        setGamesLibrary(data);
        setServerMessage(`Loaded ${data.length} games.`);
    } catch (err) {
        setServerMessage("Failed to load games from database.");
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

  return (
    <div className="App">
      <h1>🎮 Giga Game Dashboard</h1>
      
      {/* Feedback Message Area */}
      <p style={{ color: 'lightgreen', fontWeight: 'bold', height: '20px' }}>{serverMessage}</p>

      {/* --- LOGIC GATE: LOGIN OR DASHBOARD --- */}
      {!isLoggedIn ? (
        /* LOGIN / SIGNUP VIEW */
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
        /* MAIN DASHBOARD VIEW */
        <div>
          <button onClick={handleLogout} style={{ float: 'right', backgroundColor: '#cc3333', color: 'white', padding: '5px 15px' }}>Logout</button>
          <div style={{ clear: 'both' }}></div>

          {/* Control Panel */}
          <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', marginTop: '20px' }}>
            <input 
              type="text" 
              value={steamId} 
              onChange={(e) => setSteamId(e.target.value)} 
              placeholder="Enter SteamID64"
              style={{ padding: '10px', width: '250px' }}
            />
            <div style={{ marginTop: '15px' }}>
                <button onClick={fetchSteamProfile}>1. Fetch Profile</button>
                <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
                <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
            </div>
          </div>

          {/* Profile Display Section */}
          {profile && (
            <div className="profile-card" style={{ marginTop: '20px', padding: '20px', border: '1px solid #66c0f4', borderRadius: '8px' }}>
              <img src={profile.avatarfull} alt="Avatar" style={{ borderRadius: '50%' }} />
              <h2>{profile.personaname}</h2>
              <p>Status: {profile.personastate === 1 ? "Online" : "Offline"}</p>
              <a href={profile.profileurl} target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>View External Steam Profile</a>
            </div>
          )}

          {/* Games Library Grid Display */}
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

          {/* Achievement Display Section */}
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
        </div>
      )}
    </div>
  )
}

export default App