
# Mover a configuração LegalBi da página Organização para o painel de Administração

## Objetivo

A configuração do URL LegalBi deve ser removida da página `/organizacao` e integrada diretamente no diálogo "Editar Organização" do painel de administração (`/admin`), seguindo o mesmo padrão da integração SharePoint (componente `OrgSharePointConfig`).

---

## O que vai mudar

### 1. Criar componente `OrgLegalBiConfig`

Criar `src/components/admin/OrgLegalBiConfig.tsx` — um componente reutilizável que encapsula a lógica de configuração do URL LegalBi para uma organização específica (identificada por `organizationId`). Segue exatamente o mesmo padrão do `OrgSharePointConfig`:

- Recebe `organizationId: string | null` como prop
- Carrega o URL atual da organização via query ao Supabase
- Permite editar e guardar o `legalbi_url` diretamente na tabela `organizations`
- Mostra badge de estado ("Configurado" / "Não configurado")
- Mostra o URL configurado em formato `font-mono` truncado

### 2. Adicionar `OrgLegalBiConfig` ao diálogo "Editar Organização" em `PlatformAdmin.tsx`

No diálogo de edição de organização (linha ~1110), adicionar `<OrgLegalBiConfig organizationId={editingOrg?.id || null} />` logo abaixo do `<OrgSharePointConfig>`, mantendo a mesma hierarquia visual.

### 3. Remover a configuração LegalBi de `Organizacao.tsx`

Remover da página `src/pages/Organizacao.tsx`:
- O bloco de estado (`legalbiUrl`, `isSavingLegalbi`, `currentLegalbiUrl`)
- A função `handleSaveLegalbiUrl`
- O card "Integração LegalBi" visível para `isPlatformAdmin`
- Os imports que ficarem sem uso (`BarChart3`, `Save`, `supabase`, `useQueryClient`, `toast`)

---

## Fluxo resultante

1. Platform Admin acede a `/admin` → separador "Organizações"
2. Clica no ícone de edição (lápis) de uma organização
3. No diálogo "Editar Organização", vê:
   - Nome, Identificador, Áreas de Atuação
   - Configuração SharePoint (como hoje)
   - **[NOVO]** Configuração LegalBi — campo de URL com badge de estado
4. Guarda o URL; fica disponível para os utilizadores dessa organização na barra lateral

---

## Detalhes técnicos

**Ficheiro a criar:**
- `src/components/admin/OrgLegalBiConfig.tsx`

**Ficheiros a editar:**
- `src/pages/PlatformAdmin.tsx` — importar e adicionar `<OrgLegalBiConfig>`
- `src/pages/Organizacao.tsx` — remover toda a lógica e UI do LegalBi

**Permissões:** O componente só aparece no diálogo de edição do painel administrativo, que já é protegido pela rota `PlatformAdminRoute`. Não é necessário alterar políticas de RLS — a escrita em `organizations` já está restrita a platform admins pelo padrão existente.

**Sem alterações à base de dados** — a coluna `legalbi_url` já existe na tabela `organizations`.
