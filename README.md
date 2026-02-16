# Backend - Sistema de Pagamentos Mercado Pago

Este servidor processa os pagamentos do Mercado Pago para o Cardápio Click.

## 🚀 Como usar

### Desenvolvimento Local

1. Crie um arquivo `.env` na pasta `server/` com:

```env
SUPABASE_URL=sua-url-supabase
SUPABASE_SERVICE_ROLE_KEY=sua-chave-supabase
MP_ACCESS_TOKEN=seu-token-mercado-pago
PORT=3000
```

2. Instale as dependências:
```bash
cd server
npm install
```

3. Inicie o servidor:
```bash
npm start
```

### Deploy no Render.com

Veja o arquivo `guia_configuracao.md` no diretório `brain` para instruções completas.

## 📡 Endpoints

- `GET /api/status` - Verifica se o servidor está online
- `POST /api/create-checkout` - Cria uma preferência de pagamento no MP
- `POST /api/webhook` - Recebe notificações do Mercado Pago

## 🔧 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role do Supabase |
| `MP_ACCESS_TOKEN` | Access Token do Mercado Pago (opcional) |
| `WEBHOOK_URL` | URL pública do backend |
| `PORT` | Porta do servidor (padrão: 3000) |

> **Nota:** O `MP_ACCESS_TOKEN` pode ser configurado diretamente no banco de dados através do painel admin, então é opcional aqui.
