import { useState, useEffect } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchPlaylistById } from '../../api/spotify-playlists.js';
import { handleTokenError } from '../../utils/handleTokenError.js';
import '../PageLayout.css';
import { useNavigate, useParams } from 'react-router-dom';
import TrackItem from '../../components/TrackItem/TrackItem.jsx';
import './detailPagePlaylist.css'


export default function PlaylistPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    // require token to fetch playlists
    const { token } = useRequireToken();
    const [playlist, setPlaylist] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Set the document title for this page (Détail playlist)
    useEffect(() => { document.title = buildTitle('Détail playlist'); }, []);

    useEffect(() => {
        if (!token || !id) return;
        setLoading(true);
        fetchPlaylistById(token, id)
            .then(res => {
                if (res.error) {
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
                setError(err.message || String(err));
            })
            .finally(() => setLoading(false));
    }, [token, id]);

    return (
        <div className="playlist-page page-container">
            <h1>Playlist Page</h1>

            {loading && <div>Loading playlist…</div>}
            {error && !loading && <div role="alert">Erreur: {error}</div>}

            {!loading && !error && playlist && (
                <section className="playlist-details">
                    {/* Apply new layout for playlist header only (image, title, description, spotify link) */}
                    <div className="playlist-container">
                        <div className="playlist-header" role="region" aria-label="Playlist header">
                            <div className="playlist-header-image">
                                {playlist.images?.[0]?.url ? (
                                    <img
                                        src={playlist.images[0].url}
                                        alt={playlist.name ? `${playlist.name} cover` : 'Playlist cover'}
                                        className="playlist-cover"
                                    />
                                ) : (
                                    <div className="playlist-cover" aria-hidden="true">No image</div>
                                )}
                            </div>

                            <div className="playlist-header-text-with-link">
                                <div className="playlist-header-text">
                                    <h2 className="playlist-title">{playlist.name}</h2>
                                    <p className="playlist-subtitle">{playlist.description || 'No description'}</p>
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
                        <>
                            <ol className="tracks-list">
                                {playlist.tracks.items.map((item, idx) => (
                                    <TrackItem
                                        key={item?.track?.id ?? idx}
                                        track={item.track}
                                    />
                                ))}
                            </ol>
                        </>
                    ) : (
                        <div>No tracks available</div>
                    )}
                </section>
            )}
        </div>
    );
}