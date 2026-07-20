---
titulo: "Timeline — Golden Visa (ARI) + renovações"
area: "Imigração / Investimento"
jurisdicao: "Portugal"
base_legal: "Art. 90.º-A da Lei 23/2007; DR 84/2007; Lei 56/2023; Lei 37/81 c/ LO 1/2026"
autoridade: "AIMA"
estado: "rascunho — pendente de validação pelo advogado da área"
versao: "0.1"
---

# Timeline — Golden Visa (ARI) + renovações

> **Estado:** rascunho para validação. Ferramenta de apoio à gestão de prazos — **não dispensa** a verificação pelo mandatário. Procedimento **administrativo**: a contagem segue o **CPA**, não as férias judiciais do CPC.

## Âmbito e base legal

- **ARI** — Autorização de Residência para Atividade de Investimento, **art. 90.º-A da Lei 23/2007** (Lei de Estrangeiros); regulamentação **DR 84/2007**.
- **Autoridade competente:** AIMA (sucedeu ao SEF em 2023).
- **Regime pós-Lei 56/2023 (Mais Habitação):** removidos o imobiliário e a transferência de capital de €1,5M (revogadas subalíneas do art. 3.º/1/d).
- **Nacionalidade:** Lei 37/81, com a redação da **LO 1/2026** (em vigor ~18 maio 2026).

## Pré-requisitos (fase 0)

NIF · conta bancária PT · investimento elegível concretizado, entre as vias atuais:

| Via de investimento | Montante mínimo |
|---|---|
| Fundo CMVM não-imobiliário (FCR/OIC) | €500.000 |
| Constituição/reforço de sociedade + criação de 5 postos (ou manter 10, ≥5 permanentes) | €500.000 |
| Investigação científica | €500.000 |
| Apoio a projeto cultural / património | €250.000 |
| Criação de postos de trabalho | 10 postos |

## A) Procedimento de concessão

| # | Fase | Tipo | Prazo / regra | Base legal | Notas |
|---|------|------|---------------|-----------|-------|
| 1 | Submissão online (Portal ARI) + taxa de análise | ato do requerente | — | art. 90.º-A | Data da taxa relevante p/ relógio da nacionalidade (LO 1/2026) |
| 2 | Aceitação/validação ou pedido de correção | marco AIMA | — | — | Regra do processo completo: instrução deficiente = indeferimento |
| 3 | Pré-aprovação (verificação do investimento) | marco AIMA | — | — | — |
| 4 | Biometria (agendamento + recolha em Loja AIMA) | marco AIMA | — | — | Principal gargalo do procedimento |
| 5 | Decisão e emissão do 1.º título ARI | decisão AIMA | validade 2 anos desde a emissão; decisão em 90 dias | art. 90.º-A; CPA | Incumprimento do prazo → reclamação e depois ação/intimação administrativa |

## B) Manutenção e renovações

| # | Fase | Tipo | Prazo / regra | Base legal | Notas |
|---|------|------|---------------|-----------|-------|
| 6 | Estada mínima | obrigação continuada | ≥7 dias no 1.º ano; ≥14 dias por período de 2 anos | art. 90.º-A | Manter o investimento durante o período exigido |
| 7 | Pedido de renovação | prazo do requerente | entre **90 e 30 dias** antes da caducidade | DR 84/2007, art. 63.º/16 | 100% online no Portal das Renovações (só a partir de PT; NISS e morada atualizados; taxa em 24h) |
| 8 | Salvaguarda de caducidade | regra | direito não caduca antes de **6 meses** sobre o termo | DR 84/2007, art. 63.º/14 | Renovação tardia = contra-ordenação (art. 201.º) |
| 9 | 1.ª e 2.ª renovação | decisão AIMA | +2 anos cada | — | — |

## C) Marcos downstream (opcionais)

| # | Fase | Prazo / regra | Base legal |
|---|------|---------------|-----------|
| 10 | Residência permanente | após 5 anos de residência legal | Lei 23/2007 |
| 11 | Nacionalidade por naturalização | 10 anos (geral) / 7 anos (UE e CPLP) | Lei 37/81 c/ LO 1/2026 |

**Contagem da nacionalidade (regras transitórias LO 1/2026):** taxa de submissão paga *antes* da entrada em vigor → conta da data de pagamento; paga *depois* → conta da emissão do 1.º cartão; pedidos de nacionalidade já pendentes na entrada em vigor → decididos pelo regime dos 5 anos. Novos requisitos: A2 de português, teste cívico e declaração de adesão a princípios democráticos.

## Regra de cálculo (relógios paralelos — para implementação)

Contagem administrativa segue o **CPA** (não as férias judiciais). Quatro relógios independentes:

1. **R1 · validade do título** — emissão `+ 2 anos`; alerta de renovação na janela `90 a 30 dias` antes da caducidade; salvaguarda de `6 meses` pós-caducidade.
2. **R2 · estada mínima** — `7 dias` no 1.º ano; `14 dias` por cada período de 2 anos; alerta antes do fecho de cada período.
3. **R3 · decisão AIMA** — submissão `+ 90 dias` (confirmar se corridos ou úteis); se ultrapassado, sinalizar via de reação (reclamação → contencioso administrativo).
4. **R4 · PR/nacionalidade** — âncora conforme regras transitórias da LO 1/2026 (data de pagamento da taxa *vs.* emissão do 1.º cartão).

## Pontos a validar (advogado de imigração)

- [ ] Thresholds e enquadramento exato de cada via de investimento (art. 90.º-A; art. 3.º/1/d) e prova de manutenção.
- [ ] Validade do título e periodicidade de renovação em vigor (2+2+2) e janela 90–30 dias.
- [ ] Interpretação atual da estada mínima (14 dias "por período de 2 anos" *vs.* "anos subsequentes").
- [ ] Prazo legal de decisão (90 dias corridos ou úteis) e via de reação ao silêncio.
- [ ] Aplicação concreta das regras transitórias da LO 1/2026 ao relógio de nacionalidade.
- [ ] Taxas atuais (análise, emissão, renovação) — tabela AIMA.
- [ ] Regime dos titulares "imobiliário" anteriores (conversão para art. 89.º/4).
