export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const apiKey = req.query.key || 'dd75372991dd4b50b51a27204b532a99';
  
  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches?stage=ROUND_OF_32', {
      headers: { 'X-Auth-Token': apiKey }
    });
    const data = await response.json();
    res.status(response.status).json({
      status: response.status,
      count: data.matches?.length || 0,
      error: data.message || null,
      sample: data.matches?.slice(0,3).map(m=>({
        id: m.id,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        date: m.utcDate,
        status: m.status
      })) || []
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
