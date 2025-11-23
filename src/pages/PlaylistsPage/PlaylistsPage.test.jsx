// src/pages/PlaylistsPage.test.jsx

import { describe, expect, test } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PlaylistsPage, { limit } from './PlaylistsPage.jsx';
import * as spotifyApi from '../../api/spotify-me.js';
import * as tokenHandler from '../../utils/handleTokenError.js'; // <-- added import
import { beforeEach, afterEach, jest } from '@jest/globals';
import { KEY_ACCESS_TOKEN } from '../../constants/storageKeys.js';
import { buildTitle } from '../../constants/appMeta.js';

// Mock playlists data
const playlistsData = {
    items: [
        { id: 'playlist1', name: 'My Playlist 1', images: [{ url: 'https://via.placeholder.com/56' }], owner: { display_name: 'User1' }, tracks: { total: 5 }, external_urls: { spotify: 'https://open.spotify.com/playlist/playlist1' } },
        { id: 'playlist2', name: 'My Playlist 2', images: [{ url: 'https://via.placeholder.com/56' }], owner: { display_name: 'User2' }, tracks: { total: 10 }, external_urls: { spotify: 'https://open.spotify.com/playlist/playlist2' } },
    ],
    total: 2
};

// Mock token value
const tokenValue = 'test-token';

