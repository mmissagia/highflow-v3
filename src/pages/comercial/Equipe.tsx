import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, UserX, UserCheck, Users, Database, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AIAnalysisBlock } from "@/components/ai";
import { getTeamPerformanceAnalysis } from "@/lib/aiMocks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SalesUser = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  status: string;
  monthly_goal_value: number | null;
  commission_type: string | null;
  commission_percent: number | null;
  commission_fixed_value: number | null;
  cost_fixed_monthly: number | null;
};

const roleLabels: Record<string, string> = { SDR: "SDR", CLOSER: "Closer", LEADER: "Líder" };

const emptyForm = {
  name: "", role: "SDR", email: "", phone: "", status: "active",
  monthly_goal_value: 0, commission_type: "percent", commission_percent: 0,
  commission_fixed_value: 0, cost_fixed_monthly: 0,
};

export default function Equipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedMember, setSelectedMember] = useState<SalesUser | null>(null);

  const { data: salesUsers = [], isLoading } = useQuery({
    queryKey: ["sales_users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as SalesUser[];
    },
    enabled: !!user,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = { ...values, user_id: user!.id };
      if (values.id) {
        const { error } = await supabase.from("sales_users").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales_users").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_users"] });
      toast.success(editId ? "Profissional atualizado" : "Profissional cadastrado");
      resetForm();
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("sales_users").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_users"] });
      toast.success("Status atualizado");
    },
  });

  const resetForm = () => { setForm(emptyForm); setEditId(null); setOpen(false); };

  const openEdit = (su: SalesUser) => {
    setForm({
      name: su.name, role: su.role, email: su.email || "", phone: su.phone || "",
      status: su.status, monthly_goal_value: su.monthly_goal_value || 0,
      commission_type: su.commission_type || "percent",
      commission_percent: su.commission_percent || 0,
      commission_fixed_value: su.commission_fixed_value || 0,
      cost_fixed_monthly: su.cost_fixed_monthly || 0,
    });
    setEditId(su.id);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    upsertMutation.mutate(editId ? { ...form, id: editId } : form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Equipe Comercial</h1>
          <p className="text-muted-foreground">Gerencie SDRs, Closers e Líderes</p>
        </div>
        <div className="flex gap-2">
          {import.meta.env.DEV && (
            <Button variant="outline" size="sm" onClick={async () => {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (!authUser) return;
              const equipe = [
                { name: 'Ana Souza',        role: 'SDR',    email: 'ana.souza@highflow.com',      phone: '11991110001', status: 'active',   monthly_goal_value: 50000,  commission_type: 'percent', commission_percent: 3.5,  commission_fixed_value: null, cost_fixed_monthly: 0 },
                { name: 'Carlos Lima',      role: 'CLOSER', email: 'carlos.lima@highflow.com',    phone: '11991110002', status: 'active',   monthly_goal_value: 150000, commission_type: 'percent', commission_percent: 8.0,  commission_fixed_value: null, cost_fixed_monthly: 0 },
                { name: 'Fernanda Costa',   role: 'CLOSER', email: 'fernanda.costa@highflow.com', phone: '11991110003', status: 'active',   monthly_goal_value: 120000, commission_type: 'percent', commission_percent: 7.5,  commission_fixed_value: null, cost_fixed_monthly: 0 },
                { name: 'Ricardo Mendes',   role: 'SDR',    email: 'ricardo.mendes@highflow.com', phone: '11991110004', status: 'active',   monthly_goal_value: 40000,  commission_type: 'percent', commission_percent: 3.0,  commission_fixed_value: null, cost_fixed_monthly: 0 },
                { name: 'Juliana Teixeira', role: 'CLOSER', email: 'juliana.t@highflow.com',      phone: '11991110005', status: 'active',   monthly_goal_value: 100000, commission_type: 'percent', commission_percent: 5.0,  commission_fixed_value: null, cost_fixed_monthly: 0 },
                { name: 'Bruno Alves',      role: 'SDR',    email: 'bruno.alves@highflow.com',    phone: '11991110006', status: 'inactive', monthly_goal_value: 30000,  commission_type: 'fixed',   commission_percent: null, commission_fixed_value: 2500, cost_fixed_monthly: 0 },
              ];
              const { data: inserted, error } = await supabase.from('sales_users').insert(equipe.map(p => ({ ...p, user_id: authUser.id }))).select();
              if (error) { toast.error('Erro ao inserir equipe: ' + error.message); return; }
              toast.success(`${inserted.length} profissionais cadastrados com sucesso.`);
              queryClient.invalidateQueries({ queryKey: ['sales_users'] });
            }}>
              <Database className="h-4 w-4 mr-2" />Seed Demo
            </Button>
          )}
          {import.meta.env.DEV && (
            <Button variant="outline" size="sm" onClick={async () => {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (!authUser) return;

              const { data: equipe } = await supabase
                .from('sales_users')
                .select('id, name, role')
                .eq('user_id', authUser.id);

              const sdr1 = equipe?.find(e => e.name === 'Ana Souza')?.id;
              const sdr2 = equipe?.find(e => e.name === 'Ricardo Mendes')?.id;
              const closer1 = equipe?.find(e => e.name === 'Carlos Lima')?.id;
              const closer2 = equipe?.find(e => e.name === 'Fernanda Costa')?.id;
              const closer3 = equipe?.find(e => e.name === 'Juliana Teixeira')?.id;

              if (!sdr1 || !closer1) {
                toast.error('Insira a equipe primeiro antes de gerar os dados comerciais.');
                return;
              }

              const { error: dealsErr } = await supabase.from('deals').insert([
                { user_id: authUser.id, lead_id: 'lead-5', product_id: 'mentoria-elite',     amount_value: 15000, closer_id: closer1, sdr_id: sdr1,  notes: 'Lead indicado por ex-aluno. Fechou na primeira reunião.',    won_at: new Date(Date.now() - 5  * 86400000).toISOString(), stage: 'won' },
                { user_id: authUser.id, lead_id: 'lead-4', product_id: 'mastermind-anual',   amount_value: 24000, closer_id: closer2, sdr_id: sdr2,  notes: 'Maior deal do mês. Lead qualificado via Instagram.',         won_at: new Date(Date.now() - 10 * 86400000).toISOString(), stage: 'won' },
                { user_id: authUser.id, lead_id: 'lead-2', product_id: 'imersao-presencial', amount_value: 12000, closer_id: closer1, sdr_id: sdr1,  notes: 'Objeção de agenda. Follow-up agendado para sexta.',          won_at: null, stage: 'negotiation' },
                { user_id: authUser.id, lead_id: 'lead-1', product_id: 'mentoria-elite',     amount_value: 18000, closer_id: closer1, sdr_id: sdr1,  notes: 'Lead muito quente. Score 85. Proposta enviada.',             won_at: null, stage: 'negotiation' },
                { user_id: authUser.id, lead_id: 'lead-3', product_id: 'imersao-presencial', amount_value: 8500,  closer_id: closer2!, sdr_id: sdr2!, notes: 'Objeção de preço. Considerar boleto TMB.',                  won_at: null, stage: 'proposal' },
                { user_id: authUser.id, lead_id: 'lead-1', product_id: 'mastermind-anual',   amount_value: 24000, closer_id: closer3!, sdr_id: sdr2!, notes: 'Indicação do Rafael Mendonça. Alta receptividade.',          won_at: null, stage: 'qualified' },
              ]);
              if (dealsErr) { toast.error('Erro deals: ' + dealsErr.message); return; }

              const { error: actErr } = await supabase.from('sales_activities').insert([
                { user_id: authUser.id, lead_id: 'lead-1', sales_user_id: sdr1,    activity_type: 'CALL',         occurred_at: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'done', outcome: 'Confirmou orçamento acima de R$ 15k. Alta receptividade.',   next_step: 'Agendar reunião com Closer' },
                { user_id: authUser.id, lead_id: 'lead-2', sales_user_id: closer1, activity_type: 'MEETING_DONE', occurred_at: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'done', outcome: 'Reunião de diagnóstico. Objeção de agenda identificada.',     next_step: 'Enviar proposta personalizada' },
                { user_id: authUser.id, lead_id: 'lead-4', sales_user_id: sdr1,    activity_type: 'WHATSAPP',     occurred_at: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'done', outcome: 'Sequência WhatsApp — 3 mensagens. Taxa de resposta: 100%.', next_step: 'Aguardar retorno' },
                { user_id: authUser.id, lead_id: 'lead-3', sales_user_id: closer1, activity_type: 'CALL',         occurred_at: new Date(Date.now() - 4 * 86400000).toISOString(), status: 'done', outcome: 'Follow-up pós-proposta. Objeção de prazo. Lead pediu 1 semana.', next_step: 'Ligar em 7 dias' },
                { user_id: authUser.id, lead_id: 'lead-5', sales_user_id: closer2!, activity_type: 'MEETING_DONE', occurred_at: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'done', outcome: 'Pitch presencial. Proposta de R$ 15k. Lead muito engajado.', next_step: 'Aguardar assinatura' },
                { user_id: authUser.id, lead_id: 'lead-2', sales_user_id: sdr2!,   activity_type: 'CALL',         occurred_at: new Date(Date.now() - 6 * 3600000).toISOString(),  status: 'done', outcome: 'Primeiro contato — indicação do Rafael. Alta receptividade.', next_step: 'Preparar diagnóstico' },
                { user_id: authUser.id, lead_id: 'lead-1', sales_user_id: sdr1,    activity_type: 'WHATSAPP',     occurred_at: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'done', outcome: 'E-mail de nurturing sobre ROI de mentorias. Abertura: 68%.', next_step: 'Monitorar engajamento' },
              ]);
              if (actErr) { toast.error('Erro atividades: ' + actErr.message); return; }

              const { data: deals } = await supabase
                .from('deals')
                .select('id, amount_value, closer_id')
                .eq('user_id', authUser.id)
                .eq('stage', 'won');

              if (deals && deals.length > 0) {
                const { error: comErr } = await supabase.from('commission_records').insert(
                  deals.map(deal => ({
                    user_id: authUser.id,
                    deal_id: deal.id,
                    sales_user_id: deal.closer_id!,
                    commission_value: deal.amount_value * 0.08,
                    status: 'paid',
                    period_month: new Date().toISOString().slice(0, 7),
                  }))
                );
                if (comErr) { toast.error('Erro comissões: ' + comErr.message); return; }
              }

              await queryClient.invalidateQueries({ queryKey: ['sales_activities'] });
              await queryClient.invalidateQueries({ queryKey: ['deals'] });
              await queryClient.invalidateQueries({ queryKey: ['commission_records'] });
              toast.success('Dados comerciais inseridos com sucesso.');
            }}>
              <Database className="h-4 w-4 mr-2" />Seed Dados Comerciais
            </Button>
          )}
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Profissional</Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} Profissional</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SDR">SDR</SelectItem>
                      <SelectItem value="CLOSER">Closer</SelectItem>
                      <SelectItem value="LEADER">Líder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Comissão</Label>
                  <Select value={form.commission_type} onValueChange={(v) => setForm({ ...form, commission_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual</SelectItem>
                      <SelectItem value="fixed">Fixo</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>% Comissão</Label><Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Valor Fixo (R$)</Label><Input type="number" value={form.commission_fixed_value} onChange={(e) => setForm({ ...form, commission_fixed_value: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Meta Mensal (R$)</Label><Input type="number" value={form.monthly_goal_value} onChange={(e) => setForm({ ...form, monthly_goal_value: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Custo Fixo Mensal (R$)</Label><Input type="number" value={form.cost_fixed_monthly} onChange={(e) => setForm({ ...form, cost_fixed_monthly: Number(e.target.value) })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>{editId ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["SDR", "CLOSER", "LEADER"] as const).map((r) => (
          <Card key={r}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{roleLabels[r]}s</p>
                <p className="text-2xl font-bold">{salesUsers.filter((s) => s.role === r && s.status === "active").length}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Profissionais</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando equipe</p>
          ) : salesUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum profissional cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Meta Mensal</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesUsers.map((su) => (
                  <TableRow key={su.id}>
                    <TableCell className="font-medium">{su.name}</TableCell>
                    <TableCell><Badge variant="outline">{roleLabels[su.role] || su.role}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{su.email || "-"}</TableCell>
                    <TableCell>R$ {(su.monthly_goal_value || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">
                      {su.commission_type === "percent" && `${su.commission_percent}%`}
                      {su.commission_type === "fixed" && `R$ ${su.commission_fixed_value}`}
                      {su.commission_type === "hybrid" && `${su.commission_percent}% + R$ ${su.commission_fixed_value}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={su.status === "active" ? "default" : "secondary"}>
                        {su.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => setSelectedMember(su)}
                        >
                          <Sparkles className="h-3 w-3 text-primary" />
                          Análise IA
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(su)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleStatusMutation.mutate({ id: su.id, status: su.status })}>
                          {su.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedMember} onOpenChange={(v) => !v && setSelectedMember(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Performance individual</SheetTitle>
          </SheetHeader>
          {selectedMember && (
            <div className="mt-6">
              <AIAnalysisBlock analysis={getTeamPerformanceAnalysis(selectedMember.name)} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
