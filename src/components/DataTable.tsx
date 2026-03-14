import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Copy } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const hasActions = onView || onEdit || onDelete || onDuplicate;

  return (
    <>
      <div className="data-table">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th key={col.key} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Carregando...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick?.(item)}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {onView && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onView(item); }}>
                                <Eye className="w-4 h-4 text-info" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>
                        )}
                        {onEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                                <Edit className="w-4 h-4 text-success" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        )}
                        {onDuplicate && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDuplicate(item); }}>
                                <Copy className="w-4 h-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicar</TooltipContent>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => {
          if (deleteItem) {
            onDelete?.(deleteItem);
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
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium ${variants[status?.toLowerCase()] || ""}`}>
      {label || status}
    </Badge>
  );
}
