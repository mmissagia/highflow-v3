// invite-member: provision a member into a company.
// Creates (or reuses) an auth user (email invite), an org_membership with the
// given access role, and — for sellers — a linked sales_users profile.
// Authorization: the caller must be an admin of the target org (is_org_admin).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VALID_ACCESS_ROLES = ["admin", "sdr", "closer", "agency_admin", "super_admin"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const body = await req.json();
    const { orgId, email, name, accessRole, sales, redirectTo } = body ?? {};

    if (!orgId || !email || !name || !accessRole) {
      return json({ error: "orgId, email, name e accessRole são obrigatórios" }, 400);
    }
    if (!VALID_ACCESS_ROLES.includes(accessRole)) {
      return json({ error: `accessRole inválido: ${accessRole}` }, 400);
    }

    // 1) Authorize the caller. The caller client forwards the caller's JWT on
    // every request, so the is_org_admin RPC resolves auth.uid() = caller and
    // enforces that only an admin of the target org may invite into it.
    if (!authHeader) return json({ error: "Não autenticado" }, 401);
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: canManage, error: rpcErr } = await caller.rpc("is_org_admin", { target: orgId });
    if (rpcErr) return json({ error: "Falha na verificação de permissão: " + rpcErr.message }, 500);
    if (!canManage) return json({ error: "Sem permissão para gerenciar esta empresa" }, 403);

    // 2) Admin client (service role) for privileged writes.
    const admin = createClient(url, service);

    // 3) Find or invite the auth user.
    let userId: string | null = null;
    let invited = false;
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo: redirectTo || undefined,
    });
    if (inviteErr) {
      // Most likely already registered -> reuse the existing user.
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find(
        (u: { email?: string; id: string }) => (u.email ?? "").toLowerCase() === String(email).toLowerCase(),
      );
      if (!existing) return json({ error: "Falha ao convidar: " + inviteErr.message }, 500);
      userId = existing.id;
    } else {
      userId = inviteData?.user?.id ?? null;
      invited = true;
    }
    if (!userId) return json({ error: "Não foi possível resolver o usuário" }, 500);

    // 4) Membership (idempotent).
    const { error: memErr } = await admin
      .from("org_memberships")
      .upsert(
        { org_id: orgId, user_id: userId, role: accessRole, status: "active" },
        { onConflict: "org_id,user_id" },
      );
    if (memErr) return json({ error: "Falha ao criar acesso: " + memErr.message }, 500);

    // 5) Sales profile (optional, for SDR/Closer/Leader).
    let salesUserId: string | null = null;
    if (sales && sales.role) {
      const salesPayload = {
        org_id: orgId,
        user_id: userId,
        auth_user_id: userId,
        name,
        role: sales.role,
        email,
        phone: sales.phone ?? null,
        status: "active",
        monthly_goal_value: sales.monthly_goal_value ?? 0,
        commission_type: sales.commission_type ?? "percent",
        commission_percent: sales.commission_percent ?? 0,
        commission_fixed_value: sales.commission_fixed_value ?? 0,
        cost_fixed_monthly: sales.cost_fixed_monthly ?? 0,
      };
      const { data: existingSales } = await admin
        .from("sales_users")
        .select("id")
        .eq("org_id", orgId)
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (existingSales) {
        const { error } = await admin.from("sales_users").update(salesPayload).eq("id", existingSales.id);
        if (error) return json({ error: "Falha no perfil de vendas: " + error.message }, 500);
        salesUserId = existingSales.id;
      } else {
        const { data, error } = await admin.from("sales_users").insert(salesPayload).select("id").single();
        if (error) return json({ error: "Falha no perfil de vendas: " + error.message }, 500);
        salesUserId = data.id;
      }
    }

    return json({ ok: true, userId, salesUserId, invited });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
