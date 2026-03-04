# CLAUDE.md — CCA Legal Hub

## Project Overview

CCA Legal Hub is a multi-tenant legal contract management SPA for a Portuguese law firm (CCA - Sociedade de Advogados). It provides contract lifecycle management, regulatory compliance tracking, AI-powered document analysis, and GDPR compliance features. The platform is primarily in **Portuguese** with English translation support.

**Supabase Project ID**: `scjxhhkutsiswsgsuiqo`
**Supabase URL**: `https://scjxhhkutsiswsgsuiqo.supabase.co`

> **Nota**: O nome do repositório contém "outoflovable" por razões históricas — o projecto foi inicialmente scaffolded via Lovable (ex-GPT Engineer). **Não existem dependências, referências ou código Lovable no projecto actual.** O source `lovable_ai` foi renomeado para `ai_extraction` (migration `20260225000002`). Nunca adicionar referências ao Lovable em código novo.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite 5 (with SWC plugin for React) |
| **Styling** | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| **Routing** | React Router v6 |
| **State/Data** | TanStack React Query v5 |
| **Backend** | Supabase (Auth, Database, Storage, Edge Functions) |
| **i18n** | react-i18next (PT/EN) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Theme** | next-themes (dark/light/system) |
| **Deployment** | Vercel (SPA rewrite) |
| **Package Manager** | npm (package-lock.json present; bun.lockb also exists) |

---

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint check
npm run preview      # Preview production build
```

There are **no test commands** configured. No test framework is set up.

---

## Project Structure

```
src/
├── App.tsx                      # Root: routes, providers, query client
├── main.tsx                     # Entry point
├── index.css                    # Global styles + CSS variables (theme tokens)
├── components/
│   ├── ui/                      # shadcn/ui primitives (DO NOT edit manually)
│   ├── layout/                  # AppLayout, Header, Sidebar, PlatformAdminRoute
│   ├── admin/                   # Platform admin: users, departments, configs
│   ├── contracts/               # Contract cards, tables, AI parser, triage, compliance
│   ├── compliance/              # Event impact analyzer (AI)
│   ├── dashboard/               # Stats, charts, lists for overview page
│   ├── home/                    # Home page editor + widget system
│   │   └── widgets/             # 9 configurable home widgets
│   ├── settings/                # Privacy, security, SharePoint settings
│   ├── shared/                  # DocumentUploadWithAI, ImageUploader, ImageCropModal
│   ├── sharepoint/              # SharePoint document browser
│   └── organizations/           # Industry sector selector
├── contexts/
│   ├── AuthContext.tsx           # Supabase auth (user, session, signIn/Out/Up)
│   ├── ImpersonationContext.tsx  # Admin impersonation with audit trail
│   ├── SidebarContext.tsx        # Sidebar collapse state (localStorage)
│   └── IndustrySectorContext.tsx # Org industry sectors
├── hooks/
│   ├── useContratos.ts          # Contract CRUD + bulk ops
│   ├── useProfile.ts            # User profile + avatar upload
│   ├── useOrganizations.ts      # Org CRUD, switching, members
│   ├── useEventosLegislativos.ts # Legislative events CRUD
│   ├── useComplianceAI.ts       # AI compliance analysis (edge functions)
│   ├── useDashboardStats.ts     # Dashboard metrics computation
│   ├── useNotifications.ts      # Notifications with realtime subscriptions
│   ├── useAuditLogs.ts          # Audit log queries with filters
│   ├── usePlatformAdmin.ts      # Platform admin check + global stats
│   ├── useFeatureFlags.ts       # Feature flags management
│   ├── useContentBlocks.ts      # Org-specific content management
│   ├── useHomeConfig.ts         # Home layout draft/publish workflow
│   ├── useUserTheme.ts          # Theme preference (DB-persisted)
│   ├── useEffectiveOrganization.ts # Impersonation-aware org resolution
│   ├── use-mobile.tsx           # Responsive breakpoint (768px)
│   └── use-toast.ts             # Internal toast queue (reducer pattern)
├── lib/
│   ├── utils.ts                 # cn() helper, generateSlug()
│   ├── contractStateMachine.ts  # State transitions + lifecycle events
│   ├── exportUtils.ts           # CSV export with BOM for Excel
│   ├── TranslationService.ts    # 3-layer cache: LRU → IndexedDB → Edge Function
│   ├── LRUCache.ts              # In-memory LRU cache (500 items)
│   ├── IndexedDBCache.ts        # Persistent translation cache
│   ├── ccaAgent.ts              # External CCA validation agent bridge
│   ├── industrySectors.ts       # 24 Portuguese industry sectors
│   ├── defaultHomeLayout.ts     # Default widget layout
│   ├── sectorLayoutTemplates.ts # Sector-specific home layouts
│   ├── cropImage.ts             # Canvas-based image cropping
│   └── imageProcessor.ts        # Image processing utilities
├── pages/                       # Route-level page components
│   ├── auth/                    # Login, SSOCallback
│   └── *.tsx                    # ~25 page components
├── integrations/supabase/
│   ├── client.ts                # Supabase client init (typed)
│   └── types.ts                 # Auto-generated DB types (~36K tokens)
├── types/
│   ├── contracts.ts             # Contract enums, interfaces, display labels
│   └── index.ts                 # General app types (User, Event, Policy, etc.)
├── i18n/
│   ├── index.ts                 # i18next config (default: PT)
│   └── locales/
│       ├── pt.json              # Portuguese translations (~52KB)
│       └── en.json              # English translations (~50KB)
└── assets/                      # Static assets
```

---

## Code Patterns — FOLLOW THESE EXACTLY

### Imports — Standard Order

```typescript
// 1. React and external libs
import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';

