import { useState, useEffect } from 'react';

export default function PlayStationTab({ username, API_URL, setServerMessage, initialAccountId }) {
    const [npsso, setNpsso] = useState('');
    const [isLinked, setIsLinked] = useState(!!initialAccountId); 
    
    const [psnAccountId, setPsnAccountId] = useState(initialAccountId || '');
    const [activePsnOnlineId, setActivePsnOnlineId] = useState(initialAccountId ? "My Account" : "");
    const [psnSearchQuery, setPsnSearchQuery] = useState('');
    const [psnSearchResults, setPsnSearchResults] = useState([]);
    const [psnProfile, setPsnProfile] = useState(null);
    const [psnStats, setPsnStats] = useState(null);
    const [gamesLibrary, setGamesLibrary] = useState([]);
    const [selectedAchievements, setSelectedAchievements] = useState(null);
    const [activeGameName, setActiveGameName] = useState("");

    useEffect(() => {
        if (initialAccountId) {
            setIsLinked(true);
            setPsnAccountId(initialAccountId);
            setActivePsnOnlineId("My Account");
        }
    }, [initialAccountId]);

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
                setIsLinked(true); 
                setPsnAccountId(data.accountId);
                // We now use the real onlineId returned by the backend
                setActivePsnOnlineId(data.onlineId || "me"); 
                alert(`PSN Linked successfully as ${data.onlineId}!`);
            } else {
                alert(data.message);
            }
            setServerMessage("");
        } catch (err) { setServerMessage("Failed to link PSN."); }
    };
    const handlePsnSearch = async () => {
        if (!psnSearchQuery) return;
        setServerMessage("Searching PSN...");
        try {
            const res = await fetch(`${API_URL}/api/search/psn/${username}/${psnSearchQuery}`);
            const data = await res.json();
            setPsnSearchResults(data);
            if (data.length === 0) setServerMessage("No players found.");
            else setServerMessage(`Found ${data.length} matches.`);
        } catch (err) { setServerMessage("Search failed."); }
    };

    const selectPsnPlayer = (player) => {
        setActivePsnOnlineId(player.onlineId);
        setPsnAccountId(player.accountId);
        setPsnSearchResults([]);
        setServerMessage("Player selected. Click '1. Load Profile'.");
    };

    const fetchPsnProfile = async () => {
        if (!activePsnOnlineId) return alert("Please select an ID.");
        
        setServerMessage(`Fetching PSN profile for ${activePsnOnlineId}...`);
        try {
            const res = await fetch(`${API_URL}/api/psn/profile/${username}/${activePsnOnlineId}`);
            const data = await res.json();
            
            if (!res.ok || data.error) {
                alert(data.message || data.error || "Profile not found.");
                setServerMessage("");
                return;
            }

            const statsRes = await fetch(`${API_URL}/api/psn/trophy-summary/${username}/${data.accountId}`);
            const statsData = await statsRes.json();

            setPsnProfile(data);
            setPsnStats(statsData);
            setServerMessage("PSN Profile loaded.");
        } catch (err) { setServerMessage("Error fetching PSN profile."); }
    };

    const syncPsnData = async () => {
        let targetId = psnAccountId === "Linked" ? "me" : psnAccountId;
        setServerMessage("Syncing PlayStation games (this takes a moment)...");
        try {
            const res = await fetch(`${API_URL}/api/psn/sync/${username}/${targetId}`, { method: 'POST' });
            const data = await res.json();
            alert(data.message || data.error);
            setServerMessage("");
        } catch (err) { setServerMessage("Sync failed."); }
    };

    const loadLibrary = async () => {
        setServerMessage("Loading PSN Library...");
        const fetchId = psnAccountId === "Linked" ? username : psnAccountId; 
        try {
            const res = await fetch(`${API_URL}/api/games/${fetchId}`);
            const data = await res.json();
            setGamesLibrary(data);
            setServerMessage("Library Loaded.");
        } catch (err) { setServerMessage("Failed to load library."); }
    };

  const loadAchievements = async (game) => {
      // 1. Strictly determine the ID and Platform
      // If it's a PSN game, we MUST use platformGameId (the NPWR string)
      const isPSN = game.platform === 'PSN';
      const gameId = isPSN ? game.platformGameId : (game.appid || game.platformGameId);
      const platform = game.platform || 'Steam'; 
      
      // Safety Check: If we somehow don't have an ID, stop immediately
      if (!gameId) {
          return alert("Cannot load achievements: Game ID is missing from the database.");
      }

      setServerMessage(`Fetching ${platform} achievements for ${game.name}...`);
      setActiveGameName(game.name);
      setSelectedAchievements(null);

      try {
          let dbData;
          if (isPSN) {
              // Call the PlayStation achievement route
              // We pass 'username' (the auth owner) and 'gameId' (the NPWR string)
              const res = await fetch(`${API_URL}/api/psn/achievements/${username}/${gameId}`);
              
              // Handle server crashes gracefully
              if (!res.ok) {
                  const errorText = await res.text();
                  console.error("Server returned an error:", errorText);
                  throw new Error(`Server returned ${res.status}`);
              }
              dbData = await res.json();
              
              // Handle the specific case where Sony says the game has no trophies
              if (dbData.error) {
                  alert(`Sony API Error: ${dbData.error}`);
                  setServerMessage("");
                  return;
              }
          } else {
              // Call Steam routes
              await fetch(`${API_URL}/api/steam/achievements/${steamId}/${gameId}`);
              const dbRes = await fetch(`${API_URL}/api/achievements/${steamId}/${gameId}`);
              dbData = await dbRes.json();
          }
          
          setSelectedAchievements(dbData);
          setServerMessage("");
      } catch (err) {
          console.error("Achievement error:", err);
          alert("Failed to load trophies for this game. It may not support trophies, or the API rejected the request.");
          setServerMessage("Failed to fetch achievements.");
      }
  };

    return (
        <div>
            <div className="card" style={{ padding: '20px', backgroundColor: '#001a4d', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
                {!isLinked ? (
                    <div>
                        <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>PlayStation Account Setup</h3>
                        <p style={{ fontSize: '12px', color: '#ccc', marginBottom: '15px' }}>
                            To use PlayStation features, you must provide an active <strong>npsso</strong> token.<br/>
                            <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" style={{ color: '#66c0f4' }}>Click here to get yours.</a>
                        </p>
                        <input type="text" placeholder="Paste 64-character token here" value={npsso} onChange={e => setNpsso(e.target.value)} style={{ padding: '10px', width: '300px' }} />
                        <button onClick={handleLinkPsn} style={{ marginLeft: '10px', backgroundColor: '#f5f5f5', color: '#003087' }}>Authenticate with Sony</button>
                    </div>
                ) : (
                    <div>
                        <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>PlayStation Tracker & Search</h3>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                            <input type="text" value={psnSearchQuery} onChange={(e) => setPsnSearchQuery(e.target.value)} placeholder="e.g. xX_Sniper_Xx" style={{ padding: '10px', width: '250px' }} />
                            <button onClick={handlePsnSearch} style={{ backgroundColor: '#f5f5f5', color: '#003087' }}>Search PSN</button>
                        </div>
                        {psnSearchResults.length > 0 && (
                            <div style={{ backgroundColor: '#002266', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                                {psnSearchResults.map(player => (
                                    <div key={player.accountId} onClick={() => selectPsnPlayer(player)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                                        <img src={player.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                                        <span>{player.onlineId}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                            <p style={{ color: 'white' }}>Active PSN Profile: <strong style={{ color: '#66c0f4' }}>{activePsnOnlineId || "None Selected"}</strong></p>
                            <button onClick={fetchPsnProfile} style={{ backgroundColor: '#f5f5f5', color: '#003087' }}>1. Load Profile</button>
                            <button onClick={syncPsnData} style={{ backgroundColor: '#2a475e', color: 'white', marginLeft: '10px' }}>2. Sync to DB</button>
                            <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', color: 'white', marginLeft: '10px' }}>3. View Library</button>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                {psnProfile && !psnProfile.error && (
                    <div className="profile-card" style={{ padding: '20px', border: '1px solid #003087', borderRadius: '8px', minWidth: '250px', backgroundColor: '#001a4d', color: 'white' }}>
                        <img src={psnProfile.avatar} alt="Avatar" style={{ borderRadius: '50%', width: '100px' }} />
                        <h2>{psnProfile.onlineId}</h2>
                        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#ccc' }}>"{psnProfile.aboutMe}"</p>
                    </div>
                )}
                {/* --- CRASH FIX APPLIED HERE: Added optional chaining (?.) --- */}
                {psnStats && !psnStats.error && (
                    <div className="stats-card" style={{ padding: '20px', backgroundColor: '#002266', border: '1px solid #003087', borderRadius: '8px', minWidth: '250px', textAlign: 'center', color: 'white' }}>
                        <h2 style={{ margin: '0 0 15px 0', color: '#ccc' }}>Trophy Hub</h2>
                        <h1 style={{ fontSize: '48px', margin: '0', color: '#f5f5f5' }}>Lv. {psnStats.level}</h1>
                        <p style={{ margin: '0 0 20px 0', color: '#888' }}>{psnStats.progress}% to next level</p>
                        <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #333', paddingTop: '15px' }}>
                            <div><strong style={{ color: '#b9a3e3' }}>{psnStats.earned?.platinum || 0}</strong><br/><small>Platinum</small></div>
                            <div><strong style={{ color: '#e6c300' }}>{psnStats.earned?.gold || 0}</strong><br/><small>Gold</small></div>
                            <div><strong style={{ color: '#a6a6a6' }}>{psnStats.earned?.silver || 0}</strong><br/><small>Silver</small></div>
                            <div><strong style={{ color: '#cd7f32' }}>{psnStats.earned?.bronze || 0}</strong><br/><small>Bronze</small></div>
                        </div>
                    </div>
                )}
            </div>

            {gamesLibrary.length > 0 && (
                <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                    {gamesLibrary.map(game => (
                        <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: '#003087', color: 'white' }}>PSN</span>
                            <img src={game.img_icon_url} alt={game.name} style={{ width: '64px', height: '64px', marginBottom: '10px', borderRadius: '5px' }} />
                            <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px', color: 'white' }}>{game.name}</p>
                            <p style={{ fontSize: '12px', color: '#888' }}>ID: {game.platformGameId}</p>
                            <button onClick={() => loadAchievements(game)} style={{ fontSize: '12px', padding: '5px 10px', marginTop: '10px' }}>View Trophies</button>
                        </div>
                    ))}
                </div>
            )}

            {selectedAchievements && (
                <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
                    <h2 style={{ color: 'white' }}>🏆 Trophies for {activeGameName}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
                        {selectedAchievements.map((ach, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: ach.achieved ? '#003087' : '#171a21', padding: '10px', borderRadius: '5px', border: ach.achieved ? '1px solid #66c0f4' : '1px solid #333', opacity: ach.achieved ? 1 : 0.6 }}>
                                <img src={ach.iconUrl} alt={ach.apiname} style={{ width: '50px', height: '50px', marginRight: '15px', borderRadius: '5px' }} />
                                <div style={{ textAlign: 'left', color: 'white' }}>
                                    <h4 style={{ margin: '0 0 5px 0' }}>{ach.displayName}</h4>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#aaa' }}>{ach.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}