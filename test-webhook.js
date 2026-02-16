// Teste manual do webhook
const https = require('https');

const data = JSON.stringify({
    action: "payment.created",
    data: { id: "123456789" }
});

const options = {
    hostname: 'cardapio-backend-k3oj.onrender.com',
    port: 443,
    path: '/api/webhook?topic=payment&id=123456789',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);

    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error('Erro:', error);
});

req.write(data);
req.end();

console.log('✅ Teste de webhook enviado!');
console.log('📋 Agora verifique os logs do Render em:');
console.log('   https://dashboard.render.com');
console.log('');
console.log('Deve aparecer:');
console.log('   🔔 Webhook recebido do Mercado Pago!');
