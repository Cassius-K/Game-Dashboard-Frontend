import { useState, useEffect, useRef } from 'react';

export default function HomeTab({ username, API_URL, linkedSteamId, linkedPsnId, linkedXboxId }) {
    const [megaLibrary, setMegaLibrary] = useState([]);
    const [filter, setFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Name'); 
    
    const [steamSummary, setSteamSummary] = useState(null);
    const [psnSummary, setPsnSummary] = useState(null);
    const [xboxSummary, setXboxSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hydrationStatus, setHydrationStatus] = useState("");
    const isHydrating = useRef(false); // Prevents multiple hydration jobs at once

    useEffect(() => {
        loadCentralHub();
    }, [linkedSteamId, linkedPsnId, linkedXboxId]);

    // --- BACKGROUND HYDRATION LOGIC ---
    useEffect(() => {
        // If we are already hydrating or have no games, do nothing
        if (isHydrating.current || megaLibrary.length === 0) return;

        // Find all games that have 0% completion (need hydrating)
        const gamesToHydrate = megaLibrary.filter(g => (g.completionRate === 0 || g.completionRate === undefined) && g.platform !== 'Xbox');
        
        if (gamesToHydrate.length > 0) {
            isHydrating.current = true;
            hydrateQueue(gamesToHydrate);
        }
    }, [megaLibrary]); // This effect runs whenever the megaLibrary changes

    const hydrateQueue = async (queue) => {
        for (let i = 0; i < queue.length; i++) {
            const game = queue[i];
            setHydrationStatus(`Hydrating... (${i + 1}/${queue.length}) ${game.name}`);

            try {
                // Tell the backend to fetch and save this one game
                await fetch(`${API_URL}/api/hydrate/game-completion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, game })
                });

                // Wait 1.5 seconds between requests to avoid API bans
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (err) {
                console.error(`Failed to hydrate ${game.name}`);
            }
        }
        setHydrationStatus("Hydration complete! Click Refresh to see updated stats.");
        isHydrating.current = false;
    };


    const loadCentralHub = async () => {
        setIsLoading(true);
        setHydrationStatus(""); // Clear hydration message on refresh
        try {
            // 1. Load Mega Library from DB
            const libRes = await fetch(`${API_URL}/api/library/all/${username}`);
            const libData = await libRes.json();
            setMegaLibrary(libData);

            // 2. Fetch platform stats... (existing code here)
            if (linkedSteamId) {
                const steamRes = await fetch(`${API_URL}/api/steam/profile/${linkedSteamId}`);
                if (steamRes.ok) setSteamSummary(await steamRes.json());
            }
            if (linkedPsnId) {
                const psnRes = await fetch(`${API_URL}/api/psn/trophy-summary/${username}/${linkedPsnId}`);
                if (psnRes.ok) setPsnSummary(await psnRes.json());
            }
            if (linkedXboxId) {
                const xboxRes = await fetch(`${API_URL}/api/xbox/profile/${linkedXboxId}`);
                if (xboxRes.ok) setXboxSummary(await xboxRes.json());
            }
        } catch (err) {
            console.error("Failed to load Central Hub data");
        }
        setIsLoading(false);
    };

    let processedGames = filter === 'All' ? megaLibrary : megaLibrary.filter(g => g.platform === filter);
    if (sortBy === 'Name') {
        processedGames.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'Completion') {
        processedGames.sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0));
    }

    return (
        <div>
            {/* --- TOP STATS BANNER --- */}
            {/* ... (existing code for the 3 summary cards) ... */}

            {/* --- CONSOLIDATED MEGA LIBRARY --- */}
            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#171a21', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <h2 style={{ color: 'white', margin: 0 }}>Mega Library ({megaLibrary.length} Games)</h2>
                    <button onClick={loadCentralHub} style={{ backgroundColor: '#66c0f4', color: 'black', padding: '5px 10px', fontSize: '12px' }} title="Re-fetch library">
                        🔄 Refresh
                    </button>
                </div>

                {/* NEW: Hydration Status Bar */}
                {hydrationStatus && <p style={{ color: '#a3cf06', fontSize: '12px' }}>{hydrationStatus}</p>}

                {/* Filter and Sort Controls */}
                {/* ... (existing code for filter/sort controls) ... */}
                
                {isLoading ? <p>Loading your empire...</p> : (
                    <div className="games-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
                        {processedGames.map(game => (
                            <div key={game._id} className="game-card" style={{ border: '1px solid #555', padding: '15px', width: '200px', backgroundColor: '#1b2838', borderRadius: '5px', position: 'relative' }}>
                                {/* ... (existing code for game card display, including completion rate) ... */}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}