// 2. React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 3. Supabase client
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// 4. Contexts
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useSidebar } from '@/contexts/SidebarContext';

// 5. Custom hooks
import { useContratos, useContrato } from '@/hooks/useContratos';
import { useProfile } from '@/hooks/useProfile';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';

// 6. Toast — ATTENTION: two different toast systems exist
import { toast } from '@/hooks/use-toast';  // Used in: useContratos, useProfile, useEventosLegislativos
import { toast } from 'sonner';             // Used in: useOrganizations, useNotifications

// 7. shadcn UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// 8. Icons (lucide-react)
import { Plus, Loader2, FileText, Search, X, AlertTriangle } from 'lucide-react';

// 9. Utilities
import { cn } from '@/lib/utils';
```

### CRITICAL: Two Toast Systems

The codebase uses **two different toast libraries**. Match the existing pattern in each file:

```typescript
// System 1: @/hooks/use-toast (custom reducer-based)
// Used in: useContratos, useProfile, useEventosLegislativos, useAuditLogs, useContentBlocks, useFeatureFlags
import { toast } from '@/hooks/use-toast';
toast({ title: 'Contrato criado com sucesso' });
toast({ title: 'Erro ao criar contrato', description: error.message, variant: 'destructive' });

// System 2: sonner (external library)
// Used in: useOrganizations, useNotifications, usePlatformAdmin
import { toast } from 'sonner';
toast.success('Organização criada com sucesso!');
toast.error(error.message || 'Erro ao criar organização');
toast('Notification title', { description: 'Message' });
```

**Rule**: When editing an existing file, use whichever toast system that file already imports. For new hooks, prefer `@/hooks/use-toast`.

---

### React Query — Hook Pattern

Every data hook follows this exact structure:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Type aliases from auto-generated types
type Contrato = Tables<'contratos'>;
type ContratoInsert = TablesInsert<'contratos'>;
type ContratoUpdate = TablesUpdate<'contratos'>;

// Organization scoping helper (used in useContratos, useEventosLegislativos)
const getCurrentOrganizationId = async (userId: string): Promise<string | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('current_organization_id')
    .eq('id', userId)
    .maybeSingle();
  return data?.current_organization_id || null;
};

export const useContratos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // QUERY
  const { data: contratos, isLoading, error, refetch } = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos')
        .select('*', { count: 'exact' })
        .eq('arquivado', false)
        .order('created_at', { ascending: false })
        .range(0, 199);
      if (error) throw error;
      return data as Contrato[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // MUTATION — Create
  const createContrato = useMutation({
    mutationFn: async (contrato: ContratoInsert) => {
      if (!user) throw new Error('Utilizador não autenticado');
      const organizationId = await getCurrentOrganizationId(user.id);
      if (!organizationId) throw new Error('Nenhuma organização selecionada');

      const { data, error } = await supabase
        .from('contratos')
        .insert([{
          ...contrato,
          created_by_id: user.id,
          updated_by_id: user.id,
          organization_id: organizationId,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar contrato', description: error.message, variant: 'destructive' });
    },
  });

  // MUTATION — Update
  const updateContrato = useMutation({
    mutationFn: async ({ id, ...updates }: ContratoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contratos')
        .update({ ...updates, updated_by_id: user?.id })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar contrato', description: error.message, variant: 'destructive' });
    },
  });

  // MUTATION — Archive (soft delete)
  const archiveContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contratos')
        .update({ arquivado: true, updated_by_id: user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast({ title: 'Contrato arquivado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao arquivar contrato', description: error.message, variant: 'destructive' });
    },
  });

  return { contratos, isLoading, error, refetch, createContrato, updateContrato, archiveContrato };
};
```

