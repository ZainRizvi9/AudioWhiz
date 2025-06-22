
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

let accessToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (!accessToken || Date.now() > tokenExpiresAt) {
    const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
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

app.get('/tracks', async (req, res) => {
  const playlistUrl = req.query.url;
  if (!playlistUrl) return res.status(400).json({ error: 'No playlist URL provided.' });
  const playlistId = extractPlaylistId(playlistUrl);
  const token = await getSpotifyToken();

  const api = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
  const response = await fetch(api, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!data.items) return res.status(500).json({ error: 'Could not fetch playlist.' });

  const tracks = data.items
    .map(item => item.track)
    .filter(track => track && track.preview_url)
    .map(track => ({
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      preview_url: track.preview_url
    }));

  res.json(tracks);
});

if (process.env.NODE_ENV !== "serverless") {
  app.listen(4000, () => console.log('API running on http://localhost:4000'));
}

module.exports = app;
