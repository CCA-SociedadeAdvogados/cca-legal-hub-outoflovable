# Análise de Impacto das Alterações de Segurança (CCA Legal Hub)

**Data:** 2026-06-22
**Para:** Administrador (asilva@cca.law)
**Objetivo:** Para **cada alteração** proposta, indicar o **impacto que pode causar** — quem é afetado, o que muda no funcionamento, o que pode partir, pré-condições a verificar, como testar e como reverter.
**Documentos-base:** `SECURITY-ASSESSMENT-2026-06-22.md`, `SECURITY-REMEDIATION-PLAN-2026-06-22.md`

> **Como ler:** o **"Risco da alteração"** mede a probabilidade de a *própria correção* causar uma regressão (≠ severidade da vulnerabilidade). Um achado crítico pode ter uma correção de risco baixo, e vice-versa.
>
> **Afetados:** 👨‍⚖️ Advogados/staff CCA · 🧑‍💼 Clientes (portal) · 🛠️ Admin · ⏰ Crons/integrações · 🌐 Anónimos (internet).
>
> Esta análise foi validada contra o código real (quem invoca cada função, convenções de path, definição de `is_cca_user`, etc.), pelo que os impactos abaixo são concretos, não genéricos.

---

## ⭐ Resumo: alterações ordenadas pelo risco da própria mudança

| Risco da mudança | Alterações | Porquê |
|------------------|-----------|--------|
| **Muito baixo** (ganhos seguros) | Tema 4-A, H-02 legal-mirror, M-08 mirror-run TLS, L-04, L-05, L-09 deps, H-04 (com nota) | Transparente para utilizadores; sem caminhos de quebra |
| **Baixo** | Tema 3 (exceto translate-content), H-05 impersonação, M-09 PDF, M-10 state, M-13 export, L-01 (abordagem correta), L-07 | Transparente, mas mexe em fluxos sensíveis |
| **Médio** | Tema 2 orgAuth, M-01 CORS, M-02 politicas, M-03 RPCs, M-11 retenção, Tema 1 demo-IP, H-03, H-07 BC-HTTPS | Pode excluir utilizadores/quebrar acesso se mal feito; exige verificação prévia |
| **Médio-alto** (cuidado) | M-04 SSO (nonce/assinatura), translate-content com verify_jwt | Mexe no **login dos advogados**; alto blast radius |

**Princípio:** começar pelos "muito baixo/baixo" (fecham o crítico sem disrupção) e tratar os "médio/médio-alto" com verificação + teste em staging.

---

## PARTE 1 — Os 4 temas

### Tema 4 — Fechar `contract_ai_extractions`/`jobs` (Opção A) 🟢 Risco MUITO BAIXO

- **Alteração:** trocar `USING(true)` por `USING (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()))` no SELECT. Migrar também `contract_ai_diffs`/`contract_audit_log` de `role='internal'` para `is_cca_user()`.
- **Quem é afetado:** 👨‍⚖️ (continuam a ver tudo) · 🧑‍💼 (deixam de ver — mas **não usam**) · 🌐 (deixam de ver).
- **Impacto funcional:** **nenhum para advogados.** Validado: os únicos consumidores são `useCCAStatus.ts` e as páginas da app CCA (`ContratoDetalhe`, `ContratoForm`, `ContractAIParser`…). **O portal de clientes não lê estas tabelas.** A escrita já é só service-role (não há política de INSERT/UPDATE), por isso o pipeline de IA continua igual.
- **Verificar antes:** confirmar que nenhuma página em `src/portal/` passa a depender destas tabelas no futuro próximo.
- **Como testar:** login como advogado → abrir "Validate Contract" / estado de extração (deve funcionar); login como cliente teste → console: `supabase.from('contract_ai_extractions').select('*')` deve devolver **0 linhas**.
- **Rollback:** reverter a migração (recriar a política anterior). Sem perda de dados.

### Tema 3 — Autenticar as funções de IA 🟢 Risco BAIXO (exceto `translate-content` ⚠️)

