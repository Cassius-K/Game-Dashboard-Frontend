import { useState, useEffect, useRef } from 'react'; // NEW: Add useEffect and useRef
import SteamTab from './components/SteamTab';
import PlayStationTab from './components/PlayStationTab';
import XboxTab from './components/XboxTab';
import HomeTab from './components/HomeTab';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('Home'); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  
  // These pass the user's primary IDs down to the tabs when they log in
  const [linkedSteamId, setLinkedSteamId] = useState('');
  const [linkedPsnId, setLinkedPsnId] = useState('');
  const [linkedXboxId, setLinkedXboxId] = useState('');
  
  // NEW: Hydration state lives here, at the top level of the app
  const [hydrationStatus, setHydrationStatus] = useState("");
  const isHydrating = useRef(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
        setIsLoggedIn(true);
        setUsername(data.username);
        
        // Load linked accounts on login so the tabs know who the user is
        if (data.linkedSteamId) setLinkedSteamId(data.linkedSteamId);
        if (data.psnAccountId) setLinkedPsnId(data.psnAccountId);
        if (data.linkedXboxXuid) setLinkedXboxId(data.linkedXboxXuid);
        
        setServerMessage(`Welcome, ${data.username}!`);
      } else { 
          alert(data.message); 
          setServerMessage(""); 
      }
    } catch (err) { setServerMessage("Login failed."); }
  };

  const handleLogout = () => window.location.reload();

  // --- NEW: Hydration Queue Logic (lives in App.jsx so it doesn't stop on tab switch) ---
  const startHydration = async () => {
    // If a job is already running, or the user isn't logged in, do nothing.
    if (isHydrating.current || !username) return;

    setHydrationStatus("Checking for games to hydrate...");
    try {
        const libRes = await fetch(`${API_URL}/api/library/all/${username}`);
        const libData = await libRes.json();
        
        // Find games that need their completion % calculated
        const gamesToHydrate = libData.filter(g => 
            (g.completionRate === 0 || g.completionRate === undefined) && g.platform !== 'Xbox'
        );
        
        if (gamesToHydrate.length > 0) {
            isHydrating.current = true;
            hydrateQueue(gamesToHydrate);
        } else {
            setHydrationStatus("All games are up to date!");
            setTimeout(() => setHydrationStatus(""), 5000); // Clear message after 5 seconds
        }
    } catch (err) {
        console.error("Failed to start hydration:", err);
        setHydrationStatus("Error starting hydration process.");
    }
  };

  const hydrateQueue = async (queue) => {
    for (let i = 0; i < queue.length; i++) {
        const game = queue[i];
        setHydrationStatus(`Hydrating... (${i + 1}/${queue.length}) ${game.name}`);

        try {
            await fetch(`${API_URL}/api/hydrate/game-completion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, game })
            });
            // Wait 1.5 seconds between requests to be polite to the APIs
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (err) {
            console.error(`Failed to hydrate ${game.name}:`, err);
        }
    }
    setHydrationStatus("Hydration complete! Click 'Refresh' on the Home tab to see updated stats.");
    isHydrating.current = false;
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

  return (
    <div className="App">
      <header style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1>🎮 Giga Game Dashboard</h1>
        {{/* NEW: Global Hydration Status Bar (Styled) */}
        <p style={{ 
            color: '#66c0f4', // A nice light blue
            fontStyle: 'italic', 
            fontWeight: 'bold',
            height: '20px', 
            marginTop: '10px', // Adds space above
            marginBottom: '10px' // Adds space below
        }}>
            {hydrationStatus}
        </p>
        <p style={{ color: 'lightblue', fontWeight: 'bold', height: '20px' }}>{serverMessage}</p>
      </header>

      {!isLoggedIn ? (
        <div className="card" style={{ width: '320px', margin: '0 auto', padding: '30px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
          <h2>Account Access</h2>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ display: 'block', margin: '15px auto', padding: '10px', width: '90%' }} />
          <div style={{ marginTop: '20px' }}>
            <button onClick={handleLogin} style={{ margin: '5px', padding: '10px 20px' }}>Login</button>
            <button onClick={handleSignup} style={{ margin: '5px', padding: '10px 20px', backgroundColor: '#2a475e' }}>Sign Up</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px', marginBottom: '20px' }}>
              <span>User: <strong>{username}</strong></span>
              <button onClick={handleLogout} style={{ backgroundColor: '#cc3333', color: 'white', padding: '5px 15px' }}>Logout</button>
          </div>

          {/* --- PLATFORM SWITCHER TABS --- */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {/* NEW: Central Hub Button */}
              <button onClick={() => setActiveTab('Home')} style={{ backgroundColor: activeTab === 'Home' ? '#cca43b' : '#333', color: activeTab === 'Home' ? 'black' : 'white', padding: '10px 30px', fontWeight: 'bold' }}>Central Hub</button>
              <button onClick={() => setActiveTab('Steam')} style={{ backgroundColor: activeTab === 'Steam' ? '#66c0f4' : '#333', color: activeTab === 'Steam' ? 'black' : 'white', padding: '10px 30px', fontWeight: 'bold' }}>Steam View</button>
              <button onClick={() => setActiveTab('PSN')} style={{ backgroundColor: activeTab === 'PSN' ? '#003087' : '#333', color: 'white', padding: '10px 30px', fontWeight: 'bold' }}>PlayStation View</button>
              <button onClick={() => setActiveTab('Xbox')} style={{ backgroundColor: activeTab === 'Xbox' ? '#107c10' : '#333', color: 'white', padding: '10px 30px', fontWeight: 'bold' }}>Xbox View</button>
          </div>

          {/* --- TAB ROUTING --- */}
          {/* NEW: Mount the Home Component and pass down hydration props */}
          {activeTab === 'Home' && (
              <HomeTab 
                username={username} 
                API_URL={API_URL} 
                linkedSteamId={linkedSteamId} 
                linkedPsnId={linkedPsnId} 
                linkedXboxId={linkedXboxId} 
                startHydration={startHydration} // Pass down the function
                hydrationStatus={hydrationStatus} // Pass down the status message
              />
          )}

          {activeTab === 'Steam' && (
              <SteamTab username={username} API_URL={API_URL} setServerMessage={setServerMessage} linkedId={linkedSteamId} setLinkedId={setLinkedSteamId} />
          )}

          {activeTab === 'PSN' && (
              <PlayStationTab username={username} API_URL={API_URL} setServerMessage={setServerMessage} initialAccountId={linkedPsnId} />
          )}

          {activeTab === 'Xbox' && (
              <XboxTab username={username} API_URL={API_URL} setServerMessage={setServerMessage} linkedId={linkedXboxId} setLinkedId={setLinkedXboxId} />
          )}

          {/* Global Leaderboard Footer */}
          <div style={{ textAlign: 'center', marginTop: '60px', borderTop: '2px solid #333', paddingTop: '20px' }}>
              <button onClick={loadLeaderboard} style={{ backgroundColor: '#6600cc', padding: '10px 20px', fontSize: '16px' }}>Load Global Leaderboard</button>
              {leaderboard.length > 0 && (
                <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#171a21', borderRadius: '10px', border: '1px solid #cca43b' }}>
                    <h2 style={{ color: '#cca43b' }}>🌍 Global Leaderboard</h2>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #555', color: '#888' }}>
                                <th style={{ padding: '10px' }}>Rank</th>
                                <th style={{ padding: '10px' }}>Giga Username</th>
                                <th style={{ padding: '10px' }}>Unlocked Trophies</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((u, index) => (
                                <tr key={u.username} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '15px 10px', fontSize: index < 3 ? '24px' : '16px' }}>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</td>
                                    <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#66c0f4' }}>{u.username}</td>
                                    <td style={{ padding: '15px 10px', color: '#fff' }}>{u.unlockedCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App;