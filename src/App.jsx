import { useState } from 'react'
import './App.css'

function App() {
  const [steamId, setSteamId] = useState('76561198035414121'); // Default test ID
  const [profile, setProfile] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchSteamProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/steam/profile/${steamId}`);
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile", err);
    }
  };

  return (
    <div className="App">
      <h1>🎮 Giga Game Dashboard</h1>
      
      <div className="card">
        <input 
          type="text" 
          value={steamId} 
          onChange={(e) => setSteamId(e.target.value)} 
          placeholder="Enter SteamID64"
        />
        <button onClick={fetchSteamProfile}>Fetch Steam Profile</button>
      </div>

      {profile && (
        <div className="profile-card">
          <img src={profile.avatarfull} alt="Avatar" />
          <h2>{profile.personaname}</h2>
          <p>Status: {profile.personastate === 1 ? "Online" : "Offline"}</p>
          <a href={profile.profileurl} target="_blank">View Steam Profile</a>
        </div>
      )}
    </div>
  )
}

export default App