import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone, MessageCircle, Calendar, UserPlus, DollarSign, XCircle,
  CheckCircle, Clock, AlertTriangle, Briefcase,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const activityLabels: Record<string, string> = {
  CALL: "Ligação", WHATSAPP: "WhatsApp", FOLLOW_UP: "Follow-up",
  MEETING_SCHEDULED: "Call Agendada", MEETING_DONE: "Call Realizada",
  PROPOSAL_SENT: "Proposta Enviada", DEAL_WON: "Venda Fechada",
  DEAL_LOST: "Perda", NO_SHOW: "No-show",
};

const activityIcons: Record<string, React.ElementType> = {
  CALL: Phone, WHATSAPP: MessageCircle, FOLLOW_UP: Clock,
  MEETING_SCHEDULED: Calendar, MEETING_DONE: CheckCircle,
  PROPOSAL_SENT: DollarSign, DEAL_WON: CheckCircle,
  DEAL_LOST: XCircle, NO_SHOW: AlertTriangle,
};

interface Props {
  leadId: string;
}

export default function LeadComercialTab({ leadId }: Props) {
  const { user } = useAuth();
  const { activeCompanyId } = useOrg();
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ sales_user_id: "", type: "SDR" });
  const [activityForm, setActivityForm] = useState({ sales_user_id: "", activity_type: "CALL", outcome: "", scheduled_at: "", loss_reason: "" });
  const [dealForm, setDealForm] = useState({ amount_value: 0, closer_id: "", stage: "won" as string, notes: "" });

  const { data: salesUsers = [] } = useQuery({
    queryKey: ["sales_users_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_users").select("id, name, role, commission_type, commission_percent, commission_fixed_value").eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["lead_assignments", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_assignments")
        .select("*, sales_users(name, role)")
        .eq("lead_id", leadId)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!leadId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["lead_activities", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_activities")
        .select("*, sales_users(name)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!leadId,
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["lead_deals", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, sales_users:closer_id(name)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!leadId,
  });

  const sdr = assignments.find((a: any) => a.assignment_type === "SDR");
  const closer = assignments.find((a: any) => a.assignment_type === "CLOSER");

  // Compute commercial status
  const lastActivity = activities[0];
  const openDeal = deals.find((d: any) => d.stage === "open");
  const wonDeal = deals.find((d: any) => d.stage === "won");
  const lostDeal = deals.find((d: any) => d.stage === "lost");

  let commercialStatus = "Não atribuído";
  let statusColor = "secondary" as "secondary" | "default" | "destructive" | "outline";
  if (wonDeal) { commercialStatus = "Ganho"; statusColor = "default"; }
  else if (lostDeal && !openDeal) { commercialStatus = "Perdido"; statusColor = "destructive"; }
  else if (openDeal) { commercialStatus = "Negociação"; statusColor = "outline"; }
  else if (lastActivity?.activity_type === "NO_SHOW") { commercialStatus = "No-show"; statusColor = "destructive"; }
  else if (lastActivity?.activity_type === "MEETING_SCHEDULED") { commercialStatus = "Call marcada"; statusColor = "outline"; }
  else if (activities.some((a: any) => a.status === "planned")) { commercialStatus = "Ação pendente"; statusColor = "secondary"; }
  else if (sdr || closer) { commercialStatus = "Atribuído"; statusColor = "secondary"; }

  const assignMutation = useMutation({
    mutationFn: async () => {
      // Deactivate existing of same type
      await supabase.from("lead_assignments").update({ active: false }).eq("lead_id", leadId).eq("assignment_type", assignForm.type);
      const { error } = await supabase.from("lead_assignments").insert({
        user_id: user!.id, org_id: activeCompanyId!, lead_id: leadId,
        assigned_to_sales_user_id: assignForm.sales_user_id,
        assigned_by_user_id: user!.id,
        assignment_type: assignForm.type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_assignments", leadId] });
      toast.success("Profissional atribuído");
      setAssignOpen(false);
    },
    onError: () => toast.error("Erro ao atribuir"),
  });

  const activityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales_activities").insert({
        user_id: user!.id, org_id: activeCompanyId!, lead_id: leadId,
        sales_user_id: activityForm.sales_user_id,
        activity_type: activityForm.activity_type,
        status: activityForm.scheduled_at ? "planned" : "done",
        scheduled_at: activityForm.scheduled_at || null,
        occurred_at: activityForm.scheduled_at ? null : new Date().toISOString(),
        outcome: activityForm.outcome || null,
        loss_reason: activityForm.loss_reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_activities", leadId] });
      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });
      toast.success("Atividade registrada");
      setActivityOpen(false);
      setActivityForm({ sales_user_id: "", activity_type: "CALL", outcome: "", scheduled_at: "", loss_reason: "" });
    },
    onError: () => toast.error("Erro ao registrar"),
  });

  const dealMutation = useMutation({
    mutationFn: async () => {
      const closerUser = salesUsers.find((s: any) => s.id === dealForm.closer_id);
      const sdrAssignment = sdr;

      // Create deal
      const { data: deal, error } = await supabase.from("deals").insert({
        user_id: user!.id, org_id: activeCompanyId!, lead_id: leadId,
        amount_value: dealForm.amount_value,
        stage: dealForm.stage,
        closer_id: dealForm.closer_id || null,
        sdr_id: sdrAssignment?.assigned_to_sales_user_id || null,
        won_at: dealForm.stage === "won" ? new Date().toISOString() : null,
        lost_at: dealForm.stage === "lost" ? new Date().toISOString() : null,
        notes: dealForm.notes || null,
      }).select().single();
      if (error) throw error;

      // Create commission for closer if won
      if (dealForm.stage === "won" && closerUser) {
        let commissionValue = 0;
        if (closerUser.commission_type === "percent") commissionValue = dealForm.amount_value * (Number(closerUser.commission_percent) / 100);
        else if (closerUser.commission_type === "fixed") commissionValue = Number(closerUser.commission_fixed_value);
        else if (closerUser.commission_type === "hybrid") commissionValue = dealForm.amount_value * (Number(closerUser.commission_percent) / 100) + Number(closerUser.commission_fixed_value);

        if (commissionValue > 0) {
          const period = new Date().toISOString().slice(0, 7);
          await supabase.from("commission_records").insert({
            user_id: user!.id, org_id: activeCompanyId!, deal_id: deal.id,
            sales_user_id: closerUser.id,
            commission_value: commissionValue,
            period_month: period,
          });
        }
      }

      // Create activity record
      await supabase.from("sales_activities").insert({
        user_id: user!.id, org_id: activeCompanyId!, lead_id: leadId,
        sales_user_id: dealForm.closer_id || (sdrAssignment?.assigned_to_sales_user_id ?? salesUsers[0]?.id),
        activity_type: dealForm.stage === "won" ? "DEAL_WON" : "DEAL_LOST",
        status: "done",
        occurred_at: new Date().toISOString(),
        outcome: dealForm.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_deals", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead_activities", leadId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["commission_records"] });
      toast.success(dealForm.stage === "won" ? "Venda registrada!" : "Perda registrada");
      setDealOpen(false);
      setDealForm({ amount_value: 0, closer_id: "", stage: "won", notes: "" });
    },
    onError: () => toast.error("Erro ao registrar"),
  });

  return (
    <div className="space-y-6">
      {/* Status & Assignments */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant={statusColor} className="text-sm px-3 py-1">{commercialStatus}</Badge>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">SDR:</span>
          <span className="font-medium">{sdr ? (sdr as any).sales_users?.name : "Não atribuído"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Closer:</span>
          <span className="font-medium">{closer ? (closer as any).sales_users?.name : "Não atribuído"}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-1" />Atribuir SDR</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Atribuir Profissional</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={assignForm.type} onValueChange={(v) => setAssignForm({ ...assignForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SDR">SDR</SelectItem>
                    <SelectItem value="CLOSER">Closer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={assignForm.sales_user_id} onValueChange={(v) => setAssignForm({ ...assignForm, sales_user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {salesUsers.map((su: any) => (
                      <SelectItem key={su.id} value={su.id}>{su.name} ({su.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => assignMutation.mutate()} disabled={!assignForm.sales_user_id || assignMutation.isPending}>Atribuir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><Phone className="h-4 w-4 mr-1" />Registrar Atividade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={activityForm.activity_type} onValueChange={(v) => setActivityForm({ ...activityForm, activity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(activityLabels).filter(([k]) => k !== "DEAL_WON" && k !== "DEAL_LOST").map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={activityForm.sales_user_id} onValueChange={(v) => setActivityForm({ ...activityForm, sales_user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {salesUsers.map((su: any) => (
                      <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Agendado para (opcional)</Label>
                <Input type="datetime-local" value={activityForm.scheduled_at} onChange={(e) => setActivityForm({ ...activityForm, scheduled_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Resultado</Label>
                <Textarea value={activityForm.outcome} onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })} placeholder="Observações..." />
              </div>
              {activityForm.activity_type === "NO_SHOW" && (
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input value={activityForm.loss_reason} onChange={(e) => setActivityForm({ ...activityForm, loss_reason: e.target.value })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => activityMutation.mutate()} disabled={!activityForm.sales_user_id || activityMutation.isPending}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dealOpen} onOpenChange={setDealOpen}>
          <DialogTrigger asChild><Button size="sm"><DollarSign className="h-4 w-4 mr-1" />Fechar Venda</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Deal</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Resultado</Label>
                <Select value={dealForm.stage} onValueChange={(v) => setDealForm({ ...dealForm, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">Ganho</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" value={dealForm.amount_value} onChange={(e) => setDealForm({ ...dealForm, amount_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Closer</Label>
                <Select value={dealForm.closer_id} onValueChange={(v) => setDealForm({ ...dealForm, closer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {salesUsers.filter((s: any) => s.role === "CLOSER").map((su: any) => (
                      <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={dealForm.notes} onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => dealMutation.mutate()} disabled={dealMutation.isPending}>{dealForm.stage === "won" ? "Registrar Venda" : "Registrar Perda"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Activities Timeline */}
      <div>
        <h3 className="font-semibold mb-3">Timeline de Atividades</h3>
        {activities.length === 0 ? (
          <EmptyState icon={Briefcase} title="Sem atividades comerciais" description="Registre calls e follow-ups para acompanhar a negociação." size="sm" />
        ) : (
          <div className="space-y-3">
            {activities.map((a: any) => {
              const Icon = activityIcons[a.activity_type] || Clock;
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Icon className="h-4 w-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{activityLabels[a.activity_type] || a.activity_type}</p>
                      <Badge variant={a.status === "done" ? "default" : "secondary"} className="text-xs">
                        {a.status === "done" ? "Feita" : a.status === "planned" ? "Planejada" : "Cancelada"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{(a as any).sales_users?.name} • {new Date(a.occurred_at || a.scheduled_at || a.created_at).toLocaleString("pt-BR")}</p>
                    {a.outcome && <p className="text-sm mt-1">{a.outcome}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deals */}
      {deals.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Deals</h3>
          <div className="space-y-3">
            {deals.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">R$ {Number(d.amount_value).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{(d as any).sales_users?.name} • {new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <Badge variant={d.stage === "won" ? "default" : d.stage === "lost" ? "destructive" : "secondary"}>
                  {d.stage === "won" ? "Ganho" : d.stage === "lost" ? "Perdido" : "Aberto"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
