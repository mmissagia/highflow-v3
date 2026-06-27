// Role / module access matrix for HighFlow (multi-tenant).
// Roles are scoped per organization (see OrgContext). SDR and Closer share the
// same module access for this go-live; company Admin (and agency/super admin)
// get everything.

export type AppRole = "super_admin" | "agency_admin" | "admin" | "sdr" | "closer";

export type ModuleKey =
  | "dashboard"
  | "crm"
  | "comercial"
  | "relatorios"
  | "monetizacao"
  | "comunicacao"
  | "ia"
  | "entrega"
  | "infra"
  | "usuarios"
  | "orgs";

export const ALL_MODULES: ModuleKey[] = [
  "dashboard",
  "crm",
  "comercial",
  "relatorios",
  "monetizacao",
  "comunicacao",
  "ia",
  "entrega",
  "infra",
  "usuarios",
];

// SDR/Closer: Comercial, Relatórios, Monetização, IA, Comunicação, CRM (+ Dashboard).
const STAFF_MODULES: ModuleKey[] = [
  "dashboard",
  "crm",
  "comercial",
  "relatorios",
  "monetizacao",
  "ia",
  "comunicacao",
];

// "orgs" (onboarding console) is platform/agency-only — intentionally NOT in
// ALL_MODULES, so a company admin does not see it.
export const MODULE_ACCESS: Record<AppRole, ModuleKey[]> = {
  super_admin: [...ALL_MODULES, "orgs"],
  agency_admin: [...ALL_MODULES, "orgs"],
  admin: ALL_MODULES,
  sdr: STAFF_MODULES,
  closer: STAFF_MODULES,
};

// Route prefixes that belong to each module (longest-prefix match wins).
const MODULE_ROUTES: Record<ModuleKey, string[]> = {
  dashboard: ["/"],
  crm: ["/crm"],
  comercial: ["/comercial"],
  relatorios: ["/performance"],
  monetizacao: ["/monetizacao", "/estrategias", "/checkout-ht"],
  comunicacao: ["/comunicacao"],
  ia: ["/ia"],
  entrega: ["/entrega"],
  infra: ["/infra", "/conexoes"],
  usuarios: ["/usuarios"],
  orgs: ["/organizacoes"],
};

export function canAccessModule(role: AppRole | null | undefined, module: ModuleKey): boolean {
  if (!role) return false;
  return MODULE_ACCESS[role]?.includes(module) ?? false;
}

// Resolve a pathname to its module. Returns null when no module owns the path
// (treated as always-allowed, e.g. NotFound).
export function moduleForPath(pathname: string): ModuleKey | null {
  if (pathname === "/") return "dashboard";
  let best: { module: ModuleKey; len: number } | null = null;
  (Object.keys(MODULE_ROUTES) as ModuleKey[]).forEach((m) => {
    MODULE_ROUTES[m].forEach((prefix) => {
      if (prefix === "/") return;
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        if (!best || prefix.length > best.len) best = { module: m, len: prefix.length };
      }
    });
  });
  return best ? best.module : null;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  agency_admin: "Admin da Agência",
  admin: "Admin",
  sdr: "SDR",
  closer: "Closer",
};
