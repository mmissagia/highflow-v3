import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlobalContextSelector } from "@/components/GlobalContextSelector";
import { Search, Filter, Download, Plus, Eye, Inbox, MessageCircle, Mail, Users, Plug, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LeadSourceSelector from "@/components/crm/LeadSourceSelector";
import { CreateLeadDrawer } from "@/components/crm/CreateLeadDrawer";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import useUnifiedLeads from "@/hooks/useUnifiedLeads";
import { useLeadStageOverrides } from "@/hooks/useLeadStage";
import { formatStageLabel, STAGE_COLORS, CRITICAL_STAGE_IDS } from "@/lib/leadUtils";
import type { UnifiedLead } from "@/types/lead";

type Lead = UnifiedLead;

export default function LeadsList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentlyCreatedLeadId, setRecentlyCreatedLeadId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { leads: unifiedLeads, refetch } = useUnifiedLeads();
  const { data: stageOverrides } = useLeadStageOverrides();

  const leads: Lead[] = useMemo(() => {
    return unifiedLeads.map((l) => {
      if (l.source === "manual") return l;
      const override = stageOverrides?.get(l.id);
      return override ? { ...l, stage: override } : l;
    });
  }, [unifiedLeads, stageOverrides]);

  const hasLeads = leads.length > 0;

  const filteredLeads = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q)
    );
  });

  const columns: DataTableColumn<Lead>[] = [
    {
      id: "lead",
      header: "Lead",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {row.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      id: "etapa",
      header: "Etapa",
      accessor: (row) => {
        const isCritical = CRITICAL_STAGE_IDS.has(row.stage);
        return (
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isCritical ? STAGE_COLORS[row.stage] : "bg-muted-foreground/40")} />
            <span className={cn("text-sm", isCritical && "font-medium")}>{formatStageLabel(row.stage)}</span>
          </div>
        );
      },
    },
    {
      id: "valor",
      header: "Valor Potencial",
      align: "right",
      accessor: (row) => (
        <span className="font-medium text-success tabular-nums">
          R$ {(row.pipeline_value ?? 0).toLocaleString("pt-BR")}
        </span>
      ),
    },
    {
      id: "proxima-acao",
      header: "Próxima Ação",
      accessor: () => <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      id: "ultima-interacao",
      header: "Última Interação",
      accessor: (row) => (
        <span className="text-sm text-muted-foreground">{row.last_contact ?? "Recém-criado"}</span>
      ),
    },
    { id: "origem", header: "Origem", expandable: true, accessor: (row) => row.origin },
    { id: "responsavel", header: "Responsável", expandable: true, accessor: (row) => row.responsible ?? "—" },
    { id: "score", header: "Score", expandable: true, accessor: (row) => row.score ?? "—" },
    { id: "iem", header: "IEM", expandable: true, accessor: (row) => (row.iem !== null ? `${row.iem}%` : "—") },
  ];

  const actions: DataTableAction<Lead>[] = [
    {
      id: "ver",
      label: "Abrir ficha",
      icon: Eye,
      onClick: (row) => navigate(`/crm/lead/${row.id}`),
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      onClick: (row) => navigate(`/comunicacao/conversas?lead=${row.id}`),
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      onClick: () => {
        /* placeholder */
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lista de Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão operacional dos seus leads</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      <GlobalContextSelector />

      <LeadSourceSelector />

      {!hasLeads ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title="Seu CRM ainda não tem leads"
              description="Conecte um produto Eduzz, importe um CSV, ou cadastre o primeiro lead manualmente."
              primaryCta={{
                label: "Conectar produto",
                icon: Plug,
                onClick: () => navigate("/conexoes"),
              }}
              secondaryAction={
                <span className="inline-flex items-center gap-2">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => {
                      /* placeholder importar CSV */
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Importar CSV
                  </Button>
                  <span aria-hidden="true">·</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar lead
                  </Button>
                </span>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
            {search.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Filtros de sessão aplicados</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 gap-1 text-xs"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <DataTable<Lead>
              data={filteredLeads}
              columns={columns}
              actions={actions}
              onRowClick={(row) => navigate(`/crm/lead/${row.id}`)}
              rowKey={(row) => row.id}
              highlightRowId={recentlyCreatedLeadId}
              onHighlightComplete={() => setRecentlyCreatedLeadId(null)}
              emptyState={{
                icon: Users,
                title: "Seu CRM ainda não tem leads",
                description: "Conecte um produto Eduzz, importe um CSV, ou cadastre o primeiro lead manualmente.",
                cta: (
                  <Button onClick={() => navigate("/conexoes")}>
                    <Plug className="h-4 w-4 mr-2" />
                    Conectar produto
                  </Button>
                ),
                secondaryAction: (
                  <span className="inline-flex items-center gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => {
                        /* placeholder importar CSV */
                      }}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Importar CSV
                    </Button>
                    <span aria-hidden="true">·</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar lead
                    </Button>
                  </span>
                ),
              }}
            />
          </CardContent>
        </Card>
      )}
      <CreateLeadDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(lead) => {
          void refetch();
          if (lead?.id !== undefined) {
            setRecentlyCreatedLeadId(String(lead.id));
          }
          setCreateOpen(false);
        }}
      />
    </div>
  );
}
