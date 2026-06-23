export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Validate master key — only admin can access
  const masterKey = req.headers['x-master-key'] || req.query.master;
  if (masterKey !== 'tharaujo2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPA_URL = 'https://yyksiowovekyqkocqshq.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY not configured' });
  }

  if (req.method === 'GET') {
    // List all participants with sensitive data
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/participantes?select=*&order=created_at`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PATCH') {
    // Reset de campo para todos (novo jogo extra)
    if (req.body?.resetField) {
      const field = req.body.resetField;
      const allowed = ['pago_unico', 'pago_unico2'];
      if (!allowed.includes(field)) return res.status(400).json({ error: 'Campo nao permitido' });
      try {
        await fetch(`${SUPA_URL}/rest/v1/participantes?id=neq.00000000-0000-0000-0000-000000000000`, {
          method: 'PATCH',
          headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: false })
        });
        return res.status(200).json({ reset: field });
      } catch(e) { return res.status(500).json({ error: e.message }); }
    }
    // Update participante especifico
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/participantes?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates)
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/participantes?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        }
      });
      return res.status(200).json({ deleted: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
