# Secrets — Integração Business Central

Este documento lista todos os secrets necessários para a integração BC e onde configurá-los.

---

## Secrets da Edge Function (`supabase secrets set`)

Configurar com o CLI do Supabase antes de fazer deploy:

```bash
supabase secrets set \
  PA_BC_FLOW_URL="https://prod-XX.westeurope.logic.azure.com/workflows/..." \
  PA_API_KEY="chave-api-secreta-do-flow" \
  BC_COMPANY_ID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

| Secret | Descrição | Onde obter |
|---|---|---|
| `PA_BC_FLOW_URL` | URL HTTP do Power Automate Flow (trigger) | Copiar do trigger do Flow após guardar |
| `PA_API_KEY` | Chave API para autenticar pedidos ao Flow | Definido na configuração do trigger do Flow |
| `BC_COMPANY_ID` | GUID da empresa em Business Central | BC → Configuração → Informações da empresa → ID |

> **Nota:** Os secrets são encriptados em repouso e nunca expostos no frontend.

---

## Secrets do Supabase (automáticos)

Estes secrets já existem no ambiente Supabase e são injectados automaticamente:

| Secret | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projecto Supabase |
| `SUPABASE_ANON_KEY` | Chave anónima (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (privilegiada) — usada para cache |

---

## Variáveis de ambiente Frontend (`.env`)

Copiar `.env.example` para `.env` e preencher:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_PROJECT_ID` | ID do projecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anónima pública |

> O frontend **não** precisa de acesso directo ao BC ou ao Power Automate.
> Toda a comunicação passa pela Edge Function `bc-integration`.

---

## Verificar secrets configurados

```bash
# Listar secrets do projecto (valores ocultados)
supabase secrets list

# Exemplo de output esperado:
# PA_BC_FLOW_URL  *****
# PA_API_KEY      *****
# BC_COMPANY_ID   *****
```

---

## Rotação de secrets

1. Gerar nova chave/URL
2. `supabase secrets set PA_API_KEY="nova-chave"`
3. Actualizar também na configuração do Power Automate Flow
4. Não é necessário fazer redeploy da Edge Function (os secrets são lidos em runtime)

---

## Segurança

- **Nunca** fazer commit do ficheiro `.env`
- **Nunca** expor `PA_BC_FLOW_URL` ou `PA_API_KEY` no código frontend
- Usar sempre autenticação JWT na Edge Function (`validateAuth` em `_shared/auth.ts`)
- Activar RLS nas tabelas `bc_cache` e `bc_audit_log` (incluído na migration)
