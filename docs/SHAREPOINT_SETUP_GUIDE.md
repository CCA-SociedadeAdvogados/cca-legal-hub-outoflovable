# Guia de Configuração - Integração SharePoint

Este guia explica como configurar a integração do SharePoint com a plataforma CCA Legal.

## Passo 1: Registar a Aplicação no Azure AD

### 1.1 Aceder ao Azure Portal

1. Aceda a [https://portal.azure.com](https://portal.azure.com)
2. Faça login com a sua conta Microsoft 365 (a mesma que usa no SharePoint)

### 1.2 Criar o Registo da Aplicação

1. Na barra de pesquisa, escreva **"App registrations"** e clique no resultado
2. Clique em **"+ New registration"**
3. Preencha os campos:
   - **Name**: `CCA Legal - SharePoint Integration`
   - **Supported account types**: Selecione **"Accounts in this organizational directory only"**
   - **Redirect URI**: Deixe em branco por agora (não é necessário para polling)
4. Clique em **"Register"**

### 1.3 Guardar os IDs Importantes

Após criar a aplicação, será redirecionado para a página de Overview. **Guarde estes valores**:

| Campo | Onde encontrar | Exemplo |
|-------|----------------|---------|
| **Application (client) ID** | Overview > Application (client) ID | `12345678-1234-1234-1234-123456789abc` |
| **Directory (tenant) ID** | Overview > Directory (tenant) ID | `87654321-4321-4321-4321-cba987654321` |

![Azure App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/media/quickstart-register-app/portal-02-app-reg-01.png)

## Passo 2: Criar o Client Secret

1. No menu lateral esquerdo, clique em **"Certificates & secrets"**
2. Na secção **"Client secrets"**, clique em **"+ New client secret"**
3. Preencha:
   - **Description**: `CCA Legal Production`
   - **Expires**: Escolha **"24 months"** (recomendado)
4. Clique em **"Add"**
5. **IMPORTANTE**: Copie imediatamente o **"Value"** do secret (só aparece uma vez!)

| Campo | Valor a guardar |
|-------|-----------------|
| **Client Secret** | `abc123...` (o Value, NÃO o Secret ID) |

## Passo 3: Configurar as Permissões da API

### 3.1 Adicionar Permissões

1. No menu lateral, clique em **"API permissions"**
2. Clique em **"+ Add a permission"**
3. Selecione **"Microsoft Graph"**
4. Selecione **"Application permissions"** (NÃO Delegated!)
5. Procure e selecione as seguintes permissões:

| Permissão | Descrição |
|-----------|-----------|
| `Sites.Read.All` | Ler todos os sites SharePoint |
| `Files.Read.All` | Ler todos os ficheiros |

6. Clique em **"Add permissions"**

### 3.2 Conceder Consentimento de Administrador

1. Ainda na página de "API permissions"
2. Clique em **"Grant admin consent for [Your Organization]"**
3. Confirme clicando em **"Yes"**
4. Verifique que todas as permissões têm um ✅ verde na coluna "Status"

![API Permissions](https://docs.microsoft.com/en-us/graph/images/aad-portal-permissions.png)

## Passo 4: Obter o Site ID do SharePoint

### 4.1 Identificar o URL do seu Site

O URL do seu site SharePoint tem este formato:
```
https://[empresa].sharepoint.com/sites/[nome-do-site]
```

Por exemplo:
- `https://ccaadvogados.sharepoint.com/sites/Documentos`
- `https://minhaempresa.sharepoint.com/sites/Legal`

### 4.2 Obter o Site ID via Graph Explorer

1. Aceda a [https://developer.microsoft.com/graph/graph-explorer](https://developer.microsoft.com/graph/graph-explorer)
2. Faça login com a sua conta Microsoft 365
3. Na barra de consulta, substitua pelo seu URL:

```
GET https://graph.microsoft.com/v1.0/sites/[empresa].sharepoint.com:/sites/[nome-do-site]
```

**Exemplo real:**
```
GET https://graph.microsoft.com/v1.0/sites/ccaadvogados.sharepoint.com:/sites/Documentos
```

4. Clique em **"Run query"**
5. Na resposta JSON, copie o valor do campo **"id"**:

```json
{
  "id": "ccaadvogados.sharepoint.com,12345678-abcd-1234-efgh-123456789abc,87654321-dcba-4321-hgfe-cba987654321",
  "name": "Documentos",
  "webUrl": "https://ccaadvogados.sharepoint.com/sites/Documentos"
}
```

O **Site ID** completo é: `ccaadvogados.sharepoint.com,12345678-abcd-1234-efgh-123456789abc,87654321-dcba-4321-hgfe-cba987654321`

## Passo 5: Configurar na Plataforma CCA Legal

### 5.1 Adicionar Secrets ao Supabase

1. Aceda ao seu projeto Supabase
2. Vá a **Settings > Edge Functions**
3. Em **"Secrets"**, adicione os seguintes:

| Nome do Secret | Valor |
|----------------|-------|
| `SHAREPOINT_CLIENT_ID` | O Application (client) ID do Passo 1.3 |
| `SHAREPOINT_CLIENT_SECRET` | O Client Secret do Passo 2 |
| `SHAREPOINT_TENANT_ID` | O Directory (tenant) ID do Passo 1.3 |

### 5.2 Configurar na Interface

1. Na plataforma CCA Legal, vá a **Definições > Integrações**
2. Na secção **SharePoint**, clique em **"Configurar"**
3. Cole o **Site ID** obtido no Passo 4.2
4. Clique em **"Guardar e Testar Conexão"**

## Passo 6: Testar a Integração

1. Coloque um ficheiro na raiz do site SharePoint ou numa pasta
2. Na plataforma CCA Legal, vá a **Documentos**
3. Clique em **"Sincronizar SharePoint"**
4. O ficheiro deve aparecer na lista em alguns segundos

## Resolução de Problemas

### Erro: "Access Denied" ou "Insufficient privileges"

- Verifique se concedeu **Admin consent** no Passo 3.2
- Confirme que selecionou **Application permissions** (não Delegated)

### Erro: "Invalid client secret"

- O secret pode ter expirado ou foi copiado incorretamente
- Crie um novo secret no Passo 2

### Erro: "Site not found"

- Verifique o URL do site no Passo 4.1
- Confirme que o Site ID está correto

### Ficheiros não aparecem

- Verifique se os ficheiros estão na biblioteca "Documents" do site
- Confirme que o polling está ativo nas definições

## Estrutura de Pastas Recomendada no SharePoint

Para melhor organização, recomendamos esta estrutura:

```
Site SharePoint
├── Documents/
│   ├── Contratos/
│   │   ├── Cliente A/
│   │   └── Cliente B/
│   ├── Financeiro/
│   │   ├── Faturas/
│   │   └── Recibos/
│   └── Geral/
```

A sincronização irá replicar esta estrutura na plataforma CCA Legal.

## Segurança

- O **Client Secret** é sensível - nunca o partilhe
- O secret expira após o período configurado (recomendado: 24 meses)
- Configure um lembrete para renovar o secret antes de expirar
- As permissões são **read-only** - a aplicação não pode modificar ficheiros no SharePoint

## Suporte

Se tiver problemas na configuração, contacte o suporte técnico com:
1. Screenshots dos erros
2. Os IDs da aplicação (NÃO o secret!)
3. O URL do site SharePoint