### Query Key Conventions

```typescript
// Always use these exact query keys — they are referenced for cache invalidation
['contratos']                              // Contract list
['contrato', id]                           // Single contract
['profile', user?.id]                      // User profile
['organizations', user?.id]                // All organizations
['current-organization', user?.id]         // Current org
['user-memberships', user?.id]             // User memberships
['organization-members', organizationId]   // Org members
['eventos_legislativos']                   // Legislative events
['notifications']                          // Notifications
['audit-logs', filters]                    // Audit logs
['feature-flags']                          // Feature flags
['contentBlocks', organizationId]          // Content blocks
['homeConfig', organizationId]             // Home config
['effective-industry-sectors']             // Industry sectors
```

### Self-Healing Pattern (useProfile, useOrganizations)

```typescript
// If a record doesn't exist, create it automatically
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .maybeSingle();  // Use maybeSingle(), NOT single()

if (!data) {
  // Create missing profile
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      nome_completo: user.user_metadata?.nome_completo || user.email,
      onboarding_completed: false,
    })
    .select()
    .single();
  if (insertError) throw insertError;
  return newProfile;
}
return data;
```

### Supabase — RPC Calls

```typescript
// For operations that bypass RLS, use RPC functions
const { data: org, error } = await supabase
  .rpc('create_organization', { p_name: name, p_slug: slug });
if (error) throw error;

// For admin checks
const { data } = await supabase.rpc('is_platform_admin', { _user_id: user.id });
```

### Supabase — File Upload to Storage

```typescript
const fileExt = file.name.split('.').pop();
const filePath = `${user.id}/avatar.${fileExt}`;

// Upload
const { error: uploadError } = await supabase.storage
  .from('contratos')
  .upload(filePath, file, { upsert: true });
if (uploadError) throw uploadError;

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('contratos')
  .getPublicUrl(filePath);
```

### Supabase — Realtime Subscriptions

```typescript
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel('notifications-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user, queryClient]);
```

### Cache Invalidation on Organization Switch

```typescript
// When switching org, invalidate ALL org-scoped queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['current-organization'] });
  queryClient.invalidateQueries({ queryKey: ['contratos'] });
  queryClient.invalidateQueries({ queryKey: ['eventos-legislativos'] });
  queryClient.invalidateQueries({ queryKey: ['impactos'] });
},
```

---

## Page & Component Patterns

### Page Structure

```typescript
import { AppLayout } from '@/components/layout/AppLayout';

const MyPage = () => {
  const { t } = useTranslation();
  const { contratos, isLoading } = useContratos();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">{t('page.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('page.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/path">
                <Plus className="mr-2 h-4 w-4" />
                {t('page.addNew')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* cards, tables, etc. */}
        </div>
      </div>
    </AppLayout>
  );
};

export default MyPage;
```

### Loading States

```typescript
// Full page spinner
if (isLoading) {
  return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </AppLayout>
  );
}

// Loading with text
<div className="flex items-center justify-center min-h-[50vh]">
  <div className="flex flex-col items-center gap-4">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-muted-foreground">A carregar contrato...</p>
  </div>
</div>

// Table skeleton rows
{isLoading ? (
  Array.from({ length: 5 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: colCount }).map((__, j) => (
        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
) : (/* render data */)}

// Button loading
<Button disabled={isSubmitting}>
  {isSubmitting
    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...</>
    : <><Save className="mr-2 h-4 w-4" />Guardar</>
  }
</Button>
```

### Empty States

