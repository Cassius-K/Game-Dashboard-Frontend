import { useState } from 'react';
import SteamTab from './components/SteamTab';
import PlayStationTab from './components/PlayStationTab';
import XboxTab from './components/XboxTab'; // NEW: Import the Xbox component
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('Steam'); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  
  // These pass the user's primary IDs down to the tabs when they log in
  const [linkedSteamId, setLinkedSteamId] = useState('');
  const [linkedPsnId, setLinkedPsnId] = useState('');
  const [linkedXboxId, setLinkedXboxId] = useState(''); // NEW: Track the Xbox ID
  
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
        if (data.linkedXboxXuid) setLinkedXboxId(data.linkedXboxXuid); // NEW: Load Xbox ID
        
        setServerMessage(`Welcome, ${data.username}!`);
      } else { 
          alert(data.message); 
          setServerMessage(""); 
      }
    } catch (err) { setServerMessage("Login failed."); }
  };

  const handleLogout = () => window.location.reload();

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
        <p style={{ color: 'lightgreen', fontWeight: 'bold' }}>{serverMessage}</p>
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
              <button onClick={() => setActiveTab('Steam')} style={{ backgroundColor: activeTab === 'Steam' ? '#66c0f4' : '#333', color: activeTab === 'Steam' ? 'black' : 'white', padding: '10px 30px', fontWeight: 'bold' }}>Steam View</button>
              <button onClick={() => setActiveTab('PSN')} style={{ backgroundColor: activeTab === 'PSN' ? '#003087' : '#333', color: 'white', padding: '10px 30px', fontWeight: 'bold' }}>PlayStation View</button>
              {/* NEW: Xbox Tab Button */}
              <button onClick={() => setActiveTab('Xbox')} style={{ backgroundColor: activeTab === 'Xbox' ? '#107c10' : '#333', color: 'white', padding: '10px 30px', fontWeight: 'bold' }}>Xbox View</button>
          </div>

          {/* --- TAB ROUTING --- */}
          {activeTab === 'Steam' && (
              <SteamTab username={username} API_URL={API_URL} setServerMessage={setServerMessage} linkedId={linkedSteamId} setLinkedId={setLinkedSteamId} />
          )}

          {activeTab === 'PSN' && (
              <PlayStationTab username={username} API_URL={API_URL} setServerMessage={setServerMessage} initialAccountId={linkedPsnId} />
          )}

          {/* NEW: Mount the Xbox Component when active */}
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