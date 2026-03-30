import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Users, Warehouse, FileText, DollarSign, Package } from "lucide-react";
import { ImportacaoLote } from "./ImportacaoLotesTable";

interface ReconciliacaoIndicadoresProps {
  lotes: ImportacaoLote[];
}

export function ReconciliacaoIndicadores({ lotes }: ReconciliacaoIndicadoresProps) {
  const stats = lotes.reduce((acc, lote) => {
    const type = lote.tipo_importacao;
    if (!acc[type]) acc[type] = { count: 0, imported: 0, errors: 0 };
    acc[type].count++;
    acc[type].imported += lote.total_importados || 0;
    acc[type].errors += lote.total_erros || 0;
    return acc;
  }, {} as Record<string, any>);

  const cards = [
    { title: "Cadastros", type: ["produtos", "clientes", "fornecedores"], icon: Users, color: "text-blue-600" },
    { title: "Estoque", type: ["estoque_inicial"], icon: Warehouse, color: "text-orange-600" },
    { title: "Faturamento", type: ["faturamento"], icon: FileText, color: "text-purple-600" },
    { title: "Financeiro", type: ["financeiro_aberto"], icon: DollarSign, color: "text-emerald-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const typeStats = card.type.reduce((acc, t) => {
          const s = stats[t] || { imported: 0, errors: 0 };
          return { imported: acc.imported + s.imported, errors: acc.errors + s.errors };
        }, { imported: 0, errors: 0 });

        return (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(typeStats.imported)}</div>
              <p className="text-xs text-muted-foreground">
                {typeStats.errors > 0 ? (
                  <span className="text-rose-500 font-medium">{typeStats.errors} inconsistências</span>
                ) : (
                  "Sem erros detectados"
                )}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
