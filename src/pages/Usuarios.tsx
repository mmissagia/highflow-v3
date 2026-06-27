import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { ROLE_LABELS, type AppRole } from "@/config/permissions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, UserPlus, Users, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface Member {
  user_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

// Roles assignable to a company member, in this go-live.
const COMPANY_ROLES: AppRole[] = ["admin", "sdr", "closer"];
const SALES_ROLE: Record<string, "SDR" | "CLOSER" | undefined> = { sdr: "SDR", closer: "CLOSER" };

const roleColors: Record<string, string> = {
  super_admin: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  agency_admin: "bg-purple-500/15 text-purple-700 border-purple-300",
  admin: "bg-blue-500/15 text-blue-700 border-blue-300",
  sdr: "bg-cyan-500/15 text-cyan-700 border-cyan-300",
  closer: "bg-green-500/15 text-green-700 border-green-300",
};
const statusColors: Record<string, string> = {
  active: "bg-green-500/15 text-green-700 border-green-300",
  invited: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
  disabled: "bg-gray-500/15 text-gray-600 border-gray-300",
};
const statusLabels: Record<string, string> = { active: "Ativo", invited: "Convidado", disabled: "Inativo" };

const avatarColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500"];
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function Usuarios() {
  const { activeCompany, activeCompanyId } = useOrg();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "admin" as AppRole });
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("admin");
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const membersKey = ["org_members", activeCompanyId];
  const { data: members = [], isLoading } = useQuery({
    queryKey: membersKey,
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_org_members", { p_org: activeCompanyId });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) throw new Error("Nenhuma empresa ativa");
      if (!invite.name.trim() || !invite.email.trim()) throw new Error("Informe nome e e-mail");
      const sales = SALES_ROLE[invite.role] ? { role: SALES_ROLE[invite.role] } : undefined;
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: {
          orgId: activeCompanyId,
          email: invite.email.trim(),
          name: invite.name.trim(),
          accessRole: invite.role,
          redirectTo: window.location.origin,
          sales,
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey });
      toast.success("Convite enviado por e-mail");
      setInvite({ name: "", email: "", role: "admin" });
      setInviteOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao convidar"),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("org_memberships")
        .update({ role })
        .eq("org_id", activeCompanyId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey });
      toast.success("Papel atualizado");
      setEditMember(null);
    },
    onError: () => toast.error("Erro ao atualizar papel"),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("org_memberships")
        .delete()
        .eq("org_id", activeCompanyId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey });
      toast.success("Acesso removido");
      setRemoveTarget(null);
    },
    onError: () => { toast.error("Erro ao remover"); setRemoveTarget(null); },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Membros com acesso a <span className="font-medium text-foreground">{activeCompany?.name ?? "—"}</span> e seus papéis.
          </p>
        </div>
        <Card className="px-4 py-3 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xl font-bold text-foreground">{members.length}</p>
            <p className="text-xs text-muted-foreground">Membros</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" /> Convidar membro
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Carregando membros…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum membro nesta empresa ainda.</TableCell></TableRow>
            ) : filtered.map((m) => (
              <TableRow key={m.user_id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(m.name)}`}>
                      {getInitials(m.name)}
                    </div>
                    <span className="font-medium text-foreground">{m.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleColors[m.role] || ""}>{ROLE_LABELS[m.role as AppRole] ?? m.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[m.status] || ""}>{statusLabels[m.status] ?? m.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => { setEditMember(m); setEditRole((COMPANY_ROLES.includes(m.role as AppRole) ? m.role : "admin") as AppRole); }}>
                        Editar papel
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setRemoveTarget(m)}>
                        Remover acesso
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Convidar */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Convidar membro</DialogTitle>
            <DialogDescription>Cria o acesso e envia um convite por e-mail para definir a senha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} placeholder="Nome do membro" />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              {SALES_ROLE[invite.role] && (
                <p className="text-xs text-muted-foreground">Também cria o perfil de vendas (aparece na Equipe Comercial).</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Enviando…" : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar papel */}
      <Dialog open={!!editMember} onOpenChange={(v) => !v && setEditMember(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar papel</DialogTitle>
            <DialogDescription>{editMember?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPANY_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancelar</Button>
            <Button
              onClick={() => editMember && roleMutation.mutate({ userId: editMember.user_id, role: editRole })}
              disabled={roleMutation.isPending}
            >
              {roleMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remover */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso de {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa perde o acesso a esta empresa. O login continua existindo (pode ser convidado novamente).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.user_id)}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? "Removendo…" : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
