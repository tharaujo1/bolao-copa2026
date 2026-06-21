export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = req.query.key;
  const path = req.query.path || 'matches';
  const params = new URLSearchParams(req.query);
  params.delete('key');
  params.delete('path');

  const url = `https://api.football-data.org/v4/${path}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': apiKey }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
