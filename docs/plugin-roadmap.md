# Claude for Legal — Roadmap de adopção no Hub

Este documento mapeia as skills do [`anthropics/claude-for-legal`](https://github.com/anthropics/claude-for-legal) (lançado 12 Mai 2026) para funcionalidades do **CCA Legal Hub**.

## Princípios

1. **Plugins não correm em máquinas de advogados.** As skills são portadas para Edge Functions e expostas na UI do Hub.
2. **PT/EU only** (regra crítica #15 do `CLAUDE.md`). Referências US são reescritas ou removidas antes do port.
3. **Playbook por organização** (`org_playbooks`) define regras de aprovação, thresholds e escalation — nunca hardcoded.
4. **Output é sempre minuta** para revisão por advogado.

## Pipeline obrigatório por port

Para cada skill que decidimos portar:

1. Ler skill original do `claude-for-legal` (só leitura, nada copiado)
2. Identificar referências US (FRE, IRAC, state/federal, CCPA, MBE, common law, etc.)
3. Substituir por equivalente PT/EU ou remover
4. Ancorar em direito PT/EU concreto (artigos do Código Civil, RGPD, etc.)
5. System prompt final lê `org_playbooks` via `loadPlaybook()` + `buildSystemPrompt()`
6. Adicionar test fixture que verifica ausência de tokens proibidos no output
7. Commit

## Legenda

- ✅ Implementado
- 🟡 Parcial (existe mas falta capacidade)
- ❌ Gap — port previsto
- 🚫 Não portar (jurisdição US-specific) — redesign de raiz se necessário
- ⏳ Em análise

---

## Fase 1 — `commercial-legal`

Core do produto. ~70% já existe.

| Skill origem | Status Hub | Edge Function / componente |
|---|---|---|
| `review` (vendor agreements, NDAs, SaaS) | ✅ | `redline-contract` + `validate-contract` + tab IA |
| `stakeholder-summary` | ✅ | `executive-summary` |
| `matter-workspace` | ✅ | `ClienteContext.viewingOrganizationId` |
| `renewal-tracker` | 🟡 | `send-contract-alerts` (cron). Gap: tabela `renewal_register` + UI de 90-day window |
| `escalation-flagger` | ❌ | Edge Function nova — lê output do redline + `org_playbooks.escalation_rules` → cria notificação para aprovador |
| `amendment-history` | ❌ | comparador entre versões em `anexos_contrato`; diff inteligente cláusula a cláusula |
| `playbook-monitor` | ❌ | scheduled agent que detecta 5+ overrides de cláusula numa janela e propõe update ao `org_playbooks` (sugestão, nunca auto-apply) |
| `cold-start-interview` | ⏳ | substituído por UI no Hub para sócio CCA preencher o playbook da firma (sem CLI) |

### Adaptação PT/EU para `commercial-legal`

- Cláusulas-tipo: usar terminologia do Código Civil PT (art. 405.º liberdade contratual, art. 280.º objecto, art. 232.º consenso, art. 280.º a 282.º forma) e do Código Comercial
- Renovação automática: art. 1054.º CCiv para arrendamento; cláusulas gerais negociadas para outros contratos
- Cláusulas abusivas: DL 446/85 (LCCG)
- Mora e juros comerciais: DL 62/2013 (transposição directiva atraso pagamento)

---

## Fase 2 — `privacy-legal`

GDPR/RGPD encaixa naturalmente — é o plugin mais alinhado com PT/EU.

| Skill origem | Status Hub | Implementação |
|---|---|---|
| `dsar-response` | ❌ | Direito de acesso — RGPD art. 15.º + Lei 58/2019 |
| `dpa-review` | ❌ | Contrato de subcontratação — RGPD art. 28.º |
| `pia-generation` | ❌ | DPIA — RGPD art. 35.º |
| `privacy-triage` | ❌ | Triagem de incidentes — RGPD art. 33.º, 34.º + obrigação CNPD |
| `breach-notification-draft` | ❌ | Notificação à CNPD em 72h |

### Adaptação PT/EU para `privacy-legal`

- Autoridade: **CNPD** (não FTC, não state AG)
- Lei nacional: Lei 58/2019 (execução RGPD em PT)
- Direito comunitário: RGPD, Diretiva ePrivacy, EU-US DPF
- **Remover** referências a CCPA/CPRA, state privacy laws

---

## Fase 3 — `corporate-legal`

M&A e governance societário.

| Skill origem | Status Hub | Implementação |
|---|---|---|
| `diligence-issue-extraction` | ❌ | Due diligence: extracção de issues a partir de dataroom |
| `tabular-review` | ❌ | Diligence grid com citações |
| `closing-checklist` | ❌ | CP tracker (conditions precedent) |
| `entity-compliance` | ❌ | Obrigações registrais — Código das Sociedades Comerciais |

### Adaptação PT/EU para `corporate-legal`

- Código das Sociedades Comerciais (DL 262/86), Código do Registo Comercial
- Concorrência: Lei 19/2012 (controlo de concentrações), AdC + Comissão Europeia (Regulamento 139/2004)
- Tipos societários: SA, Lda., SGPS — **não** LLC/Inc/Corp
- **Remover** referências a Delaware General Corporation Law, NY BCL

---

## Fase 4 — Restantes plugins

| Plugin | Status | Notas de adaptação PT/EU |
|---|---|---|
| `employment-legal` | ❌ Fase 4 | Código do Trabalho (Lei 7/2009); ACT (Autoridade Condições Trabalho); **remover** FLSA/ADA/FMLA/at-will |
| `regulatory-legal` | ❌ Fase 4 | Feeds: DRE, JO UE, CMVM, Banco de Portugal, ASAE; **remover** Federal Register |
| `ai-governance-legal` | ❌ Fase 4 | EU AI Act (Reg. 2024/1689); **remover** NIST AI RMF como default |
| `product-legal` | ❌ Fase 4 | Lei 24/96 (defesa consumidor); marcação CE; **remover** FTC marketing guides |

---

## Não portar

| Plugin | Razão | Alternativa |
|---|---|---|
| `litigation-legal` | Estruturado em torno de processo civil US (FRE, claim charts, demand letters anglo, FRCP discovery) | Se necessário no futuro, **desenhar de raiz** em torno do CPC (Lei 41/2013) — petição inicial, contestação, instrução, prova testemunhal/documental/pericial |
| `ip-legal` | US patent practice (USPTO, claim construction Markman, prior art search USPTO-shaped) | Se necessário, **desenhar de raiz** em torno do Código da Propriedade Industrial (DL 110/2018) e Reg. UE 2017/1001 (marca UE), procedimentos INPI |
| `law-student`, `legal-clinic`, `legal-builder-hub` | Fora do âmbito de um hub de contratos para sociedade de advogados | — |
| `cocounsel-legal` (Thomson Reuters) | Integração Westlaw — base de dados US | Eventual integração equivalente: DRE, Wolters Kluwer PT, Almedina, IUS+ — projecto separado |

---

## Tokens proibidos em prompts e outputs

Lista não-exaustiva. Test fixtures dos Edge Functions devem verificar ausência destes tokens no output:

```
FRE, FRCP, IRAC, CREAC, CCPA, CPRA, HIPAA, FCRA, GLBA, SOX, FCPA,
UCC, FLSA, ADA, FMLA, NLRA, ERISA, OSHA, ADEA, DMCA, CDA, Section 230,
U.S.C., USC, CFR, MBE, JD, Esq.,
Delaware law, California law, New York law, common law,
state/federal, at-will, demand letter, claim chart,
First Amendment, Fourth Amendment, supremacy clause,
DOJ, FTC, SEC, EEOC, NLRB, IRS, USPTO
```

---

## Trabalho fora do port

Itens que **não** vêm do `claude-for-legal` mas complementam:

- UI no Hub para sócios CCA editarem o `org_playbooks` da firma (substitui `cold-start-interview`)
- Auditoria periódica (CI) que faz grep dos tokens proibidos em todos os prompts
- Versionamento do playbook (`org_playbook_versions`) para rastreabilidade
- Métricas de uso por skill (volume, custo Anthropic API, override rate)
