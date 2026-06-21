// Public login endpoint — only returns nome for a given whats number
// Does NOT require master key — used by all users to log in
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const whats = req.query.whats;
  if (!whats) return res.status(400).json({ error: 'whats required' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const SUPA_URL = 'https://yyksiowovekyqkocqshq.supabase.co';

  try {
    // Only return nome — no sensitive data exposed
    const r = await fetch(
      `${SUPA_URL}/rest/v1/participantes?whats=eq.${whats}&select=nome,whats`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      }
    );
    const data = await r.json();
    const found = data?.[0] || null;
    
    if (found) {
      return res.status(200).json({ found: true, nome: found.nome, whats: found.whats });
    } else {
      return res.status(200).json({ found: false });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