```typescript
{contratos.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground">
    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
    <p>{t('dashboard.noContracts')}</p>
    <Button variant="outline" className="mt-4" asChild>
      <Link to="/contratos/novo">
        <Plus className="mr-2 h-4 w-4" />
        {t('dashboard.createFirstContract')}
      </Link>
    </Button>
  </div>
) : (/* render items */)}
```

### Search Bar with Clear Button

```typescript
<div className="relative flex-1 max-w-sm">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
  <Input
    placeholder="Pesquisar..."
    className="pl-9"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
  {search && (
    <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
      <X className="h-3.5 w-3.5" />
    </button>
  )}
</div>
```

### Filter Buttons Row

```typescript
<div className="flex items-center gap-2 flex-wrap">
  {FILTERS.map((f) => (
    <Button
      key={f.key}
      variant={activeFilter === f.key ? 'default' : 'outline'}
      size="sm"
      onClick={() => setActiveFilter(f.key)}
    >
      {f.label}
    </Button>
  ))}
</div>
```

---

## Forms — React Hook Form + Zod

### Complete Form Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define schema
const formSchema = z.object({
  titulo_contrato: z.string().min(1, 'Título é obrigatório'),
  tipo_contrato: z.string().min(1, 'Tipo é obrigatório'),
  valor_estimado: z.number().optional().nullable(),
  data_termo: z.date().optional().nullable(),
  tratamento_dados_pessoais: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

// 2. Initialize form
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    titulo_contrato: '',
    tipo_contrato: 'prestacao_servicos',
    valor_estimado: null,
    data_termo: null,
    tratamento_dados_pessoais: false,
  },
});

// 3. Submit handler
const onSubmit = async (data: FormValues) => {
  if (isEditing && id) {
    await updateContrato.mutateAsync({ id, ...data });
  } else {
    const result = await createContrato.mutateAsync(data);
    if (result?.id) navigate(`/contratos/${result.id}`);
  }
};

// 4. Render form
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

    {/* Text input */}
    <FormField
      control={form.control}
      name="titulo_contrato"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Título do Contrato *</FormLabel>
          <FormControl>
            <Input placeholder="Título descritivo" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    {/* Select with enum labels */}
    <FormField
      control={form.control}
      name="tipo_contrato"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo de Contrato *</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger><SelectValue /></SelectTrigger>
            </FormControl>
            <SelectContent>
              {Object.entries(TIPO_CONTRATO_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />

    {/* Date picker */}
    <FormField
      control={form.control}
      name="data_termo"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Data de Termo</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !field.value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value
                  ? format(field.value, "d 'de' MMMM 'de' yyyy", { locale: pt })
                  : "Selecione uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value || undefined}
                onSelect={field.onChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </FormItem>
      )}
    />

    {/* Switch (boolean) */}
    <FormField
      control={form.control}
      name="tratamento_dados_pessoais"
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border p-4">
          <FormLabel>Tratamento de Dados Pessoais</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />

    {/* Conditional field via watch */}
    {form.watch('tratamento_dados_pessoais') && (
      <FormField control={form.control} name="categorias_dados" render={({ field }) => (
        <FormItem>
          <FormLabel>Categorias de Dados</FormLabel>
          <FormControl><Textarea rows={2} {...field} /></FormControl>
        </FormItem>
      )} />
    )}

    {/* Submit button */}
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting
        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...</>
        : <><Save className="mr-2 h-4 w-4" />Guardar</>
      }
    </Button>
  </form>
</Form>
```

### Programmatic Form Operations

```typescript
// Set single value
form.setValue('titulo_contrato', data.titulo_contrato);

// Reset entire form
form.reset({ titulo_contrato: contrato.titulo_contrato, /* ... */ });

// Watch field changes
const tipoContrato = form.watch('tipo_contrato');
```

---

## Role-Based Rendering

### Available Role Hooks

```typescript
const { user } = useAuth();
const { isPlatformAdmin } = usePlatformAdmin();
const { legalHubProfile, isCCAUser, isOrgManager, isOrgUser, isLocal } = useLegalHubProfile();
// isLocal = true for org_user/org_manager (client users)
// isCCAUser = true for CCA internal staff
```

### Conditional Rendering Patterns

```typescript
// Platform admin only
{isPlatformAdmin && (
  <NavItem to="/admin" icon={Crown} label={t('nav.admin')} />
)}

// CCA internal staff only (hide from clients)
{!isLocal && (
  <div className="pt-2 border-t space-y-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Acções internas
    </p>
    <Button variant="outline" size="sm">Reprocessar CCA</Button>
  </div>
)}

