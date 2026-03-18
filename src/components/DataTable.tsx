import { useState } from 'react';
import { Eye, Edit, Trash2, Copy } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onDuplicate?: (item: T) => void;
  loading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  loading,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const hasActions = onView || onEdit || onDelete || onDuplicate;
  const primaryColumn = columns[0];
  const secondaryColumns = columns.slice(1);

  const renderActions = (item: T) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {onView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onView(item); }}>
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Visualizar</TooltipContent>
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Editar</TooltipContent>
        </Tooltip>
      )}
      {onDuplicate && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDuplicate(item); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicar</TooltipContent>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Excluir</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  return (
    <>
      <div className="data-table">
        {loading ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Carregando...
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">Nenhum registro encontrado</div>
        ) : isMobile ? (
          <div className="space-y-3 p-3">
            {data.map((item, idx) => (
              <div
                key={item.id || idx}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : -1}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && onRowClick) { event.preventDefault(); onRowClick(item); } }}
                className="w-full rounded-2xl border bg-background p-4 text-left shadow-sm transition hover:border-primary/30 hover:bg-accent/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{primaryColumn.label}</p>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {primaryColumn.render ? primaryColumn.render(item) : item[primaryColumn.key]}
                    </div>
                  </div>
                  {hasActions && <div className="shrink-0">{renderActions(item)}</div>}
                </div>

                <div className="mt-3 space-y-2">
                  {secondaryColumns.map((col) => (
                    <div key={col.key} className="flex items-start justify-between gap-3 rounded-xl bg-accent/40 px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{col.label}</span>
                      <div className={cn('max-w-[60%] text-right text-sm text-foreground', col.key.toLowerCase().includes('status') && 'font-medium')}>
                        {col.render ? col.render(item) : item[col.key]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {col.label}
                  </th>
                ))}
                {hasActions && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick?.(item)}
                  className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  {hasActions && <td className="px-4 py-3 text-right">{renderActions(item)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Excluir registro"
        description="Esta ação não pode ser desfeita. Tem certeza que deseja continuar?"
        onConfirm={() => {
          if (deleteItem && onDelete) {
            onDelete(deleteItem);
            setDeleteItem(null);
          }
        }}
      />
    </>
  );
}


export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const variants: Record<string, string> = {
    ativo: "bg-success/10 text-success border-success/20",
    inativo: "bg-muted text-muted-foreground border-muted",
    pendente: "bg-warning/10 text-warning border-warning/20",
    confirmado: "bg-success/10 text-success border-success/20",
    confirmada: "bg-success/10 text-success border-success/20",
    aprovado: "bg-info/10 text-info border-info/20",
    aprovada: "bg-info/10 text-info border-info/20",
    convertido: "bg-primary/10 text-primary border-primary/20",
    em_separacao: "bg-warning/10 text-warning border-warning/20",
    cancelado: "bg-destructive/10 text-destructive border-destructive/20",
    cancelada: "bg-destructive/10 text-destructive border-destructive/20",
    rascunho: "bg-muted text-muted-foreground border-muted",
    pago: "bg-success/10 text-success border-success/20",
    aberto: "bg-warning/10 text-warning border-warning/20",
    vencido: "bg-destructive/10 text-destructive border-destructive/20",
    faturado: "bg-primary/10 text-primary border-primary/20",
    entregue: "bg-success/10 text-success border-success/20",
    simples: "bg-muted text-muted-foreground border-muted",
    composto: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium ${variants[status?.toLowerCase()] || ''}`}>
      {label || status}
    </Badge>
  );
}
