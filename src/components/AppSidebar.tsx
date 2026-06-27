import {
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  GraduationCap,
  TrendingUp,
  Kanban,
  List,
  CalendarDays,
  Megaphone,
  MessageCircle,
  BookOpen,
  Heart,
  ChevronRight,
  CreditCard,
  Sparkles,
  LogOut,
  Plug,
  UsersRound,
  Activity,
  Gauge,
  DollarSign,
  Calendar,
  Shield,
  Settings,
  ShoppingBag,
  Presentation,
  Package,
  RefreshCw,
  Zap,
  LayoutGrid,
  Filter,
  Bell,
  FileText,
  Smartphone,
  Sun,
  Moon,
  Building2,
  Network,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleKey } from "@/config/permissions";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Fragment } from "react";
import { PulsaGlyph } from "@/components/ai/PulsaGlyph";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
};

type MenuGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
};

type MenuSection = {
  label: string;
  groups: MenuGroup[];
};

const menuGroups: MenuSection[] = [
  {
    label: "Home",
    groups: [
      {
        title: "Home",
        icon: LayoutDashboard,
        items: [
          { title: "Dashboard", url: "/", icon: LayoutDashboard },
        ],
      },
    ],
  },
  {
    label: "CRM",
    groups: [
      {
        title: "CRM",
        icon: Users,
        items: [
          { title: "Pipeline", url: "/crm/pipeline", icon: Kanban },
          { title: "Leads", url: "/crm/leads", icon: List },
        ],
      },
    ],
  },
  {
    label: "Comercial",
    groups: [
      {
        title: "Comercial",
        icon: DollarSign,
        items: [
          { title: "Equipe", url: "/comercial/equipe", icon: UsersRound },
          { title: "Atividades", url: "/comercial/atividades", icon: Activity },
          { title: "Comissões", url: "/comercial/comissoes", icon: DollarSign },
          { title: "Agenda", url: "/comercial/agenda", icon: Calendar },
          { title: "Performance", url: "/comercial/performance", icon: Gauge },
        ],
      },
    ],
  },
  {
    label: "Monetização",
    groups: [
      {
        title: "Monetização",
        icon: TrendingUp,
        items: [
          { title: "Estratégias", url: "/estrategias", icon: Sparkles },
          { title: "Eventos", url: "/monetizacao/eventos", icon: CalendarDays },
          { title: "Produtos & Pitches", url: "/monetizacao/pitches", icon: Package },
          { title: "Checkout HT", url: "/checkout-ht", icon: CreditCard },
          { title: "Assinaturas", url: "/monetizacao/assinaturas", icon: RefreshCw },
        ],
      },
    ],
  },
  {
    label: "Comunicação",
    groups: [
      {
        title: "Comunicação",
        icon: MessageSquare,
        items: [
          { title: "Conversas", url: "/comunicacao/conversas", icon: MessageCircle },
          { title: "Campanhas", url: "/comunicacao/campanhas", icon: Megaphone },
          { title: "Automações", url: "/comunicacao/automacoes", icon: Zap },
          { title: "Mensagens", url: "/comunicacao/editor", icon: BookOpen },
        ],
      },
    ],
  },
  {
    label: "Entrega",
    groups: [
      {
        title: "Entrega",
        icon: GraduationCap,
        items: [
          { title: "Portfólio", url: "/entrega/portfolio", icon: LayoutGrid },
          { title: "Cursos", url: "/entrega/cursos", icon: BookOpen },
          { title: "Mentorias", url: "/entrega/mentorias", icon: Heart },
        ],
      },
    ],
  },
  {
    label: "Configurações",
    groups: [
      {
        title: "Configurações",
        icon: Settings,
        items: [
          { title: "Integrações", url: "/infra/integracoes", icon: Plug },
          { title: "Segurança", url: "/infra/seguranca", icon: Shield },
          { title: "Configurações", url: "/infra/configuracoes", icon: Settings },
        ],
      },
    ],
  },
  {
    label: "Organizações",
    groups: [
      {
        title: "Organizações",
        icon: Network,
        items: [
          { title: "Empresas & Agências", url: "/organizacoes", icon: Building2 },
        ],
      },
    ],
  },
];

