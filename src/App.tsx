import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GlobalFilterProvider } from "@/contexts/GlobalFilterContext";
import { StrategyProvider } from "@/contexts/StrategyContext";
import { OrgProvider, useOrg } from "@/contexts/OrgContext";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { NoAccess } from "@/components/NoAccess";
import { moduleForPath, canAccessModule } from "@/config/permissions";
import { Loader2 } from "lucide-react";
import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { AIAgentPanel } from "@/components/ai-agent/AIAgentPanel";
import { AIAgentFab } from "@/components/ai-agent/AIAgentFab";
import { AIHeaderBadge } from "@/components/ai-agent/AIHeaderBadge";
import { useAIToastAlerts } from "@/hooks/useAIToastAlerts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// Pages
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

// CRM
import Pipeline from "./pages/crm/Pipeline";
import LeadsList from "./pages/crm/LeadsList";
import LeadDetail from "./pages/crm/LeadDetail";

// Eventos
import EventosList from "./pages/eventos/EventosList";
import EventoDetail from "./pages/eventos/EventoDetail";
import PitchEditor from "./pages/eventos/PitchEditor";
import ConstrutorEstrategias from "./pages/eventos/ConstrutorEstrategias";

// Comunicação
import Campanhas from "./pages/comunicacao/Campanhas";
import Automacoes from "./pages/comunicacao/Automacoes";
import EditorMensagens from "./pages/comunicacao/EditorMensagens";

import Conversas from "./pages/comunicacao/Conversas";

// Entrega
import MeusCursos from "./pages/entrega/MeusCursos";
import MinhasMentorias from "./pages/entrega/MinhasMentorias";
import PainelMentor from "./pages/entrega/PainelMentor";
import PainelProdutor from "./pages/entrega/PainelProdutor";
import Portfolio from "./pages/entrega/Portfolio";

// Conexões
import Conexoes from "./pages/Conexoes";

// Infraestrutura
import Seguranca from "./pages/infra/Seguranca";
import Configuracoes from "./pages/infra/Configuracoes";
import Usuarios from "./pages/Usuarios";
import OrgConsole from "./pages/OrgConsole";

// Comercial
import Equipe from "./pages/comercial/Equipe";
import Atividades from "./pages/comercial/Atividades";
import PerformanceComercial from "./pages/comercial/PerformanceComercial";
import Comissoes from "./pages/comercial/Comissoes";
import Agenda from "./pages/comercial/Agenda";
import Relatorios from "./pages/comercial/Relatorios";
import CheckoutHighTicket from "./pages/checkout/CheckoutHighTicket";
import PublicCheckout from "./pages/checkout/PublicCheckout";
const Assinaturas = lazy(() => import('./pages/monetizacao/Assinaturas'));
const Copiloto = lazy(() => import('./pages/ia/Copiloto'));
const CopilotAccess = lazy(() => import('./pages/ia/CopilotAccess'));
const CopilotProfiles = lazy(() => import('./pages/ia/CopilotProfiles'));
const CopilotScope = lazy(() => import('./pages/ia/CopilotScope'));
const CopilotAlerts = lazy(() => import('./pages/ia/CopilotAlerts'));
const CopilotLogs = lazy(() => import('./pages/ia/CopilotLogs'));
const CopilotSimulation = lazy(() => import('./pages/ia/CopilotSimulation'));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function ModuleGate({ children }: { children: React.ReactNode }) {
  const { loading, role, companies } = useOrg();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role && companies.length === 0) {
    return <NoAccess variant="no-company" />;
  }

  const moduleKey = moduleForPath(location.pathname);
  if (moduleKey && !canAccessModule(role, moduleKey)) {
    return <NoAccess variant="forbidden" />;
  }

  return <>{children}</>;
}

