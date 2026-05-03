import { useState } from 'react';

export default function SteamTab({ username, API_URL, setServerMessage, linkedId, setLinkedId }) {
    const [steamId, setSteamId] = useState(linkedId || ''); 
    const [searchQuery, setSearchQuery] = useState(linkedId || ''); 
    const [searchResults, setSearchResults] = useState([]); 
    const [wasSearchPerformed, setWasSearchPerformed] = useState(false);
    
    const [profile, setProfile] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [gamesLibrary, setGamesLibrary] = useState([]);
    const [selectedAchievements, setSelectedAchievements] = useState(null);
    const [activeGameName, setActiveGameName] = useState("");

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
            if (res.ok) setLinkedId(steamId);
        } catch (err) { setServerMessage("Failed to link account."); }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setServerMessage("Searching for players...");
        setSearchResults([]);
        setWasSearchPerformed(true);

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
        setServerMessage("Player selected. Click 'Load Profile' to continue.");
    };

    const fetchSteamProfile = async () => {
        if (!steamId) return alert("Please search or enter a Steam ID first.");
        setServerMessage("Fetching profile info...");
        try {
            const res = await fetch(`${API_URL}/api/steam/profile/${steamId}`);
            const data = await res.json();
            if (res.ok) {
                setProfile(data);
                setServerMessage("Profile loaded.");
            } else {
                alert(data.message);
                setServerMessage("");
            }
        } catch (err) { setServerMessage("Error connecting to server."); }
    };

    const syncData = async () => {
        if (!steamId) return;
        setServerMessage(`Syncing Steam data for ID: ${steamId}...`);
        try {
            const res = await fetch(`${API_URL}/api/steam/sync/${steamId}`, { method: 'POST' });
            const data = await res.json();
            alert(data.message || data.error);
            setServerMessage("Sync process finished.");
        } catch (err) { setServerMessage("Sync failed."); }
    };

    const loadLibrary = async () => {
        if (!steamId) return;
        setServerMessage("Loading library and stats...");
        try {
            const res = await fetch(`${API_URL}/api/games/${steamId}`);
            const data = await res.json();
            setGamesLibrary(data);

            const statsRes = await fetch(`${API_URL}/api/stats/${steamId}`);
            const statsData = await statsRes.json();
            const playtimeRes = await fetch(`${API_URL}/api/stats/playtime/${steamId}`);
            const playtimeData = await playtimeRes.json();
            setUserStats({ ...statsData, ...playtimeData });

            setServerMessage(`Loaded ${data.length} games.`);
        } catch (err) { setServerMessage("Failed to load data."); }
    };

    const loadAchievements = async (game) => {
        const gameId = game.appid || game.platformGameId;
        
        if (!gameId) {
            return alert("Cannot load achievements: Game ID is missing from the database.");
        }

        setServerMessage(`Fetching Steam achievements for ${game.name}...`);
        setActiveGameName(game.name);
        setSelectedAchievements(null);
        
        try {
            // 1. Tell the backend to ask Steam for the stats
            const syncRes = await fetch(`${API_URL}/api/steam/achievements/${steamId}/${gameId}`);
            
            if (!syncRes.ok) {
                throw new Error(`Server returned ${syncRes.status}`);
            }

            const syncData = await syncRes.json();
            
            if (syncData.error) {
                 alert(`Steam Error: ${syncData.error}`);
                 setServerMessage("");
                 return;
            }

            // NEW: If the backend hit a privacy wall, alert the user!
            if (syncData.isPrivate) {
                 alert("This player's Game Details are set to Private or Friends Only on Steam. We can only display the locked trophy list.");
            }

            // 2. Fetch the newly saved stats from our MongoDB
            const dbRes = await fetch(`${API_URL}/api/achievements/${steamId}/${gameId}`);
            const dbData = await dbRes.json();
            
            setSelectedAchievements(dbData);
            setServerMessage("");
        } catch (err) { 
            console.error("Achievement error:", err);
            alert("Failed to load achievements. The game may not support trophies.");
            setServerMessage("Failed to fetch achievements."); 
        }
    };

    return (
        <div>
            <div className="card" style={{ padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
                <h3 style={{ margin: '0 0 5px 0' }}>Player Tracker & Search</h3>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>Search by name, or enter a <strong>SteamID64</strong> or <strong>Custom URL</strong>.</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. GabeNewell" style={{ padding: '10px', width: '250px' }} />
                    <button onClick={handleSearch} style={{ backgroundColor: '#66c0f4', color: 'black' }}>Search</button>
                </div>

                {searchResults.length > 0 && (
                    <div style={{ backgroundColor: '#171a21', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                        {searchResults.map(player => (
                            <div key={player.steamId || player.steamid} onClick={() => selectPlayer(player.steamId || player.steamid)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img src={player.avatar} alt="av" style={{ width: '25px', borderRadius: '3px' }} />
                                <span>{player.personaname}</span>
                                {player.isNew && <span style={{ fontSize: '10px', color: '#888', marginLeft: 'auto', backgroundColor: '#333', padding: '2px 5px', borderRadius: '3px' }}>New to DB</span>}
                            </div>
                        ))}
                    </div>
                )}
                
                {wasSearchPerformed && searchResults.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#ccc', marginTop: '10px', padding: '10px', backgroundColor: '#171a21', borderRadius: '5px' }}>
                        <p style={{ margin: 0 }}>**No results found.** The Steam API doesn't support partial name searches.</p>
                    </div>
                )}

                <div style={{ marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                    <p>Active Profile: <strong style={{ color: '#66c0f4' }}>{steamId || "None Selected"}</strong></p>
                    
                    {!linkedId && steamId && <button onClick={handleLinkSteam} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                    {linkedId && steamId !== linkedId && <button onClick={() => { setSteamId(linkedId); setSearchQuery(linkedId); }} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                    <button onClick={fetchSteamProfile}>1. Load Profile</button>
                    <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px' }}>2. Sync to DB</button>
                    <button onClick={loadLibrary} style={{ backgroundColor: '#107c10', marginLeft: '10px' }}>3. View Library</button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                {profile && (
                    <div className="profile-card" style={{ padding: '20px', border: '1px solid #66c0f4', borderRadius: '8px', minWidth: '250px' }}>
                        <img src={profile.avatarfull} alt="Avatar" style={{ borderRadius: '50%' }} />
                        <h2>{profile.personaname}</h2>
						<h3 style={{ color: '#cca43b', margin: '5px 0' }}>Level {profile.steamLevel}</h3>
                        <p>Status: {profile.personastate === 1 ? "Online" : "Offline"}</p>
                    </div>
                )}
                {userStats && (
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
                )}
            </div>

            {gamesLibrary.length > 0 && (
                <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                    {gamesLibrary.map(game => (
                        <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: '#1b2838', color: 'white' }}>Steam</span>
                            <img 
								src={`https://steamcdn-a.akamaihd.net/steam/apps/${game.appid || game.platformGameId}/header.jpg`} 
								alt={game.name} 
								// If the high-res image fails to load (some very old games don't have one), fallback to the low-res icon
								onError={(e) => { e.target.onerror = null; e.target.src = `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid || game.platformGameId}/${game.img_icon_url}.jpg`; }}
								style={{ 
									width: '100%', 
									height: 'auto', 
									aspectRatio: '460/215', 
									objectFit: 'cover',
									marginBottom: '10px', 
									borderRadius: '5px' 
								}} 
							/>
                            <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px' }}>{game.name}</p>
                            <p style={{ fontSize: '13px', color: '#a3cf06', margin: '5px 0', fontWeight: 'bold' }}>{(game.playtime_forever / 60).toFixed(1)} hrs played</p>
                            <button onClick={() => loadAchievements(game)} style={{ fontSize: '12px', padding: '5px 10px', marginTop: '10px' }}>View Achievements</button>
                        </div>
                    ))}
                </div>
            )}

            {selectedAchievements && (
                <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
                    <h2>🏆 Achievements for {activeGameName}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
                        {selectedAchievements.map((ach, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: ach.achieved ? '#2a475e' : '#171a21', padding: '10px', borderRadius: '5px', border: ach.achieved ? '1px solid #66c0f4' : '1px solid #333', opacity: ach.achieved ? 1 : 0.6 }}>
                                <img src={ach.iconUrl} alt={ach.apiname} style={{ width: '50px', height: '50px', marginRight: '15px', borderRadius: '5px' }} />
                                <div style={{ textAlign: 'left', color: 'white' }}>
									<h4 style={{ margin: '0 0 5px 0' }}>
                                        {ach.displayName}
                                        {/* NEW: Display the Value Badge */}
                                        {ach.value && (
                                            <span style={{ fontSize: '10px', backgroundColor: '#333', padding: '2px 6px', borderRadius: '4px', marginLeft: '10px', color: '#cca43b', verticalAlign: 'middle' }}>
                                                {ach.value}
                                            </span>
                                        )}
                                    </h4>
									<p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>{ach.description}</p>
									{/* NEW: Show the Unlock Date if Achieved */}
									{ach.achieved === 1 && ach.unlocktime > 0 && (
										<p style={{ margin: '5px 0 0 0', fontSize: '10px', color: '#a3cf06' }}>
											Unlocked: {new Date(ach.unlocktime * 1000).toLocaleDateString()}
										</p>
									)}
								</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}