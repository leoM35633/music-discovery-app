// DashboardPage : récupère et affiche l'artiste et le morceau les plus écoutés de l'utilisateur.
// - Utilise useRequireToken pour obtenir le token d'auth.
// - Appelle fetchUserTopArtists et fetchUserTopTracks.
// - Gère séparément les états de chargement / erreur pour artistes et tracks.
// - Ne gère pas le style : rendu minimal (nom, image, genres/artists joinés).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// buildTitle permet de composer le titre du document (utilisé pour l'accessibilité et le SEO)
import { buildTitle } from '../../constants/appMeta.js';

// hook pour exiger un token d'auth avant d'appeler l'API
import { useRequireToken } from '../../hooks/useRequireToken.js';
// fonctions d'API : récupérer top artists et top tracks de l'utilisateur connecté
import { fetchUserTopArtists, fetchUserTopTracks } from '../../api/spotify-me.js';
// utilitaire pour gérer les erreurs de token / redirection vers la page de login si token expiré
import { handleTokenError } from '../../utils/handleTokenError.js';

// compossant pour gérer le style d'afficher du top artiste et du top track
import SimpleCard from '../../components/SimpleCard/SimpleCard.jsx'

import './DashboardPage.css';
import '../PageLayout.css';

/* 
  Remarques sur l'implémentation :
  - limit et timeRange définissent les paramètres passés aux appels API.
  - Les useEffect déclenchent les fetchs lorsque le token est disponible.
  - handleTokenError est utilisé pour détecter les erreurs d'auth (ex: token expiré)
    et potentiellement rediriger l'utilisateur vers /login.
*/

/**
 * Nombre d'artistes à récupérer pour la page Dashboard
 * Ici on utilise 1 pour n'afficher que l'artiste le plus écouté.
 */
export const limit = 1;

/** 
 * Plage temporelle pour le calcul des top artists / tracks
 * 'short_term' correspond aux dernières ~4 semaines (selon l'API Spotify).
 */
export const timeRange = 'short_term';

