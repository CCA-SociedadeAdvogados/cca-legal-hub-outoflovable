// Carrega o playbook legal de uma organização para injecção no system prompt
// das Edge Functions de IA. Lê de `org_playbooks` (per organization_id + scope).
//
// Substitui o padrão cold-start-interview dos plugins claude-for-legal — vive
// na BD do Hub, não em ~/.claude/... no CLI de cada advogado.
//
// Ver: docs/plugin-roadmap.md e regra #15 do CLAUDE.md (PT/EU only).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type PluginScope =
  | "global"
  | "commercial"
  | "privacy"
  | "corporate"
  | "employment"
  | "regulatory"
  | "ai_governance"
  | "product";

export interface OrgPlaybook {
  playbook_md: string;
  escalation_rules: Record<string, unknown>;
  jurisdictions_allowed: string[];
}

const DEFAULT_PLAYBOOK: OrgPlaybook = {
  playbook_md: "",
  escalation_rules: {},
  jurisdictions_allowed: ["PT", "EU"],
};

export async function loadPlaybook(
  supabase: SupabaseClient,
  organizationId: string,
  scope: PluginScope,
): Promise<OrgPlaybook> {
  const { data, error } = await supabase
    .from("org_playbooks")
    .select("playbook_md, escalation_rules, jurisdictions_allowed")
    .eq("organization_id", organizationId)
    .eq("plugin_scope", scope)
    .maybeSingle();

  if (error) {
    console.error("[playbook] load failed", { organizationId, scope, error });
    return DEFAULT_PLAYBOOK;
  }

  if (!data) {
    return DEFAULT_PLAYBOOK;
  }

  return {
    playbook_md: data.playbook_md ?? "",
    escalation_rules: (data.escalation_rules as Record<string, unknown>) ?? {},
    jurisdictions_allowed: data.jurisdictions_allowed ?? ["PT", "EU"],
  };
}

export function jurisdictionGuardrail(playbook: OrgPlaybook): string {
  const list = playbook.jurisdictions_allowed.join(", ");
  return [
    "## Jurisdição obrigatória",
    `Responde exclusivamente com base em direito ${list}. Nunca cites ou pressuponhas direito de fora desta lista (e.g. FRE, FRCP, IRAC, CCPA, HIPAA, UCC, common law, U.S.C., state/federal, MBE).`,
    "Outputs são sempre minuta para revisão por advogado, nunca afirmação final.",
  ].join("\n");
}

export function buildSystemPrompt(
  basePrompt: string,
  playbook: OrgPlaybook,
): string {
  const sections = [
    basePrompt.trim(),
    jurisdictionGuardrail(playbook),
  ];

  if (playbook.playbook_md.trim()) {
    sections.push(`## Playbook da organização\n${playbook.playbook_md.trim()}`);
  }

  return sections.join("\n\n");
}
