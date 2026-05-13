# Claude for Legal — Guia de Instalação (CCA)

Marketplace oficial de plugins jurídicos da Anthropic para o **Claude Code CLI** (terminal/desktop). Cada plugin adiciona slash commands e skills específicos para uma área de prática.

> **Âmbito.** Este guia é para uso **pessoal** de cada advogado/jurista da CCA, na sua própria máquina. Não tem impacto no código deste repositório (`cca-legal-hub-outoflovable`) — os plugins são ferramentas de trabalho do dia-a-dia jurídico, não dependências do produto.

Repo do marketplace: https://github.com/anthropics/claude-for-legal

---

## 1. Pré-requisitos

- **Claude Code CLI** instalado localmente (não funciona em sessões web/cloud)
- Conta Claude com acesso ao CLI
- (Opcional, recomendado) Um conector de pesquisa jurídica: CourtListener, Trellis, Descrybe, Solve Intelligence ou CoCounsel Legal

## 2. Adicionar o marketplace

No teu terminal, dentro de qualquer pasta de trabalho (ou na pasta onde guardas matérias):

```bash
claude
```

Dentro da sessão Claude Code:

```text
/plugin marketplace add https://github.com/anthropics/claude-for-legal
```

## 3. Instalar os plugins relevantes

Escolhe apenas os que se aplicam à tua prática. Para a CCA (sociedade portuguesa de espectro alargado em comercial/societário/laboral/litigation), os mais úteis são:

```text
/plugin install commercial-legal@claude-for-legal      # contratos comerciais, NDAs, SaaS
/plugin install corporate-legal@claude-for-legal       # M&A, due diligence, deliberações
/plugin install litigation-legal@claude-for-legal      # contencioso, intake, claim charts
/plugin install employment-legal@claude-for-legal      # laboral, cessações, classificação
/plugin install privacy-legal@claude-for-legal         # RGPD, DSAR, DPA, PIA
/plugin install regulatory-legal@claude-for-legal      # monitorização regulatória
/plugin install ip-legal@claude-for-legal              # marcas, FTO, C&D, DMCA, OSS
```

Outros disponíveis (instala se aplicável):

```text
/plugin install product-legal@claude-for-legal         # revisão de lançamentos, marketing claims
/plugin install ai-governance-legal@claude-for-legal   # triagem de casos de uso IA, AIA
/plugin install law-student@claude-for-legal           # estagiários: drilling socrático, briefing
/plugin install legal-clinic@claude-for-legal          # gestão de matérias em clínica jurídica
/plugin install legal-builder-hub@claude-for-legal     # descoberta de skills da comunidade
/plugin install cocounsel-legal@claude-for-legal       # Westlaw Deep Research (TR — requer subscrição)
```

## 4. Reiniciar o CLI

Sai do Claude Code (`Ctrl+D` ou `/exit`) e volta a abrir. Os comandos dos plugins ficam disponíveis no autocomplete.

## 5. Setup de cada plugin (cold-start interview)

**Passo crítico.** Cada plugin tem uma entrevista de arranque que personaliza o perfil de prática e escreve um `CLAUDE.md` adequado:

```text
/commercial-legal:cold-start-interview
/corporate-legal:cold-start-interview
/litigation-legal:cold-start-interview
/employment-legal:cold-start-interview
/privacy-legal:cold-start-interview
/regulatory-legal:cold-start-interview
/ip-legal:cold-start-interview
```

Responde às perguntas com o contexto da CCA (jurisdição PT/UE, idioma primário PT, estilo de redacção, templates internos, etc.). O resultado fica guardado e é reutilizado em todas as sessões seguintes nessa pasta.

## 6. Slash commands principais por plugin

| Plugin | Comandos chave |
|---|---|
| `commercial-legal` | `:review`, `:amendment-history` |
| `corporate-legal` | `:tabular-review`, `:closing-checklist` |
| `litigation-legal` | `:matter-intake`, `:claim-chart` |
| `employment-legal` | `:hiring-review`, `:termination-review` |
| `privacy-legal` | `:dsar-response`, `:pia-generation` |
| `regulatory-legal` | `:reg-feed-watcher`, `:policy-diff` |
| `ip-legal` | `:clearance`, `:cease-desist` |
| `product-legal` | `:launch-review`, `:marketing-claims-review` |
| `ai-governance-legal` | `:use-case-triage`, `:aia-generation` |
| `law-student` | `:socratic-drill`, `:bar-prep-questions` |
| `legal-clinic` | `:client-intake`, `:memo` |
| `legal-builder-hub` | `:registry-browser`, `:skill-installer` |
| `cocounsel-legal` | `:deep-research` |

## 7. Conectores (opcional)

Para ligar a sistemas externos (CLM, DMS, e-discovery, SharePoint), configura `.mcp.json` na pasta de trabalho. Ver [SHAREPOINT_SETUP_GUIDE.md](./SHAREPOINT_SETUP_GUIDE.md) para o setup do SharePoint da CCA.

## 8. Actualizar plugins

```text
/plugin update <plugin-name>@claude-for-legal
```

## 9. Remover

```text
/plugin uninstall <plugin-name>@claude-for-legal
/plugin marketplace remove claude-for-legal
```

---

## Notas importantes

- Os plugins funcionam também no Claude Cowork (browser), Claude para Microsoft Word/Excel e via Managed Agents API — mas o fluxo principal aqui descrito é via Claude Code CLI.
- **Não corras os comandos `/plugin ...` dentro de uma sessão remota/web** (ex.: sessões Claude Code na web ligadas a este repo via GitHub MCP) — só funcionam no CLI local.
- Cada advogado deve correr a `cold-start-interview` uma vez por plugin para que as respostas sejam consistentes com o estilo da casa.
