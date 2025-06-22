import fetch from 'node-fetch';

let accessToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (!accessToken || Date.now() > tokenExpiresAt) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    console.log('Getting Spotify token...');
    console.log('Client ID:', clientId ? 'Present' : 'Missing');
    console.log('Client Secret:', clientSecret ? 'Present' : 'Missing');
    
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
    
    console.log('Token response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Token error:', errorText);
      throw new Error('Failed to get Spotify token: ' + errorText);
    }
    
    const data = await res.json();
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    console.log('Token obtained successfully');
  }
  return accessToken;
}

function extractPlaylistId(url) {
  console.log('Input URL:', url);
  
  const patterns = [
    /playlist\/([a-zA-Z0-9]+)/,
    /playlist:([a-zA-Z0-9]+)/,
    /^([a-zA-Z0-9]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      console.log('Extracted playlist ID:', match[1]);
      return match[1];
    }
  }
  
  console.log('Could not extract playlist ID from URL');
  return null;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const playlistUrl = req.query.url;
    console.log('=== NEW REQUEST ===');
    console.log('Received URL:', playlistUrl);
    
    if (!playlistUrl) {
      return res.status(400).json({ error: 'No playlist URL provided.' });
    }
    
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      return res.status(400).json({ 
        error: 'Invalid playlist URL format. Please use a valid Spotify playlist URL.' 
      });
    }
    
    const token = await getSpotifyToken();
    console.log('Using token:', token ? 'Present' : 'Missing');

    const api = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`;
    console.log('API URL:', api);
    
    const response = await fetch(api, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    
    console.log('Spotify API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify API error:', errorText);
      
      if (response.status === 404) {
        return res.status(404).json({ 
          error: 'Playlist not found. Make sure the playlist exists and is public.' 
        });
      } else if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Authentication failed. Please check Spotify API credentials.' 
        });
      } else if (response.status === 403) {
        return res.status(403).json({ 
          error: 'Access forbidden. Make sure the playlist is public.' 
        });
      }
      
      return res.status(response.status).json({ 
        error: `Spotify API error (${response.status}): ${errorText}` 
      });
    }
    
    const data = await response.json();
    console.log('Received data keys:', Object.keys(data));
    console.log('Items count:', data.items ? data.items.length : 'No items');
    
    if (!data.items) {
      return res.status(500).json({ error: 'No items in playlist response.' });
    }

    const tracks = data.items
      .map(item => {
        if (!item.track) {
          console.log('Item has no track:', item);
          return null;
        }
        return item.track;
      })
      .filter(track => track !== null)
      .filter(track => {
        const hasPreview = !!track.preview_url;
        if (!hasPreview) {
          console.log('Track without preview:', track.name, 'by', track.artists?.[0]?.name);
        }
        return hasPreview;
      })
      .map(track => ({
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        preview_url: track.preview_url
      }));

    console.log('Final tracks count:', tracks.length);
    console.log('Sample track:', tracks[0]);

    res.json(tracks);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Server error: ' + error.message 
    });
  }
}