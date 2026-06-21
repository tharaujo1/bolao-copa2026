export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'MP_ACCESS_TOKEN not configured' });

  const { valor, nome, whats, descricao, modo } = req.body;
  if (!valor || !nome || !whats) {
    return res.status(400).json({ error: 'valor, nome e whats são obrigatórios' });
  }

  // external_reference: "11995564994|mata,unico" — survives intact through webhook
  const externalRef = `${whats}|${modo || 'mata'}`;

  try {
    const idempotencyKey = `bolao-${whats}-${modo}-${Date.now()}`;
    
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: parseFloat(valor),
        description: descricao || `Bolão Bradesco Copa 2026`,
        payment_method_id: 'pix',
        external_reference: externalRef,
        payer: {
          email: `${whats}@bolao.app`,
          first_name: nome.split(' ')[0],
          last_name: nome.split(' ').slice(1).join(' ') || 'Participante',
          identification: { type: 'CPF', number: '00000000000' }
        },
        notification_url: `https://bolao-copa2026-sigma.vercel.app/api/mp-webhook`,
        metadata: { whats, nome, modo }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Erro no Mercado Pago' });
    }

    const pixData = data.point_of_interaction?.transaction_data;
    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: pixData?.qr_code,
      qr_code_base64: pixData?.qr_code_base64,
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
