import { useState, useMemo, useCallback } from 'react';
import { Eye, Edit, Trash2, Copy, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, PackageOpen, Columns3 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  hidden?: boolean;
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
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Show column visibility toggle */
  showColumnToggle?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  loading,
  pageSize = 25,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Tente ajustar os filtros ou adicione um novo registro.",
  showColumnToggle = false,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const [deleteItem, setDeleteItem] = useState<T | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.hidden).map((c) => c.key)),
  );
  const hasActions = !!onView;
  const visibleColumns = columns.filter((c) => !hiddenKeys.has(c.key));
  const primaryColumn = visibleColumns[0];
  const secondaryColumns = visibleColumns.slice(1);

  const toggleColumnVisibility = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(0);
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal), 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const pagedData = sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const toggleSelect = useCallback((id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }, [selectedIds, onSelectionChange]);

  const toggleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    const pageIds = pagedData.map((item) => item.id).filter(Boolean);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    onSelectionChange(allSelected ? selectedIds.filter((id) => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])]);
  }, [pagedData, selectedIds, onSelectionChange]);

  const renderActions = (item: T) => (
    <div className="flex items-center gap-1 flex-nowrap">
      {onView && (
        <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onView(item); }}>
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipTrigger><TooltipContent>Visualizar</TooltipContent></Tooltip>
      )}
    </div>
  );

  const handleDoubleClick = (item: T) => {
    if (onView) onView(item);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
  };

  const renderSkeleton = () => (
    <div className="p-4 space-y-3">
      <span className="sr-only">Carregando...</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {visibleColumns.map((col) => (
            <Skeleton key={col.key} className="h-5 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <PackageOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{emptyTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{emptyDescription}</p>
    </div>
  );

  const renderPagination = () => {
    if (sortedData.length <= pageSize) return null;
    return (
      <div className="flex items-center justify-between border-t px-4 py-3">
        <span className="text-xs text-muted-foreground">
          {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedData.length)} de {sortedData.length}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {showColumnToggle && !isMobile && (
        <div className="flex justify-end mb-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Columns3 className="h-3.5 w-3.5" />
                Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 p-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Colunas visíveis</p>
              <div className="space-y-1">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={!hiddenKeys.has(col.key)}
                      onCheckedChange={() => toggleColumnVisibility(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
        {loading ? renderSkeleton() : data.length === 0 ? renderEmpty() : isMobile ? (
          <>
            <div className="space-y-3 p-3">
              {pagedData.map((item, idx) => (
                <div
                  key={item.id || idx}
                  role={onView || onRowClick ? "button" : undefined}
                  tabIndex={onView || onRowClick ? 0 : -1}
                  onClick={() => onView ? onView(item) : onRowClick?.(item)}
                  onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && (onView || onRowClick)) { event.preventDefault(); onView ? onView(item) : onRowClick?.(item); } }}
                  className="w-full rounded-xl border bg-background p-4 text-left shadow-sm transition hover:border-primary/30 hover:bg-accent/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{primaryColumn.label}</p>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {primaryColumn.render ? primaryColumn.render(item) : item[primaryColumn.key]}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {secondaryColumns.map((col) => (
                      <div key={col.key} className="flex items-start justify-between gap-3 rounded-lg bg-accent/40 px-3 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</span>
                        <div className="max-w-[60%] text-right text-sm text-foreground">
                          {col.render ? col.render(item) : item[col.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {renderPagination()}
          </>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {hasActions && (
                      <th className="w-12 px-2 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
                    )}
                    {selectable && (
                      <th className="w-10 px-3 py-3">
                        <Checkbox
                          checked={pagedData.length > 0 && pagedData.every((item) => selectedIds.includes(item.id))}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                    )}
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                          col.sortable !== false && "cursor-pointer select-none hover:text-foreground transition-colors"
                        )}
                        onClick={() => col.sortable !== false && handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.label}
                          {col.sortable !== false && <SortIcon colKey={col.key} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedData.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      onClick={() => onRowClick?.(item)}
                      onDoubleClick={() => handleDoubleClick(item)}
                      className={cn(
                        "border-b transition-colors last:border-b-0 hover:bg-muted/30",
                        (onRowClick || onView) && "cursor-pointer",
                        selectable && selectedIds.includes(item.id) && "bg-primary/5"
                      )}
                    >
                      {hasActions && <td className="w-12 px-2 py-3">{renderActions(item)}</td>}
                      {selectable && (
                        <td className="w-10 px-3 py-3">
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-sm whitespace-nowrap">{col.render ? col.render(item) : item[col.key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Excluir registro"
        description="Esta ação não pode ser desfeita. Tem certeza que deseja continuar?"
        onConfirm={() => { if (deleteItem && onDelete) { onDelete(deleteItem); setDeleteItem(null); } }}
      />
    </>
  );
}

// Re-export StatusBadge from its dedicated module for backward compatibility
export { StatusBadge } from '@/components/StatusBadge';

