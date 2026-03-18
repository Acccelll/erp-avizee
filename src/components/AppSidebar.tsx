import { Fragment, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, onOpenSearch }: AppSidebarProps) {
  const location = useLocation();
  const currentRoute = `${location.pathname}${location.search}`;

  const isItemActive = (targetPath: string) => {
    const [targetBase, targetQuery] = targetPath.split('?');
    if (targetQuery) return currentRoute === targetPath;
    return location.pathname === targetBase || location.pathname.startsWith(`${targetBase}/`);
  };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operacional: true,
    cadastros: true,
    financeiro: true,
    fiscal: true,
    relatorios: true,
    administracao: true,
  });

  const activeSectionKeys = useMemo(
    () =>
      navSections
        .filter((section) =>
          section.items.some((group) => group.items.some((item) => isItemActive(item.path))),
        )
        .map((section) => section.key),
    [currentRoute],
  );

  const containerClasses = collapsed ? 'w-[240px] md:w-[72px]' : 'w-[240px]';

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onCloseMobile} />}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
          containerClasses,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
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
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={onToggleCollapsed}>
            <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </Button>
        </div>

        <div className="border-b border-border px-3 py-3">
          <button
            type="button"
            onClick={onOpenSearch}
            className={`flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground ${collapsed ? 'justify-center px-0' : ''}`}
            title="Buscar módulos (Ctrl/Cmd + K)"
          >
            <Search className="h-4 w-4" />
            {!collapsed && (
              <>
                <span className="truncate">Buscar módulos...</span>
                <span className="ml-auto text-[10px]">⌘K</span>
              </>
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <Link
            to={dashboardItem.path}
            onClick={onCloseMobile}
            className={`sidebar-item mb-2 ${location.pathname === dashboardItem.path ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? dashboardItem.title : undefined}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{dashboardItem.title}</span>}
          </Link>

          <div className="space-y-2">
            {navSections.map((section) => {
              const sectionActive = activeSectionKeys.includes(section.key);
              const isOpen = collapsed ? false : openSections[section.key];
              return (
                <div key={section.key} className="rounded-xl border border-transparent bg-background/40">
                  <button
                    type="button"
                    onClick={() => {
                      if (collapsed) {
                        onToggleCollapsed();
                        return;
                      }
                      setOpenSections((current) => ({ ...current, [section.key]: !current[section.key] }));
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${sectionActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'} ${collapsed ? 'justify-center px-0' : ''}`}
                    title={collapsed ? section.title : undefined}
                  >
                    <section.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{section.title}</span>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </>
                    )}
                  </button>

                  {!collapsed && isOpen && (
                    <div className="space-y-4 px-2 pb-3 pt-2">
                      {section.items.map((group) => (
                        <Fragment key={group.title}>
                          <div>
                            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {group.title}
                            </p>
                            <div className="space-y-1">
                              {group.items.map((item) => {
                                const active = isItemActive(item.path);
                                return (
                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={onCloseMobile}
                                    className={`block rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                  >
                                    {item.title}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border p-2">
          <Link
            to="/configuracoes"
            onClick={onCloseMobile}
            className={`sidebar-item ${isPathActive(location.pathname, '/configuracoes') ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Configurações' : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}
