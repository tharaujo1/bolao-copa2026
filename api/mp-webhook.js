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
  return fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body;
    const type = body.type || body.action;
    const paymentId = body.data?.id || body.id;

    if ((type === 'payment' || type === 'payment.updated' || type === 'payment.created') && paymentId) {
      const token = process.env.MP_ACCESS_TOKEN;
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const payment = await mpRes.json();

      if (payment.status === 'approved') {
        // Parse external_reference: "11995564994|mata,unico,unico2"
        const extRef = payment.external_reference || '';
        let whats, modos;

        if (extRef.includes('|')) {
          const parts = extRef.split('|');
          whats = parts[0];
          modos = parts[1].split(','); // ['mata'], ['unico'], ['mata','unico'], etc
        } else {
          // Fallback to metadata
          whats = payment.metadata?.whats;
          const modo = payment.metadata?.modo || 'mata';
          modos = modo.split(',');
        }

        if (whats) {
          // Mark as paid (legacy field)
          await supaRequest(`participantes?whats=eq.${whats}`, 'PATCH', { pago: true });

          // Gravar campos específicos por bolão
          const pagoFields = {};
          // Extrair jogo_ids do external_reference (formato: whats|modos|base64jogoIds)
          let jogoIds = {};
          try {
            const parts = externalReference.split('|');
            if (parts[2]) {
              jogoIds = JSON.parse(Buffer.from(parts[2], 'base64').toString('utf-8'));
            }
          } catch(e) {}

          if (modos.includes('mata')) pagoFields.pago_mata = true;
          if (modos.includes('unico')) {
            pagoFields.pago_unico = true;
            if (jogoIds.unico) pagoFields.pago_unico_jogo_id = jogoIds.unico;
          }
          if (modos.includes('unico2')) {
            pagoFields.pago_unico2 = true;
            if (jogoIds.unico2) pagoFields.pago_unico2_jogo_id = jogoIds.unico2;
          }
          if (Object.keys(pagoFields).length > 0) {
            await supaRequest(`participantes?whats=eq.${whats}`, 'PATCH', pagoFields);
          }

          // Activate each selected bolão
          for (const modo of modos) {
            if (modo === 'mata') {
              await supaRequest(
                `palpites_mata?whats=eq.${whats}&status=eq.pendente`,
                'PATCH', { status: 'ativo' }
              );
            } else if (modo === 'unico') {
              await supaRequest(
                `palpites_unico?whats=eq.${whats}&status=eq.pendente&jogo_extra_id=neq.jogo2`,
                'PATCH', { status: 'ativo' }
              );
            } else if (modo === 'unico2') {
              await supaRequest(
                `palpites_unico?whats=eq.${whats}&status=eq.pendente&jogo_extra_id=eq.jogo2`,
                'PATCH', { status: 'ativo' }
              );
            }
          }

          // Add feed
          const modosLabel = modos.map(m => m === 'mata' ? 'Mata-Mata' : m === 'unico2' ? 'Extra 2' : 'Extra').join(' + ');
          await supaRequest('feed', 'POST', {
            icon: '💰',
            texto: `Pix confirmado — ${modosLabel}`,
            hora: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
          });

          console.log(`✅ ${whats} ativado: ${modos.join(',')}`);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(200).json({ received: true });
  }
}
