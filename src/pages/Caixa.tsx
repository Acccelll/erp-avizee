import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CaixaMov {
  id: string; tipo: string; descricao: string; valor: number;
  saldo_anterior: number; saldo_atual: number; created_at: string;
}

const Caixa = () => {
  const { data, loading, create } = useSupabaseCrud<CaixaMov>({ table: "caixa_movimentos", hasAtivo: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CaixaMov | null>(null);
  const [form, setForm] = useState({ tipo: "suprimento", descricao: "", valor: 0 });
  const [saving, setSaving] = useState(false);

  const saldoAtual = data.length > 0 ? Number(data[0].saldo_atual) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao || !form.valor) { toast.error("Descrição e valor são obrigatórios"); return; }
    setSaving(true);
    try {
      const isPositive = ["abertura", "suprimento", "venda"].includes(form.tipo);
      const saldo_atual = isPositive ? saldoAtual + form.valor : saldoAtual - form.valor;
      await create({ ...form, saldo_anterior: saldoAtual, saldo_atual });
      setModalOpen(false);
      setForm({ tipo: "suprimento", descricao: "", valor: 0 });
    } catch {}
    setSaving(false);
  };

  const typeLabels: Record<string, string> = {
    abertura: "Abertura", suprimento: "Suprimento", sangria: "Sangria",
    fechamento: "Fechamento", venda: "Venda", pagamento: "Pagamento",
  };

  const columns = [
    { key: "tipo", label: "Tipo", render: (m: CaixaMov) => typeLabels[m.tipo] || m.tipo },
    { key: "descricao", label: "Descrição" },
    { key: "valor", label: "Valor", render: (m: CaixaMov) => {
      const positive = ["abertura", "suprimento", "venda"].includes(m.tipo);
      return <span className={positive ? "text-success font-semibold" : "text-destructive font-semibold"}>
        {positive ? "+" : "-"}R$ {Number(m.valor).toFixed(2)}
      </span>;
    }},
    { key: "saldo_atual", label: "Saldo", render: (m: CaixaMov) => <span className="font-semibold">R$ {Number(m.saldo_atual).toFixed(2)}</span> },
    { key: "created_at", label: "Data/Hora", render: (m: CaixaMov) => new Date(m.created_at).toLocaleString("pt-BR") },
  ];

  return (
    <AppLayout>
      <ModulePage title="Caixa" subtitle={`Saldo atual: R$ ${saldoAtual.toFixed(2)}`} addLabel="Nova Movimentação" onAdd={() => setModalOpen(true)} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={(m) => { setSelected(m); setDrawerOpen(true); }} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Movimentação de Caixa" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="abertura">Abertura</SelectItem>
                <SelectItem value="suprimento">Suprimento</SelectItem>
                <SelectItem value="sangria">Sangria</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="pagamento">Pagamento</SelectItem>
                <SelectItem value="fechamento">Fechamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Movimentação">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Tipo</span><p>{typeLabels[selected.tipo]}</p></div>
            <div><span className="text-xs text-muted-foreground">Descrição</span><p className="font-medium">{selected.descricao}</p></div>
            <div><span className="text-xs text-muted-foreground">Valor</span><p className="font-semibold">R$ {Number(selected.valor).toFixed(2)}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Saldo Anterior</span><p>R$ {Number(selected.saldo_anterior).toFixed(2)}</p></div>
              <div><span className="text-xs text-muted-foreground">Saldo Atual</span><p className="font-semibold">R$ {Number(selected.saldo_atual).toFixed(2)}</p></div>
            </div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Caixa;
