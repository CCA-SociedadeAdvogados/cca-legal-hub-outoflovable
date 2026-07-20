---
titulo: "Timeline — IRS (Modelo 3) + pedido de documentos"
area: "Fiscal"
jurisdicao: "Portugal"
base_legal: "CIRS; agenda fiscal AT"
campanha: "IRS 2026 (rendimentos de 2025)"
estado: "rascunho — pendente de validação pelo fiscalista"
versao: "0.1"
---

# Timeline — IRS (Modelo 3) + pedido de documentos

> **Estado:** rascunho para validação. Orientado por **prazos fixos da campanha** (datas civis), não por evento-gatilho. Se um prazo terminar em dia não útil, transfere-se para o dia útil seguinte.

## Fase 0 (interna) — pedido e recolha de documentos ao cliente

Definir antecedência (ex.: até final de fevereiro). Checklist por tipo de rendimento/anexo:

- Rendimentos de trabalho e pensões (cat. A/H).
- Trabalho independente / recibos verdes (cat. B).
- Rendas (cat. F) — contratos e recibos.
- Mais-valias e imóveis (Anexo G) — compra/venda, reinvestimento.
- Rendimentos e contas no estrangeiro (Anexo J).
- Deduções à coleta: saúde, educação, habitação, lares, donativos.
- IBAN atualizado; alterações ao agregado familiar; NIF dos dependentes.

## Calendário da campanha 2026

| # | Data | Obrigação | Notas |
|---|------|-----------|-------|
| 1 | Até 2 março 2026 | Validar faturas no e-Fatura; comunicar agregado familiar; Modelo 44; Modelo 10 | Concentra a maioria das comunicações pré-declaração |
| 2 | 16–31 março 2026 | Consultar e reclamar as deduções à coleta apuradas pela AT | Último momento de correção das deduções |
| 3 | Até 31 março 2026 | Consignação de 1% (IRS/IVA); registar/atualizar IBAN | — |
| 4 | 1 abril – 30 junho 2026 | Entrega da Modelo 3 ou confirmação do IRS automático | Exclusivamente online |
| 5 | Até 31 julho 2026 | AT emite a nota de liquidação | Só para declarações entregues no prazo |
| 6 | Até 31 agosto 2026 | Pagamento do imposto apurado ou reembolso | — |
| 7 | Até 15 setembro 2026 | Pedido de pagamento em prestações | Dívidas até €5.000, após liquidação |

**Independentes (pagamentos por conta):** 20 julho · 21 setembro · 21 dezembro.

## Lógica (para implementação)

- Datas fixas por campanha — não há contagem a partir de evento-gatilho.
- Alertas recomendados: pedido de documentos X semanas antes de 1 abril; alerta interno a ~15 abril (aguardar estabilização dos dados pré-preenchidos); alerta ao aproximar de 30 junho para casos pendentes.
- As datas das comunicações podem variar ligeiramente a cada ano — parametrizar por campanha.

## Pontos a validar (fiscalista)

- [ ] Datas exatas da agenda fiscal AT para a campanha (podem variar).
- [ ] Checklist de documentos por anexo.
- [ ] Casos que afastam o IRS automático (cat. B, Anexo G, Anexo J, etc.).
- [ ] Declaração de substituição — prazos e efeitos.
