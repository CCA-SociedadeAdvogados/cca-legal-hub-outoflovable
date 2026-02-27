# Guia: Power Automate Flow — Business Central → Supabase

Este Flow serve de proxy HTTP entre a Edge Function `bc-integration` (Supabase) e a API
OData v4 do Business Central (BC) on-premises ou cloud.

---

## Pré-requisitos

| Requisito | Notas |
|---|---|
| Power Automate Premium ou Per-flow | Necessário para o trigger HTTP |
| Conector Business Central | Incluído na licença Dynamics 365 BC |
| Supabase project URL + anon key | Para testes opcionais de retorno |

---

## Passo 1 — Criar o Flow

1. Aceder a **make.powerautomate.com**
2. **+ Criar** → **Fluxo de nuvem instantâneo**
3. Nome: `CCA-BC-Proxy`
4. Trigger: **Quando um pedido HTTP é recebido**

---

## Passo 2 — Configurar o Trigger HTTP

No trigger, definir o **Esquema JSON do corpo do pedido**:

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["getCustomers", "getLedgerEntries", "getCustomerById"]
    },
    "companyId": { "type": "string" },
    "customerNo": { "type": "string" },
    "filter": { "type": "string" },
    "top": { "type": "integer" },
    "skip": { "type": "integer" }
  },
  "required": ["action", "companyId"]
}
```

Guardar o flow para obter o **HTTP POST URL** — este será o valor de `PA_BC_FLOW_URL`.

---

## Passo 3 — Adicionar condição por acção

Adicionar uma acção **Switch** com expressão:

```
triggerBody()?['action']
```

### Case: `getCustomers`

Adicionar acção **Business Central — Listar entidades** (ou usar HTTP com OData):

- **Tipo de entidade**: `customers`
- **ID da empresa**: `@{triggerBody()?['companyId']}`
- **$filter** (se presente):
  ```
  @{if(empty(triggerBody()?['filter']), '', triggerBody()?['filter'])}
  ```
- **$top**:
  ```
  @{if(empty(triggerBody()?['top']), 50, triggerBody()?['top'])}
  ```

### Case: `getLedgerEntries`

- **Tipo de entidade**: `customerLedgerEntries`
- **$filter**:
  ```
  @{if(empty(triggerBody()?['filter']), '', triggerBody()?['filter'])}
  ```
- Para filtrar por cliente: adicionar ao filter
  ```
  customerNumber eq '@{triggerBody()?['customerNo']}'
  ```

### Case: `getCustomerById`

- **Tipo de entidade**: `customers`
- **Filtro**: `number eq '@{triggerBody()?['customerNo']}'`

---

## Passo 4 — Mapear a resposta

Para cada case, adicionar acção **Resposta** (HTTP Response):

- **Código de estado**: `200`
- **Cabeçalhos**: `Content-Type: application/json`
- **Corpo**:

```json
{
  "success": true,
  "data": @{body('BC_Action_Name')?['value']},
  "totalCount": @{length(body('BC_Action_Name')?['value'])}
}
```

Em caso de erro, adicionar um **Âmbito** → **Executar após** (configurado para falha)
com resposta:

```json
{
  "success": false,
  "data": [],
  "error": "@{body('BC_Action_Name')?['error']?['message']}"
}
```

---

## Passo 5 — Proteger com API Key (opcional mas recomendado)

1. No trigger, expandir **Configurações avançadas**
2. Activar **Autenticação** → seleccionar **Chave API**
3. Definir um valor secreto — esse será `PA_API_KEY` nos secrets Supabase

A Edge Function envia o header `x-api-key: <PA_API_KEY>` em cada pedido.

---

## Passo 6 — Testar o Flow

```bash
curl -X POST "https://prod-xx.westeurope.logic.azure.com/..." \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_API_KEY" \
  -d '{
    "action": "getCustomers",
    "companyId": "SEU_BC_COMPANY_ID",
    "top": 5
  }'
```

Resposta esperada:

```json
{
  "success": true,
  "data": [...],
  "totalCount": 5
}
```

---

## Mapeamento de campos BC → TypeScript

| Campo BC (OData)         | Campo TypeScript       |
|--------------------------|------------------------|
| `number`                 | `no`                   |
| `displayName`            | `name`                 |
| `email`                  | `email`                |
| `phoneNumber`            | `phoneNo`              |
| `blocked`                | `blocked`              |
| `creditLimit`            | `creditLimit`          |
| `balance`                | `balance`              |
| `balanceDue`             | `balanceDue`           |
| `currencyCode`           | `currency`             |
| `paymentTermsCode`       | `paymentTermsCode`     |
| `entryNumber`            | `entryNo`              |
| `customerNumber`         | `customerNo`           |
| `postingDate`            | `postingDate`          |
| `documentType`           | `documentType`         |
| `documentNumber`         | `documentNo`           |
| `amount`                 | `amount`               |
| `remainingAmount`        | `remainingAmount`      |
| `open`                   | `open`                 |
| `dueDate`                | `dueDate`              |

---

## Notas de performance

- O Flow tem latência típica de 2–5 s por chamada.
- A Edge Function faz cache em Supabase (TTL: 2–5 min por acção).
- Para listas grandes (> 500 clientes), usar `$top` e `$skip` para paginar.
- Em produção, considerar usar a acção **Premium — HTTP** com OData directamente
  para evitar o overhead do conector genérico BC.
