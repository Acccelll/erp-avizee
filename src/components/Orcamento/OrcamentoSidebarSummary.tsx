import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Save, Eye, FileText, Weight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
  numero: string;
  clienteNome: string;
  qtdItens: number;
  totalProdutos: number;
  freteValor: number;
  valorTotal: number;
  pesoTotal?: number;
  validade?: string;
  isEdit?: boolean;
  onSave: () => void;
  onPreview: () => void;
  onGeneratePdf: () => void;
  saving?: boolean;
}

export function OrcamentoSidebarSummary({
  status, numero, clienteNome, qtdItens,
  totalProdutos, freteValor, valorTotal,
  pesoTotal, validade, isEdit,
  onSave, onPreview, onGeneratePdf, saving
}: Props) {
  const isExpired = validade ? new Date(validade) < new Date(new Date().toDateString()) : false;
  const saveLabel = isEdit && status !== "rascunho" ? "Salvar Alterações" : "Salvar Rascunho";

  return (
    <div className="bg-card rounded-xl border shadow-soft p-5 sticky top-6">
      <h3 className="font-semibold text-foreground mb-4">Resumo do Orçamento</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status</span>
          <StatusBadge status={status} />
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nº Orçamento</span>
          <span className="font-mono font-medium text-primary">{numero || "—"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">Cliente</span>
          <span className="font-medium truncate max-w-[150px] text-right">{clienteNome || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Itens</span>
          <span className="font-mono">{qtdItens}</span>
        </div>
        {(pesoTotal !== undefined && pesoTotal > 0) && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <Weight className="h-3.5 w-3.5" />Peso
            </span>
            <span className="font-mono">{pesoTotal.toFixed(2)} kg</span>
          </div>
        )}
        {validade && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Validade</span>
            <span className={cn("font-mono text-xs", isExpired ? "text-destructive font-semibold" : "text-foreground")}>
              {formatDate(validade)}{isExpired ? " ⚠ Expirado" : ""}
            </span>
          </div>
        )}
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Produtos</span>
            <span className="font-mono">{formatCurrency(totalProdutos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span className="font-mono">{formatCurrency(freteValor)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-semibold text-base">Total Final</span>
            <span className="font-mono font-bold text-xl text-primary">{formatCurrency(valorTotal)}</span>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Button className="w-full gap-2" onClick={onSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : saveLabel}
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={onPreview}>
          <Eye className="w-4 h-4" />
          Visualizar
        </Button>
        <Button variant="secondary" className="w-full gap-2" onClick={onGeneratePdf}>
          <FileText className="w-4 h-4" />
          Gerar PDF
        </Button>
      </div>
    </div>
  );
}
