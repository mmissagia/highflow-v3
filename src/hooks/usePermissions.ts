import { useOrg } from "@/contexts/OrgContext";
import { canAccessModule, MODULE_ACCESS, type ModuleKey } from "@/config/permissions";

export function usePermissions() {
  const { role, loading } = useOrg();
  return {
    role,
    loading,
    can: (module: ModuleKey) => canAccessModule(role, module),
    allowedModules: role ? MODULE_ACCESS[role] : [],
  };
}
