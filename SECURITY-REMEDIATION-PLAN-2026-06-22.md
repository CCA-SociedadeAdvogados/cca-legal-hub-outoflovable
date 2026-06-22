# Plano de Remediação — Decisões e Ações por Tema (CCA Legal Hub)

**Data:** 2026-06-22
**Para:** Administrador (asilva@cca.law)
**Objetivo:** Para cada tema da avaliação, explicar **o que fazer**, as **opções/decisões necessárias**, **o que muda para vós** e o **esforço** — para poder decidir quais avançar.
**Documento-base:** `SECURITY-ASSESSMENT-2026-06-22.md`

> **Conceito central que atravessa todo o relatório:** o sistema tem **dois tipos de utilizadores com login**:
> 1. **Advogados/staff CCA** (login SSO `@cca.law`) — devem ver os clientes.
> 2. **Clientes** (portal) — só devem ver os *seus próprios* dados.
>
> Quando uma regra diz `TO authenticated` ou "qualquer autenticado", **inclui os clientes do portal**, não só os advogados. E quando uma função não tem autenticação nenhuma, fica aberta à **internet anónima** (sem login de todo). É por isto que "são os advogados a usar" não fecha o risco: o problema é que *outros* também conseguem.

---

## PARTE 1 — Os temas que levantou

### Tema 1 — Login demo (manter como está) ✅ Risco aceite

**A sua decisão:** manter o login demo a funcionar como hoje (acesso de superadmin, só usado por si).

**O que isto significa em risco:** a função `demo-login` está aberta sem login e, com a password demo, cria uma sessão de **platform admin** (controlo total). Como é a *sua* via de acesso de administrador, o risco real resume-se a **uma coisa: se a password demo for descoberta ou for alvo de brute-force, alguém entra como superadmin**.

**O que fazer (controlos compensatórios — NÃO mudam a sua utilização):**

| Ação | Porquê | Esforço |
|------|--------|---------|
| **1. Tratar `DEMO_USER_PASSWORD` como credencial privilegiada** — longa (20+ caracteres), única, rodada periodicamente | É a única coisa entre a internet e o superadmin | S |
| **2. Restringir a função por IP** (nova env `DEMO_ALLOWED_IPS` com o(s) seu(s) IP(s)) — rejeitar todos os outros | Como só o admin usa, limita o ataque à sua rede | S |
| **3. Endurecer o rate limit** — hoje é em memória (`Map`), pouco fiável em serverless; passar para contador persistente (tabela/Redis) | Travar brute-force a sério | M |
| **4. Alerta/auditoria a cada login demo** (registo em `audit_logs` + notificação ao admin) | Saber imediatamente se alguém usou | S |

**Decisão necessária (opcional, estratégica):** a longo prazo, o mais seguro seria a sua conta nominal `@cca.law` ser `platform_admin` com MFA, e reservar o "demo" para uma organização-sandbox sem dados reais. Não é obrigatório — fica como nota. **Se mantiver como está, aplique pelo menos os pontos 1, 2 e 4.**

---

### Tema 2 — Advogados CCA precisam de aceder a tudo dos seus clientes 🟠 Decisão de modelo

**O ponto importante:** o problema **não é** os advogados acederem aos clientes — é *como* essa permissão está escrita hoje:

```ts
// _shared/orgAuth.ts:39 — autoriza com base num campo do perfil
if (prof?.auth_method === "sso_cca") return true;   // → acesso a QUALQUER organização
```

Isto tem 3 fragilidades:
1. **Confia num atributo do perfil** (`auth_method`) em vez de uma fonte de verdade controlada. Qualquer conta marcada `sso_cca` ganha acesso a **todos** os clientes.
2. **É tudo-ou-nada:** não distingue um sócio de um estagiário/colaborador administrativo com email `@cca.law`.
3. **Não suporta "muralhas éticas"** (conflitos de interesse / segredo profissional — Estatuto da Ordem dos Advogados), que exigem o princípio do *need-to-know*.

**Tem de escolher o modelo de acesso (esta é a decisão central):**

#### Opção A — "Todo o staff CCA vê todos os clientes" (mínima disrupção) ⭐ Recomendada como base imediata
- Mantém exatamente o comportamento atual para os advogados, mas troca a verificação frágil por uma **robusta**: usar `is_cca_user(auth.uid())` (já existe), apoiada na tabela `cca_internal_users` que **só o platform admin gere**.
- **Efeito:** só pessoas que o admin inscreveu como staff CCA têm acesso firm-wide — não "qualquer email que passe no SSO".
- **O que muda para vós:** nada no dia-a-dia dos advogados já inscritos. Passa a ser preciso inscrever explicitamente novos colaboradores CCA (uma vez).
- **Esforço:** S–M (substituir a verificação em `orgAuth.ts` e nas políticas RLS que usam o mesmo padrão).

