import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import type { UnifiedLead } from "@/types/lead";

interface UseUnifiedLeadsResult {
  leads: UnifiedLead[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Real leads only, scoped to the active company. (Mock leads were removed in
// Phase 4 — the pipeline now reflects persisted manual_leads.)
export default function useUnifiedLeads(): UseUnifiedLeadsResult {
  const { activeCompanyId } = useOrg();
  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchManual = useCallback(async () => {
    if (!activeCompanyId) {
      setLeads([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error: selectError } = await supabase
        .from("manual_leads")
        .select("*")
        .eq("org_id", activeCompanyId)
        .order("created_at", { ascending: false });
      if (selectError) throw selectError;
      const mapped: UnifiedLead[] = (data ?? []).map((row) => ({
        id: row.id,
        source: "manual",
        name: row.name,
        email: row.email ?? null,
        phone: row.phone ?? null,
        stage: row.stage,
        closer_user_id: row.closer_user_id ?? null,
        sdr_user_id: row.sdr_user_id ?? null,
        origin: row.origin,
        created_via: row.created_via ?? null,
        pipeline_value:
          row.pipeline_value === null || row.pipeline_value === undefined
            ? null
            : Number(row.pipeline_value),
        pitch: row.pitch ?? null,
        score: null,
        iem: null,
        responsible: null,
        last_contact: null,
        created_at: row.created_at ?? null,
      }));
      setLeads(mapped);
      setError(null);
    } catch (err) {
      setLeads([]);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    void fetchManual();
  }, [fetchManual]);

  return { leads, isLoading, error, refetch: fetchManual };
}