// Tests for PlaylistsPage
describe('PlaylistsPage', () => {
    // Setup mocks before each test
    beforeEach(() => {
        // Mock localStorage token access
        jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => key === KEY_ACCESS_TOKEN ? tokenValue : null);

        // Default mock: successful playlists fetch
        jest.spyOn(spotifyApi, 'fetchUserPlaylists').mockResolvedValue({ data: playlistsData, error: null });

        // Ajout: mock pour fetchUserPlaylistsCount afin de renvoyer le total attendu par le composant
        jest.spyOn(spotifyApi, 'fetchUserPlaylistsCount').mockResolvedValue({ data: { total: playlistsData.total }, error: null });
    });

    // Restore mocks after each test
    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Helper to render PlaylistsPage
    const renderPlaylistsPage = () => {
        return render(
            // render PlaylistsPage within MemoryRouter
            <MemoryRouter initialEntries={['/playlists']}>
                <Routes>
                    <Route path="/playlists" element={<PlaylistsPage />} />
                    {/* Dummy login route for redirection when token is expired */}
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    // Helper to wait for loading to finish
    const waitForLoadingToFinish = async () => {
        // initial loading state expectations
        expect(screen.getByRole('status')).toHaveTextContent(/loading playlists/i);
        await waitFor(() => {
            expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
        });
    };

    test('renders playlists page', async () => {
        // Render the PlaylistsPage
        renderPlaylistsPage();

        // Check document title
        expect(document.title).toBe(buildTitle('Playlists'));

        // wait for loading to finish
        await waitForLoadingToFinish();

        // when loading is done, verify playlists content rendered and api called correctly

        // should call fetchUserPlaylists with the token
        expect(spotifyApi.fetchUserPlaylists).toHaveBeenCalledTimes(1);
        expect(spotifyApi.fetchUserPlaylists).toHaveBeenCalledWith(tokenValue, limit);

        // should render a heading of level 1 with text 'Your Playlists'
        const heading = await screen.findByRole('heading', { level: 1, name: 'Your Playlists' });
        expect(heading).toBeInTheDocument();

        // Mise à jour: le texte du second titre inclut maintenant le total (ex: "10 of 2 Playlists")
        const expectedCountText = `${limit} of ${playlistsData.total} Playlists`; // commentaire: construit le texte attendu
        const countHeading = await screen.findByRole('heading', { level: 2, name: expectedCountText });
        expect(countHeading).toBeInTheDocument();

        // verify each playlist item rendered, don't check details here as covered in PlaylistItem tests
        for (const playlist of playlistsData.items) {
            expect(await screen.findByTestId(`playlist-item-${playlist.id}`)).toBeInTheDocument();
        }
    });

    test('displays error message on fetchUserPlaylists error', async () => {
        // Mock fetchUserPlaylists to return error
        jest.spyOn(spotifyApi, 'fetchUserPlaylists').mockResolvedValue({ data: { items: [], total: 0 }, error: 'Failed to fetch playlists' });

        // Render the PlaylistsPage
        renderPlaylistsPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // verify error message displayed
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Failed to fetch playlists');
    });

    test('displays error message on fetchUserPlaylists failure', async () => {
        // Mock fetchUserPlaylists to return error
        jest.spyOn(spotifyApi, 'fetchUserPlaylists').mockRejectedValue(new Error('Network error'));

        // Render the PlaylistsPage
        renderPlaylistsPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // verify error message displayed
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Network error');
    });

    test('redirects to login on token expiration', async () => {
        // Mock fetchUserPlaylists to return token expired error
        jest.spyOn(spotifyApi, 'fetchUserPlaylists').mockResolvedValue({ playlists: [], error: 'The access token expired' });

        // Render the PlaylistsPage
        renderPlaylistsPage();

        // Wait for loading to finish
        await waitForLoadingToFinish();

        // Verify redirection to login page
        expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    test('verify styling and accessibility attributes using role', async () => {
        // Render the PlaylistsPage
        renderPlaylistsPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // should have section landmark with appropriate class names
        const region = screen.getByRole('region', { name: `Your Playlists` });
        expect(region).toHaveClass('playlists-container', 'page-container');

        // should have heading level 1 with appropriate class name
        const heading1 = screen.getByRole('heading', { level: 1, name: `Your Playlists` });
        expect(heading1).toHaveClass('playlists-title', 'page-title');

        // Mise à jour: vérifier le heading level 2 avec le texte "{limit} of {total} Playlists"
        const expectedCountText = `${limit} of ${playlistsData.total} Playlists`; // commentaire: même construction que dans l'autre test
        const heading2 = screen.getByRole('heading', { level: 2, name: expectedCountText });
        expect(heading2).toHaveClass('playlists-count');

        // should have ordered list with appropriate class name
        const list = screen.getByRole('list');
        expect(list).toHaveClass('playlists-list');
    });

    test('displays error when fetchUserPlaylistsCount returns error payload', async () => {
        // Make handleTokenError return false so setError branch is taken
        jest.spyOn(tokenHandler, 'handleTokenError').mockReturnValue(false);
        // Mock count endpoint to return an error payload (res.error)
        jest.spyOn(spotifyApi, 'fetchUserPlaylistsCount').mockResolvedValue({ error: 'Count failed' });

        // Render the PlaylistsPage
        renderPlaylistsPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // verify error message displayed (from count handler)
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Count failed');
    });

    test('accepts top-level "total" shape from fetchUserPlaylistsCount', async () => {
        // Mock count endpoint to return { total: <number> }
        jest.spyOn(spotifyApi, 'fetchUserPlaylistsCount').mockResolvedValue({ total: playlistsData.total, error: null });

        // Render the PlaylistsPage
        renderPlaylistsPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // Verify the count heading uses the provided top-level total
        const expectedCountText = `${limit} of ${playlistsData.total} Playlists`;
        const countHeading = await screen.findByRole('heading', { level: 2, name: expectedCountText });
        expect(countHeading).toBeInTheDocument();
    });

    test('accepts primitive numeric response from fetchUserPlaylistsCount', async () => {
        // Mock count endpoint to return a primitive number (res is number)
        jest.spyOn(spotifyApi, 'fetchUserPlaylistsCount').mockResolvedValue(playlistsData.total);

        // Render the PlaylistsPage
        renderPlaylistsPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // Verify the count heading uses the primitive number
        const expectedCountText = `${limit} of ${playlistsData.total} Playlists`;
        const countHeading = await screen.findByRole('heading', { level: 2, name: expectedCountText });
        expect(countHeading).toBeInTheDocument();
    });

    test('displays error message when fetchUserPlaylistsCount rejects', async () => {
        // Mock count endpoint to reject
        jest.spyOn(spotifyApi, 'fetchUserPlaylistsCount').mockRejectedValue(new Error('Count network error'));

        // Render the PlaylistsPage
        renderPlaylistsPage();

        // wait for loading to finish
        await waitForLoadingToFinish();

        // verify error message displayed (caught in .catch -> setError(err.message))
        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Count network error');
    });
});
