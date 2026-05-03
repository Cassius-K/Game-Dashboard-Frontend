import { useState, useEffect } from 'react';

export default function XboxTab({ username, API_URL, setServerMessage, linkedId, setLinkedId }) {
    const [xboxXuid, setXboxXuid] = useState(linkedId || ''); 
    const [searchQuery, setSearchQuery] = useState(''); 
    
    // UI State for Search
    const [searchResults, setSearchResults] = useState([]); 
    const [wasSearchPerformed, setWasSearchPerformed] = useState(false);
    
    const [profile, setProfile] = useState(null);
    const [gamesLibrary, setGamesLibrary] = useState([]);
    const [selectedAchievements, setSelectedAchievements] = useState(null);
    const [activeGameName, setActiveGameName] = useState("");
    const [achievementError, setAchievementError] = useState(null); // NEW: State to track API limitation errors

    useEffect(() => {
        if (linkedId) {
            setXboxXuid(linkedId);
            // If they have a linked account, we shouldn't necessarily overwrite the search box, 
            // but we ensure the active XUID is set.
        }
    }, [linkedId]);

    const handleLinkXbox = async () => {
        if (!xboxXuid) return alert("Please search and select a Gamertag first to link.");
        setServerMessage("Linking Xbox account...");
        try {
            const res = await fetch(`${API_URL}/api/auth/link-xbox`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // We send the current search query (the name) to the backend
                body: JSON.stringify({ username, gamertag: searchQuery })
            });
            const data = await res.json();
            if (res.ok) {
                setLinkedId(data.xuid);
                setXboxXuid(data.xuid);
                alert("Account successfully linked!");
            } else {
                alert(data.message);
            }
            setServerMessage("");
        } catch (err) { setServerMessage("Failed to link Xbox account."); }
    };

    // --- Advanced Search Logic ---
    const handleSearch = async () => {
        if (!searchQuery) return;
        setServerMessage("Searching Xbox Network...");
        setSearchResults([]);
        setWasSearchPerformed(true);

        try {
            const res = await fetch(`${API_URL}/api/search/xbox/${searchQuery}`);
            const data = await res.json();
            
            if (res.ok) {
                setSearchResults(data);
                if (data.length === 0) setServerMessage("No players found.");
                else setServerMessage(`Found ${data.length} matches. Please select one.`);
            } else {
                alert(data.error || "Search failed.");
                setServerMessage("");
            }
        } catch (err) { setServerMessage("Search failed due to network error."); }
    };

    // --- Selection Logic ---
    const selectPlayer = (player) => {
        setXboxXuid(player.xuid);          // Set the internal ID for API calls
        setSearchQuery(player.gamertag);     // Put their name in the search box
        setSearchResults([]);                // Close the dropdown
        setServerMessage("Player selected. Click '1. Load Profile' to view their stats.");
    };

    const fetchProfile = async () => {
        if (!xboxXuid) return alert("Please search and select a player from the list first.");
        setServerMessage("Fetching Xbox profile...");
        try {
            const res = await fetch(`${API_URL}/api/xbox/profile/${xboxXuid}`);
            const data = await res.json();
            if (!res.ok || data.error) return alert(data.error || "Profile not found.");
            setProfile(data);
            setServerMessage("Profile loaded.");
        } catch (err) { setServerMessage("Error fetching profile."); }
    };

    const syncData = async () => {
        if (!xboxXuid) return alert("Please select an account first.");
        setServerMessage(`Syncing Xbox games (This may take a moment)...`);
        try {
            const res = await fetch(`${API_URL}/api/xbox/sync/${xboxXuid}`, { method: 'POST' });
            const data = await res.json();
            alert(data.message || data.error);
            setServerMessage("Sync process finished.");
        } catch (err) { setServerMessage("Sync failed."); }
    };

    const loadLibrary = async () => {
        if (!xboxXuid) return alert("Please select an account first.");
        setServerMessage("Loading Xbox Library...");
        try {
            const res = await fetch(`${API_URL}/api/games/${xboxXuid}`);
            const data = await res.json();
            setGamesLibrary(data);
            setServerMessage(`Loaded ${data.length} games.`);
        } catch (err) { setServerMessage("Failed to load library."); }
    };

    const loadAchievements = async (game) => {
        setServerMessage(`Fetching achievements for ${game.name}...`);
        setActiveGameName(game.name);
        setSelectedAchievements(null);
        setAchievementError(null); // Clear previous errors

        try {
            const syncRes = await fetch(`${API_URL}/api/xbox/achievements/${xboxXuid}/${game.platformGameId}`);
            const syncData = await syncRes.json();
            
            // If we hit the Xbox One/Series API restriction, set the error state and stop
            if (syncData.error) {
                setAchievementError(syncData.details || syncData.error);
                setServerMessage("");
                return;
            }
            
            const dbRes = await fetch(`${API_URL}/api/achievements/${xboxXuid}/${game.platformGameId}`);
            const dbData = await dbRes.json();
            setSelectedAchievements(dbData);
            setServerMessage("");
        } catch (err) { 
            setAchievementError("Failed to fetch achievements from the server.");
            setServerMessage(""); 
        }
    };

    const backToMyProfile = () => {
        setXboxXuid(linkedId);
        setSearchQuery("My Account"); // Or ideally, store the user's linked gamertag in state and put it here
        setServerMessage("Switched back to your profile.");
    };

    return (
        <div>
            <div className="card" style={{ padding: '20px', backgroundColor: '#107c10', borderRadius: '10px', marginTop: '20px', position: 'relative' }}>
                <h3 style={{ margin: '0 0 5px 0', color: 'white' }}>Xbox Player Tracker</h3>
                <p style={{ fontSize: '12px', color: '#e6e6e6', marginBottom: '15px' }}>Search for any Xbox Gamertag.</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="e.g. Major Nelson" style={{ padding: '10px', width: '250px' }} />
                    <button onClick={handleSearch} style={{ backgroundColor: '#f5f5f5', color: '#107c10' }}>Search</button>
                </div>

                {/* --- THE DROPDOWN LIST --- */}
                {searchResults.length > 0 && (
                    <div style={{ backgroundColor: '#0e5c0e', border: '1px solid #555', borderRadius: '5px', width: '310px', margin: '5px auto', textAlign: 'left', position: 'absolute', zIndex: 10, left: '50%', transform: 'translateX(-50%)', maxHeight: '300px', overflowY: 'auto' }}>
                        {searchResults.map(player => (
                            <div key={player.xuid} onClick={() => selectPlayer(player)} style={{ padding: '10px', borderBottom: '1px solid #333', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                                <img src={player.avatar} alt="av" style={{ width: '35px', height: '35px', borderRadius: '50%' }} />
                                <span style={{ fontWeight: 'bold' }}>{player.gamertag}</span>
                            </div>
                        ))}
                    </div>
                )}
                
                {wasSearchPerformed && searchResults.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#ccc', marginTop: '10px', padding: '10px', backgroundColor: '#0e5c0e', borderRadius: '5px' }}>
                        <p style={{ margin: 0 }}>**No results found.** Try checking spelling or searching for a different player.</p>
                    </div>
                )}

                <div style={{ marginTop: '20px', borderTop: '1px solid #0e5c0e', paddingTop: '15px' }}>
                    <p style={{ color: 'white' }}>Active XUID: <strong style={{ color: '#a3cf06' }}>{xboxXuid || "None"}</strong></p>
                    
                    {!linkedId && xboxXuid && <button onClick={handleLinkXbox} style={{ backgroundColor: '#cca43b', color: 'black', marginBottom: '10px' }}>Link to My Account</button>}
                    {linkedId && xboxXuid !== linkedId && <button onClick={backToMyProfile} style={{ display: 'block', margin: '0 auto 10px auto' }}>Back to Me</button>}

                    <button onClick={fetchProfile} style={{ backgroundColor: '#f5f5f5', color: '#107c10' }}>1. Load Profile</button>
                    <button onClick={syncData} style={{ backgroundColor: '#2a475e', marginLeft: '10px', color: 'white' }}>2. Sync to DB</button>
                    <button onClick={loadLibrary} style={{ backgroundColor: '#cca43b', color: 'black', marginLeft: '10px' }}>3. View Library</button>
                </div>
            </div>

            {profile && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <div className="profile-card" style={{ padding: '20px', border: '1px solid #107c10', borderRadius: '8px', backgroundColor: '#0e5c0e', color: 'white' }}>
                        <img src={profile.avatar} alt="Avatar" style={{ borderRadius: '50%', width: '100px' }} />
                        <h2>{profile.gamertag}</h2>
                        <h3 style={{ color: '#cca43b' }}>{profile.gamerscore} Ⓖ</h3>
                        <p>Status: {profile.presence}</p>
                    </div>
                </div>
            )}

            {gamesLibrary.length > 0 && (
                <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
                    {gamesLibrary.map(game => (
                        <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '220px', backgroundColor: '#171a21', borderRadius: '5px', position: 'relative' }}>
                            <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', backgroundColor: '#107c10', color: 'white' }}>Xbox</span>
                            <img src={game.img_icon_url} alt={game.name} style={{ width: '64px', height: '64px', marginBottom: '10px', borderRadius: '5px' }} />
                            <p style={{ fontSize: '14px', fontWeight: 'bold', minHeight: '40px', color: 'white' }}>{game.name}</p>
                            <button onClick={() => loadAchievements(game)} style={{ fontSize: '12px', padding: '5px 10px', marginTop: '10px', backgroundColor: '#107c10', color: 'white' }}>View Achievements</button>
                        </div>
                    ))}
                </div>
            )}

            {/* NEW: Elegant Error Display for API Restrictions */}
            {achievementError && (
                <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px', border: '1px solid #cca43b' }}>
                    <h2 style={{ color: '#cca43b' }}>⚠️ API Limitation: {activeGameName}</h2>
                    <p style={{ color: '#ccc', lineHeight: '1.5' }}>{achievementError}</p>
                </div>
            )}

            {/* Existing Achievements Detail View */}
            {selectedAchievements && !achievementError && (
                <div className="achievements-section" style={{ marginTop: '40px', padding: '20px', backgroundColor: '#1b2838', borderRadius: '10px' }}>
                    <h2 style={{ color: 'white' }}>🏆 Achievements for {activeGameName}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', marginTop: '20px' }}>
                        {selectedAchievements.map((ach, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: ach.achieved ? '#107c10' : '#171a21', padding: '10px', borderRadius: '5px', border: ach.achieved ? '1px solid #107c10' : '1px solid #333', opacity: ach.achieved ? 1 : 0.6 }}>
                                <img src={ach.iconUrl} alt={ach.apiname} style={{ width: '50px', height: '50px', marginRight: '15px', borderRadius: '5px' }} />
                                <div style={{ textAlign: 'left', color: 'white' }}>
                                    <h4 style={{ margin: '0 0 5px 0' }}>{ach.displayName}</h4>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>{ach.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}