// Different views by role (client vs internal)
{isLocal ? (
  // Client view: read-only indicators
  <div className="grid gap-4 md:grid-cols-3">
    {/* read-only badges */}
  </div>
) : (
  // Internal view: full editable form
  <FormField ... />
)}

// Hide sensitive data from viewers
const isViewer = role === 'viewer';
{!isViewer && (
  <TableCell className="font-mono text-sm">
    {formatCurrency(c.valor_total_estimado)}
  </TableCell>
)}

// Org manager features
{isOrgManager && (
  <NavItem to="/utilizadores-org" icon={UserCog} label="Utilizadores" />
)}
```

---

## shadcn UI — Component Usage

### DO NOT edit `src/components/ui/` manually. Add new ones via:
```bash
npx shadcn-ui@latest add <component>
```

### Common Component Patterns

```typescript
// Dialog
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>

// AlertDialog (destructive confirmation)
<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Eliminar?</AlertDialogTitle>
      <AlertDialogDescription>Esta acção não pode ser desfeita.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={confirmDelete}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        Eliminar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// DropdownMenu
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      <Pencil className="mr-2 h-4 w-4" />Editar
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
      <Trash className="mr-2 h-4 w-4" />Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// Sheet (side drawer)
<Sheet open={open} onOpenChange={v => !v && onClose()}>
  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
    <SheetHeader className="pb-4 border-b">
      <SheetTitle>Detalhe</SheetTitle>
    </SheetHeader>
    {/* content */}
  </SheetContent>
</Sheet>

// Tabs
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="geral">Geral</TabsTrigger>
    <TabsTrigger value="partes">Partes</TabsTrigger>
    <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
  </TabsList>
  <TabsContent value="geral">{/* ... */}</TabsContent>
</Tabs>

// Tooltip
<Tooltip delayDuration={0}>
  <TooltipTrigger asChild>
    <button>{/* icon */}</button>
  </TooltipTrigger>
  <TooltipContent side="right">Texto da tooltip</TooltipContent>
</Tooltip>

// Table
<Table>
  <TableHeader>
    <TableRow className="bg-muted/40">
      <TableHead className="w-[35%]">Nome</TableHead>
      <TableHead>Estado</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id} className="hover:bg-muted/30 cursor-pointer">
        <TableCell className="py-3">{item.name}</TableCell>
        <TableCell><Badge>{item.status}</Badge></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## i18n — Translation Patterns

```typescript
const { t, i18n } = useTranslation();

// Simple key
{t('common.save')}           // "Guardar" / "Save"
{t('nav.contracts')}         // "Contratos" / "Contracts"
{t('contracts.title')}       // "Contratos" / "Contracts"

// With interpolation
{t('dashboard.contractsExpiring30Days', { count: 5 })}

// Check current language
if (i18n.language === 'pt') { /* Portuguese-specific logic */ }

// Translation keys are hierarchical in pt.json/en.json:
// common.*, nav.*, users.*, admin.*, home.*, notifications.*,
// upload.*, contracts.*, dashboard.*
```

**Rules**:
- All user-facing strings MUST use `t()` — never hardcode Portuguese/English
- Add keys to BOTH `src/i18n/locales/pt.json` AND `en.json`
- Portuguese is primary — write PT first

---

## Tailwind — Class Patterns

### Layout

```typescript
className="space-y-6 animate-fade-in"              // Page wrapper
className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" // Stats grid
className="flex items-center justify-between gap-4"  // Header row
className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" // Responsive header
```

### Typography

```typescript
className="text-3xl font-bold font-serif"   // Page title (h1)
className="text-muted-foreground mt-1"      // Subtitle
className="text-lg font-semibold"           // Section heading
className="text-sm text-muted-foreground"   // Secondary text
className="font-mono text-sm"              // Numeric/code values
className="truncate"                        // Overflow ellipsis
className="line-clamp-2"                    // Max 2 lines
```

### Conditional Classes (always use cn())

```typescript
className={cn(
  "flex items-center gap-3 rounded-lg transition-all",
  isActive
    ? "bg-sidebar-accent text-sidebar-accent-foreground"
    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
  isCollapsed && "justify-center px-2"
)}
```

### Custom Color Tokens

