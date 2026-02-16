// Script de teste do Mercado Pago
const { MercadoPagoConfig, Preference } = require('mercadopago');

const ACCESS_TOKEN = 'TEST-7110160495065661-021612-96302d97c5efe35126362d8e8bce63d8d-2234756754';

async function testMP() {
    try {
        console.log('🧪 Testando conexão com Mercado Pago...\n');

        const client = new MercadoPagoConfig({
            accessToken: ACCESS_TOKEN,
            options: { timeout: 5000 }
        });

        const preference = new Preference(client);

        console.log('📋 Criando preferência de teste...');

        const result = await preference.create({
            body: {
                items: [
                    {
                        id: 'test',
                        title: 'Teste de Pagamento',
                        quantity: 1,
                        currency_id: 'BRL',
                        unit_price: 1.00
                    }
                ],
                back_urls: {
                    success: 'https://cardapioclick.art/?status=success',
                    failure: 'https://cardapioclick.art/?status=failure',
                    pending: 'https://cardapioclick.art/?status=pending'
                },
                auto_return: 'approved'
            }
        });

        console.log('\n✅ SUCESSO!');
        console.log('🔗 URL de pagamento:', result.init_point);
        console.log('\n🎉 Suas credenciais estão funcionando!');

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.error('\n📄 Detalhes:', error);

        if (error.status === 403) {
            console.log('\n⚠️  Erro 403 - Possíveis soluções:');
            console.log('1. Verifique se a aplicação está ativa no painel do MP');
            console.log('2. Verifique se sua conta MP está verificada');
            console.log('3. Tente criar uma NOVA aplicação no painel');
            console.log('4. Entre em contato com o suporte do Mercado Pago');
        }
    }
}

testMP();
