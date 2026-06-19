// Verifica se o chamador pode operar sobre uma organização.
// Autorizado quando: service role (chamada interna/cron), platform admin,
// utilizador CCA (SSO — pode gerir qualquer organização) ou membro da org.
// Usado pelas funções SharePoint para impedir que um utilizador opere sobre
// uma organização à qual não pertence (passando outro organization_id).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isAuthorizedForOrg(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  organizationId: string,
): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return false;

  // Chamada interna (service role) — ignora verificação de utilizador.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return true;

  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) return false;

  // Platform admin
  const { data: pa } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (pa) return true;

  // Utilizador CCA (SSO) — gere qualquer organização de cliente
  const { data: prof } = await supabase
    .from("profiles")
    .select("auth_method")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.auth_method === "sso_cca") return true;

  // Membro da própria organização
  const { data: mem } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return !!mem;
}