- **Alteração:** em cada função (`contract-chat`, `multi-contract-analysis`, `generate-contract`, `redline-contract`, `validate-contract`, `analyze-document`), validar o token e chamar `isAuthorizedForOrg()`; pôr `verify_jwt = true`.
- **Quem é afetado:** 👨‍⚖️🧑‍💼 (transparente) · 🌐 (bloqueados).
- **Impacto funcional:** **nenhum para utilizadores com login.** Validado: todas estas funções são invocadas via `supabase.functions.invoke(...)` (em `useContractChat`, `useRedlineContract`, `useContractExtractions`, `DocumentUploadWithAI`, `ccaAgent`, `ContratoForm`), que anexa automaticamente o token do utilizador. Fecha a fuga anónima **e** o abuso da chave Anthropic.
- **⚠️ Exceção — `translate-content`:** o `TranslationService` é inicializado em `App.tsx` (nível de topo). **Pré-condição:** confirmar que `translate-content` **não** é chamado em páginas públicas/pré-login (landing, login). Se for, `verify_jwt=true` parte a tradução dessas páginas. Mitigação: manter `translate-content` com validação leve + rate-limit em vez de `verify_jwt`, ou garantir que só traduz conteúdo pós-login.
- **Verificar antes:** que nenhuma destas funções é alvo de um **webhook externo** sem login (não encontrei nenhum, mas confirmar nas configurações do Supabase).
- **Como testar:** fluxos de IA logado (devem funcionar); chamada anónima (curl sem `Authorization`) → deve devolver 401; testar a tradução nas páginas públicas **antes** de tocar em `translate-content`.
- **Rollback:** repor `verify_jwt=false` no `config.toml` e re-deploy (reversão imediata por função).

### Tema 2 — Acesso CCA: trocar `auth_method==='sso_cca'` por `is_cca_user()` 🟡 Risco MÉDIO

- **Alteração:** em `_shared/orgAuth.ts:39`, substituir a verificação por `is_cca_user()` (membro de org `cca_owner`).
- **Quem é afetado:** 👨‍⚖️ (potencialmente, se algum não estiver na org `cca_owner`) · 🛠️.
- **Impacto funcional / risco de lockout:** `is_cca_user()` é `EXISTS(... org_type='cca_owner')`. Validado que o SSO **já insere** novos utilizadores na org real C.0000/`cca_owner` (`sso-cca:956-1138`), por isso é seguro **para o fluxo normal**. **MAS:** se algum utilizador tiver sido adicionado apenas à org de *fallback* `CCA_TESTE_ORG_ID` (cujo `org_type` não está garantido como `cca_owner`), ou tiver `auth_method='sso_cca'` sem membership, **perde o acesso cross-org**.
- **Verificar antes (obrigatório):** correr reconciliação —
  ```sql
  SELECT p.id, p.email FROM profiles p
  WHERE p.auth_method='sso_cca'
    AND NOT public.is_cca_user(p.id);   -- lista quem perderia acesso
  ```
  Se a lista vier vazia, a troca é segura. Se não, corrigir as memberships primeiro.
- **Estratégia de baixo risco:** fase 1 — verificação transitória `is_cca_user(uid) OR prof.auth_method='sso_cca'` (não exclui ninguém); fase 2 — depois da reconciliação, remover o ramo `auth_method`.
- **Como testar:** login de vários perfis CCA (sócio, associado, recém-criado) → acesso a SharePoint/financeiro de um cliente; confirmar que um perfil não-CCA continua sem acesso.
- **Rollback:** reverter `orgAuth.ts` (uma linha) e re-deploy das ~8 funções que o usam.
- **Nota:** se quiserem a **Opção B (muralhas por advogado)**, o impacto é maior — muda *o que cada advogado vê* e exige UI de atribuição; tratar como projeto à parte, não como correção.

### Tema 1 — Controlos do login demo (manter funcional) 🟡 Risco MÉDIO (auto-lockout)

