export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const apiKey = process.env.API_FOOTBALL_KEY;
  const endpoint = req.query.endpoint || 'fixtures';
  const params = new URLSearchParams(req.query);
  params.delete('endpoint');
  
  const url = `https://v3.football.api-sports.io/${endpoint}?${params.toString()}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
      }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
