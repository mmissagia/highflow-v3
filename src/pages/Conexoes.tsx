import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plug,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Sparkles,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { AIBadge } from "@/components/ai";
import { getIntegrationSuggestion } from "@/lib/aiMocks";

type Provider = {
  id: string;
  name: string;
  description: string;
  available: boolean;
};

const providers: Provider[] = [
  { id: "EDUZZ", name: "Eduzz", description: "Plataforma de infoprodutos e checkout", available: true },
  { id: "HOTMART", name: "Hotmart", description: "Marketplace de produtos digitais", available: false },
  { id: "KIWIFY", name: "Kiwify", description: "Plataforma de vendas digitais", available: false },
  { id: "ACTIVECAMPAIGN", name: "ActiveCampaign", description: "Automação de email e CRM", available: false },
  { id: "MANYCHAT", name: "ManyChat", description: "Automação de mensagens e chatbots", available: false },
  { id: "META", name: "Meta (Business)", description: "Anúncios e gestão de páginas", available: false },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  connected: { label: "Conectado", variant: "default", icon: CheckCircle2 },
  disconnected: { label: "Não conectado", variant: "outline", icon: XCircle },
  token_expired: { label: "Token expirado", variant: "destructive", icon: AlertTriangle },
};

export default function Conexoes() {
  const { user } = useAuth();
  const { activeCompanyId } = useOrg();
  const queryClient = useQueryClient();
  const [connectDialog, setConnectDialog] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("id, user_id, provider, status, last_sync_at, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const connectMutation = useMutation({
    mutationFn: async ({ provider, key }: { provider: string; key: string }) => {
      const existing = connections.find((c) => c.provider === provider);
      if (existing) {
        const { error } = await supabase
          .from("connections")
          .update({ api_key_encrypted: key, status: "connected", last_sync_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("connections").insert({
          user_id: user!.id,
          org_id: activeCompanyId!,
          provider,
          api_key_encrypted: key,
          status: "connected",
          last_sync_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Conexão realizada com sucesso!");
      setConnectDialog(null);
      setApiKey("");
    },
    onError: () => toast.error("Erro ao conectar. Tente novamente."),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("connections")
        .update({ status: "disconnected", api_key_encrypted: null })
        .eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Conexão desativada.");
    },
  });

  const getConnectionForProvider = (providerId: string) =>
    connections.find((c) => c.provider === providerId);

  const suggestion = getIntegrationSuggestion();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conexões</h1>
        <p className="text-muted-foreground">Gerencie suas integrações com plataformas externas</p>
      </div>

      <div className="border-l-4 border-l-accent bg-accent/5 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AIBadge variant="accent" />
          <h3 className="text-sm font-semibold text-foreground">{suggestion.title}</h3>
        </div>

        <p className="text-sm text-foreground leading-relaxed">{suggestion.summary}</p>

        <ul className="space-y-1">
          {suggestion.benefits.map((b, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-2">
              <span className="text-muted-foreground/60">•</span>
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-2 pt-3 border-t border-accent/20">
          <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-foreground">
            Impacto estimado: <span className="text-muted-foreground font-normal">{suggestion.impact}</span>
          </p>
        </div>

        <Button
          onClick={() => toast.success("Iniciando conexão com Meta Ads...")}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {suggestion.cta}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-3 w-3/4 bg-muted rounded animate-pulse mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-28 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => {
            const connection = getConnectionForProvider(provider.id);
            const status = connection?.status || "disconnected";
            const config = statusConfig[status] || statusConfig.disconnected;
            const StatusIcon = config.icon;

            return (
              <Card key={provider.id} className={!provider.available ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{provider.name}</CardTitle>
                    <Badge variant={config.variant}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {connection?.last_sync_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      <Clock className="h-3 w-3" />
                      Última sincronização: {new Date(connection.last_sync_at).toLocaleString("pt-BR")}
                    </p>
                  )}

                  {!provider.available ? (
                    <Badge variant="secondary">Em breve</Badge>
                  ) : status === "connected" ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConnectDialog(provider.id)}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Reconectar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => connection && disconnectMutation.mutate(connection.id)}
                      >
                        Desconectar
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setConnectDialog(provider.id)}>
                      <Plug className="h-3.5 w-3.5 mr-1" />
                      Conectar
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!connectDialog} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar {connectDialog}</DialogTitle>
            <DialogDescription>
              Insira sua API Key da plataforma para ativar a integração.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Cole sua API Key aqui..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!apiKey.trim() || connectMutation.isPending}
              onClick={() => connectDialog && connectMutation.mutate({ provider: connectDialog, key: apiKey })}
            >
              {connectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {connectMutation.isPending ? "Conectando" : "Conectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
