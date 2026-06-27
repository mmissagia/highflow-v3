import { MetricCard } from "@/components/MetricCard";
import { SalesFunnel } from "@/components/dashboard/SalesFunnel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlobalContextSelector } from "@/components/GlobalContextSelector";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/data/checkoutData";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { AIInsightCard } from "@/components/ai";
import { getDashboardDailyInsight, getDashboardAlertContext } from "@/lib/aiMocks";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// --- Mock data ---
const todayActions = [
  { id: 1, type: "Follow-up", lead: "Maria Santos", time: "10:00", overdue: true },
  { id: 2, type: "Call agendada", lead: "Pedro Costa", time: "14:30", overdue: false },
  { id: 3, type: "Enviar proposta", lead: "Roberto Almeida", time: "16:00", overdue: false },
];

const hotLeadsAging = [
  { id: 1, name: "Lucia Ferreira", stage: "Follow-up", days: 5, value: 20000 },
  { id: 2, name: "Ana Oliveira", stage: "Lead Frio", days: 8, value: 10000 },
  { id: 3, name: "Carlos Mendes", stage: "Call Agendada", days: 3, value: 35000 },
  { id: 4, name: "João Silva", stage: "Engajado", days: 4, value: 15000 },
  { id: 5, name: "Fernanda Lima", stage: "Warm", days: 6, value: 25000 },
];

// Funnel + metric cards now come from useDashboardMetrics (real, per active company).

const paymentsAtRisk = [
  { id: 1, lead: "Carlos Mendes", type: "PIX expirando", value: 35000, deadline: "Hoje" },
  { id: 2, lead: "Fernanda Lima", type: "Cartão recusado", value: 25000, deadline: "Ontem" },
];

export default function Dashboard() {
  const { data: m } = useDashboardMetrics();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground mt-1">Painel centralizado da sua operação high-ticket</p>
      </div>

      {/* 1. GlobalContextSelector — largura total */}
      <GlobalContextSelector />

      {/* Resumo do Dia — Insight de IA */}
      <AIInsightCard insight={getDashboardDailyInsight()} />

      {/* 2. Grid 2×2 — 4 cards de ações/riscos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ações de Hoje */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Ações de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayActions.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {a.overdue && <AlertTriangle className="h-3 w-3 text-destructive" />}
                  <span className={a.overdue ? "text-destructive font-medium" : "text-foreground"}>{a.type}</span>
                </div>
                <span className="text-muted-foreground truncate ml-2">{a.lead}</span>
              </div>
            ))}
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/50">
              <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] italic text-muted-foreground leading-relaxed">
                {getDashboardAlertContext('actions')}
              </p>
            </div>
            <Link to="/comercial/atividades">
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs h-7">
                Ir para Atividades <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Leads Quentes Parados */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Leads Quentes Parados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotLeadsAging.slice(0, 3).map((l) => (
              <div key={l.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground truncate">{l.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">{l.days}d em {l.stage}</Badge>
              </div>
            ))}
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/50">
              <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] italic text-muted-foreground leading-relaxed">
                {getDashboardAlertContext('hotLeads')}
              </p>
            </div>
            <Link to="/crm/pipeline">
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs h-7">
                Ver Pipeline <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Gargalo do Funil */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Gargalo do Funil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-center py-2">
                <p className="text-lg font-bold text-foreground">Warm → Call</p>
                <p className="text-xs text-muted-foreground">Maior queda de conversão</p>
                <p className="text-2xl font-bold text-destructive mt-1">-50%</p>
                <p className="text-xs text-muted-foreground">Tempo médio: 4.2 dias</p>
              </div>
              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/50">
                <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] italic text-muted-foreground leading-relaxed">
                  {getDashboardAlertContext('bottleneck')}
                </p>
              </div>
              <Link to="/performance/relatorios">
                <Button variant="ghost" size="sm" className="w-full text-xs h-7">
                  Abrir diagnóstico <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos em Risco */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-chart-4" />
              Pagamentos em Risco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentsAtRisk.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-foreground">{p.lead}</span>
                  <p className="text-muted-foreground">{p.type}</p>
                </div>
                <span className="font-medium text-foreground shrink-0">R$ {(p.value / 1000).toFixed(0)}K</span>
              </div>
            ))}
            <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-border/50">
              <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] italic text-muted-foreground leading-relaxed">
                {getDashboardAlertContext('payments')}
              </p>
            </div>
            <Link to="/monetizacao/pitches">
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs h-7">
                Ir para Monetização <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 3. Grid 4 colunas — 4 MetricCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Receita (vendas)" value={formatCurrency(m?.wonRevenue ?? 0)} icon={DollarSign} variant="green" />
        <MetricCard title="Leads Ativos" value={String(m?.activeLeads ?? 0)} icon={Users} variant="primary" />
        <MetricCard title="Taxa de Conversão" value={`${(m?.conversion ?? 0).toFixed(1)}%`} icon={Target} variant="yellow" />
        <MetricCard title="Ticket Médio" value={formatCurrency(m?.ticket ?? 0)} icon={TrendingUp} variant="default" />
      </div>

      {/* 4. Grid 2 colunas — Funil Visual + BarChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesFunnel />

        {/* BarChart Funil de Conversão */}
        <Card>
          <CardHeader><CardTitle>Funil de Conversão</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={m?.funnel ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 5. Checkout HT — largura total */}
      <CheckoutDashboardSection />
    </div>
  );
}

function CheckoutDashboardSection() {
  const { data: m } = useDashboardMetrics();
  const paidTotal = m?.paidTotal ?? 0;
  const pendingTotal = m?.pendingTotal ?? 0;
  const linkCount = m?.linkCount ?? 0;

  return (
    <Link to="/checkout-ht" className="block">
      <Card className="hover:shadow-lg transition-all cursor-pointer">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Checkout High Ticket
            <div
              className="ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #4F46E5, #9333EA)" }}
            >
              Z2Pay
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Receita realizada</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatCurrency(paidTotal)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Receita pendente</p>
              <p className="text-lg font-bold text-amber-500 tabular-nums">{formatCurrency(pendingTotal)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Cobranças</p>
              <p className="text-lg font-bold tabular-nums">{linkCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
