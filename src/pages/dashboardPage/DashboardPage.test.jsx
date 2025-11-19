// src/pages/DashboardPage/DashboardPage.test.jsx

import { describe, expect, test } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './DashboradPage.jsx';
import * as spotifyApi from '../../api/spotify-me.js';
import { beforeEach, afterEach, jest } from '@jest/globals';
import { KEY_ACCESS_TOKEN } from '../../constants/storageKeys.js';
import { buildTitle } from '../../constants/appMeta.js';
import * as handleTokenUtil from '../../utils/handleTokenError.js';

// Mock top artist and track data
// Ces objets imitent la forme renvoyée par l'API Spotify (res.data.items)
const topArtistData = {
    items: [
        { 
            id: 'artist1', 
            name: 'Top Artist', 
            genres: ['pop', 'rock'],
            images: [{ url: 'https://via.placeholder.com/64' }], 
            external_urls: { spotify: 'https://open.spotify.com/artist/artist1' } 
        },
    ],
};

// topTrackData simule un objet track avec album, artistes et liens externes
const topTrackData = {
    items: [
        { 
            id: 'track1', 
            name: 'Top Track', 
            album: { images: [{ url: 'https://via.placeholder.com/64' }], 
            name: 'Top Album' }, 
            artists: [{ name: 'Artist1' }], 
            external_urls: { spotify: 'https://open.spotify.com/track/track1' } },
    ],
};

// Mock token value
const tokenValue = 'test-token';