- **Alterações:** (1) password forte/rodada; (2) restrição por IP (`DEMO_ALLOWED_IPS`); (3) rate-limit persistente; (4) alerta/auditoria.
- **Quem é afetado:** 🛠️ (só o admin).
- **Impacto funcional:** a (1) e (4) são transparentes. **(2) restrição por IP tem risco de auto-lockout:** se usar IP dinâmico (casa/telemóvel/VPN), pode bloquear-se a si próprio. **Pré-condição:** confirmar que tem IP(s) fixo(s); caso contrário, usar uma allowlist de gama/VPN corporativa ou um *bypass* de emergência. (3) é interno (sem impacto visível).
- **Como testar:** login demo a partir de IP permitido (OK) e de IP não permitido (deve recusar) — testar **antes** de remover qualquer outro acesso admin.
- **Rollback:** remover a env `DEMO_ALLOWED_IPS` repõe o comportamento atual.

---

## PARTE 2 — Achados ALTA

### H-02 — `legal-mirror`: adicionar `TO service_role` às escritas 🟢 Risco MUITO BAIXO
- **Afetados:** 🌐 (perdem escrita indevida) · ⏰ (`mirror-run` continua, escreve como service-role).
- **Impacto:** nenhum no funcionamento legítimo (o `mirror-run` usa service-role, que continua a passar). Bloqueia apenas escritas anónimas. **Verificar:** que nenhum upload legítimo a este bucket é feito a partir do browser do utilizador (não deve). **Rollback:** reverter migração.

### H-03 — `fetch-azure-photo`: validar `sso_external_id` 🟡 Risco MÉDIO
- **Afetados:** 👨‍⚖️ (foto de perfil).
- **Impacto:** se nem todos os `sso_external_id` forem UUID (ex.: alguns serem UPN/email), uma validação UUID estrita **parte a foto** desses utilizadores. **Pré-condição:** confirmar o formato real de `sso_external_id` no Azure (objectId vs UPN). Validar pelo formato correto + confirmar que é o do próprio utilizador. **Teste:** carregar foto de vários perfis. **Rollback:** remover a validação.

### H-04 — `admin-create-user`: não devolver a password 🟢 Risco MUITO BAIXO (mas muda fluxo do admin)
- **Afetados:** 🛠️.
- **Impacto:** **muda o fluxo de criação de utilizadores** — hoje o admin vê a password para a comunicar; passa a ter de usar convite/reset por email. É uma melhoria, mas requer ajuste no procedimento e possivelmente na UI (`AdminUsersTab`). **Teste:** criar utilizador → confirmar que recebe email de definição de password. **Rollback:** trivial.

### H-05 — Impersonação: validação bloqueante 🟢 Risco BAIXO
- **Afetados:** 🛠️ (quem impersona).
- **Impacto:** adiciona um pequeno *delay* (spinner) ao restaurar a sessão de impersonação, enquanto valida no servidor. Funcionalmente transparente; elimina a janela de *race*. **Teste:** iniciar impersonação, recarregar a página → deve revalidar e manter/expirar corretamente. **Rollback:** reverter o contexto.

### H-06 — Transferência de dados para IA (Anthropic) 🟡 Risco MÉDIO (decisão de negócio)
- **Afetados:** 👨‍⚖️🧑‍💼 (consoante a opção).
- **Impacto por opção:** (a) **SCC + divulgação** → impacto técnico nulo, impacto jurídico/documental; (b) **regionalizar (Bedrock/Vertex UE)** → mudança de fornecedor/endpoint em `callAI.ts`, pode alterar latência/custos/qualidade e exige testes de regressão das 16 funções de IA; (c) **opt-out por cliente** → nova lógica: se um cliente desativar IA, as funcionalidades de IA ficam indisponíveis para os contratos dele (mudança visível). **Recomendação:** começar por (a) (rápido), avaliar (b)/(c) conforme exigência. **Rollback:** depende da opção.

