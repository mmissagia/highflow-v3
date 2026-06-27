import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Network, Plus } from "lucide-react";
import { toast } from "sonner";

type DialogState = { kind: "agency" | "company"; parentAgencyId?: string; parentName?: string };

export default function OrgConsole() {
  const { organizations, isSuperAdmin, memberships, refresh } = useOrg();

  const platform = organizations.find((o) => o.type === "platform");
  const agencies = organizations.filter((o) => o.type === "agency");
  const companies = organizations.filter((o) => o.type === "company");
  const myAgencies = isSuperAdmin
    ? agencies
    : agencies.filter((a) => memberships.some((m) => m.org_id === a.id && m.status === "active"));

  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [form, setForm] = useState({ name: "", adminName: "", adminEmail: "" });
  const [busy, setBusy] = useState(false);

  const openCreate = (state: DialogState) => {
    setForm({ name: "", adminName: "", adminEmail: "" });
    setDialog(state);
  };

  const handleCreate = async () => {
    if (!dialog) return;
    if (!form.name.trim()) {
      toast.error("Informe o nome");
      return;
    }
    const parentId = dialog.kind === "agency" ? platform?.id : dialog.parentAgencyId;
    if (!parentId) {
      toast.error("Organização superior não encontrada");
      return;
    }
    setBusy(true);
    try {
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ type: dialog.kind, name: form.name.trim(), parent_org_id: parentId })
        .select()
        .single();
      if (error) throw error;

      if (form.adminEmail.trim()) {
        const { data, error: fnErr } = await supabase.functions.invoke("invite-member", {
          body: {
            orgId: org.id,
            email: form.adminEmail.trim(),
            name: form.adminName.trim() || form.adminEmail.trim(),
            accessRole: dialog.kind === "agency" ? "agency_admin" : "admin",
            redirectTo: window.location.origin,
          },
        });
        if (fnErr) throw fnErr;
        if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
      }

      toast.success(dialog.kind === "agency" ? "Agência criada" : "Empresa criada");
      setDialog(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar organização");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizações</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? "Gerencie agências e suas empresas-clientes."
              : "Gerencie as empresas da sua agência."}
          </p>
        </div>
        {isSuperAdmin && (
          <Button className="gap-2" onClick={() => openCreate({ kind: "agency" })} disabled={!platform}>
            <Plus className="h-4 w-4" /> Nova agência
          </Button>
        )}
      </div>

      {myAgencies.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isSuperAdmin ? "Nenhuma agência ainda. Crie a primeira." : "Você não administra nenhuma agência."}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {myAgencies.map((agency) => {
          const agencyCompanies = companies.filter((c) => c.parent_org_id === agency.id);
          return (
            <Card key={agency.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Network className="h-5 w-5 text-primary" />
                  {agency.name}
                  <Badge variant="outline">Agência</Badge>
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => openCreate({ kind: "company", parentAgencyId: agency.id, parentName: agency.name })}
                >
                  <Plus className="h-4 w-4" /> Nova empresa
                </Button>
              </CardHeader>
              <CardContent>
                {agencyCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma empresa nesta agência.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {agencyCompanies.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-md border border-border p-3">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{c.name}</span>
                        {c.status !== "active" && (
                          <Badge variant="secondary" className="ml-auto text-xs">{c.status}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.kind === "agency" ? "Nova agência" : "Nova empresa"}</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "agency"
                ? "Crie uma agência e, opcionalmente, convide o admin dela."
                : `Nova empresa${dialog?.parentName ? ` na agência ${dialog.parentName}` : ""}. Convide o admin para ela acessar.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome {dialog?.kind === "agency" ? "da agência" : "da empresa"} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Acme Ltda" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome do admin</Label>
                <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} placeholder="Opcional" />
              </div>
              <div className="space-y-2">
                <Label>E-mail do admin</Label>
                <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="convite por e-mail" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se informar o e-mail, enviamos um convite para a pessoa definir a senha como
              {dialog?.kind === "agency" ? " admin da agência." : " admin da empresa."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={busy}>{busy ? "Criando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
