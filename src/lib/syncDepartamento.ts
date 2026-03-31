import { supabase } from '@/integrations/supabase/client';

// Untyped client for tables not yet in auto-generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Maps profiles.departamento enum values to human-readable department names.
 * These are the Portuguese labels used when auto-creating departments rows.
 */
const _DEPT_ENUM_TO_NAME: Record<string, string> = {
  juridico: 'Jurídico',
  comercial: 'Comercial',
  financeiro: 'Financeiro',
  rh: 'Recursos Humanos',
  it: 'TI',
  operacoes: 'Operações',
  marketing: 'Marketing',
  outro: 'Outro',
};

/**
 * Syncs the profiles.departamento enum value with the user_departments junction table.
 *
 * 1. Updates profiles.departamento
 * 2. Finds or creates a departments row with matching slug in the user's org
 * 3. Inserts into user_departments (idempotent via ON CONFLICT)
 *
 * This bridges the legacy profiles.departamento column with the newer
 * user_departments many-to-many structure used by MeuDepartamento and other pages.
 */
export async function syncDepartamento(
  userId: string,
  organizationId: string,
  departamentoSlug: string,
): Promise<void> {
  // Step 1: Update profiles.departamento
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      departamento: departamentoSlug as "comercial" | "financeiro" | "it" | "juridico" | "marketing" | "operacoes" | "outro" | "rh",
    })
    .eq('id', userId);

  if (profileError) throw new Error(profileError.message || 'Erro ao actualizar perfil');

  // Step 2: Find existing department row in the org (do NOT create — admin responsibility)
  const { data: existingDept } = await db
    .from('departments')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', departamentoSlug)
    .maybeSingle();

  if (!existingDept?.id) {
    // Department doesn't exist yet in this org — profiles.departamento is saved,
    // user_departments sync is skipped until the department is created by an admin.
    return;
  }

  // Step 3: Insert into user_departments (idempotent)
  const { error: udError } = await db
    .from('user_departments')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      department_id: existingDept.id,
    });

  // Ignore unique constraint violations (user already in this department)
  if (udError && !udError.message?.includes('duplicate key') && !udError.code?.includes('23505')) {
    throw new Error(udError.message || 'Erro ao associar utilizador ao departamento');
  }
}