#### Opção B — "Cada advogado vê os seus clientes; sócios/admin veem todos" (muralhas éticas) 🔒 Mais seguro / boas práticas
- Usar a coluna **`organizations.lawyer_user_id`** (que já existe na BD!) e/ou uma tabela de afetação advogado↔cliente. Cada advogado acede aos clientes que lhe estão atribuídos; sócios/admin veem tudo.
- **Efeito:** implementa *need-to-know* e separação por processo — alinhado com o dever de sigilo e gestão de conflitos.
- **O que muda para vós:** é preciso **atribuir advogados a clientes** (processo de gestão novo); muda o que cada advogado vê.
- **Esforço:** L (modelo de dados + RLS + UI de atribuição).

#### Opção C — Híbrida
- Base = Opção A (staff vê tudo), com a *capacidade* de marcar certos clientes sensíveis como restritos a advogados atribuídos (muralha só onde é preciso).
- **Esforço:** L, mas faseável (começar na A e adicionar restrições pontuais).

**Recomendação:** avançar **já com a Opção A** (fecha a vulnerabilidade real sem disrupção) e considerar a **Opção B/C** como evolução estratégica se quiserem muralhas de conflito. Em qualquer dos casos, a verificação deixa de depender de `auth_method` e passa a depender de `is_cca_user()`/afetação.

> **Verificação técnica adicional:** confirmar se um utilizador consegue alterar o próprio `auth_method` (no perfil). Se conseguir, a regra atual é também um vetor de escalonamento de privilégios. A migração para `is_cca_user()` elimina esse risco independentemente.

---

### Tema 3 — Funções de IA sem autenticação 🔴 Crítico (mas fix simples e transparente para os advogados)

**O que se passa, em linguagem simples:** estas funções (`contract-chat`, `multi-contract-analysis`, `generate-contract`, `redline-contract`, `validate-contract`, `analyze-document`, `translate-content`, etc.) são **"portas abertas"**: não pedem login nenhum. Qualquer pessoa na internet que saiba o endereço pode:
- enviar um `contract_id` e **receber os dados desse contrato** (nomes, NIF, valores, cláusulas) — mesmo sem ser cliente nem advogado;
- gerar chamadas pagas à conta de IA (Anthropic) à vossa custa, sem limite.

**Porque "são os advogados a usar" não chega:** a função não verifica *quem* está a chamar. Não está limitada aos advogados — está limitada a *ninguém*.

**O que fazer (mesmo padrão em todas as funções — já existe um exemplo correto no código, `analyze-contract-client`):**

1. **Exigir login** — a função lê o token do utilizador (cabeçalho `Authorization`) e valida-o (`supabase.auth.getUser`). Sem token válido → erro 401.
   *Para os advogados isto é invisível:* o frontend já envia o token deles. Nada muda na utilização.
2. **Verificar a organização** — confirmar que quem chama pode ver *aquele* contrato, reutilizando o helper `isAuthorizedForOrg()` (já existe): staff CCA passa (vê tudo, conforme Tema 2); um cliente só passa para os contratos da sua própria organização.
3. **(Camada extra grátis)** mudar `verify_jwt = false` → `verify_jwt = true` no `config.toml` para as funções usadas por utilizadores com login. A plataforma Supabase passa a rejeitar chamadas anónimas **antes** de chegarem ao código.

**Efeito:** fecha a exfiltração anónima **e** o abuso da chave de IA (denial-of-wallet), sem afetar os advogados.
**O que muda para vós:** nada para quem está autenticado. Só bloqueia o acesso anónimo.
**Esforço:** M (é repetir o mesmo padrão em ~9 funções; mecânico e de baixo risco).

> **Decisão necessária:** confirmar que **nenhuma** destas funções é chamada por um sistema externo sem login (ex.: um webhook). Pelo que vi, são todas usadas pelo frontend autenticado — mas convém confirmar antes de pôr `verify_jwt = true`.

---

### Tema 4 — `contract_ai_extractions` / `contract_ai_jobs` com RLS `USING(true)` 🔴 Crítico

**O que se passa:** estas duas tabelas guardam o resultado da extração de IA dos contratos. A regra de leitura é:

```sql
CREATE POLICY "clients_read_extractions" ON contract_ai_extractions
  FOR SELECT TO authenticated USING (true);   -- "true" = sem qualquer filtro
```

`USING (true)` = **qualquer utilizador com login lê tudo**. E como `authenticated` **inclui os clientes do portal**, um cliente da empresa A pode ler as extrações de IA dos contratos da empresa B. Não é sobre advogados — é sobre clientes a verem dados de *outros* clientes.

