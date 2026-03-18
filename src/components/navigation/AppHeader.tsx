import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Moon, Plus, Search, Sun, User } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { AppBreadcrumbs, resolvePageTitle } from './AppBreadcrumbs';
import { NotificationsPanel } from './NotificationsPanel';
import { GlobalSearch } from './GlobalSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { headerIcons, quickActions } from '@/lib/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
  searchRequest?: number;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function AppHeader({ onOpenMobileMenu: _onOpenMobileMenu, searchRequest = 0 }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (searchRequest > 0) setSearchOpen(true);
  }, [searchRequest]);

  useEffect(() => {
    const handleHotkeys = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        navigate('/cotacoes/novo');
      }

      if (!event.metaKey && !event.ctrlKey && event.key === '?') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleHotkeys);
    return () => window.removeEventListener('keydown', handleHotkeys);
  }, [navigate]);

  const initials = (profile?.nome || 'Admin')
    .split(' ')
    .slice(0, 2)
    .map((name) => name[0])
    .join('')
    .toUpperCase();

  const pageTitle = useMemo(
    () => resolvePageTitle(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  const Icon = useMemo(() => {
    const exact = headerIcons[location.pathname];
    if (exact) return exact;
    return Object.entries(headerIcons).find(([path]) => location.pathname.startsWith(path) && path !== '/')?.[1] || headerIcons['/'];
  }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-3 md:px-6">
          {isMobile ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {location.pathname !== '/' && (
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-accent p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold leading-none">{pageTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">ERP AviZee</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => setSearchOpen(true)}>
                  <Search className="h-4 w-4" />
                </Button>
                <NotificationsPanel />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/configuracoes?tab=usuarios')}>
                      <User className="mr-2 h-4 w-4" /> Meu perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                      {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                      Tema {theme === 'dark' ? 'claro' : 'escuro'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={async () => {
                        await signOut();
                        navigate('/login');
                      }}
                    >
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1 space-y-1">
                <AppBreadcrumbs />
              </div>

              <Button variant="outline" className="hidden min-w-[220px] items-center justify-start gap-2 md:flex" onClick={() => setSearchOpen(true)}>
                <Search className="h-4 w-4" />
                <span className="text-muted-foreground">Buscar módulos...</span>
                <span className="ml-auto rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 rounded-full px-4">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Novo</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Ações rápidas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {quickActions.map((action) => (
                    <DropdownMenuItem key={action.id} onClick={() => navigate(action.path)} className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      {action.shortcut && <span className="text-[10px] text-muted-foreground">{action.shortcut}</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <NotificationsPanel />

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-2 rounded-full px-2">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left md:block">
                      <p className="text-sm font-medium leading-none">{profile?.nome || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground">{profile?.cargo || 'Administrador'}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/configuracoes?tab=usuarios')}>
                    <User className="mr-2 h-4 w-4" />
                    Meu perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                    {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    Tema {theme === 'dark' ? 'claro' : 'escuro'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async () => {
                      await signOut();
                      navigate('/login');
                    }}
                  >
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
