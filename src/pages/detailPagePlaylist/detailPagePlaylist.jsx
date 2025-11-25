import { useState, useEffect, useRef } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchPlaylistById } from '../../api/spotify-playlists.js';
import { handleTokenError } from '../../utils/handleTokenError.js';
import '../PageLayout.css';
import { useNavigate, useParams } from 'react-router-dom';
import TrackItem from '../../components/TrackItem/TrackItem.jsx';
import './detailPagePlaylist.css'
import { KEY_ACCESS_TOKEN } from '../../constants/storageKeys.js';

export default function PlaylistPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { token } = useRequireToken();
	const fetchedRef = useRef({ token: null, id: null });

	// compute token available at initial render (hook or localStorage)
	const initialStoredToken = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_ACCESS_TOKEN) : null;
	const initialEffectiveToken = token ?? initialStoredToken;

	// Initialize states based on token availability (avoid synchronous setState in effect)
	const [playlist, setPlaylist] = useState(null);
	const [loading, setLoading] = useState(() => Boolean(initialEffectiveToken));
	const [error, setError] = useState(() => (initialEffectiveToken ? null : 'No access token found.'));

	// Set the document title
	useEffect(() => { document.title = buildTitle('Playlist'); }, []);

	useEffect(() => {
		// do nothing without an id
		if (!id) return;

		// determine current token (hook or localStorage)
		const effectiveToken = token ?? (typeof window !== 'undefined' ? window.localStorage.getItem(KEY_ACCESS_TOKEN) : null);

		// nothing to do if no token (initial state already reflects that)
		if (!effectiveToken) return;

		// avoid duplicate fetches for same (token, id)
		if (fetchedRef.current.token === effectiveToken && fetchedRef.current.id === id) {
			return;
		}
		fetchedRef.current = { token: effectiveToken, id };

		// perform async fetch; update state only inside async callbacks
		fetchPlaylistById(effectiveToken, id)
			.then(res => {
				if (res.error) {
					// allow handleTokenError to redirect; otherwise display error
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
				setError(err?.message ?? 'Network error');
			})
			.finally(() => setLoading(false));
	}, [token, id, navigate]);

	return (
		<div className="playlist-page page-container">
			{loading && <div role="status" data-testid="loading-indicator">Loading playlist…</div>}
			{error && !loading && <div role="alert">Erreur: {error}</div>}

			{!loading && !error && playlist && (
				<section className="playlist-details">
					{/* header */}
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
									<h1 className="playlist-title page-title">{playlist.name}</h1>
									<h2 className="playlist-subtitle page-subtitle">{playlist.description || 'No description'}</h2>
								</div>

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

					{/* tracks */}
					{Array.isArray(playlist.tracks?.items) && playlist.tracks.items.length > 0 ? (
						<ol className="playlist-list">
							{playlist.tracks.items.map((item, idx) => (
								<TrackItem key={item?.track?.id ?? idx} track={item.track} />
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