import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [serverMessage, setServerMessage] = useState("Loading...");

  // We use VITE_API_URL so Render knows where to point, but defaults to localhost for testing
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/status`)
      .then(res => res.json())
      .then(data => setServerMessage(data.message))
      .catch(err => setServerMessage("Cannot connect to server."));
  }, []);

  return (
    <div className="App">
      <h1>🎮 The Giga Game Dashboard</h1>
      <div className="card">
        <h2>Backend Status:</h2>
        <p style={{ color: 'lightgreen', fontWeight: 'bold' }}>{serverMessage}</p>
      </div>
    </div>
  )
}

export default App