import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Save, Eye, FileText } from "lucide-react";

interface Props {
  status: string;
  numero: string;
  clienteNome: string;
  qtdItens: number;
  totalProdutos: number;
  freteValor: number;
  valorTotal: number;
  onSave: () => void;
  onPreview: () => void;
  onGeneratePdf: () => void;
  saving?: boolean;
}

export function OrcamentoSidebarSummary({
  status, numero, clienteNome, qtdItens,
  totalProdutos, freteValor, valorTotal,
  onSave, onPreview, onGeneratePdf, saving
}: Props) {
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
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium truncate max-w-[140px]">{clienteNome || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Itens</span>
          <span className="font-mono">{qtdItens}</span>
        </div>
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Produtos</span>
            <span className="font-mono">R$ {totalProdutos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span className="font-mono">R$ {freteValor.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="font-semibold">Valor Total</span>
            <span className="font-mono font-bold text-lg text-primary">R$ {valorTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Button className="w-full gap-2" onClick={onSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Orçamento"}
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
