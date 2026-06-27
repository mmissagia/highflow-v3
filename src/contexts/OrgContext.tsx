import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/config/permissions";

export type OrgType = "platform" | "agency" | "company";

export interface Organization {
  id: string;
  type: OrgType;
  name: string;
  parent_org_id: string | null;
  status: string;
}

export interface Membership {
  id: string;
  org_id: string;
  user_id: string;
  role: AppRole;
  status: string;
}

interface OrgContextType {
  loading: boolean;
  organizations: Organization[];
  companies: Organization[];
  memberships: Membership[];
  isSuperAdmin: boolean;
  activeCompany: Organization | null;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string) => void;
  /** Effective role of the current user in the active company. */
  role: AppRole | null;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);
const ACTIVE_KEY = "highflow.activeCompany";

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY)
  );

  const load = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [orgsRes, memRes] = await Promise.all([
      supabase.from("organizations").select("*"),
      supabase.from("org_memberships").select("*").eq("user_id", user.id),
    ]);
    setOrganizations((orgsRes.data ?? []) as unknown as Organization[]);
    setMemberships((memRes.data ?? []) as unknown as Membership[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const companies = organizations.filter((o) => o.type === "company");

  const isSuperAdmin = memberships.some(
    (m) =>
      m.role === "super_admin" &&
      m.status === "active" &&
      organizations.find((o) => o.id === m.org_id)?.type === "platform"
  );

  const activeCompany =
    companies.find((c) => c.id === activeCompanyId) ?? companies[0] ?? null;

  const setActiveCompanyId = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveCompanyIdState(id);
  }, []);

  // Keep the persisted active company in sync with what is actually resolvable.
  useEffect(() => {
    if (activeCompany && activeCompany.id !== activeCompanyId) {
      setActiveCompanyIdState(activeCompany.id);
      localStorage.setItem(ACTIVE_KEY, activeCompany.id);
    }
  }, [activeCompany, activeCompanyId]);

  let role: AppRole | null = null;
  if (isSuperAdmin) {
    role = "super_admin";
  } else if (activeCompany) {
    const direct = memberships.find(
      (m) => m.org_id === activeCompany.id && m.status === "active"
    );
    if (direct) {
      role = direct.role;
    } else if (activeCompany.parent_org_id) {
      const agencyMem = memberships.find(
        (m) => m.org_id === activeCompany.parent_org_id && m.status === "active"
      );
      if (agencyMem) role = "agency_admin";
    }
  }

  return (
    <OrgContext.Provider
      value={{
        loading,
        organizations,
        companies,
        memberships,
        isSuperAdmin,
        activeCompany,
        activeCompanyId: activeCompany?.id ?? null,
        setActiveCompanyId,
        role,
        refresh: load,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within an OrgProvider");
  return ctx;
}
