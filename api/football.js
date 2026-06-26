export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.query.path || '';
  const params = new URLSearchParams(req.query);
  params.delete('path');
  params.delete('key'); // legado

  // Usar API-Football (api-sports) com key da variavel de ambiente
  const apiKey = process.env.API_FOOTBALL_KEY;
  const url = `https://v3.football.api-sports.io/${path}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
        'x-rapidapi-key': apiKey,
      }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
