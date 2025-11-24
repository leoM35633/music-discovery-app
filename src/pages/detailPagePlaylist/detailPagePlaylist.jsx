import { useState, useEffect } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchPlaylistById } from '../../api/spotify-playlists.js';
import { handleTokenError } from '../../utils/handleTokenError.js';
import '../PageLayout.css';
import { useNavigate, useParams } from 'react-router-dom';
import TrackItem from '../../components/TrackItem/TrackItem.jsx';


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
                    <h2>{playlist.name}</h2>
                    <p>{playlist.description || 'No description'}</p>

                    {/* image: Spotify returns images array */}
                    {playlist.images?.[0]?.url ? (
                        <img
                            src={playlist.images[0].url}
                            alt={playlist.name ? `${playlist.name} cover` : 'Playlist cover'}
                            style={{ maxWidth: 320 }}
                        />
                    ) : (
                        <div>No image</div>
                    )}

                    {/* external link button */}
                    {playlist.external_urls?.spotify ? (
                        <a
                            href={playlist.external_urls.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <button type="button">Open in Spotify</button>
                        </a>
                    ) : null}

                    {/* Tracks list: map over playlist.tracks.items and pass item.track to TrackItem */}
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