const SECTION_MODULE: Record<string, ModuleKey> = {
  Home: "dashboard",
  CRM: "crm",
  Comercial: "comercial",
  Monetização: "monetizacao",
  Comunicação: "comunicacao",
  Entrega: "entrega",
  Configurações: "infra",
  Organizações: "orgs",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut, user } = useAuth();
  const { can } = usePermissions();
  const { resolvedTheme, setTheme } = useTheme();

  const visibleSections = menuGroups.filter((section) => {
    const mod = SECTION_MODULE[section.label];
    return mod ? can(mod) : true;
  });

  const isActiveGroup = (items: { url: string }[]) => {
    return items.some((item) => currentPath === item.url || currentPath.startsWith(item.url + "/"));
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-6 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            {state === "expanded" && (
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">HighFlow</h1>
                <p className="text-xs text-sidebar-foreground/60">Plataforma High-Ticket</p>
              </div>
            )}
          </div>
        </div>

        {visibleSections.map((section) => (
          <Fragment key={section.label}>
          {section.label === "CRM" && can("ia") && (
            <SidebarGroup key="copiloto-ia-highlight">
              <SidebarGroupLabel>IA</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Collapsible
                    defaultOpen={currentPath.startsWith("/ia/copiloto")}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full justify-between border-l-2 border-l-primary bg-primary/10 hover:bg-primary/20">
                          <div className="flex items-center gap-2">
                            <PulsaGlyph size="sm" />
                            {state === "expanded" && (
                              <>
                                <span className="font-medium">Pulsa</span>
                              </>
                            )}
                          </div>
                          {state === "expanded" && (
                            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {[
                            { title: "Chat", url: "/ia/copiloto", icon: MessageCircle, end: true },
                            { title: "Acessos", url: "/ia/copiloto/acessos", icon: Users, end: false },
                            { title: "Perfis", url: "/ia/copiloto/perfis", icon: Shield, end: false },
                            { title: "Escopo", url: "/ia/copiloto/escopo", icon: Filter, end: false },
                            { title: "Alertas", url: "/ia/copiloto/alertas", icon: Bell, end: false },
                            { title: "Logs", url: "/ia/copiloto/logs", icon: FileText, end: false },
                            { title: "Simulação", url: "/ia/copiloto/simulacao", icon: Smartphone, end: false },
                          ].map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton asChild>
                                <NavLink
                                  to={sub.url}
                                  end={sub.end}
                                  className="hover:bg-sidebar-accent"
                                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                                >
                                  <sub.icon className="h-3.5 w-3.5" />
                                  {state === "expanded" && <span>{sub.title}</span>}
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          <SidebarGroup>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.groups.map((group) => (
                  <Collapsible
                    key={group.title}
                    defaultOpen={isActiveGroup(group.items)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full justify-between hover:bg-sidebar-accent">
                          <div className="flex items-center gap-2">
                            <group.icon className="h-4 w-4" />
                            {state === "expanded" && <span>{group.title}</span>}
                          </div>
                          {state === "expanded" && (
                            <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.items.map((item) => (
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton asChild={!item.comingSoon}>
                                {item.comingSoon ? (
                                  <div className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                                    <item.icon className="h-3.5 w-3.5" />
                                    {state === "expanded" && (
                                      <>
                                        <span>{item.title}</span>
                                        <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                                          Em breve
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <NavLink
                                    to={item.url}
                                    end
                                    className="hover:bg-sidebar-accent"
                                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                                  >
                                    <item.icon className="h-3.5 w-3.5" />
                                    {state === "expanded" && <span>{item.title}</span>}
                                  </NavLink>
                                )}
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          </Fragment>
        ))}

        {/* User & Logout */}
        <div className="mt-auto border-t border-sidebar-border p-4">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 w-full px-3 py-1.5 mb-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-instant ease-snap"
            aria-label="Alternar tema"
          >
            {resolvedTheme === "dark" ? (
              <>
                <Sun className="h-4 w-4" />
                {state === "expanded" && <span>Modo claro</span>}
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                {state === "expanded" && <span>Modo escuro</span>}
              </>
            )}
          </button>
          {state === "expanded" && user && (
            <p className="text-xs text-sidebar-foreground/60 mb-2 truncate">
              {user.email}
            </p>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors duration-instant ease-snap"
          >
            <LogOut className="h-4 w-4" />
            {state === "expanded" && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
