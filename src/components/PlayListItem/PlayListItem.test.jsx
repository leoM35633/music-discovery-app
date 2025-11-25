// src/components/PlayListItem.test.jsx

import { describe, expect, test } from '@jest/globals'
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PlayListItem from './PlayListItem';

describe('PlayListItem component', () => {
    test('renders playlist information correctly', () => {
        // Arrange
        const playlist = {
            id: 'playlist1',
            name: 'Test Playlist',
            images: [{ url: 'test.jpg' }],
            owner: { display_name: 'Test Owner' },
            tracks: { total: 15 },
            external_urls: { spotify: 'https://open.spotify.com/playlist/playlist1' }
        };
        // Act
        render(<PlayListItem playlist={playlist} />);

        // Assert
        // items are rendered correctly
        expect(screen.getByTestId(`playlist-item-${playlist.id}`)).toBeInTheDocument();
        // image is rendered correctly
        expect(screen.getByAltText('cover')).toHaveAttribute('src', playlist.images[0].url);
        // text content is rendered correctly
        expect(screen.getByText(playlist.name)).toBeInTheDocument();
        // owner name is rendered correctly
        expect(screen.getByText(`By ${playlist.owner.display_name}`)).toBeInTheDocument();
        // track count is rendered correctly
        expect(screen.getByText(`${playlist.tracks.total} tracks`)).toBeInTheDocument();

        // Handle multiple links: external Spotify link + internal route link
        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThanOrEqual(2);
        // at least one link points to the external Spotify URL
        expect(links.some(l => l.getAttribute('href') === playlist.external_urls.spotify)).toBeTruthy();
        // at least one link points to the internal playlist route (path may be relative)
        expect(links.some(l => l.getAttribute('href')?.includes(`/playlist/${playlist.id}`))).toBeTruthy();
    });
});
