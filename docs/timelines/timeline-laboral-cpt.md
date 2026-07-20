---
titulo: "Timeline — Ação declarativa, processo comum (CPT)"
area: "Laboral"
jurisdicao: "Portugal — 1.ª instância"
base_legal: "Código de Processo do Trabalho (aplicação subsidiária do CPC)"
estado: "rascunho — pendente de validação pelo advogado da área"
versao: "0.1"
---

# Timeline — Ação declarativa, processo comum (laboral)

> **Estado:** rascunho para validação. Ferramenta de apoio à gestão de prazos — **não dispensa** a verificação do prazo pelo mandatário em cada processo.

## Pressupostos de contagem

Os mesmos do CPC (aplicação subsidiária, *art. 1.º CPT*), **com uma ressalva crítica**:

> ⚠️ **Natureza urgente** — vários processos laborais são urgentes por lei (ex.: impugnação de despedimento, acidentes de trabalho — *art. 26.º CPT*). Nesses casos os prazos **não se suspendem** durante as férias judiciais. É o ponto que mais erros de contagem gera — validar caso a caso.

Regras gerais (quando o processo **não** for urgente):

- **Continuidade e suspensão** — prazo contínuo, suspenso nas férias judiciais. — *art. 138.º/1 CPC*
- **Férias judiciais** — 22 dez a 3 jan; do Domingo de Ramos à Segunda-feira de Páscoa (móvel); 16 jul a 31 ago. — *art. 28.º LOSJ*
- **Dies a quo** — o dia do ato não conta; conta-se do dia seguinte. — *art. 279.º b) CC*
- **Termo em dia não útil** — transfere para o 1.º dia útil seguinte. — *art. 138.º/2 CPC*
- **Prática após o termo** — 3 primeiros dias úteis com multa (*art. 139.º/5*) ou justo impedimento (*art. 140.º*).

## Sequência de fases

| # | Fase | Tipo | Prazo | Base legal | Notas |
|---|------|------|-------|-----------|-------|
| 1 | Petição inicial · despacho liminar | evento-gatilho | — | art. 54.º | — |
| 2 | Citação do réu para a audiência de partes | marco | — | art. 54.º/3 | Com entrega do duplicado da PI |
| 3 | Audiência de partes (tentativa de conciliação) | marco do tribunal | — | art. 55.º | Marca de toque do processo laboral |
| 4 | Contestação | prazo de parte | 10 dias ⚠️ *confirmar* | art. 56.º | Após a audiência de partes, não havendo conciliação. Prorrogável (art. 58.º) |
| 5 | Resposta / articulados supervenientes | prazo de parte | — | art. 60.º | Quando admissível |
| 6 | Suprimento de exceções / convite ao aperfeiçoamento | marco | — | art. 61.º | — |
| 7 | Audiência prévia | marco do tribunal | — | art. 62.º | Quando tenha lugar |
| 8 | Audiência final (julgamento) | marco do tribunal | ~30 dias | art. 62.º/2, 63.º e ss. | Em regra realiza-se dentro de 30 dias |
| 9 | Sentença | prazo do tribunal | ⚠️ *a confirmar* | (subsid. art. 607.º/1 CPC) | Verificar prazo laboral aplicável |
| 10 | Notificação da sentença | marco | — | art. 247.º | Âncora do recurso |
| 11 | Recurso de apelação | prazo de parte | 30 dias ⚠️ *confirmar* | art. 79.º-A/80.º CPT + 638.º CPC | Confirmar especialidades laborais |

## Regra de cálculo (para implementação)

1. Âncora do prazo de contestação = data da **audiência de partes** (não a citação).
2. Contagem a partir do dia seguinte à âncora.
3. **Se o processo for urgente:** não aplicar suspensão em férias (contagem contínua total).
4. Se o termo cair em dia não útil, avança para o 1.º dia útil seguinte.
5. Calcular também o termo `+3 dias úteis` (janela de multa — art. 139.º/5).

## Pontos a validar (advogado de laboral)

- [ ] **Natureza urgente** do processo — decisivo para a suspensão (ou não) em férias.
- [ ] Prazo exato da contestação após a audiência de partes (art. 56.º).
- [ ] Prazo da sentença laboral.
- [ ] Prazo e especialidades do recurso no CPT (art. 79.º-A/80.º).
- [ ] Confirmar as fases que são marcos (sem prazo de parte fixo).
