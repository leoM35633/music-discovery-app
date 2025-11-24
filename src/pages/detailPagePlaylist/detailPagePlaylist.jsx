import { useState, useEffect } from 'react';
import { buildTitle } from '../../constants/appMeta.js';
import { useRequireToken } from '../../hooks/useRequireToken.js';
import { fetchPlaylistById } from '../../api/spotify-playlists.js';
import { handleTokenError } from '../../utils/handleTokenError.js';
import '../PageLayout.css';
import { useNavigate, useParams } from 'react-router-dom';


export default function PlaylistPage() {
    const { id } = useParams();
    // require token to fetch playlists
    const { token } = useRequireToken();

    return (
        <div>
            Playlist Page
            <div>ID dans l'URL: {id ?? 'aucun id'}</div>
        </div>
    );
}