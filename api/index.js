require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let accessToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (!accessToken || Date.now() > tokenExpiresAt) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing Spotify credentials');
    }
    
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${creds}`, 
        'Content-Type': 'application/x-www-form-urlencoded' 
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!res.ok) {
      throw new Error('Failed to get Spotify token');
    }
    
    const data = await res.json();
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  }
  return accessToken;
}

function extractPlaylistId(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : url;
}

app.get('/api/tracks', async (req, res) => {
  try {
    const playlistUrl = req.query.url;
    if (!playlistUrl) {
      return res.status(400).json({ error: 'No playlist URL provided.' });
    }
    
    const playlistId = extractPlaylistId(playlistUrl);
    const token = await getSpotifyToken();

    const api = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
    const response = await fetch(api, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Could not fetch playlist. Please check the playlist URL and make sure it\'s public.' 
      });
    }
    
    const data = await response.json();
    if (!data.items) {
      return res.status(500).json({ error: 'Could not fetch playlist.' });
    }

    const tracks = data.items
      .map(item => item.track)
      .filter(track => track && track.preview_url)
      .map(track => ({
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        preview_url: track.preview_url
      }));

    res.json(tracks);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Server error. Please try again later.' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// For local development
if (process.env.NODE_ENV !== "production") {
  app.listen(4000, () => console.log('API running on http://localhost:4000'));
}

module.exports = app;