```typescript
// Risk levels
className="text-risk-high"        // Red
className="bg-risk-high/20"       // Red transparent
className="text-risk-medium"      // Yellow/orange
className="text-risk-low"         // Green

// Status
className="text-status-pending"
className="text-status-active"
className="text-status-completed"
className="text-status-expired"

// Borders/backgrounds with opacity
className="border-risk-high/50 bg-risk-high/5"
```

---

## Contract State Machine

Defined in `src/lib/contractStateMachine.ts`. Always use these functions:

```typescript
import { canTransitionTo, getValidEventsForState, getStateChangeForEvent } from '@/lib/contractStateMachine';

// Check before changing state
if (!canTransitionTo(currentState, newState)) {
  throw new Error('Transição inválida');
}

// Get allowed lifecycle events for current state
const validEvents = getValidEventsForState('activo');
// → ['inicio_vigencia', 'renovacao', 'adenda', 'rescisao', 'denuncia', 'expiracao', 'nota_interna', 'alteracao']

// Some events auto-change state
getStateChangeForEvent('rescisao');  // → 'rescindido'
getStateChangeForEvent('denuncia');  // → 'denunciado'
getStateChangeForEvent('expiracao'); // → 'expirado'
getStateChangeForEvent('renovacao'); // → 'activo'
```

### Valid State Transitions

```
rascunho         → [em_revisao, activo]
em_revisao       → [rascunho, em_aprovacao, activo]
em_aprovacao     → [em_revisao, activo]
enviado_para_assinatura → [activo, em_revisao]
activo           → [expirado, denunciado, rescindido]
expirado         → [activo]  (via renovação)
denunciado       → []  (terminal)
rescindido       → []  (terminal)
```

---

## Provider Hierarchy (App.tsx)

```
ThemeProvider (next-themes)
  → QueryClientProvider (staleTime: 5min, gcTime: 10min, retry: 1, refetchOnWindowFocus: false)
    → AuthProvider
      → ImpersonationProvider
        → SidebarProvider
          → TooltipProvider
            → BrowserRouter
              → Routes
```

---

## Routing Map

### Public Routes
- `/login` — Multi-method auth (SSO, email/password, demo)
- `/auth/sso-callback` — OAuth2 callback handler

### Protected Routes (auth + onboarding)
- `/`, `/home` — Widget dashboard
- `/contratos` — Contract list
- `/contratos/novo` — Create contract
- `/contratos/:id` — Contract detail
- `/contratos/:id/editar` — Edit contract
- `/contratos/visao-geral` — Analytics dashboard
- `/contratos/upload-massa` — Bulk upload
- `/contratos/triagem` — Triage/screening
- `/eventos` — Legislative events
- `/normativos`, `/normativos/:id` — Regulations
- `/impactos` — Impact analysis
- `/politicas` — Policies
- `/assinatura-digital` — Digital signatures
- `/documentos` — Document repository
- `/perfil` — User profile
- `/organizacao` — Organization management
- `/minha-organizacao` — Org overview
- `/meu-departamento` — Department
- `/utilizadores-org` — Org users
- `/definicoes` — Settings
- `/notificacoes` — Notifications
- `/legalbi` — Legal BI
- `/financeiro` — Financial
- `/novidades-cca` — CCA news

### Admin-Only (platform_admin)
- `/admin` — Admin panel

### Redirects
- `/requisitos`, `/templates`, `/auditoria` → `/contratos/visao-geral`
- `/contratos/documentos` → `/assinatura-digital`
- `/utilizadores` → `/admin?tab=users`

---

## Supabase Backend

### Database: ~58 tables, 15+ enums, 73 migrations

### Key Enums

```typescript
estado_contrato: 'rascunho' | 'em_revisao' | 'em_aprovacao' | 'enviado_para_assinatura' | 'activo' | 'expirado' | 'denunciado' | 'rescindido'
tipo_contrato: 'nda' | 'prestacao_servicos' | 'fornecimento' | 'saas' | 'arrendamento' | 'trabalho' | 'licenciamento' | 'parceria' | 'consultoria' | 'outro'
departamento: 'comercial' | 'operacoes' | 'it' | 'rh' | 'financeiro' | 'juridico' | 'marketing' | 'outro'
app_role: 'owner' | 'admin' | 'editor' | 'viewer'
nivel_risco: 'baixo' | 'medio' | 'alto'
jurisdicao: 'nacional' | 'europeia' | 'internacional'
```

