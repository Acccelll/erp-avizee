import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, FileText, XCircle, AlertCircle } from "lucide-react";

interface ImportacaoResumoCardsProps {
  totalBatches: number;
  totalErrors: number;
  totalProcessed: number;
  totalPending: number;
}

export function ImportacaoResumoCards({ totalBatches, totalErrors, totalProcessed, totalPending }: ImportacaoResumoCardsProps) {
  const cards = [
    {
      title: "Total de Lotes",
      value: totalBatches,
      description: "Lotes registrados no sistema",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Concluídos",
      value: totalProcessed,
      description: "Lotes importados com sucesso",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      title: "Erros",
      value: totalErrors,
      description: "Registros com falhas críticas",
      icon: XCircle,
      color: "text-rose-500",
      bg: "bg-rose-50"
    },
    {
      title: "Pendentes/Validando",
      value: totalPending,
      description: "Lotes aguardando conferência",
      icon: AlertCircle,
      color: "text-amber-500",
      bg: "bg-amber-50"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card key={i} className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-1.5 rounded-md ${card.bg}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
