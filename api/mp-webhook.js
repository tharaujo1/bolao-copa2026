import crypto from 'crypto';

const SUPA_URL = 'https://yyksiowovekyqkocqshq.supabase.co';

async function supaRequest(path, method = 'GET', body = null) {
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const opts = {
    method,
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  return r;
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Validate MP signature
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (secret) {
      const xSignature = req.headers['x-signature'];
      const xRequestId = req.headers['x-request-id'];
      const dataId = req.query['data.id'] || req.body?.data?.id;

      if (xSignature) {
        const parts = xSignature.split(',');
        let ts = '', v1 = '';
        parts.forEach(p => {
          const [k, v] = p.trim().split('=');
          if (k === 'ts') ts = v;
          if (k === 'v1') v1 = v;
        });
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
        if (hmac !== v1) {
          console.error('Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }
    }

    const body = req.body;
    const type = body.type || body.action;
    const paymentId = body.data?.id || body.id;

    console.log('Webhook type:', type, 'paymentId:', paymentId);

    if ((type === 'payment' || type === 'payment.created' || type === 'payment.updated') && paymentId) {
      const token = process.env.MP_ACCESS_TOKEN;
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payment = await mpRes.json();
      console.log('Payment status:', payment.status, 'metadata:', payment.metadata);

      if (payment.status === 'approved') {
        const whats = payment.metadata?.whats || req.query.whats;
        if (whats) {
          // Mark as paid
          await supaRequest(
            `participantes?whats=eq.${whats}`,
            'PATCH',
            { pago: true }
          );
          // Auto-activate palpites
          await supaRequest(
            `palpites_mata?whats=eq.${whats}&status=eq.pendente`,
            'PATCH',
            { status: 'ativo' }
          );
          await supaRequest(
            `palpites_unico?whats=eq.${whats}&status=eq.pendente`,
            'PATCH',
            { status: 'ativo' }
          );
          // Add feed event
          await supaRequest('feed', 'POST', {
            icon: '💰',
            texto: `Pagamento confirmado via Pix!`,
            hora: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
          });
          console.log(`✅ Participante ${whats} ativado!`);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(200).json({ received: true });
  }
}
