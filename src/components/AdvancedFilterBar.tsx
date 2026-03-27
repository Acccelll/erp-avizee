import { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface FilterChip {
  key: string;
  label: string;
  value: string;
  displayValue: string;
}

interface AdvancedFilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  activeFilters?: FilterChip[];
  onRemoveFilter?: (key: string) => void;
  onClearAll?: () => void;
  count?: number;
  extra?: ReactNode;
}

export function AdvancedFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  children,
  activeFilters = [],
  onRemoveFilter,
  onClearAll,
  count,
  extra,
}: AdvancedFilterBarProps) {
  const hasSearch = typeof onSearchChange === "function";
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {hasSearch && (
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 pr-8"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          {extra}
          {count !== undefined && (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {count} {count === 1 ? "registro" : "registros"}
            </span>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Filtros:</span>
          {activeFilters.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="font-medium">{chip.displayValue}</span>
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(chip.key)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {onClearAll && activeFilters.length > 1 && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-xs text-muted-foreground">
              Limpar todos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