### H-07 — Business Central por HTTPS + chave de menor privilégio 🟡 Risco MÉDIO
- **Afetados:** ⏰ (sync NAV/BC) · 🛠️.
- **Impacto:** ativar HTTPS no BC é uma **alteração de infraestrutura do lado do BC** (certificado TLS no servidor on-premises) — pode exigir IT e, se mal configurado (certificado inválido), **parte o sync**. Trocar a service-role do agente por uma role dedicada exige criar essa role com permissões mínimas nas tabelas `bc_*`. **Pré-condição:** validar que o servidor BC suporta TLS. **Teste:** correr o agente em `--dry-run` após a mudança. **Rollback:** repor a config anterior do agente (mas manter a meta de TLS).

---

## PARTE 3 — Achados MÉDIA (impacto resumido)

### M-01 — CORS: definir `ALLOWED_ORIGIN` 🟡 Risco MÉDIO-ALTO (blast radius)
- **Impacto:** se a lista de origens estiver **incompleta**, **todas** as chamadas às edge functions a partir do frontend real falham no *preflight* CORS → app inutilizável. **Pré-condição:** enumerar **todas** as origens legítimas (domínio de produção, domínios de *preview* do Vercel, `localhost` de dev). **Mitigação:** usar lista separada por vírgulas e testar em *preview* antes de produção. **Rollback:** repor `*` (ou remover a env).

### M-02 — Bucket `politicas`: scoping por organização 🟢 Risco BAIXO
- **Impacto:** validado que o upload já guarda em `${organization_id}/...` (`usePoliticas.ts:48`), por isso uma política baseada na 1.ª pasta do path **não orfana** os ficheiros existentes. A política tem de permitir 👨‍⚖️ verem tudo e 🧑‍💼 verem a pasta da sua org (o portal lê este bucket — `PortalPoliticas`). **Pré-condição:** auditar se há ficheiros **antigos** sem prefixo de org. **Teste:** cliente teste lê as suas políticas (OK) e não as de outra org. **Rollback:** reverter migração.

### M-03 — RPCs financeiras: fixar `p_user_id := auth.uid()` 🟡 Risco MÉDIO
- **Impacto:** se algum chamador legítimo passar um `user_id` diferente do próprio (ex.: um fluxo "ver em nome de"), **deixa de funcionar**. Validado que o frontend passa o próprio id, mas confirmar não haver exceções. Remover `GRANT ... TO anon` é seguro (anónimo não passa). **Teste:** dashboards financeiros de cliente e de CCA. **Rollback:** reverter as definições das funções.

### M-04 — SSO: nonce obrigatório + validar assinatura do ID token 🔴 Risco MÉDIO-ALTO (login dos advogados!)
- **Impacto:** mexe no **login SSO dos advogados** (alto blast radius). Exigir `nonce` parte o login se o IdP não o devolver (o Azure devolve quando pedido — confirmar que é pedido no `/start`). Validar a assinatura exige obter as JWKS da Microsoft; se mal implementado, **bloqueia todos os logins SSO**. **Pré-condição:** testar exaustivamente em staging com o tenant real. **Recomendação:** implementar com *feature flag* para reverter rápido. **Rollback:** flag/deploy anterior.

### Outras MÉDIA (risco baixo, impacto localizado)
| Achado | Impacto da mudança | Risco |
|--------|--------------------|-------|
| M-05 prompt injection | Reestruturar prompts pode alterar ligeiramente as respostas da IA → revalidar qualidade | Baixo |
| M-06 segredos CRON distintos | Atualizar os secrets nos GitHub Actions **e** nas funções em simultâneo, senão os crons falham | Baixo-Médio |
| M-07 `sync-sharepoint` validar site/drive | Se a validação for estrita demais, pode recusar sites legítimos → confirmar lista de sites válidos | Médio |
| M-08 `mirror-run` TLS | Remover `caCerts:[]` → se `pgdlisboa.pt` tiver cert inválido, o crawl desse host falha (degradação graciosa) | Muito baixo |
| M-09 export PDF | Sanitizar conteúdo → transparente | Muito baixo |
| M-10 state SSO no cliente | Acrescenta verificação → transparente (ou remover código morto) | Muito baixo |
| M-11 retenção `deletion_type` | **Muda o ciclo de vida dos dados:** dados hoje apagados passam a ser anonimizados/retidos conforme política → validar períodos; corre via cron que mexe em utilizadores | Baixo (testar) |
| M-12 banner de cookies | Novo componente UI visível a **todos**; impacto de UX, não de quebra | Baixo |
| M-13 export RGPD com scope de org | Reduz o que é exportado → comportamento mais correto | Baixo |
| M-14 eliminação cobrir Storage | Apaga também ficheiros → **irreversível**; testar bem o alvo antes | Médio |
| M-15 logging de acessos | Mais escritas em audit → volume/performance a vigiar | Baixo |
| M-16 processo de violações | Processual + alertas; sem quebra | Baixo |
| M-17 magic bytes no upload | Se a deteção for estrita, pode recusar ficheiros válidos atípicos → testar com amostras reais | Baixo-Médio |
| M-18 tokens/PKCE | Mudar storage de tokens pode afetar persistência de sessão → testar "manter sessão" | Médio |