**Boa notícia (limita o estrago e simplifica o fix):**
- A migração só define políticas de **SELECT**. A escrita (INSERT/UPDATE/DELETE) não tem política → com RLS ativo, é **negada** ao utilizador normal e só a service-role (as edge functions) escreve. Logo, **a exposição é apenas de leitura** e basta corrigir o SELECT.

**O que fazer — duas opções, conforme quem usa a funcionalidade "CCA Validate Contract":**

#### Opção A — Se for ferramenta **interna da CCA** (provável, pelo nome) ⭐ Recomendada
Restringir a leitura a staff CCA:
```sql
DROP POLICY "clients_read_extractions" ON contract_ai_extractions;
CREATE POLICY "cca_read_extractions" ON contract_ai_extractions
  FOR SELECT TO authenticated
  USING (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()));
-- idem para contract_ai_jobs
```
- **Efeito:** advogados/staff CCA continuam a ler tudo; clientes deixam de ver estas tabelas. Fecha a fuga.
- **Esforço:** S (uma migração curta).

#### Opção B — Se os **clientes** também consultam estas extrações no portal
Aplicar o mesmo padrão já usado (e validado) na tabela `contract_extractions`: staff CCA vê tudo + cada cliente vê os da sua organização. Como `contract_id` é texto, faz-se o join com cast:
```sql
USING (
  is_cca_user(auth.uid()) OR is_platform_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM contratos c
             WHERE c.id::text = contract_ai_extractions.contract_id
               AND c.organization_id = get_user_organization_id(auth.uid()))
)
```
- **Esforço:** M (e validar que `contract_id` corresponde sempre a um `contratos.id`).

**Corrigir também as tabelas-irmãs:** `contract_ai_diffs` e `contract_audit_log` usam hoje `raw_user_meta_data->>'role' = 'internal'` — um critério frágil (metadados de utilizador são menos fiáveis). Migrar para `is_cca_user(auth.uid())` por consistência.

**Decisão necessária:** os clientes usam a funcionalidade "Validate Contract" no portal? **Não → Opção A.** **Sim → Opção B.** (Se a funcionalidade já não está em uso, a opção mais limpa é eliminar as tabelas — como já foi feito com `contract_triage_analyses`.)

---

## PARTE 2 — Os restantes temas (o que fazer, em resumo)

Ações para os outros achados, para ter a visão completa. Coluna "Afeta utilizadores?" indica se muda alguma coisa no dia-a-dia dos advogados/clientes.

### Prioridade ALTA

| Tema | O que fazer | Afeta utilizadores? | Esforço |
|------|-------------|---------------------|---------|
| **Bucket `legal-mirror` gravável por anónimos** (H-02) | Adicionar `TO service_role` às políticas de escrita do bucket | Não | S |
| **`fetch-azure-photo` (SSRF/IDOR)** (H-03) | Validar `sso_external_id` como UUID e confirmar que é o do próprio utilizador | Não | S |
| **`admin-create-user` devolve password** (H-04) | Não devolver a password; enviar por canal seguro ou forçar reset no 1.º login | Ligeiro (fluxo de criação de utilizador) | S |
| **Impersonação forjável/race** (H-05) | Tornar a validação bloqueante (`await`), validar o `orgId` contra a sessão na BD, validar schema | Não (transparente) | M |
| **IA envia dados para os EUA (Anthropic)** (H-06) | **Decisão de conformidade** — ver nota RGPD abaixo | Possível (opt-out) | M–L |
| **Business Central por HTTP + service-key on-premises** (H-07) | Ativar HTTPS no BC; trocar a service-role do agente por chave de menor privilégio; cofre de segredos na máquina | Não | M |

### Prioridade MÉDIA

