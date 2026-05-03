import { useState, useEffect } from 'react';

// NEW: Accept startHydration and hydrationStatus as props from App.jsx
export default function HomeTab({ username, API_URL, linkedSteamId, linkedPsnId, linkedXboxId, startHydration, hydrationStatus }) {
    const [megaLibrary, setMegaLibrary] = useState([]);
    const [filter, setFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Name'); // NEW: Controls sorting logic ('Name' or 'Completion')
    
    const [steamSummary, setSteamSummary] = useState(null);
    const [psnSummary, setPsnSummary] = useState(null);
    const [xboxSummary, setXboxSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // We use a function inside useEffect so we can call it again on demand
    useEffect(() => {
        loadCentralHub();
    }, [linkedSteamId, linkedPsnId, linkedXboxId]); // Reruns when linked accounts change

    const loadCentralHub = async () => {
        setIsLoading(true);
        try {
            // 1. Load Mega Library from DB
            const libRes = await fetch(`${API_URL}/api/library/all/${username}`);
            const libData = await libRes.json();
            setMegaLibrary(libData);

            // 2. Fetch Steam Stats if linked
            if (linkedSteamId) {
                const steamRes = await fetch(`${API_URL}/api/steam/profile/${linkedSteamId}`);
                if (steamRes.ok) setSteamSummary(await steamRes.json());
            }

            // 3. Fetch PSN Stats if linked
            if (linkedPsnId) {
                const psnRes = await fetch(`${API_URL}/api/psn/trophy-summary/${username}/${linkedPsnId}`);
                if (psnRes.ok) setPsnSummary(await psnRes.json());
            }

            // 4. Fetch Xbox Stats if linked
            if (linkedXboxId) {
                const xboxRes = await fetch(`${API_URL}/api/xbox/profile/${linkedXboxId}`);
                if (xboxRes.ok) setXboxSummary(await xboxRes.json());
            }
        } catch (err) {
            console.error("Failed to load Central Hub data");
        }
        setIsLoading(false);
    };

    // --- SORTING AND FILTERING LOGIC ---
    // 1. Filter by platform
    let processedGames = filter === 'All' ? megaLibrary : megaLibrary.filter(g => g.platform === filter);

    // 2. Sort the filtered games
    if (sortBy === 'Name') {
        processedGames.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'Completion') {
        // Sort highest percentage to lowest
        processedGames.sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0));
    }

    return (
        <div>
            {/* --- TOP STATS BANNER --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                
                {/* Steam Summary Card */}
                <div className="card" style={{ flex: '1', minWidth: '250px', backgroundColor: '#1b2838', border: '1px solid #66c0f4', padding: '20px', borderRadius: '10px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#66c0f4' }}>Steam</h3>
                    {steamSummary ? (
                        <div>
                            <img src={steamSummary.avatarfull} alt="Steam" style={{ width: '60px', borderRadius: '50%' }} />
                            <h2>{steamSummary.personaname}</h2>
                            <h3 style={{ color: '#cca43b' }}>Level {steamSummary.steamLevel || '?'}</h3>
                        </div>
                    ) : <p style={{ color: '#888' }}>Not Linked</p>}
                </div>

                {/* PSN Summary Card */}
                <div className="card" style={{ flex: '1', minWidth: '250px', backgroundColor: '#002266', border: '1px solid #003087', padding: '20px', borderRadius: '10px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: 'white' }}>PlayStation</h3>
                    {psnSummary && !psnSummary.error ? (
                        <div>
                            <h1 style={{ fontSize: '48px', margin: '10px 0', color: '#f5f5f5' }}>Lv. {psnSummary.level}</h1>
                            <p style={{ color: '#b9a3e3' }}>Platinum: {psnSummary.earned?.platinum || 0}</p>
                        </div>
                    ) : <p style={{ color: '#888' }}>Not Linked or Synced</p>}
                </div>

                {/* Xbox Summary Card */}
                <div className="card" style={{ flex: '1', minWidth: '250px', backgroundColor: '#0e5c0e', border: '1px solid #107c10', padding: '20px', borderRadius: '10px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: 'white' }}>Xbox</h3>
                    {xboxSummary && !xboxSummary.error ? (
                        <div>
                            <img src={xboxSummary.avatar} alt="Xbox" style={{ width: '60px', borderRadius: '50%' }} />
                            <h2>{xboxSummary.gamertag}</h2>
                            <h3 style={{ color: '#cca43b' }}>{xboxSummary.gamerscore} Ⓖ</h3>
                        </div>
                    ) : <p style={{ color: '#888' }}>Not Linked</p>}
                </div>
            </div>

            {/* --- CONSOLIDATED MEGA LIBRARY --- */}
            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#171a21', borderRadius: '10px' }}>
                {/* === UPDATED: Refresh and Hydrate buttons are now side-by-side === */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <h2 style={{ color: 'white', margin: 0 }}>Mega Library ({megaLibrary.length} Games)</h2>
                    <button 
                        onClick={loadCentralHub} 
                        style={{ backgroundColor: '#66c0f4', color: 'black', padding: '5px 10px', fontSize: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        title="Re-fetch library to see updated completion rates"
                    >
                        🔄 Refresh
                    </button>
                    {/* NEW: This button now calls the startHydration function passed down from App.jsx */}
                    <button 
                        onClick={startHydration} 
                        style={{ backgroundColor: '#cc3333', color: 'white', padding: '5px 10px', fontSize: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                        title="Scan library for missing completion data"
                    >
                        💧 Hydrate
                    </button>
                </div>
                
                {/* NEW: Displays the global hydration status message from App.jsx */}
                {hydrationStatus && <p style={{ color: '#a3cf06', fontStyle: 'italic', height: '20px' }}>{hydrationStatus}</p>}

                {/* Filter and Sort Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {/* Platform Filter Buttons */}
                    <div>
                        <span style={{ color: '#888', marginRight: '10px' }}>Filter:</span>
                        <button onClick={() => setFilter('All')} style={{ backgroundColor: filter === 'All' ? '#cca43b' : '#333', color: filter === 'All' ? 'black' : 'white', padding: '5px 10px' }}>All</button>
                        <button onClick={() => setFilter('Steam')} style={{ backgroundColor: filter === 'Steam' ? '#66c0f4' : '#333', color: filter === 'Steam' ? 'black' : 'white', padding: '5px 10px', marginLeft: '5px' }}>Steam</button>
                        <button onClick={() => setFilter('PSN')} style={{ backgroundColor: filter === 'PSN' ? '#003087' : '#333', color: 'white', padding: '5px 10px', marginLeft: '5px' }}>PlayStation</button>
                        <button onClick={() => setFilter('Xbox')} style={{ backgroundColor: filter === 'Xbox' ? '#107c10' : '#333', color: 'white', padding: '5px 10px', marginLeft: '5px' }}>Xbox</button>
                    </div>

                    {/* NEW: Sort Dropdown */}
                    <div>
                        <span style={{ color: '#888', marginRight: '10px' }}>Sort By:</span>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ padding: '8px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}
                        >
                            <option value="Name">Alphabetical (A-Z)</option>
                            <option value="Completion">Completion % (High-Low)</option>
                        </select>
                    </div>
                </div>

                {isLoading ? <p>Loading your empire...</p> : (
                    <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                        {/* CHANGED: Now mapping over processedGames instead of filteredGames */}
                        {processedGames.map(game => (
                            <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '200px', backgroundColor: '#1b2838', borderRadius: '5px', position: 'relative' }}>
                                
                                <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', color: 'white', backgroundColor: game.platform === 'PSN' ? '#003087' : game.platform === 'Xbox' ? '#107c10' : '#333' }}>
                                    {game.platform}
                                </span>
                                
                                <img 
									src={game.platform === 'Steam' ? `https://steamcdn-a.akamaihd.net/steam/apps/${game.platformGameId}/header.jpg` : game.img_icon_url} 
									alt={game.name} 
									style={{ 
										width: '100%', 
										height: 'auto', 
										aspectRatio: game.platform === 'Steam' ? '460/215' : '1/1', 
										objectFit: 'cover',
										marginBottom: '10px', 
										borderRadius: '5px' 
									}} 
                                    // Fallback for missing Steam header images
                                    onError={(e) => { if(game.platform === 'Steam') { e.target.onerror = null; e.target.src = `http://media.steampowered.com/steamcommunity/public/images/apps/${game.platformGameId}/${game.img_icon_url}.jpg`; } }}
								/>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', margin: '5px 0' }}>{game.name}</p>
                                
                                {/* NEW: Display Completion % on the card */}
                                <p style={{ fontSize: '12px', color: '#cca43b', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                                    Completion: {game.completionRate || 0}%
                                </p>
                                
                                {game.platform === 'Steam' && <p style={{ fontSize: '12px', color: '#a3cf06', margin: '0' }}>{(game.playtime_forever / 60).toFixed(1)} hrs</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}