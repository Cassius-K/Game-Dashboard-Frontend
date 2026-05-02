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

  // 2. API Configuration
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // 3. Fetch Basic Profile Info (displays name and avatar)
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

  // 4. Sync Profile and Games to MongoDB
  const syncData = async () => {
    setServerMessage("Syncing with Steam... this may take a moment.");
    try {
      const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
      const data = await res.json();
      
      // Fixed: Handles both success messages and error messages
      alert(data.message || data.error || "Sync complete!");
      setServerMessage("Sync process finished.");
    } catch (err) {
      console.error("Sync error", err);
      setServerMessage("Sync failed.");
    }
  };

  // 5. Load Library from MongoDB
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

  // 6. Fetch specific achievements for a game
	const loadAchievements = async (appid, gameName) => {
      setServerMessage(`Fetching achievements for ${gameName}...`);
      setActiveGameName(gameName);
      setSelectedAchievements(null); // Clear previous achievements

      try {
          // 1. Sync from Steam to DB (Your existing backend route)
          await fetch(`${API_URL}/api/steam/achievements/${steamId}/${appid}`);
          
          // 2. Fetch the newly saved achievements FROM your DB
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

      {/* Control Panel */}
      <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
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
          <div className="games-grid" style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '15px', 
              marginTop: '30px', 
              justifyContent: 'center' 
          }}>
              {gamesLibrary.map(game => (
                  <div key={game.appid} className="game-card" style={{ 
                      border: '1px solid #555', 
                      padding: '15px', 
                      width: '220px', 
                      backgroundColor: '#171a21',
                      borderRadius: '5px'
                  }}>
                      {/* Note: Steam uses a specific URL pattern for game icons */}
                      <img 
                        src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`} 
                        alt={game.name} 
                        style={{ width: '64px', marginBottom: '10px' }} 
                      />
                      <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                      <p style={{ fontSize: '12px', color: '#888' }}>App ID: {game.appid}</p>
                      <button 
						onClick={() => loadAchievements(game.appid, game.name)}
						style={{ fontSize: '12px', padding: '5px 10px', marginTop: '10px' }}
						>
						View Achievements
					</button>
                  </div>
              ))}
          </div>
      )}
	  {/* NEW: Achievement Display Section */}
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
                            backgroundColor: ach.achieved ? '#2a475e' : '#171a21', // Lighter blue if unlocked
                            padding: '10px', 
                            borderRadius: '5px',
                            border: ach.achieved ? '1px solid #66c0f4' : '1px solid #333',
                            opacity: ach.achieved ? 1 : 0.6 // Dim out locked achievements
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
  )
}

export default App