import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TotaisForm {
  valor_total: number;
  desconto: number;
  imposto_st: number;
  imposto_ipi: number;
  frete_valor: number;
  outras_despesas: number;
}

interface Props {
  totalProdutos: number;
  form: TotaisForm;
  onChange: (field: string, value: number) => void;
}

export function OrcamentoTotaisCard({ totalProdutos, form, onChange }: Props) {
  const valorTotal = totalProdutos - form.desconto + form.imposto_st + form.imposto_ipi + form.frete_valor + form.outras_despesas;

  return (
    <div className="bg-card rounded-xl border shadow-soft p-5">
      <h3 className="font-semibold text-foreground mb-4">Totais</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Total Produtos</Label>
          <div className="h-10 flex items-center px-3 bg-accent/30 rounded-md font-mono text-sm font-semibold">
            R$ {totalProdutos.toFixed(2)}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">(-) Desconto</Label>
          <Input type="number" step="0.01" className="font-mono text-sm" value={form.desconto || ""} onChange={(e) => onChange("desconto", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">(+) Imposto S.T.</Label>
          <Input type="number" step="0.01" className="font-mono text-sm" value={form.imposto_st || ""} onChange={(e) => onChange("imposto_st", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">(+) Imposto IPI</Label>
          <Input type="number" step="0.01" className="font-mono text-sm" value={form.imposto_ipi || ""} onChange={(e) => onChange("imposto_ipi", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">(+) Frete</Label>
          <Input type="number" step="0.01" className="font-mono text-sm" value={form.frete_valor || ""} onChange={(e) => onChange("frete_valor", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">(+) Outras Despesas</Label>
          <Input type="number" step="0.01" className="font-mono text-sm" value={form.outras_despesas || ""} onChange={(e) => onChange("outras_despesas", Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Valor Total</span>
        <span className="text-xl font-bold font-mono text-primary">R$ {valorTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