### Edge Functions (21 total)

| Function | Auth | Purpose |
|----------|------|---------|
| `analyze-compliance` | JWT | AI compliance analysis |
| `analyze-document` | JWT | AI document analysis |
| `triage-contract` | Public | Contract risk triage |
| `validate-contract` | JWT | Contract validation via CCA agent |
| `parse-contract` | Public | Extract contract structured data |
| `legal-api` | Public | Legal document search |
| `match-legislation` | JWT | Contract-legislation linking |
| `sso-cca` | Public | CCA SSO OAuth2 flow |
| `translate-content` | Public | Dynamic content translation |
| `send-contract-alerts` | JWT | Email notifications |
| `admin-create-user` | Public | Admin user creation |
| `sync-sharepoint` | Public | SharePoint sync |
| `user-data-export` | Public | GDPR data export |
| `user-data-deletion` | Public | GDPR data deletion |

### Environment Variables

```env
VITE_SUPABASE_URL=https://scjxhhkutsiswsgsuiqo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
```

O project ID `scjxhhkutsiswsgsuiqo` também está em `supabase/config.toml` como `project_id`.

---

## CSS Variables (index.css)

```css
/* Theme tokens — HSL format */
--background, --foreground, --card, --popover, --primary, --secondary
--muted, --accent, --destructive, --border, --input, --ring, --radius

/* Risk colors */
--risk-high, --risk-medium, --risk-low

/* Status colors */
--status-pending, --status-active, --status-completed, --status-expired

/* Sidebar */
--sidebar-background, --sidebar-foreground, --sidebar-primary, --sidebar-accent

/* Shadows */
--shadow-card, --shadow-elevated

/* Primary brand color (Coral CCA): HSL 20 100% 63% (#FF7F41) */
```

---

## Key Business Domain

| PT Term | EN | Notes |
|---------|-----|-------|
| Contrato | Contract | Core entity |
| Evento Legislativo | Legislative Event | Regulatory changes |
| Normativo | Regulation | Legal requirements |
| Impacto | Impact | Regulation → contract effect |
| Triagem | Triage | AI risk assessment |
| Parte A/B | Party A/B | Counterparties |
| NIF | Tax ID (PT) | 9-digit fiscal number |
| RGPD | GDPR | Data protection |
| DPA | Data Processing Agreement | GDPR requirement |
| Rascunho | Draft | Initial contract state |
| Adenda | Addendum | Contract amendment |
| Rescisão | Termination | Contract ended by party |
| Denúncia | Non-renewal notice | Contract not renewed |
| Vigência | Validity period | Active period |

---

## Critical Rules — Avoid These Errors

1. **Never mix toast systems** — check which import the file uses (`@/hooks/use-toast` vs `sonner`)
2. **Never edit `src/components/ui/`** — use `npx shadcn-ui@latest add <component>`
3. **Never edit `src/integrations/supabase/types.ts`** — regenerate with `supabase gen types`
4. **Always scope queries by organization** — use `getCurrentOrganizationId()` or `useEffectiveOrganization()`
5. **Always set `created_by_id` and `updated_by_id`** on insert/update mutations
6. **Use `maybeSingle()` not `single()`** when a record might not exist
7. **Always invalidate query cache** after mutations — missing this causes stale UI
8. **Use `canTransitionTo()` before changing contract state** — state machine rules are strict
9. **Add i18n keys to BOTH `pt.json` and `en.json`** — missing one causes fallback errors
10. **Use `@/` path aliases everywhere** — never use relative `../../` imports
11. **Date formatting** — always use `format(date, pattern, { locale: pt })` from date-fns
12. **TypeScript is lenient** (`strictNullChecks: false`) — but still check for null before accessing nested properties
13. **No test framework** — verify changes manually via `npm run build` and `npm run lint`
14. **Self-healing patterns** exist in `useProfile` and `useOrganizations` — don't break them
15. **Feature flags** control SSO, 2FA, demo login — check `useFeatureFlags()` before adding conditional features
16. **Supabase project ID é `scjxhhkutsiswsgsuiqo`** — usar este ID ao referenciar o projecto Supabase (config, URLs, CLI commands)
17. **Zero referências ao Lovable** — o repo foi scaffolded via Lovable mas já não tem dependências nem código Lovable; nunca adicionar referências `lovable`, `gptengineer` ou `lovable_ai` em código novo
