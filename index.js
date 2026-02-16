// dotenv não é necessário no Render - as variáveis vêm do Environment
// require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// SEU DOMÍNIO FRONTEND
const MY_DOMAIN = 'https://cardapioclick.art';

app.use(cors({
  origin: [MY_DOMAIN, 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- HELPER PARA CONFIGURAÇÃO DO MERCADO PAGO ---
const getMpClient = async (reqToken = null) => {
  let accessToken = reqToken;

  console.log('🔎 Debug Token MP:');
  console.log('  - Token do request:', reqToken ? 'SIM (tamanho: ' + reqToken.length + ')' : 'NÃO');

  // Se não veio na requisição, busca do banco (Configuração Global)
  if (!accessToken) {
    try {
      const { data: row } = await supabase.from('usage_data').select('content').eq('id', 1).single();
      if (row?.content?.mpAccessToken) {
        accessToken = row.content.mpAccessToken;
        console.log('  - Token do Supabase:', accessToken ? 'SIM (tamanho: ' + accessToken.length + ')' : 'NÃO');
      } else {
        console.log('  - Token do Supabase: NÃO ENCONTRADO');
      }
    } catch (e) {
      console.error("  - Erro ao buscar token MP do banco:", e.message);
    }
  }

  // Fallback para ENV
  if (!accessToken) {
    accessToken = process.env.MP_ACCESS_TOKEN;
    console.log('  - Token do ENV:', accessToken ? 'SIM (tamanho: ' + accessToken.length + ')' : 'NÃO');
  }

  if (!accessToken) {
    console.error('  ❌ NENHUM TOKEN ENCONTRADO!');
    return null;
  }

  console.log('  ✅ Token final (primeiros 20 chars):', accessToken.substring(0, 20) + '...');
  return new MercadoPagoConfig({ accessToken: accessToken });
};

// --- ROTA DE STATUS ---
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'online', msg: 'Backend Mercado Pago Operacional' });
});

// --- CRIAR PREFERÊNCIA DE PAGAMENTO ---
app.post('/api/create-checkout', async (req, res) => {
  try {
    const { title, price, credits, email, mpAccessToken } = req.body;

    if (!email || !price) return res.status(400).json({ error: 'Dados incompletos.' });

    const client = await getMpClient(mpAccessToken);
    if (!client) return res.status(500).json({ error: 'Mercado Pago não configurado (Access Token ausente).' });

    const preference = new Preference(client);

    // URL deste Backend para Webhook
    const backendUrl = process.env.WEBHOOK_URL || `${req.protocol}://${req.get('host')}`;

    const result = await preference.create({
      body: {
        items: [
          {
            id: 'credits-pack',
            title: `Créditos Cardápio Click - ${title}`,
            description: `Recarga de ${credits || 'créditos'} no sistema`,
            category_id: 'digital_content',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(price)
          }
        ],
        payer: {
          email: email
        },
        back_urls: {
          success: `${MY_DOMAIN}/?status=success`,
          failure: `${MY_DOMAIN}/?status=failure`,
          pending: `${MY_DOMAIN}/?status=pending`
        },
        auto_return: 'approved',
        notification_url: `${backendUrl}/api/webhook`,
        statement_descriptor: 'CARDAPIO CLICK',
        external_reference: `credits_${email}_${Date.now()}`,
        metadata: {
          user_email: email,
          credits: credits,
          ts: Date.now()
        }
      }
    });

    if (result.init_point) {
      res.json({ paymentUrl: result.init_point }); // init_point é a URL do checkout
    } else {
      throw new Error('Falha ao gerar URL de pagamento.');
    }

  } catch (error) {
    console.error('Erro MP Create:', error);
    res.status(500).json({ error: 'Erro ao comunicar com Mercado Pago.', details: error.message });
  }
});

// --- WEBHOOK MERCADO PAGO ---
app.post('/api/webhook', async (req, res) => {
  const { query, body } = req;

  // O Mercado Pago envia o ID no query (data.id) ou no body dependendo da versão do webhook
  // Geralmente topic=payment ou type=payment
  const topic = query.topic || query.type;
  const id = query.id || query['data.id'] || body?.data?.id;

  if (topic === 'payment' && id) {
    processarPagamentoMP(id);
  }

  // Responder rápido para o MP não ficar tentando de novo
  res.status(200).send('OK');
});

async function processarPagamentoMP(paymentId) {
  try {
    const client = await getMpClient();
    if (!client) return;

    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });

    // Verifica se aprovado
    if (paymentData.status === 'approved') {
      const metadata = paymentData.metadata;
      // O Mercado Pago converte metadata keys para lowercase automaticamente
      const email = metadata.user_email;
      const credits = Number(metadata.credits);

      console.log(`MP Pago: ${paymentId} | ${email} | +${credits}`);

      if (!email || !credits) return;

      // Lógica de liberação no Supabase
      const { data: row } = await supabase.from('usage_data').select('content').eq('id', 1).single();
      if (!row) return;

      let content = row.content;

      // Idempotência: Evitar creditar duas vezes o mesmo ID
      if (content.logs.some(l => l.paymentId === String(paymentId))) {
        console.log('Pagamento duplicado (já processado).');
        return;
      }

      const userIndex = content.users.findIndex(u => u.email === email);
      if (userIndex !== -1) {
        content.users[userIndex].credits += credits;
        content.logs.unshift({
          timestamp: new Date().toISOString(),
          action: `MP: Pagamento Confirmado (+${credits})`,
          cost: 0,
          userEmail: email,
          paymentId: String(paymentId),
          isPayment: true
        });

        await supabase.from('usage_data').update({ content, updated_at: new Date().toISOString() }).eq('id', 1);
        console.log('Créditos entregues com sucesso.');
      }
    }
  } catch (e) {
    console.error("Erro processar webhook MP:", e);
  }
}

app.listen(port, () => {
  console.log(`Backend Mercado Pago rodando na porta ${port}`);
});
