import { Badge } from "@/components/ui/badge";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({ columns, data, onRowClick }: DataTableProps<T>) {
  return (
    <div className="data-table">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(item)}
              className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm">
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                Nenhum registro encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ativo: "bg-success/10 text-success border-success/20",
    inativo: "bg-muted text-muted-foreground border-muted",
    pendente: "bg-warning/10 text-warning border-warning/20",
    confirmado: "bg-success/10 text-success border-success/20",
    cancelado: "bg-destructive/10 text-destructive border-destructive/20",
    rascunho: "bg-info/10 text-info border-info/20",
    pago: "bg-success/10 text-success border-success/20",
    aberto: "bg-warning/10 text-warning border-warning/20",
    vencido: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium ${variants[status.toLowerCase()] || ""}`}>
      {status}
    </Badge>
  );
}
