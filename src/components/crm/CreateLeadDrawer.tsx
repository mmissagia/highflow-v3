import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery } from "@tanstack/react-query";

const pipelineStages = [
  { id: "lead-frio", title: "Lead Frio" },
  { id: "engajado", title: "Engajado" },
  { id: "warm", title: "Warm" },
  { id: "agendou", title: "Agendou" },
  { id: "call-agendada", title: "Call Agendada" },
  { id: "call-realizada", title: "Call Realizada" },
  { id: "follow-up", title: "Follow-up" },
  { id: "fechou", title: "Fechou" },
  { id: "onboarding", title: "Onboarding" },
];

const originOptions = ["Instagram", "Facebook", "LinkedIn", "Indicação", "Evento", "Outro"];
const NONE = "__none";

interface CreateLeadDrawerProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreated: (lead: any) => void;
  defaultStage?: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  origin: "Instagram",
  stage: "lead-frio",
  dealValue: "",
  pitch: "",
  closer_user_id: "",
  sdr_user_id: "",
};

export function CreateLeadDrawer({ open, onClose, onCreated, defaultStage }: CreateLeadDrawerProps) {
  const { user } = useAuth();
  const { activeCompanyId } = useOrg();
  const [form, setForm] = useState({ ...emptyForm, stage: defaultStage || "lead-frio" });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: salesUsers = [] } = useQuery({
    queryKey: ["sales_users_active", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_users")
        .select("id, name, role")
        .eq("status", "active");
      if (error) throw error;
      return data as { id: string; name: string; role: string }[];
    },
    enabled: open && !!activeCompanyId,
  });
  const closers = salesUsers.filter((s) => s.role === "CLOSER" || s.role === "LEADER");
  const sdrs = salesUsers.filter((s) => s.role === "SDR");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }));
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.name.trim()) newErrors.name = true;
    if (!form.phone.trim() && !form.email.trim()) {
      newErrors.phone = true;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Informe o nome e ao menos telefone ou e-mail");
      return;
    }
    if (!activeCompanyId) {
      toast.error("Nenhuma empresa ativa selecionada");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("manual_leads")
      .insert({
        user_id: user!.id,
        org_id: activeCompanyId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        closer_user_id: form.closer_user_id || null,
        sdr_user_id: form.sdr_user_id || null,
        origin: form.origin,
        created_via: "manual",
        stage: form.stage,
        pipeline_value: form.dealValue ? Number(form.dealValue) : null,
        pitch: form.pitch.trim() || null,
      })
      .select()
      .single();
    setIsSubmitting(false);

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        toast.error("Já existe um lead com esse e-mail ou telefone.");
      } else {
        toast.error("Erro ao criar lead: " + error.message);
      }
      return;
    }

    onCreated(data);
    toast.success(`Lead ${form.name.trim()} criado com sucesso.`);
    setForm({ ...emptyForm, stage: defaultStage || "lead-frio" });
    setErrors({});
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Novo Lead</SheetTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toast.info("Importação de leads disponível em breve.")}
            >
              <Upload className="h-3.5 w-3.5" />
              Importar Lead
            </Button>
          </div>
          <SheetDescription>Preencha os dados do lead para adicioná-lo ao pipeline.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input
              placeholder="Nome completo"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-xs text-red-500">Nome é obrigatório</p>}
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              placeholder="(11) 99999-0000"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && <p className="text-xs text-red-500">Informe telefone ou e-mail</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>

          {/* Origem */}
          <div className="space-y-1.5">
            <Label>Origem</Label>
            <Select value={form.origin} onValueChange={(v) => handleChange("origin", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {originOptions.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Etapa */}
          <div className="space-y-1.5">
            <Label>Etapa</Label>
            <Select value={form.stage} onValueChange={(v) => handleChange("stage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {pipelineStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Closer / SDR (opcionais) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Closer</Label>
              <Select
                value={form.closer_user_id || NONE}
                onValueChange={(v) => handleChange("closer_user_id", v === NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Sem closer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem closer</SelectItem>
                  {closers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>SDR</Label>
              <Select
                value={form.sdr_user_id || NONE}
                onValueChange={(v) => handleChange("sdr_user_id", v === NONE ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Sem SDR" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem SDR</SelectItem>
                  {sdrs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor estimado */}
          <div className="space-y-1.5">
            <Label>Valor estimado</Label>
            <Input
              type="number"
              placeholder="R$ 0,00"
              value={form.dealValue}
              onChange={(e) => handleChange("dealValue", e.target.value)}
            />
          </div>

          {/* Pitch */}
          <div className="space-y-1.5">
            <Label>Pitch</Label>
            <Input
              placeholder="Nome do pitch associado (opcional)"
              value={form.pitch}
              onChange={(e) => handleChange("pitch", e.target.value)}
            />
          </div>

          <Button className="w-full mt-2" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando lead</>
            ) : (
              "Criar Lead"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
