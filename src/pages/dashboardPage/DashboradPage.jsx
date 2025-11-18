import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// buildTitle permet de composer le titre du document
import { buildTitle, APP_NAME } from '../../constants/appMeta.js';

// hook pour exiger un token d'auth avant d'appeler l'API
import { useRequireToken } from '../../hooks/useRequireToken.js';
// fonction d'API pour récupérer les top artists de l'utilisateur
import { fetchUserTopArtists } from '../../api/spotify-me.js';

import './DashboardPage.css';
import '../PageLayout.css';


/**
 * Nombre d'artistes à récupérer pour la page Dashboard
 */
export const limit = 1;

/** 
 * Plage temporelle pour le calcul des top artists
 */
export const timeRange = 'short_term';


export default function DashboardPage() {
  const navigate = useNavigate();

  // état contenant la liste des artistes récupérés
  const [artists, setArtists] = useState([]);

  // états de contrôle pour le chargement et les erreurs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // hook qui fournit le token (doit être utilisé à l'intérieur du composant)
  const { token } = useRequireToken();

  // Met à jour le titre du document pour la page Dashboard
  useEffect(() => {
    document.title = buildTitle('Top Artists');
  }, []);

  // Effet : récupérer les top artists dès que le token est disponible
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchUserTopArtists(token, limit, timeRange);
        // stocke les résultats dans l'état pour affichage
        setArtists(res?.data?.items ?? []);
      } catch (err) {
        // stocke un message d'erreur lisible
        setError(err?.message ?? 'Erreur lors de la récupération');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, navigate]);

  const topArtist = artists?.[0] ?? null;

  // Affiche topArtist dans la console à chaque mise à jour
  useEffect(() => {
    if (topArtist) {
      console.log('topArtist:', topArtist);
    }
  }, [topArtist]);

  return (
    <>
      {/* Titre principal de la page */}
      <h1>Welcome to DashboardPage</h1>

      {/* Indicateur de chargement */}
      {loading && <div>Loading top artist…</div>}

      {/* Affiche l'erreur si elle existe */}
      {error && !loading && <div role="alert">{error}</div>}

      {/* Affiche l'artiste le plus écouté : nom, image et genres (séparés par des virgules) */}
      {!loading && !error && topArtist && (
        <div>
          <div>{topArtist.name}</div>
          <div>
            <img
              src={topArtist.images?.[0]?.url}
              alt={topArtist.name || 'Top artist'}
              width="200"
            />
          </div>
          <div>{(topArtist.genres || []).join(', ')}</div>

          {/* Bouton pour en savoir plus : ouvre le lien externe dans un nouvel onglet */}
          <div>
            <a href={topArtist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
              <button type="button">Learn more</button>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

