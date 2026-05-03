import { useState, useEffect } from 'react';

export default function HomeTab({ username, API_URL, linkedSteamId, linkedPsnId, linkedXboxId }) {
    const [megaLibrary, setMegaLibrary] = useState([]);
    const [filter, setFilter] = useState('All');
    
    const [steamSummary, setSteamSummary] = useState(null);
    const [psnSummary, setPsnSummary] = useState(null);
    const [xboxSummary, setXboxSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadCentralHub();
    }, [linkedSteamId, linkedPsnId, linkedXboxId]);

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

    const filteredGames = filter === 'All' ? megaLibrary : megaLibrary.filter(g => g.platform === filter);

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
                <h2 style={{ color: 'white' }}>Mega Library ({megaLibrary.length} Games)</h2>
                
                {/* Filter Buttons */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                    <button onClick={() => setFilter('All')} style={{ backgroundColor: filter === 'All' ? '#cca43b' : '#333', color: filter === 'All' ? 'black' : 'white' }}>All</button>
                    <button onClick={() => setFilter('Steam')} style={{ backgroundColor: filter === 'Steam' ? '#66c0f4' : '#333', color: filter === 'Steam' ? 'black' : 'white' }}>Steam</button>
                    <button onClick={() => setFilter('PSN')} style={{ backgroundColor: filter === 'PSN' ? '#003087' : '#333', color: 'white' }}>PlayStation</button>
                    <button onClick={() => setFilter('Xbox')} style={{ backgroundColor: filter === 'Xbox' ? '#107c10' : '#333', color: 'white' }}>Xbox</button>
                </div>

                {isLoading ? <p>Loading your empire...</p> : (
                    <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                        {filteredGames.map(game => (
                            <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '200px', backgroundColor: '#1b2838', borderRadius: '5px', position: 'relative' }}>
                                <span style={{ position: 'absolute', top: '5px', right: '5px', fontSize: '10px', padding: '2px 5px', borderRadius: '3px', color: 'white', backgroundColor: game.platform === 'PSN' ? '#003087' : game.platform === 'Xbox' ? '#107c10' : '#333' }}>
                                    {game.platform}
                                </span>
                                <img src={game.platform === 'Steam' ? `http://media.steampowered.com/steamcommunity/public/images/apps/${game.platformGameId}/${game.img_icon_url}.jpg` : game.img_icon_url} alt={game.name} style={{ width: '64px', height: '64px', marginBottom: '10px', borderRadius: '5px' }} />
                                <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{game.name}</p>
                                {game.platform === 'Steam' && <p style={{ fontSize: '13px', color: '#a3cf06' }}>{(game.playtime_forever / 60).toFixed(1)} hrs</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}