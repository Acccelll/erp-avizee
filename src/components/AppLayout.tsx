import { ReactNode, useEffect, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './navigation/AppHeader';
import { MobileBottomNav } from './navigation/MobileBottomNav';
import { MobileMenu } from './navigation/MobileMenu';
import { MobileQuickActions } from './navigation/MobileQuickActions';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
}

const COLLAPSED_KEY = 'erp-avizee-sidebar-collapsed';

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchRequested, setSearchRequested] = useState(0);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          mobileOpen={false}
          onCloseMobile={() => undefined}
          onOpenSearch={() => setSearchRequested((value) => value + 1)}
        />
      </div>

      <div className={`min-h-screen transition-all duration-200 ${collapsed ? 'md:ml-[72px]' : 'md:ml-[240px]'}`}>
        <AppHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} searchRequest={searchRequested} />
        <main className="mx-auto max-w-[1600px] px-3 py-4 pb-28 md:px-6 md:py-6 md:pb-6">{children}</main>
      </div>

      <MobileMenu
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        onOpenSearch={() => setSearchRequested((value) => value + 1)}
      />
      <MobileQuickActions />
      <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
    </div>
  );
}
