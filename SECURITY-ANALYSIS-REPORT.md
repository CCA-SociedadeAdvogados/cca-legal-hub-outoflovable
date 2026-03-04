# Relatório de Análise de Segurança — CCA Legal Hub

**Data:** 2026-03-04
**Tipo:** Análise estática de segurança (pentest de código)
**Scope:** Codebase completo (frontend React + Supabase Edge Functions + migrações DB)
**Ação:** Nenhuma alteração realizada — apenas identificação de vulnerabilidades

---

## Resumo Executivo

A análise identificou **6 vulnerabilidades críticas**, **8 de severidade alta**, **9 de severidade média** e **5 de severidade baixa**. As áreas de maior risco são:

1. **Configuração CORS permissiva** em todas as Edge Functions
2. **Políticas RLS abertas** na tabela `contract_extractions`
3. **Credenciais expostas** no ficheiro `.env` commitado no repositório
4. **Conta demo com privilégios de superadmin**
5. **Ausência de CSP (Content Security Policy)**
6. **Passwords expostas em respostas API**

---

## Índice

1. [Vulnerabilidades Críticas](#1-vulnerabilidades-críticas)
2. [Vulnerabilidades de Severidade Alta](#2-vulnerabilidades-de-severidade-alta)
3. [Vulnerabilidades de Severidade Média](#3-vulnerabilidades-de-severidade-média)
4. [Vulnerabilidades de Severidade Baixa](#4-vulnerabilidades-de-severidade-baixa)
5. [Pontos Positivos de Segurança](#5-pontos-positivos-de-segurança)
6. [Plano de Remediação](#6-plano-de-remediação)

---

## 1. Vulnerabilidades Críticas

### 1.1 CORS Wildcard em Todas as Edge Functions

| Campo | Detalhe |
|-------|---------|
| **Severidade** | CRÍTICA |
| **Localização** | Todas as 21 Edge Functions em `supabase/functions/` |
| **OWASP** | A05:2021 — Security Misconfiguration |

**Descrição:** Todas as Edge Functions utilizam `Access-Control-Allow-Origin: "*"`, incluindo funções sensíveis de autenticação e administração.

**Ficheiros afetados:**
- `supabase/functions/sso-cca/index.ts`
- `supabase/functions/secure-login/index.ts`
- `supabase/functions/demo-login/index.ts`
- `supabase/functions/admin-create-user/index.ts`
- `supabase/functions/admin-delete-user/index.ts`
- `supabase/functions/admin-update-user-email/index.ts`
- Todas as restantes Edge Functions

**Risco:** Qualquer origem pode efetuar pedidos a estas funções, permitindo ataques CSRF e acesso cross-origin não autorizado.

**Remediação necessária:**
- Restringir `Access-Control-Allow-Origin` ao domínio do frontend
- Usar variáveis de ambiente para configurar origens por ambiente
- Manter restrições CORS no `config.toml`

---

### 1.2 Políticas RLS Abertas na Tabela `contract_extractions`

| Campo | Detalhe |
|-------|---------|
| **Severidade** | CRÍTICA |
| **Localização** | `supabase/migrations/20260218114700_*.sql` |
| **OWASP** | A01:2021 — Broken Access Control |

**Descrição:** A tabela `contract_extractions` tem políticas RLS completamente abertas:

```sql
CREATE POLICY "ce_select" ON public.contract_extractions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ce_insert" ON public.contract_extractions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ce_update" ON public.contract_extractions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ce_delete" ON public.contract_extractions FOR DELETE TO authenticated USING (true);
```

**Risco:** Qualquer utilizador autenticado pode ler, modificar e eliminar dados de extração de contratos de QUALQUER organização. Isto inclui NIFs, termos financeiros e dados pessoais.

**Remediação necessária:**
- Substituir `USING (true)` por verificação de organização:
  ```sql
  USING (EXISTS (SELECT 1 FROM contratos c
    WHERE c.id = contract_extractions.contrato_id
    AND c.organization_id = (SELECT current_organization_id FROM profiles WHERE id = auth.uid())))
  ```

---

### 1.3 Chaves Supabase Expostas no Repositório

| Campo | Detalhe |
|-------|---------|
| **Severidade** | CRÍTICA |
| **Localização** | `.env` |
| **OWASP** | A07:2021 — Identification and Authentication Failures |

**Descrição:** O ficheiro `.env` contém a chave publishable do Supabase, o Project ID e o URL do projeto, todos commitados no repositório Git.

**Risco:** Qualquer pessoa com acesso ao repositório pode usar estas credenciais para aceder ao backend Supabase. Combinado com políticas RLS fracas, isto permite acesso não autorizado a dados.

**Remediação necessária:**
- Revogar imediatamente as chaves expostas no dashboard Supabase
- Gerar novas chaves
- Remover o `.env` do histórico Git com `git filter-branch` ou BFG Repo-Cleaner
- Garantir que `.env` está no `.gitignore` (já está, mas o ficheiro já foi commitado)

---

### 1.4 Conta Demo com Privilégios de Superadmin

| Campo | Detalhe |
|-------|---------|
| **Severidade** | CRÍTICA |
| **Localização** | `supabase/functions/demo-login/index.ts` (linhas 127-145) |
| **OWASP** | A01:2021 — Broken Access Control |

**Descrição:** A conta demo é automaticamente promovida a platform admin (superadmin), permitindo acesso total ao sistema:

```typescript
if (!existingPlatformAdmin) {
  await supabaseAdmin.from("platform_admins")
    .insert({ user_id: userId, notes: "Demo superadmin account" });
}
```

**Risco:** Se a funcionalidade demo estiver ativa em produção, qualquer pessoa pode fazer login com privilégios totais — criar/eliminar utilizadores, aceder a todos os contratos, modificar organizações.

**Remediação necessária:**
- Restringir conta demo a operações read-only
- Criar role "demo" com permissões limitadas
- Criar organização demo isolada
- Adicionar alertas caso demo seja ativado em produção

---

### 1.5 Passwords Expostas em Respostas API

| Campo | Detalhe |
|-------|---------|
| **Severidade** | CRÍTICA |
| **Localização** | `supabase/functions/admin-create-user/index.ts` (linha 216) |
| **OWASP** | A07:2021 — Identification and Authentication Failures |

**Descrição:** A função de criação de utilizadores retorna a password em texto claro na resposta API:

```typescript
return new Response(JSON.stringify({
  credentials: { email: newUser.user.email, password: userPassword }
}));
```

**Risco:** Passwords visíveis em logs de rede, histórico do browser, logs do servidor e no corpo de respostas API.

**Remediação necessária:**
- Nunca retornar passwords em respostas API
- Enviar credentials por email seguro ou forçar reset de password no primeiro login

---

### 1.6 Políticas de Storage Buckets Permissivas

| Campo | Detalhe |
|-------|---------|
| **Severidade** | CRÍTICA |
| **Localização** | Múltiplas migrações em `supabase/migrations/` |
| **OWASP** | A01:2021 — Broken Access Control |

**Descrição:** Alguns storage buckets têm políticas que permitem acesso a qualquer utilizador autenticado, sem verificação de organização.

**Risco:** Documentos sensíveis de uma organização podem ser acedidos por utilizadores de outras organizações.

**Remediação necessária:**
- Adicionar scoping por organização a todas as políticas de storage

---

## 2. Vulnerabilidades de Severidade Alta

### 2.1 Validação de Sessão de Impersonação Insuficiente

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `src/contexts/ImpersonationContext.tsx` (linhas 73-96) |
| **OWASP** | A07:2021 — Identification and Authentication Failures |

**Problemas identificados:**
- Estado de impersonação armazenado em `sessionStorage` do cliente sem encriptação
- Sem timeout automático de sessão no cliente
- `verifySession()` é async mas chamado sem blocking (`.then()` em vez de `await`) — race condition
- Razão mínima de apenas 5 caracteres (insuficiente para auditoria)

**Remediação necessária:**
- Implementar validação server-side em cada request
- Adicionar timeout automático (15-30 minutos)
- Bloquear state updates até verificação completar
- Armazenar apenas sessionId no cliente, buscar contexto do servidor

---

### 2.2 Informação de Debug Exposta no SSO

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `supabase/functions/sso-cca/index.ts` (linhas 148, 162-167) |
| **OWASP** | A05:2021 — Security Misconfiguration |

**Descrição:** Quando SSO não está configurado, a resposta inclui um objeto `debug` que revela quais campos de configuração existem:

```typescript
debug: {
  hasClientId: !!SSO_CONFIG.clientId,
  hasIssuerUrl: !!SSO_CONFIG.issuerUrl,
  hasClientSecret: !!SSO_CONFIG.clientSecret,
  hasRedirectUrl: !!SSO_CONFIG.redirectUrl,
}
```

**Remediação necessária:**
- Remover objeto debug de respostas de produção
- Retornar erro genérico: "SSO is not available"
- Logar problemas de configuração apenas server-side

---

### 2.3 Operações Admin sem Verificação Adicional

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `supabase/functions/admin-create-user/index.ts`, `admin-delete-user/index.ts` |
| **OWASP** | A01:2021 — Broken Access Control |

**Problemas:**
- Sem rate limiting em endpoints de criação/eliminação de utilizadores
- Sem mecanismo de confirmação adicional (2FA/MFA)
- Ponto único de falha — se check de admin for bypassado, acesso irrestrito
- Validação de password fraca no backend (apenas comprimento >= 8)

**Remediação necessária:**
- Implementar rate limiting
- Adicionar verificação 2FA/MFA obrigatória para operações sensíveis
- Implementar request signing com timestamps
- Aplicar mesma complexidade de password do frontend no backend

---

### 2.4 Vulnerabilidade de Open Redirect no Fluxo SSO

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `src/pages/auth/Login.tsx` (linha 166) |
| **OWASP** | A01:2021 — Broken Access Control |

**Descrição:** O `authUrl` retornado pelo backend é usado diretamente em `window.location.href` sem validação:

```typescript
window.location.href = data.authUrl;
```

**Remediação necessária:**
- Validar que `authUrl` começa com `https://` e pertence ao domínio do IdP
- Adicionar whitelist de hostnames permitidos

---

### 2.5 State Parameter do SSO Não Validado no Callback

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `src/pages/auth/SSOCallback.tsx` (linha 43) |
| **OWASP** | A07:2021 — Identification and Authentication Failures |

**Descrição:** O state parameter armazenado em `sessionStorage` é removido sem ser comparado com o state retornado pelo IdP:

```typescript
sessionStorage.removeItem("sso_state"); // Remove sem comparar!
```

**Risco:** Bypass de proteção CSRF no fluxo OAuth2.

**Remediação necessária:**
- Comparar state parameter da resposta com o armazenado
- Rejeitar callback se houver mismatch

---

### 2.6 Dados Sensíveis em Console Logs (Produção)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `src/pages/auth/SSOCallback.tsx` (linhas 61, 76, 91), `src/pages/auth/Login.tsx` (linha 171) |
| **OWASP** | A09:2021 — Security Logging and Monitoring Failures |

**Descrição:** Console logs em código de autenticação podem expor tokens, dados de sessão e detalhes de erro no DevTools do browser.

**Remediação necessária:**
- Envolver console.log em verificações de desenvolvimento: `if (import.meta.env.DEV)`
- Usar mensagens genéricas em produção

---

### 2.7 Validação de Upload de Ficheiros Insuficiente

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `src/components/shared/DocumentUploadWithAI.tsx` (linhas 112-122) |
| **OWASP** | A04:2021 — Insecure Design |

**Descrição:** Validação de uploads verifica apenas MIME type e tamanho (10MB). Falta:
- Validação de magic bytes (contra MIME type spoofing)
- Scanning de vírus/malware
- Whitelist de extensões rigorosa

**Remediação necessária:**
- Adicionar validação de magic bytes
- Implementar virus scanning (ClamAV ou serviço cloud)
- Whitelist estrita de extensões permitidas

---

### 2.8 GDPR Export Sem Filtro de Organização

| Campo | Detalhe |
|-------|---------|
| **Severidade** | ALTA |
| **Localização** | `supabase/functions/user-data-export/index.ts` (linhas 63-180) |
| **OWASP** | A01:2021 — Broken Access Control |

**Descrição:** A função de exportação GDPR usa service role key (bypassa RLS) e exporta contratos criados pelo utilizador sem filtrar por organização atual.

**Risco:** Utilizador pode exportar metadados de contratos de organizações anteriores a que já não pertence.

**Remediação necessária:**
- Filtrar contratos por `current_organization_id` e membership da organização

---

## 3. Vulnerabilidades de Severidade Média

### 3.1 Ausência de Content Security Policy (CSP)

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `index.html`, `vercel.json` |
| **OWASP** | A05:2021 — Security Misconfiguration |

**Descrição:** Sem headers CSP configurados, a aplicação é vulnerável a injeção de scripts inline via XSS.

**Remediação necessária:**
- Adicionar CSP headers no `vercel.json`:
  ```json
  {
    "headers": [{
      "source": "/(.*)",
      "headers": [{
        "key": "Content-Security-Policy",
        "value": "default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' https://*.supabase.co data:; style-src 'self' 'unsafe-inline'"
      }]
    }]
  }
  ```

---

### 3.2 Tokens de Autenticação em localStorage

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `src/integrations/supabase/client.ts` (linhas 13-16) |

**Descrição:** Supabase armazena tokens (access_token, refresh_token) em `localStorage`, que é vulnerável a ataques XSS.

**Remediação necessária:**
- Considerar storage in-memory para tokens
- Implementar estratégia de rotação com access tokens de curta duração
- CSP headers (3.1) mitiga este risco significativamente

---

### 3.3 Divulgação de Informação em Mensagens de Erro

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `src/pages/auth/Login.tsx` (linha 69), múltiplos componentes |

**Descrição:** Mensagens de erro do backend expostas diretamente na UI via `toast.error(error.message)`.

**Remediação necessária:**
- Mapear erros do backend para mensagens genéricas user-friendly
- Logar erros completos server-side

---

### 3.4 Sem Rate Limiting em Endpoints SSO

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `supabase/functions/sso-cca/index.ts` |

**Descrição:** Endpoints SSO (`/start`, `/callback`) sem rate limiting, vulneráveis a brute-force e DoS.

**Remediação necessária:**
- Rate limiting por IP no `/start` (max 5 req/min)
- Validação de estado não reutilizado no `/callback`

---

### 3.5 Sem Rate Limiting em Funções Públicas

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `parse-contract`, `legal-api`, `triage-contract` |

**Descrição:** Funções com `verify_jwt = false` não têm rate limiting, permitindo abuso ilimitado.

**Remediação necessária:**
- Rate limiting por IP em todos os endpoints públicos
- Considerar autenticação por API key

---

### 3.6 Dados de Impersonação Não Encriptados em sessionStorage

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `src/contexts/ImpersonationContext.tsx` (linha 152) |

**Descrição:** Sessões de impersonação armazenadas em texto claro no `sessionStorage`.

**Remediação necessária:**
- Armazenar apenas session ID
- Buscar contexto completo do servidor a cada carregamento

---

### 3.7 ID de Organização CCA Hardcoded no SSO

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `supabase/functions/sso-cca/index.ts` (linha 521) |

**Descrição:** `CCA_TESTE_ORG_ID` hardcoded, tornando a função não-portável entre ambientes.

**Remediação necessária:**
- Mover para variável de ambiente

---

### 3.8 Validação de Email Insuficiente no SSO

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `supabase/functions/sso-cca/index.ts` (linhas 392-405) |

**Descrição:** Validação de email baseia-se em `split("@")` simples, sem validação RFC completa.

**Remediação necessária:**
- Usar biblioteca de validação RFC-compliant
- Normalizar email antes de processamento

---

### 3.9 Função Data Retention Cron — Fragilidade de Autorização

| Campo | Detalhe |
|-------|---------|
| **Severidade** | MÉDIA |
| **Localização** | `supabase/functions/data-retention-cron/index.ts` (linhas 33-78) |

**Descrição:** Se `CRON_SECRET` for comprometido, atacante pode despoletar eliminação permanente de dados. Sem rate limiting ou requisito de auditoria.

**Remediação necessária:**
- Adicionar rate limiting e cooldown
- Logging de auditoria obrigatório
- Considerar MFA para ativação manual

---

## 4. Vulnerabilidades de Severidade Baixa

### 4.1 Logging de Eventos de Segurança Insuficiente
- Sem logging de endereço IP na maioria das funções de autenticação
- Sem logging de user-agent no SSO
- Sem detalhes de razão de falha em alguns logs

### 4.2 URLs de Imagens Externas Não Validadas
- `index.html` referencia domínio externo `hs22.name.tools:2083` com porta não-standard
- Considerar hospedar imagens em CDN de confiança

### 4.3 JSON.parse Sem Validação de Schema (sessionStorage)
- `ImpersonationContext.tsx` faz `JSON.parse` sem validação Zod runtime

### 4.4 Uso de `dangerouslySetInnerHTML` (Baixo Risco)
- Usado apenas em `src/components/ui/chart.tsx` para CSS gerado internamente
- Não aceita input de utilizador — risco mínimo mas code smell

### 4.5 Sem Verificação de Lockout para Platform Admin
- Admin pode ser removido sem 2FA, audit trail ou rate limiting

---

## 5. Pontos Positivos de Segurança

A aplicação implementa várias boas práticas que merecem destaque:

1. **Requisitos fortes de password** — Cliente valida maiúsculas, minúsculas e números
2. **Account lockout** — 5 tentativas falhadas com janela de 15 minutos (`secure-login`)
3. **Prevenção de replay attacks** — Validação OIDC nonce no callback SSO
4. **Consumo único de state tokens** — States eliminados após uso
5. **Verificação de admin** — Platform admin verificado antes de operações sensíveis
6. **Audit trail de impersonação** — Sessões logadas com razão e user agent
7. **Rate limiting no demo login** — 10 tentativas por hora por IP
8. **Gestão segura de sessões** — Supabase gere JWT com auto-refresh
9. **Sem `eval()` ou `Function()` constructor** — Nenhuma execução dinâmica de código
10. **Validação Zod** — Schemas de validação em formulários com React Hook Form
11. **TypeScript** — Tipagem estática previne muitas vulnerabilidades em compile time
12. **Segredos backend não expostos** — Variáveis sensíveis removidas intencionalmente do frontend
13. **Dependências atualizadas** — Sem vulnerabilidades críticas conhecidas nas dependências atuais

---

## 6. Plano de Remediação

### Fase 1 — Imediato (Hoje)

| # | Ação | Ficheiros |
|---|------|-----------|
| 1 | Revogar e regenerar chaves Supabase expostas | Dashboard Supabase |
| 2 | Remover `.env` do histórico Git | Git history |
| 3 | Restringir CORS a domínio(s) específico(s) | Todas as Edge Functions |

### Fase 2 — Esta Semana

| # | Ação | Ficheiros |
|---|------|-----------|
| 4 | Corrigir políticas RLS de `contract_extractions` | Nova migração SQL |
| 5 | Remover password de resposta API | `admin-create-user/index.ts` |
| 6 | Corrigir validação de state no SSO callback | `SSOCallback.tsx` |
| 7 | Implementar rate limiting em operações admin | `admin-create-user`, `admin-delete-user` |
| 8 | Remover debug info de respostas SSO | `sso-cca/index.ts` |
| 9 | Corrigir race condition na validação de impersonação | `ImpersonationContext.tsx` |

### Fase 3 — Próximo Sprint

| # | Ação | Ficheiros |
|---|------|-----------|
| 10 | Adicionar CSP headers | `vercel.json` |
| 11 | Restringir conta demo a read-only | `demo-login/index.ts`, nova role |
| 12 | Implementar 2FA para operações sensíveis de admin | Novo sistema MFA |
| 13 | Adicionar validação de magic bytes em uploads | `DocumentUploadWithAI.tsx` |
| 14 | Filtrar exportação GDPR por organização | `user-data-export/index.ts` |
| 15 | Mover console.log auth para dev-only | `Login.tsx`, `SSOCallback.tsx` |

### Fase 4 — Melhoria Contínua

| # | Ação | Ficheiros |
|---|------|-----------|
| 16 | Rate limiting em endpoints públicos | `parse-contract`, `legal-api`, `triage-contract` |
| 17 | Logging abrangente de eventos de segurança | Todas as funções de autenticação |
| 18 | Validação Zod runtime para sessionStorage | `ImpersonationContext.tsx` |
| 19 | Hardening de storage bucket policies | Migrações SQL |
| 20 | Virus scanning em uploads | Integração ClamAV/cloud |

---

## Tabela Resumo de Vulnerabilidades

| Severidade | Qtd | Exemplos Principais |
|------------|-----|---------------------|
| **CRÍTICA** | 6 | CORS wildcard, RLS aberto, chaves expostas, demo superadmin, password em resposta API, buckets abertos |
| **ALTA** | 8 | Impersonação fraca, debug info SSO, admin sem 2FA, open redirect, state não validado, console logs, uploads, GDPR export |
| **MÉDIA** | 9 | Sem CSP, tokens em localStorage, erros expostos, sem rate limiting SSO, endpoints públicos, sessionStorage, org ID hardcoded, email validation, cron auth |
| **BAIXA** | 5 | Logging insuficiente, imagens externas, JSON.parse sem schema, dangerouslySetInnerHTML, admin lockout |

---

*Este relatório foi gerado como análise estática de código. Uma análise dinâmica (penetration test em ambiente running) poderá revelar vulnerabilidades adicionais. Recomenda-se complementar com testes DAST (Dynamic Application Security Testing) antes de produção.*
