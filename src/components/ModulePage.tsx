import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ModulePageProps {
  title: string;
  subtitle?: string;
  addLabel?: string;
  onAdd?: () => void;
  children: ReactNode;
  count?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  toolbarExtra?: ReactNode;
  showToolbar?: boolean;
}

export function ModulePage({
  title,
  subtitle,
  addLabel,
  onAdd,
  children,
  count,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  toolbarExtra,
  showToolbar,
}: ModulePageProps) {
  const hasSearch = typeof onSearchChange === "function";
  const shouldShowToolbar = showToolbar ?? Boolean(hasSearch || filters || toolbarExtra || count !== undefined);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {addLabel && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {shouldShowToolbar && (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {hasSearch && (
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchValue ?? ""}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                />
              </div>
            )}
            {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            {toolbarExtra}
            {count !== undefined && (
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {count} {count === 1 ? "registro" : "registros"}
              </span>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
