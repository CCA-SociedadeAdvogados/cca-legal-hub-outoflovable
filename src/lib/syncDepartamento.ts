import { supabase } from '@/integrations/supabase/client';

// Untyped client for tables not yet in auto-generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Maps profiles.departamento enum values to human-readable department names.
 * These are the Portuguese labels used when auto-creating departments rows.
 */
const DEPT_ENUM_TO_NAME: Record<string, string> = {
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

  if (profileError) throw profileError;

  // Step 2: Find or create department row in the org
  const deptName = DEPT_ENUM_TO_NAME[departamentoSlug] || departamentoSlug;

  // Try to find existing department with this slug
  const { data: existingDept } = await db
    .from('departments')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', departamentoSlug)
    .maybeSingle();

  let departmentId: string;

  if (existingDept?.id) {
    departmentId = existingDept.id;
  } else {
    // Create the department
    const { data: newDept, error: createError } = await db
      .from('departments')
      .insert({
        organization_id: organizationId,
        name: deptName,
        slug: departamentoSlug,
        is_default: false,
        is_system: false,
        created_by_id: userId,
      })
      .select('id')
      .single();

    if (createError) {
      // Race condition: another request created it — try to fetch again
      const { data: retryDept } = await db
        .from('departments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('slug', departamentoSlug)
        .maybeSingle();

      if (!retryDept?.id) throw createError;
      departmentId = retryDept.id;
    } else {
      departmentId = newDept.id;
    }
  }

  // Step 3: Insert into user_departments (idempotent)
  const { error: udError } = await db
    .from('user_departments')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      department_id: departmentId,
    });

  // Ignore unique constraint violations (user already in this department)
  if (udError && !udError.message?.includes('duplicate key')) {
    throw udError;
  }
}
