export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' });

  const { valor, nome, whats, descricao } = req.body;
  if (!valor || !nome || !whats) {
    return res.status(400).json({ error: 'valor, nome e whats são obrigatórios' });
  }

  try {
    // Create Pix payment via MP Orders API
    const idempotencyKey = `bolao-${whats}-${Date.now()}`;
    
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: parseFloat(valor),
        description: descricao || `Bolão Bradesco Copa 2026 — ${nome}`,
        payment_method_id: 'pix',
        payer: {
          email: `${whats}@bolao.bradesco.app`,
          first_name: nome.split(' ')[0],
          last_name: nome.split(' ').slice(1).join(' ') || 'Participante',
          identification: {
            type: 'CPF',
            number: '00000000000' // placeholder — not required for Pix
          }
        },
        notification_url: `https://bolao-copa2026-sigma.vercel.app/api/mp-webhook?whats=${whats}&valor=${valor}`,
        metadata: {
          whats,
          nome,
          valor,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MP Error:', data);
      return res.status(response.status).json({ error: data.message || 'Erro no Mercado Pago', details: data });
    }

    // Return QR code and copia e cola
    const pixData = data.point_of_interaction?.transaction_data;
    
    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: pixData?.qr_code,
      qr_code_base64: pixData?.qr_code_base64,
      ticket_url: pixData?.ticket_url,
    });

  } catch (error) {
    console.error('Error creating Pix:', error);
    return res.status(500).json({ error: error.message });
  }
}
