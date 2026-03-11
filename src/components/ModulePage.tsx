import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ModulePageProps {
  title: string;
  subtitle?: string;
  addLabel?: string;
  onAdd?: () => void;
  children: ReactNode;
  count?: number;
}

export function ModulePage({ title, subtitle, addLabel, onAdd, children, count }: ModulePageProps) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        {addLabel && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
        {count !== undefined && (
          <span className="text-sm text-muted-foreground ml-auto">
            {count} {count === 1 ? "registro" : "registros"}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
