import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Database,
  ShoppingBag,
  RefreshCw,
  Users,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// Mock de produtos Eduzz para MVP
const mockEduzzProducts = [
  { id: "prod_001", name: "Mentoria High-Ticket Elite", buyers: 3482 },
  { id: "prod_002", name: "Curso Imersão Digital", buyers: 1256 },
  { id: "prod_003", name: "Workshop Funil de Vendas", buyers: 892 },
  { id: "prod_004", name: "E-book Estratégias de Tráfego", buyers: 5210 },
];

export default function LeadSourceSelector() {
  const { user } = useAuth();
  const { activeCompanyId } = useOrg();
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<"CRM" | "PRODUCTS">("CRM");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: connections = [] } = useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("status", "connected");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: leadSources = [] } = useQuery({
    queryKey: ["lead_sources", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createLeadSourceMutation = useMutation({
    mutationFn: async (product: typeof mockEduzzProducts[0]) => {
      const { error } = await supabase.from("lead_sources").insert({
        user_id: user!.id,
        org_id: activeCompanyId!,
        name: product.name,
        type: "EXTERNAL_PRODUCT",
        provider: selectedPlatform,
        reference_id: product.id,
        reference_name: product.name,
        cached_count: product.buyers,
        last_sync_at: new Date().toISOString(),
        connection_id: connections.find((c) => c.provider === selectedPlatform)?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_sources"] });
      toast.success("Base de leads criada com sucesso!");
      setSelectedProduct("");
    },
    onError: () => toast.error("Erro ao criar base de leads."),
  });

  const connectedPlatforms = connections.filter((c) => c.status === "connected");
  const selectedProductData = mockEduzzProducts.find((p) => p.id === selectedProduct);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Contagem atualizada!");
    }, 1500);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Fonte da Base
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={sourceType}
          onValueChange={(v) => setSourceType(v as "CRM" | "PRODUCTS")}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="CRM" id="source-crm" />
            <Label htmlFor="source-crm" className="cursor-pointer flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              CRM (segmentos existentes)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="PRODUCTS" id="source-products" />
            <Label htmlFor="source-products" className="cursor-pointer flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Produtos conectados
            </Label>
          </div>
        </RadioGroup>

        {sourceType === "PRODUCTS" && (
          <div className="space-y-4 pt-2 border-t border-border">
            {connectedPlatforms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma plataforma conectada. Vá em{" "}
                <a href="/conexoes" className="text-primary underline">
                  Conexões
                </a>{" "}
                para configurar.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Plataforma</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedPlatforms.map((conn) => (
                        <SelectItem key={conn.id} value={conn.provider}>
                          {conn.provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlatform && (
                  <div className="space-y-2">
                    <Label className="text-sm">Produto</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockEduzzProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedProductData && (
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{selectedProductData.name}</p>
                        <p className="text-2xl font-bold text-primary">
                          {selectedProductData.buyers.toLocaleString("pt-BR")} compradores encontrados
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createLeadSourceMutation.mutate(selectedProductData)}
                      disabled={createLeadSourceMutation.isPending}
                    >
                      {createLeadSourceMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Usar como base de leads
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Bases já criadas a partir de produtos */}
            {leadSources.filter((ls) => ls.type === "EXTERNAL_PRODUCT").length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs text-muted-foreground">Bases de produtos criadas</Label>
                {leadSources
                  .filter((ls) => ls.type === "EXTERNAL_PRODUCT")
                  .map((ls) => (
                    <div key={ls.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-2">
                      <div>
                        <span className="font-medium">{ls.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {ls.provider}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {ls.cached_count?.toLocaleString("pt-BR")} leads
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
