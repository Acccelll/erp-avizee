import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Search } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { flatNavItems, quickActions } from '@/lib/navigation';

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

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar módulos e atalhos..." value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
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
        <CommandSeparator />
        <CommandGroup heading="Módulos e páginas">
          {filteredNavigation.map((item) => (
            <CommandItem key={`${item.id}-${item.path}`} onSelect={() => handleSelect(item.path)}>
              <FolderKanban className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.subtitle}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
