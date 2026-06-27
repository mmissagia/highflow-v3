import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

const STAGE_ORDER: { id: string; label: string }[] = [
  { id: "lead-frio", label: "Lead Frio" },
  { id: "engajado", label: "Engajado" },
  { id: "warm", label: "Warm" },
  { id: "agendou", label: "Agendou" },
  { id: "call-agendada", label: "Call Agendada" },
  { id: "call-realizada", label: "Call Realizada" },
  { id: "follow-up", label: "Follow-up" },
  { id: "fechou", label: "Fechou" },
  { id: "onboarding", label: "Onboarding" },
];

export interface DashboardMetrics {
  wonRevenue: number;
  wonCount: number;
  totalLeads: number;
  activeLeads: number;
  conversion: number;
  ticket: number;
  funnel: { stage: string; count: number }[];
  paidTotal: number;
  pendingTotal: number;
  linkCount: number;
}

// Real, org-scoped dashboard aggregates (active company). Replaces the old mocks.
export function useDashboardMetrics() {
  const { activeCompanyId } = useOrg();
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard_metrics", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const [dealsRes, leadsRes, linksRes] = await Promise.all([
        supabase.from("deals").select("stage, amount_value").eq("org_id", activeCompanyId),
        supabase.from("manual_leads").select("stage").eq("org_id", activeCompanyId),
        supabase.from("payment_links").select("status, value").eq("org_id", activeCompanyId),
      ]);
      const deals = dealsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const links = linksRes.data ?? [];

      const won = deals.filter((d) => d.stage === "won");
      const wonRevenue = won.reduce((s, d) => s + Number(d.amount_value || 0), 0);
      const wonCount = won.length;
      const totalLeads = leads.length;
      const activeLeads = leads.filter((l) => l.stage !== "fechou" && l.stage !== "onboarding").length;
      const closedLeads = totalLeads - activeLeads;
      const conversion = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;
      const ticket = wonCount > 0 ? wonRevenue / wonCount : 0;

      const funnel = STAGE_ORDER.map((s) => ({
        stage: s.label,
        count: leads.filter((l) => l.stage === s.id).length,
      }));

      const paidTotal = links
        .filter((l) => l.status === "paid")
        .reduce((s, l) => s + Number(l.value || 0), 0);
      const pendingTotal = links
        .filter((l) => l.status === "pending" || l.status === "partial")
        .reduce((s, l) => s + Number(l.value || 0), 0);

      return {
        wonRevenue, wonCount, totalLeads, activeLeads, conversion, ticket,
        funnel, paidTotal, pendingTotal, linkCount: links.length,
      };
    },
  });
}
