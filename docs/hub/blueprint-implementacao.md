# Hub CCA — implementação do blueprint sobre a stack atual

> Origem: "Hub CCA — Fluxos, Integrações e Consola" (blueprint operacional v1,
> 03/07/2026, artefacto interno). Este documento mapeia cada secção do
> blueprint para a implementação no repo (Supabase + React) e regista o que
> fica pendente das decisões em aberto (Q1–Q7).

## Princípios adotados (Secção 1)

- O portal do cliente **nunca fala com sistemas de origem** — só lê o que o
  motor de publicação autoriza. Na stack atual isso traduz-se em: RLS sem
  políticas de SELECT direto para clientes nas tabelas do hub + RPCs
  `SECURITY DEFINER` que devolvem apenas colunas publicáveis (mesmo padrão já
  validado nas timelines de processos, `tl_*`).
- **Opt-in por defeito**: nada é publicado automaticamente; publicação por
  assunto, por evento e por aba, gerida na consola.
- **O cliente nunca escreve num sistema master**: escreve no hub (tabelas
  deste repo) e a CCA valida antes de propagar.
- **Auditoria**: alterações da consola e publicações registadas.

## O que é implementado agora (Fase 1 do Q7 + consola)

| Blueprint | Implementação |
|---|---|
| Secção 4 — base única de eventos | Tabela `hub_eventos` (6 tipos, texto a duas camadas, pipeline rascunho→curadoria→publicação, semântica de estado calculada, visibilidade por tipo com override) |
| F2 — assuntos com status curado, opt-in | `assuntos.publicado` + `assuntos.status_cliente`; portal só mostra assuntos publicados |
| F5 — prazos e datas | Aba Prazos do portal alimentada pela mesma base `hub_eventos` (só publicados, futuro), feed ICS, notificações 7/3/1 dias |
| F1 — grupos de acesso | `hub_grupos` + `organizations.hub_grupo_id`; seletor de entidade no portal para utilizadores com acesso a várias empresas do grupo |
| Secção 5 — consola de gestão | Página interna `/consola` (perfis de gestão CCA): abas do portal, funcionalidades, empresas do grupo, publicação de assuntos, utilizadores do cliente, auditoria |
| Níveis de permissão 1–4 | 1: `hub_portal_config` (abas/funcionalidades por org) · 2: `organizations.portal_ativa` no grupo · 3: `assuntos.publicado` + `hub_eventos.publicado` · 4: papéis `organization_members.role` + acesso restrito por assunto (`hub_user_assuntos`) |
| Marco de fase automático | Concluir uma fase nas timelines de processos (`tl_set_phase`) gera um `hub_evento` de tipo `marco_fase` em rascunho, para curadoria |
| Duas camadas de texto | `titulo_interno`/`descricao_interna` (nunca saem) vs `titulo_cliente`/`descricao_cliente` (publicados) |
| "Vencido nunca misturado com próximos" | Estado semântico calculado no servidor: `concluido`, `em_curso`, `previsto`, `vencido` |

## Pontos de encaixe para as integrações (Secção 3)

Os conectores I1–I5 e I7 dependem de credenciais e das decisões Q1–Q4; ficam
preparados do lado do hub:

- **Contrato de ingestão**: RPC `hub_ingest_evento(...)` (service role) — os
  conectores JVRIS/CLM/iManage inserem eventos em rascunho com `origem` e
  `chave_origem` (chave única por registo de origem, "fim dos duplicados").
- **I4/I5 (2× Navision)**: já existe o padrão `scripts/bc-sync-agent`
  (service role, `ORGANIZATION_ID` por instância) — replicável por entidade
  emissora; a consolidação por NIF acontece no hub, nunca na origem.
- **I6 (Entra External ID)**: decisão Q4 pendente; o portal mantém contas
  locais atuais. O SSO Azure AD interno já existe para advogados.
- **S3 (assistente IA)**: fora desta fase; a regra "nunca indexar conteúdo
  não publicado" fica garantida porque o universo publicado é exatamente o
  que os RPCs de cliente devolvem.

## Decisões em aberto (Secção 6) — estado

| Q | Tema | Estado nesta implementação |
|---|---|---|
| Q1 | Cobertura da API JVRIS | **Parcialmente resolvida**: conector I1 de WIP/timesheets implementado por acesso direto ao `CCA_WIP` (SQL Server, rede interna) via `scripts/jvris-wip-agent` → cache `jvris_wip_registos`. Agenda de prazos/fases continua pendente da API |
| Q2 | PDF das faturas nos NAV | Pendente; F6 é Fase 2 |
| Q3 | Etiqueta "cliente-visível" iManage | Pendente; F3 é Fase 2 |
| Q4 | Identidade dos utilizadores | Mantidas contas locais atuais; migração para Entra External ID fica desenhada mas não executada |
| Q5 | Quem cura o quê | A consola exige perfil de gestão CCA (`cca_manager`/`app_admin`); afinação do papel "Gestor do cliente" quando decidido |
| Q6 | Ocultar valores financeiros | Implementado como funcionalidade na consola (`ocultar_valores`), desligado por defeito |
| Q7 | Faseamento | Seguido: esta é a Fase 1 (+ consola); F3/F6 = Fase 2; F4/F7/F8 completos = Fase 3 |

## Regras de negócio da linha temporal (Secção 4.3) — como ficam garantidas

1. **Semântica de estado calculada, nunca à mão** — derivada de
   `data_evento` + `concluido` nos RPCs; o cliente recebe o estado já
   calculado.
2. **Visibilidade por tipo com override por evento** — defaults por tipo ao
   criar (audiência/data contratual/marco manual publicáveis por defeito;
   prazo processual e evento documental opt-in; marco de fase após
   curadoria); o responsável pode ocultar qualquer evento.
3. **Prazos internos nunca saem** — eventos com `interno = true` não são
   publicáveis (bloqueado por trigger na base de dados, não só na UI).
4. **Texto a duas camadas** — colunas separadas; os RPCs de cliente não
   selecionam as colunas internas.
5. **Estratégia nunca é evento** — notas táticas continuam fora desta base
   (campos internos de assuntos/contratos).
6. **Notificações 7/3/1** — função de servidor gera notificações para
   eventos publicados a 7, 3 e 1 dias da data; eventos vencidos que dependem
   do cliente ficam sinalizados `requer_acao_cliente`.
7. **Retro-compatibilidade** — os eventos manuais existentes
   (`assunto_eventos`) são migrados para `hub_eventos` (visível→publicado);
   os 3–5 marcos históricos por assunto ativo são tarefa da equipa na
   consola.