// Helper to safely return the first image URL from an entity (handles missing arrays/objects/falsy urls)
function getFirstImageUrl(entity, key = 'images') {
	// entity?.[key] might be undefined, null, or not an array
	const imgs = entity?.[key];
	if (!Array.isArray(imgs) || imgs.length === 0) return null;
	const url = imgs[0]?.url;
	return url ? url : null;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // état contenant la liste des artistes récupérés (généralement 1 élément ici)
  const [artists, setArtists] = useState([]);

  // états de contrôle pour le chargement et les erreurs (artistes)
  // loading: indicateur visuel pendant la récupération
  // artistsError: message d'erreur à afficher si la requête échoue
  const [loading, setLoading] = useState(true);
  const [artistsError, setArtistsError] = useState(null);

  // états de contrôle pour le chargement et les erreurs (top tracks)
  // topTrack: contient le premier élément de res.data.items pour les tracks
  // tracksLoading et tracksError ont la même logique que pour les artistes
  const [topTrack, setTopTrack] = useState(null);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [tracksError, setTracksError] = useState(null);

  // stocker la liste complète des tracks (fallback d'affichage si besoin)
  const [tracks, setTracks] = useState([]);

  // hook qui fournit le token (doit être utilisé à l'intérieur du composant)
  const { token } = useRequireToken();

  // Met à jour le titre du document pour la page Dashboard
  // Important pour les tests et pour l'expérience utilisateur (onglet navigateur)
  useEffect(() => {
    document.title = buildTitle('Dashboard');
  }, []);

  // Effet : récupérer les top artists dès que le token est disponible
  // - reset des erreurs avant chaque requête
  // - vérifie res.error renvoyé par l'API et utilise handleTokenError pour
  //   gérer les cas d'expiration du token (redirection vers /login)
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        setArtistsError(null);
        const res = await fetchUserTopArtists(token, limit, timeRange);
        if (res?.error) {
          // si handleTokenError retourne false => erreur non liée au token => on l'affiche
          if (!handleTokenError(res.error, navigate)) {
            setArtistsError(res.error);
          }
          return;
        }
        // stockage sûr des items (fallback sur tableau vide)
        setArtists(res?.data?.items ?? []);
      } catch (err) {
        // capture d'une exception (réseau, JSON, etc.)
        setArtistsError(err?.message ?? 'Erreur lors de la récupération des artistes');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, navigate]);

  // Effet : récupérer les top tracks (même logique que pour les artistes)
  // - on stocke uniquement le premier élément (les plus écoutés)
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setTracksLoading(true);
        setTracksError(null);
        const res = await fetchUserTopTracks(token, limit, timeRange);
        if (res?.error) {
          if (!handleTokenError(res.error, navigate)) {
            setTracksError(res.error);
          }
          return;
        }
        // stocke la liste complète et le premier élément
        setTracks(res?.data?.items ?? []);
        const firstTrack = res?.data?.items?.[0] ?? null;
        setTopTrack(firstTrack);
      } catch (err) {
        setTracksError(err?.message ?? 'Erreur lors de la récupération des top tracks');
      } finally {
        setTracksLoading(false);
      }
    })();
  }, [token, navigate]);

  // topArtist est l'élément principal utilisé pour l'affichage
  const topArtist = artists?.[0] ?? null;

  // derive image urls safely
  const topArtistImageUrl = getFirstImageUrl(topArtist, 'images');
  const topTrackImageUrl = getFirstImageUrl(topTrack?.album ?? null, 'images');

  return (
    <div className="page-container">
      <div className="dashboard-container">
        {/* Titre principal de la page (doit correspondre aux tests) */}
        <h1 className="page-title">Dashboard</h1>
        <h2 className="dashboard-subtitle">Your top artist and track</h2>

        {/* Indicateurs de chargement et d'erreur pour les artistes */}
        {loading && (
          <div data-testid="loading-artists-indicator" className="dashboard-loading">
            Loading artists…
          </div>
        )}
        {artistsError && !loading && (
          <div data-testid="error-artists-indicator" role="alert" className="dashboard-error">
            {artistsError}
          </div>
        )}

        <div className="dashboard-content">
          {/* Artiste */}
          {!loading && !artistsError && topArtist && (
            <div className="card">
              <SimpleCard
                imageUrl={topArtistImageUrl}
                title={topArtist.name}
                subtitle={(topArtist.genres || []).join(', ')}
                link={topArtist.external_urls?.spotify}
              />
            </div>
          )}

          {/* Fallback artiste */}
          {!loading && !artistsError && !topArtist && artists?.[0] && (
            <div className="card">
              <SimpleCard
                title={artists[0].name}
                subtitle={(artists[0].genres || []).join(', ')}
                link={artists[0].external_urls?.spotify}
              />
            </div>
          )}

          {/* Tracks loading / error indicators can sit inside the same content area if desired */}
          {tracksLoading && (
            <div data-testid="loading-tracks-indicator" className="dashboard-loading">
              Loading tracks…
            </div>
          )}
          {tracksError && !tracksLoading && (
            <div data-testid="error-tracks-indicator" role="alert" className="dashboard-error">
              {tracksError}
            </div>
          )}

          {/* Top track */}
          {!tracksLoading && !tracksError && topTrack && (
            <div className="card">
              <SimpleCard
                imageUrl={topTrackImageUrl}
                title={topTrack.name}
                subtitle={(topTrack.artists || []).map(a => a.name).join(', ')}
                link={topTrack.external_urls?.spotify}
              />
            </div>
          )}

          {/* Fallback track */}
          {!tracksLoading && !tracksError && !topTrack && tracks?.[0] && (
            <div className="card">
              <SimpleCard
                title={tracks[0].name}
                subtitle={(tracks[0].artists || []).map(a => a.name).join(', ')}
                link={tracks[0].external_urls?.spotify}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

