import { useState, useEffect, useRef } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchPlaylistById } from '../../api/spotify-playlists.js';
import { handleTokenError } from '../../utils/handleTokenError.js';
import '../PageLayout.css';
import { useNavigate, useParams } from 'react-router-dom';
import TrackItem from '../../components/TrackItem/TrackItem.jsx';
import './detailPagePlaylist.css'
import { KEY_ACCESS_TOKEN } from '../../constants/storageKeys.js'; // added


export default function PlaylistPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    // require token to fetch playlists
    const { token } = useRequireToken();
    const fetchedRef = useRef({ token: null, id: null }); // NEW: track last fetched pair
    const [playlist, setPlaylist] = useState(null);

    // compute token available at initial render (hook or localStorage)
    const initialStoredToken = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_ACCESS_TOKEN) : null;
    const initialEffectiveToken = token ?? initialStoredToken;

    // Initialize loading/error based on token availability to avoid synchronous setState in effect
    const [loading, setLoading] = useState(() => (initialEffectiveToken ? true : false));
    const [error, setError] = useState(() => (initialEffectiveToken ? null : 'No access token found.'));

    // Set the document title for this page (use the title expected by tests)
    useEffect(() => { document.title = buildTitle('Playlist'); }, []);

    useEffect(() => {
        // If no playlist id, do nothing
        if (!id) return;

        // use token from hook if available, otherwise fallback to localStorage (tests mock localStorage)
        const effectiveToken = token ?? (typeof window !== 'undefined' ? window.localStorage.getItem(KEY_ACCESS_TOKEN) : null);

        // If no token now, there's nothing to do (initial state already reflects missing token)
        if (!effectiveToken) {
            return;
        }

        // If token appears after initial render, clear previous error and set loading
        if (!initialEffectiveToken) {
            /* eslint-disable-next-line react-hooks/set-state-in-effect */
            setError(null);
            /* eslint-disable-next-line react-hooks/set-state-in-effect */
            setLoading(true);
        }

        // Prevent duplicate fetch: if we've already fetched this (token, id) pair, skip
        if (fetchedRef.current.token === effectiveToken && fetchedRef.current.id === id) {
            return;
        }

        // Mark this pair as fetched (prevents subsequent duplicate calls)
        fetchedRef.current = { token: effectiveToken, id };

        // use effectiveToken here so tests using localStorage token trigger the fetch
        fetchPlaylistById(effectiveToken, id)
            .then(res => {
                if (res.error) {
                    // let handleTokenError perform navigation if needed; otherwise show error text
                    if (!handleTokenError(res.error, navigate)) {
                        setError(res.error);
                    }
                    setPlaylist(null);
                    return;
                }
                setPlaylist(res.data);
            })
            .catch(err => {
                console.error('Error fetching playlist:', err);
                // Provide a clear network error message
                setError(err?.message ?? 'Network error');
            })
            .finally(() => setLoading(false));
    }, [token, id, navigate, initialEffectiveToken]); // include initialEffectiveToken to satisfy exhaustive-deps

    return (
        <div className="playlist-page page-container">
            {loading && <div role="status" data-testid="loading-indicator">Loading playlist…</div>}
            {error && !loading && <div role="alert">Erreur: {error}</div>}

            {!loading && !error && playlist && (
                <section className="playlist-details">
                    {/* Playlist header: region must have aria-label equal to playlist name and proper classes */}
                    <div className="playlist-container page-container" role="region" aria-label={playlist.name}>
                        <div className="playlist-header">
                            <div className="playlist-header-image">
                                {playlist.images?.[0]?.url ? (
                                    <img
                                        src={playlist.images[0].url}
                                        alt={`Cover of ${playlist.name}`}
                                        className="playlist-cover"
                                    />
                                ) : (
                                    <div className="playlist-cover" aria-hidden="true">No image</div>
                                )}
                            </div>

                            <div className="playlist-header-text-with-link">
                                <div className="playlist-header-text">
                                    {/* h1 with playlist name (tests expect level 1) */}
                                    <h1 className="playlist-title page-title">{playlist.name}</h1>
                                    {/* h2 with description (tests expect level 2) */}
                                    <h2 className="playlist-subtitle page-subtitle">{playlist.description || 'No description'}</h2>
                                </div>

                                {/* external link styled as button via CSS; keep target/rel for safety */}
                                {playlist.external_urls?.spotify ? (
                                    <a
                                        href={playlist.external_urls.spotify}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="playlist-spotify-link"
                                    >
                                        Open in Spotify
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Tracks list: unchanged behaviour / styling separate */}
                    {Array.isArray(playlist.tracks?.items) && playlist.tracks.items.length > 0 ? (
                            <ol className="playlist-list">
                                {playlist.tracks.items.map((item, idx) => (
                                    <TrackItem
                                        key={item?.track?.id ?? idx}
                                        track={item.track}
                                    />
                                ))}
                            </ol>
                    ) : (
                        <div>No tracks available</div>
                    )}
                </section>
            )}
        </div>
    );
}