function AppLayoutInner() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiInitialTab, setAiInitialTab] = useState<string | undefined>();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const sidebar = useSidebar();

  const openAlerts = useCallback(() => {
    setAiInitialTab("alertas");
    setAiPanelOpen(true);
  }, []);

  useAIToastAlerts(openAlerts);

  // Persist sidebar collapse across reloads
  useEffect(() => {
    const stored = localStorage.getItem("highflow.sidebar.collapsed");
    if (stored === "true" && sidebar.state === "expanded") {
      sidebar.setOpen(false);
    } else if (stored === "false" && sidebar.state === "collapsed") {
      sidebar.setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "highflow.sidebar.collapsed",
      String(sidebar.state === "collapsed")
    );
  }, [sidebar.state]);

  useKeyboardShortcuts({
    onCommandPalette: () => setPaletteOpen((v) => !v),
    onShortcutsModal: () => setShortcutsOpen(true),
    onSidebarToggle: () => sidebar.toggleSidebar(),
    onCreateContextual: () => {
      /* placeholder */
    },
    onFocusSearch: () => {
      const el = document.querySelector<HTMLInputElement>("[data-search-input]");
      el?.focus();
    },
  });

  return (
    <>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-background flex items-center px-6">
            <SidebarTrigger className="mr-4" />
            <OrgSwitcher />
            <div className="flex-1" />
            <ThemeToggle className="mr-2" />
            <AIHeaderBadge alertCount={8} onClick={openAlerts} />
          </header>
          <main className="flex-1 p-6 bg-muted/30">
            <Breadcrumb className="mb-4" />
            <ModuleGate>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/performance/relatorios" element={<Relatorios />} />
              <Route path="/performance/indicadores" element={<Navigate to="/" replace />} />
              <Route path="/crm/pipeline" element={<Pipeline />} />
              <Route path="/crm/leads" element={<LeadsList />} />
              <Route path="/crm/lead" element={<LeadDetail />} />
              <Route path="/crm/lead/:id" element={<LeadDetail />} />
              <Route path="/comercial/equipe" element={<Equipe />} />
              <Route path="/comercial/atividades" element={<Atividades />} />
              <Route path="/comercial/produtividade" element={<Navigate to="/comercial/performance" replace />} />
              <Route path="/comercial/performance" element={<PerformanceComercial />} />
              <Route path="/comercial/comissoes" element={<Comissoes />} />
              <Route path="/comercial/agenda" element={<Agenda />} />
              <Route path="/comercial/relatorios" element={<Navigate to="/" replace />} />
              {/* Monetização */}
              <Route path="/estrategias" element={<ConstrutorEstrategias />} />
              <Route path="/monetizacao/eventos" element={<EventosList />} />
              <Route path="/monetizacao/eventos/detalhe" element={<EventoDetail />} />
              <Route path="/monetizacao/eventos/detalhe/:id" element={<EventoDetail />} />
              <Route path="/monetizacao/pitches" element={<PitchEditor />} />
              <Route path="/monetizacao/pitches/:id" element={<PitchEditor />} />
              <Route path="/checkout-ht" element={<CheckoutHighTicket />} />
              <Route path="/monetizacao/assinaturas" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><Assinaturas /></Suspense>} />

              {/* IA */}
              <Route path="/ia/copiloto" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><Copiloto /></Suspense>} />
              <Route path="/ia/copiloto/acessos" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><CopilotAccess /></Suspense>} />
              <Route path="/ia/copiloto/perfis" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><CopilotProfiles /></Suspense>} />
              <Route path="/ia/copiloto/escopo" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><CopilotScope /></Suspense>} />
              <Route path="/ia/copiloto/alertas" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><CopilotAlerts /></Suspense>} />
              <Route path="/ia/copiloto/logs" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><CopilotLogs /></Suspense>} />
              <Route path="/ia/copiloto/simulacao" element={<Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}><CopilotSimulation /></Suspense>} />

              {/* Redirects de rotas antigas → novas */}
              <Route path="/eventos" element={<Navigate to="/monetizacao/eventos" replace />} />
              <Route path="/eventos/detalhe" element={<Navigate to="/monetizacao/eventos" replace />} />
              <Route path="/eventos/detalhe/:id" element={<Navigate to="/monetizacao/eventos" replace />} />
              <Route path="/eventos/pitch" element={<Navigate to="/monetizacao/pitches" replace />} />
              <Route path="/eventos/pitch/:id" element={<Navigate to="/monetizacao/pitches" replace />} />
              <Route path="/eventos/estrategias" element={<Navigate to="/estrategias" replace />} />
              <Route path="/conexoes" element={<Navigate to="/infra/integracoes" replace />} />

              {/* Comunicação */}
              <Route path="/comunicacao/campanhas" element={<Campanhas />} />
              <Route path="/comunicacao/automacoes" element={<Automacoes />} />
              <Route path="/comunicacao/editor" element={<EditorMensagens />} />
              <Route path="/comunicacao/conversas" element={<Conversas />} />

              {/* Entrega */}
              <Route path="/entrega/portfolio" element={<Portfolio />} />
              <Route path="/entrega/cursos" element={<MeusCursos />} />
              <Route path="/entrega/mentorias" element={<MinhasMentorias />} />
              <Route path="/entrega/mentorias/:id" element={<MinhasMentorias />} />
              <Route path="/entrega/mentorias-ht" element={<MinhasMentorias />} />
              <Route path="/entrega/mentor" element={<PainelMentor />} />
              <Route path="/entrega/produtor" element={<PainelProdutor />} />

              {/* Infraestrutura */}
              <Route path="/infra/integracoes" element={<Conexoes />} />
              <Route path="/infra/seguranca" element={<Seguranca />} />
              <Route path="/infra/configuracoes" element={<Configuracoes />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/organizacoes" element={<OrgConsole />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ModuleGate>
          </main>
        </div>
      </div>
      <AIAgentFab onClick={() => { setAiInitialTab(undefined); setAiPanelOpen(true); }} alertCount={8} />
      <AIAgentPanel open={aiPanelOpen} onOpenChange={setAiPanelOpen} initialTab={aiInitialTab} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}

function AppLayout() {
  return (
    <ProtectedRoute>
      <OrgProvider>
        <StrategyProvider>
          <GlobalFilterProvider>
            <SidebarProvider>
              <AppLayoutInner />
            </SidebarProvider>
          </GlobalFilterProvider>
        </StrategyProvider>
      </OrgProvider>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/pay/:linkId" element={<PublicCheckout />} />
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