| Tema | O que fazer | Esforço |
|------|-------------|---------|
| **CORS faz fallback para `*`** (M-01) | Definir a env `ALLOWED_ORIGIN` com o domínio de produção | S |
| **Bucket `politicas` cross-org** (M-02) | Scopar por organização (como o bucket `contratos`) | S |
| **RPCs financeiras não fixam o utilizador** (M-03) | Forçar `p_user_id := auth.uid()` dentro das funções; remover `GRANT … TO anon` | S |
| **SSO: debug info, nonce, assinatura do token** (M-04) | Remover o objeto `debug`; exigir e validar `nonce`; validar assinatura do ID token; tirar IDs hardcoded | M |
| **Prompt injection nas funções de IA** (M-05) | Separar instruções de conteúdo; delimitar/escapar o texto do utilizador no prompt | M |
| **Segredos de CRON partilhados** (M-06) | Segredo distinto por função; comparação em tempo constante | S |
| **`sync-sharepoint` (SSRF interno)** (M-07) | Validar `site_id`/`drive_id` contra os do tenant autorizado | M |
| **`mirror-run` desativa validação TLS** (M-08) | Remover `caCerts: []`; confiar na cadeia normal | S |
| **XSS no export de PDF** (M-09) | Sanitizar `filename`/conteúdo ou usar API de impressão sem `document.write` | S |
| **`state` SSO não comparado no cliente** (M-10) | Comparar com o guardado (ou remover o código morto que dá falsa segurança) | S |
| **Retenção: `deletion_type` ignorado** (M-11) | Corrigir `execute_data_retention()` para respeitar 'hard'/'soft'/'anonymize' | S |
| **Sem banner de cookies** (M-12) | Implementar banner de consentimento (ver nota RGPD) | M |
| **Export RGPD sem scope de org** (M-13) | Filtrar a exportação pela organização do titular | S |
| **Eliminação não cobre Storage/backups** (M-14) | Estender a eliminação aos ficheiros em Storage | M |
| **Sem registo de acessos (VIEW)** (M-15) | Registar leituras de dados pessoais sensíveis | M |
| **Sem deteção/notificação de violações** (M-16) | Definir processo + alertas (ver nota RGPD/CNPD) | M |
| **Upload sem validação de magic bytes** (M-17) | Validar a assinatura real do ficheiro no backend | M |
| **Tokens em `localStorage`** (M-18) | Mitigado pela CSP; opcional: `flowType:'pkce'` / cookies httpOnly | M |

### Prioridade BAIXA

| Tema | O que fazer | Esforço |
|------|-------------|---------|
| **`feature_flags` legível por anónimos** (L-01) | Restringir leitura a `authenticated` | S |
| **Mensagens de erro cruas** (L-02) | Mapear para mensagens genéricas; logar o detalhe só no servidor | M |
| **URLs da BD sem validação de esquema** (L-03) | Helper `isSafeHttpUrl()` antes de `href`/`window.open` | S |
| **`user_belongs_to_organization` args trocados** (L-04) | Corrigir a ordem dos argumentos (é fail-closed, não é fuga) | S |
| **`match-legislation` grava `created_by_id` nulo** (L-05) | Tornar o `created_by_id` obrigatório | S |
| **Rate limiting ausente/fraco** (L-06) | Adicionar limites por IP nos endpoints públicos/sensíveis | M |
| **Registo de consentimento incompleto** (L-07) | Guardar `ip`/`user_agent`/versão da política no consentimento | S |
| **CI sem segurança** (L-08) | Adicionar `npm audit`/SAST/secret-scanning; tornar o lint bloqueante | S |
| **Dependências vulneráveis** (L-09) | Atualizar `react-router-dom` (≥6.30.4); rever `lodash`/`recharts`. A maioria das 12 é só de *tooling* de dev | S |

---

## PARTE 3 — Nota de conformidade RGPD (decisão de negócio, não só técnica)

Três pontos exigem decisão da gestão/jurídico, não apenas código:

1. **Transferência de dados para a IA (Anthropic, EUA)** — enviar conteúdos de contratos (com dados de terceiros) para um fornecedor de IA é uma **subcontratação** e uma **transferência internacional**. Precisa de: (a) base jurídica e **divulgação** aos titulares; (b) **salvaguardas** (cláusulas-tipo SCC ou usar a IA numa região UE, ex.: via Bedrock/Vertex UE); (c) idealmente um **opt-out por cliente/contrato**. *Decisão: aceitar como está com SCC, regionalizar, ou permitir desativar a IA por cliente?*

2. **Consentimento de cookies (ePrivacy)** — falta o banner. *Decisão: que cookies/armazenamento não essenciais usam (analytics?) e qual o texto/versão da política.*

3. **Notificação de violações (Art. 33/34)** — falta o processo de deteção e o fluxo de notificação à CNPD em 72h. *Decisão: definir o procedimento interno (quem, como, em quanto tempo).*

---

## Sugestão de sequência (se quiser uma ordem)

1. **P0 imediato e transparente para os utilizadores:** Tema 3 (autenticar funções de IA) + Tema 4 Opção A (fechar `contract_ai_*`) + `ALLOWED_ORIGIN` (M-01) + `legal-mirror` (H-02). *Fecham as fugas críticas sem mudar nada para advogados/clientes.*
2. **Decisões de modelo:** Tema 2 (escolher Opção A/B/C de acesso CCA) + Tema 1 (controlos do demo) + decisões RGPD (Parte 3).
3. **Restante ALTA/MÉDIA** conforme capacidade.

**Diga-me qual(is) tema(s) quer avançar** e eu preparo as alterações (migrações SQL / edge functions) numa branch para revisão. Não implementei nada ainda — este documento é só para a sua análise.
