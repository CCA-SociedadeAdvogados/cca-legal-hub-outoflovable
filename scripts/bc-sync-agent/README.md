# BC Sync Agent — CCA Legal Hub

Script local que sincroniza dados do **Microsoft Dynamics 365 Business Central 14.0 (on-premises)** para as tabelas Supabase do CCA Legal Hub.

## Arquitetura

```
[BC Server (rede interna)]
  → (Basic Auth, OData v4)
[este script - corre na rede interna]
  → (HTTPS, service_role key)
[Supabase Cloud]
  → bc_customers, bc_accounts, bc_ledger
```

## Pré-requisitos

- Node.js >= 18
- Acesso à rede interna onde o BC server está
- Chave de serviço Supabase (`service_role`) — não usar a `anon` key
- Utilizador do BC com permissões de leitura nas tabelas `customers`, `Account`, `arq_ledger`

## Instalação

```bash
cd scripts/bc-sync-agent
cp .env.example .env
# editar .env com as credenciais corretas
npm install
```

## Configuração

Editar o ficheiro `.env`:

| Variável | Descrição |
|---|---|
| `BC_URL` | URL base do servidor BC, ex: `http://10.110.250.30:2053/BC140WS` |
| `BC_COMPANY_GUID` | GUID da empresa BC (do URL da API) |
| `BC_USERNAME` | Utilizador do BC |
| `BC_PASSWORD` | Web Service Access Key do utilizador |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (Settings > API no Supabase) |
| `ORGANIZATION_ID` | UUID da organização no CCA Legal Hub |

**Nota:** A organização deve ter a configuração BC ativa no CCA Legal Hub antes de executar o agente (Definições > Business Central).

## Uso

```bash
# Sync completo
node sync.js

# Simulação (sem escrever no Supabase)
node sync.js --dry-run

# ou via npm
npm start
npm run dry-run
```

## Tabelas sincronizadas

| Endpoint BC | Tabela Supabase | Descrição |
|---|---|---|
| `customers` | `bc_customers` | Clientes |
| `Account` | `bc_accounts` | Contas do plano de contas |
| `arq_ledger` | `bc_ledger` | Lançamentos da conta corrente |

## Agendamento automático

### Windows (Task Scheduler)
```batch
schtasks /create /sc hourly /tn "CCA BC Sync" /tr "node C:\caminho\bc-sync-agent\sync.js" /st 00:00
```

### Linux/macOS (cron) — a cada hora
```cron
0 * * * * cd /caminho/bc-sync-agent && node sync.js >> /var/log/bc-sync.log 2>&1
```

### PM2 (recomendado para Linux)
```bash
npm install -g pm2
pm2 start sync.js --name bc-sync --cron "0 * * * *"
pm2 save
pm2 startup
```

## Segurança

- **Nunca** fazer commit do ficheiro `.env` (está no `.gitignore`)
- Usar sempre a `service_role` key do Supabase (não a `anon` key)
- O utilizador do BC deve ter apenas permissões de leitura
- A chave do BC (`BC_PASSWORD`) é a **Web Service Access Key**, não a palavra-passe de Windows