// Tests for DashboardPage
describe('DashboardPage', () => {
    // Setup mocks before each test
    beforeEach(() => {
        // Mock localStorage token access
        jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => key === KEY_ACCESS_TOKEN ? tokenValue : null);

        // Default mock: successful top artist and track fetch
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: topArtistData, error: null });
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: topTrackData, error: null });
    });

    // Restore mocks after each test
    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Helper to render DashboardPage
    // Utilise MemoryRouter pour pouvoir tester la redirection vers /login
    const renderDashboardPage = () => {
        return render(
            // render DashboardPage within MemoryRouter
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    {/* Dummy login route for redirection when token is expired */}
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    // Helper to wait for loading to finish
    // Vérifie d'abord que les indicateurs de chargement sont présents puis attend leur disparition
    const waitForLoadingToFinish = async () => {
        // initial loading state expectations
        expect(screen.queryByTestId('loading-tracks-indicator')).toHaveTextContent(/loading tracks/i);
        expect(screen.queryByTestId('loading-artists-indicator')).toHaveTextContent(/loading artists/i);

        await waitFor(() => {
            expect(screen.queryByTestId('loading-tracks-indicator')).not.toBeInTheDocument();
            expect(screen.queryByTestId('loading-artists-indicator')).not.toBeInTheDocument();
        });
    };

    test('renders dashboard page', async () => {
        // Render the DashboardPage
        renderDashboardPage();

        // Check document title
        expect(document.title).toBe(buildTitle('Dashboard'));

        // wait for loading to finish
        await waitForLoadingToFinish();

        // when loading is done, verify top artist and track content rendered and api called correctly

        // should render main title
        const heading = screen.getByRole('heading', { level: 1, name: /dashboard/i });
        expect(heading).toBeInTheDocument();

        // verify subtitle rendered
        const subtitle = await screen.findByText("Your top artist and track");
        expect(subtitle).toBeInTheDocument()

        // should render top artist card
        const artistCard = screen.getByText(topArtistData.items[0].name);
        expect(artistCard).toBeInTheDocument();

        // should render top track card
        const trackCard = screen.getByText(topTrackData.items[0].name);
        expect(trackCard).toBeInTheDocument();
    });

    test('displays error messages on fetch failure', async () => {
        // Mock fetchUserTopArtists to return error
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: null, error: 'Failed to fetch top artists' });
        // Mock fetchUserTopTracks to return error
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: null, error: 'Failed to fetch top tracks' });

        // Render the DashboardPage
        renderDashboardPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // should display error message for top artists
        const artistError = screen.getByTestId('error-artists-indicator');
        expect(artistError).toHaveTextContent('Failed to fetch top artists');

        // should display error message for top tracks
        const trackError = screen.getByTestId('error-tracks-indicator');
        expect(trackError).toHaveTextContent('Failed to fetch top tracks');
    });

    test('displays error messages on fetch failure exceptions', async () => {
        // Mock fetchUserTopArtists to throw error
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockRejectedValue(new Error('Network error for artists'));
        // Mock fetchUserTopTracks to throw error
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockRejectedValue(new Error('Network error for tracks'));

        // Render the DashboardPage
        renderDashboardPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // should display error message for top artists
        const artistError = screen.getByTestId('error-artists-indicator');
        expect(artistError).toHaveTextContent('Network error for artists');

        // should display error message for top tracks
        const trackError = screen.getByTestId('error-tracks-indicator');
        expect(trackError).toHaveTextContent('Network error for tracks');
    });

    test('redirects to login on token expiration', async () => {
        // Mock fetchUserTopArtists to return token expired error
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: null, error: 'The access token expired' });
        // Mock fetchUserTopTracks to return token expired error
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: null, error: 'The access token expired' });

        // Render the DashboardPage
        renderDashboardPage();

        // Wait for loading to finish
        await waitForLoadingToFinish();

        // Verify redirection to login page
        expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    // --- Nouveaux tests ajoutés pour augmenter la couverture ---

    test('renders Learn more links with correct hrefs for artist and track', async () => {
        renderDashboardPage();
        await waitForLoadingToFinish();

        // Récupère tous les liens 'Learn more' et vérifie que les hrefs attendus sont présents
        const links = screen.getAllByRole('link');
        const hrefs = links.map(l => l.href);
        expect(hrefs).toEqual(
            expect.arrayContaining([
                topArtistData.items[0].external_urls.spotify,
                topTrackData.items[0].external_urls.spotify,
            ])
        );
    });

    test('handles missing images and genres gracefully', async () => {
        // Mock responses with missing images/genres/artists
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({
            data: { items: [{ id: 'a-noimg', name: 'ArtistNoImage', images: [], genres: [] }] },
            error: null,
        });
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({
            data: { items: [{ id: 't-noimg', name: 'TrackNoImage', album: { images: [] }, artists: [], external_urls: { spotify: 'https://open.spotify.com/track/t-noimg' } }] },
            error: null,
        });

        renderDashboardPage();
        await waitForLoadingToFinish();

        // Noms rendus correctement même si pas d'images/genres
        expect(screen.getByText('ArtistNoImage')).toBeInTheDocument();
        expect(screen.getByText('TrackNoImage')).toBeInTheDocument();

        // Pas d'éléments <img> avec ces alt texts (images manquantes) — ne doit pas planter
        expect(screen.queryByAltText('ArtistNoImage')).toBeNull();
        expect(screen.queryByAltText('TrackNoImage')).toBeNull();
    });

    test('handles API returning data null with no error (renders nothing for items)', async () => {
        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: null, error: null });
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: null, error: null });

        renderDashboardPage();
        await waitForLoadingToFinish();

        // Aucune erreur affichée et aucun item de test présent
        expect(screen.queryByTestId('error-artists-indicator')).toBeNull();
        expect(screen.queryByTestId('error-tracks-indicator')).toBeNull();
        expect(screen.queryByText(topArtistData.items[0].name)).toBeNull();
        expect(screen.queryByText(topTrackData.items[0].name)).toBeNull();
    });

    test('calls handleTokenError when token expired and redirects to login', async () => {
        // For this test, ensure handleTokenError is spied to confirm it is invoked
        const spyHandle = jest.spyOn(handleTokenUtil, 'handleTokenError');

        jest.spyOn(spotifyApi, 'fetchUserTopArtists').mockResolvedValue({ data: null, error: 'The access token expired' });
        jest.spyOn(spotifyApi, 'fetchUserTopTracks').mockResolvedValue({ data: null, error: 'The access token expired' });

        renderDashboardPage();
        await waitForLoadingToFinish();

        expect(spyHandle).toHaveBeenCalled();
        // Redirection vers la page de login (présence du contenu de la route /login)
        expect(screen.getByText('Login Page')).toBeInTheDocument();

        spyHandle.mockRestore();
    });
});