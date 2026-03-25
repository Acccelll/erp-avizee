import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { flatNavItems, navSections, quickActions } from '@/lib/navigation';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const navigationResults = useMemo(
    () =>
      flatNavItems.map((item) => ({
        id: item.path,
        title: item.title,
        section: item.section || 'Dashboard',
        subtitle: item.section ? `${item.section} · ${item.subgroup}` : 'Navegação',
        path: item.path,
        keywords: item.keywords || [],
      })),
    [],
  );

  const filteredNavigation = useMemo(() => {
    if (!search.trim()) return navigationResults;
    const term = search.toLowerCase();
    return navigationResults.filter((item) => {
      const haystack = [item.title, item.subtitle, ...(item.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [navigationResults, search]);

  const filteredActions = useMemo(() => {
    if (!search.trim()) return quickActions;
    const term = search.toLowerCase();
    return quickActions.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(term));
  }, [search]);

  const groupedNavigation = useMemo(() => {
    const groups: Record<string, typeof filteredNavigation> = {};
    for (const item of filteredNavigation) {
      const key = item.section;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [filteredNavigation]);

  const sectionMeta = useMemo(() => {
    const map: Record<string, { icon: React.ComponentType<{ className?: string }> }> = {
      Dashboard: { icon: LayoutDashboard },
    };
    for (const s of navSections) {
      map[s.title] = { icon: s.icon };
    }
    return map;
  }, []);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar módulos e atalhos..." value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {filteredActions.length > 0 && (
          <CommandGroup heading="Atalhos rápidos">
            {filteredActions.map((item) => (
              <CommandItem key={item.id} onSelect={() => handleSelect(item.path)}>
                <Search className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </div>
                {item.shortcut && <span className="ml-auto text-[10px] text-muted-foreground">{item.shortcut}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {Object.entries(groupedNavigation).map(([sectionName, items], idx) => {
          const Icon = sectionMeta[sectionName]?.icon;
          return (
            <div key={sectionName}>
              {idx > 0 || filteredActions.length > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={sectionName}>
                {items.map((item) => (
                  <CommandItem key={`${item.id}-${item.path}`} onSelect={() => handleSelect(item.path)}>
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
