import { Fragment, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Search,
  Settings,
} from 'lucide-react';
import logoAvizee from '@/assets/logoavizee.png';
import { Button } from '@/components/ui/button';
import { navSections, dashboardItem, isPathActive } from '@/lib/navigation';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useSidebarAlerts } from '@/hooks/useSidebarAlerts';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, onOpenSearch }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = `${location.pathname}${location.search}`;
  const { isAdmin } = useIsAdmin();
  const alerts = useSidebarAlerts();
  const secondsSinceSync = alerts.lastUpdatedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(alerts.lastUpdatedAt).getTime()) / 1000))
    : null;

  const badgeMap: Record<string, number> = useMemo(() => ({
    financeiro: alerts.financeiroVencidos + alerts.financeiroVencer,
    estoque: alerts.estoqueBaixo,
    comercial: alerts.orcamentosPendentes,
  }), [alerts]);

  const itemBadges: Record<string, { count: number; tone: "danger" | "warning" | "info" }> = useMemo(() => ({
    "/cotacoes": { count: alerts.orcamentosPendentes, tone: "warning" },
    "/financeiro": { count: alerts.financeiroVencer, tone: "info" },
    "/financeiro?tipo=receber": { count: alerts.financeiroVencer, tone: "info" },
    "/financeiro?tipo=pagar": { count: alerts.financeiroVencidos, tone: "danger" },
    "/estoque": { count: alerts.estoqueBaixo, tone: "danger" },
  }), [alerts]);

  // Filter out admin-only sections for non-admin users
  const visibleSections = useMemo(
    () => (isAdmin ? navSections : navSections.filter((s) => s.key !== 'administracao')),
    [isAdmin],
  );

  const isItemActive = (targetPath: string) => {
    const [targetBase, targetQuery] = targetPath.split('?');
    if (targetQuery) return currentRoute === targetPath;
    return location.pathname === targetBase || location.pathname.startsWith(`${targetBase}/`);
  };

  const [manualSections, setManualSections] = useState<Record<string, boolean>>({});

  const toneClass = {
    danger: 'bg-destructive text-destructive-foreground',
    warning: 'bg-warning text-warning-foreground',
    info: 'bg-primary text-primary-foreground',
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeSectionKeys = useMemo(
    () =>
      visibleSections
        .filter((section) =>
          section.items.some((group) => group.items.some((item) => isItemActive(item.path))),
        )
        .map((section) => section.key),
    [currentRoute, visibleSections],
  );

  const isSectionOpen = (key: string) => {
    if (collapsed) return false;
    if (key in manualSections) return manualSections[key];
    return activeSectionKeys.includes(key);
  };

  const handleNavClick = (path: string) => {
    onCloseMobile();
    navigate(path);
  };

  const containerClasses = collapsed ? 'w-[240px] md:w-[72px]' : 'w-[240px]';

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onCloseMobile} />}
      <aside
        role="complementary"
        aria-label="Barra lateral principal"
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
          containerClasses,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={logoAvizee} alt="AviZee" className="h-9 w-9 rounded object-contain" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight">AviZee</p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">ERP</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b border-border px-3 py-3">
          <button
            type="button"
            onClick={onOpenSearch}
            className={`flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground ${collapsed ? 'justify-center px-0' : ''}`}
            title="Buscar módulos (Ctrl/Cmd + K)"
            aria-label="Abrir busca global"
          >
            <Search className="h-4 w-4" />
            {!collapsed && (
              <>
                <span className="truncate">Buscar...</span>
                <span className="ml-auto text-[10px]">⌘K</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" role="navigation" aria-label="Módulos do sistema">
          {/* Dashboard */}
          <Link
            to={dashboardItem.path}
            onClick={onCloseMobile}
            className={`sidebar-item mb-3 ${location.pathname === dashboardItem.path ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? dashboardItem.title : undefined}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{dashboardItem.title}</span>}
          </Link>

          {/* Sections */}
          <div className="space-y-1">
            {visibleSections.map((section) => {
              const sectionActive = activeSectionKeys.includes(section.key);
              const isOpen = isSectionOpen(section.key);
              return (
                <div key={section.key}>
                  <button
                    type="button"
                    onClick={() => {
                      if (collapsed) { onToggleCollapsed(); return; }
                      setManualSections((c) => ({ ...c, [section.key]: !isOpen }));
                    }}
                    className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      sectionActive
                        ? 'text-primary'
                        : 'text-foreground hover:bg-accent'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                    title={collapsed ? section.title : undefined}
                    aria-label={collapsed ? `Abrir seção ${section.title}` : undefined}
                  >
                    <section.icon className="h-4.5 w-4.5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{section.title}</span>
                        {(badgeMap[section.key] ?? 0) > 0 && (
                          <span className="ml-auto mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                            {badgeMap[section.key]}
                          </span>
                        )}
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </>
                    )}
                    {collapsed && (badgeMap[section.key] ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                        {badgeMap[section.key]}
                      </span>
                    )}
                  </button>

                  {!collapsed && isOpen && (
                    <div className="ml-3 space-y-0.5 border-l border-border pl-3 py-1">
                      {section.items.map((group) => (
                        <Fragment key={group.title}>
                          {section.items.length > 1 && (
                            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {group.title}
                            </p>
                          )}
                          {group.items.map((item) => {
                            const active = isItemActive(item.path);
                            return (
                              <button
                                key={item.path}
                                type="button"
                                onClick={() => handleNavClick(item.path)}
                                className={`flex w-full items-center justify-between text-left rounded-md px-3 py-1.5 text-[13px] transition ${
                                  active
                                    ? 'bg-primary/10 font-medium text-primary'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                              >
                                <span>{item.title}</span>
                                {(itemBadges[item.path]?.count ?? 0) > 0 && (
                                  <span className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${toneClass[itemBadges[item.path].tone]}`}>
                                    {itemBadges[item.path].count}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          {!collapsed && secondsSinceSync !== null && (
            <p className="mb-2 px-2 text-[10px] text-muted-foreground">
              Última sincronização: há {secondsSinceSync}s
            </p>
          )}
          <button
            type="button"
            onClick={() => handleNavClick('/configuracoes')}
            className={`sidebar-item ${isPathActive(location.pathname, '/configuracoes') ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Configurações' : undefined}
            aria-label="Abrir configurações"
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
