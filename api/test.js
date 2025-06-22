export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.json({ 
      status: 'API is working',
      timestamp: new Date().toISOString(),
      env: {
        clientId: process.env.SPOTIFY_CLIENT_ID ? 'Present' : 'Missing',
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET ? 'Present' : 'Missing'
      }
    });
  }