---

## PARTE 4 — Achados BAIXA (impacto mínimo)

| Achado | Impacto da mudança | Risco |
|--------|--------------------|-------|
| **L-01 `feature_flags`** | ⚠️ **Restringir a `authenticated` PARTE a página de login** (lê `ENABLE_SSO_CCA`/`DEMO_LOGIN_ENABLED` pré-login — `Login.tsx:30-31`). **Abordagem correta:** manter legível por anónimo (são apenas booleanos de baixa sensibilidade) **ou** expor só um subconjunto público numa view dedicada. | Alto se ingénuo / Baixo se correto |
| L-02 mensagens de erro | Mensagens genéricas → menos detalhe para o utilizador (e para o atacante) | Muito baixo |
| L-03 validar esquema de URLs | `isSafeHttpUrl()` → bloqueia só URLs maliciosas | Muito baixo |
| L-04 args trocados | Corrigir ordem → **restaura** acesso de membros legítimos (hoje é fail-closed) | Muito baixo (melhora) |
| L-05 `created_by_id` nulo | Passa a exigir o campo → confirmar que o chamador o fornece | Baixo |
| L-06 rate limiting | Limites por IP → afinar para não afetar uso legítimo intenso | Baixo |
| L-07 consentimento `ip/ua` | Mais campos no registo → transparente | Muito baixo |
| L-08 CI segurança | `npm audit`/SAST no CI → pode passar a **bloquear PRs** (intencional) | Baixo |
| L-09 deps | `react-router-dom` 6.30.3→6.30.4 é *patch* (baixo risco); rever `lodash`/`recharts`. Testar navegação após upgrade | Baixo |

---

## PARTE 5 — Estratégia transversal de execução

1. **Verificações obrigatórias ANTES de tocar** (evitam lockouts/outages):
   - Tema 2: query de reconciliação `is_cca_user` vs `auth_method='sso_cca'`.
   - M-01: enumerar todas as origens legítimas.
   - Tema 3/translate-content: confirmar uso pré-login.
   - H-03: formato de `sso_external_id`.
   - H-07/M-04: validar TLS do BC / nonce do Azure em staging.
2. **Ambiente:** aplicar primeiro em *branch/preview* do Supabase; correr `npm run test`, `npm run typecheck`, `npm run lint` e testes manuais dos fluxos afetados.
3. **Ordem recomendada:** "Muito baixo/Baixo" primeiro (Tema 4-A, Tema 3, H-02, M-02, M-09/10, L-04) → fecham o crítico sem disrupção; depois "Médio" com verificação; **M-04 (SSO) por último**, com flag, por mexer no login dos advogados.
4. **Rollback:** todas as alterações de RLS/edge function são reversíveis por migração inversa / re-deploy com `verify_jwt` anterior. As **irreversíveis** (M-14 apagar Storage) exigem teste do alvo antes de executar.

---

**Nenhuma alteração foi aplicada.** Diga-me que tema(s) quer que avance e preparo as migrações/edge functions numa branch para revisão, já com os testes e a verificação prévia correspondentes.
