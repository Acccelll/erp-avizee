import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { SummaryCard } from "@/components/SummaryCard";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Wallet, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";

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
  const [filterTipo, setFilterTipo] = useState("todos");

  const saldoAtual = data.length > 0 ? Number(data[0].saldo_atual) : 0;

  const kpis = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let entradasHoje = 0, saidasHoje = 0, movHoje = 0;
    data.forEach(m => {
      if (m.created_at.startsWith(today)) {
        movHoje++;
        const positive = ["abertura", "suprimento", "venda"].includes(m.tipo);
        if (positive) entradasHoje += Number(m.valor);
        else saidasHoje += Number(m.valor);
      }
    });
    return { entradasHoje, saidasHoje, movHoje };
  }, [data]);

  const filteredData = useMemo(() => {
    if (filterTipo === "todos") return data;
    return data.filter(m => m.tipo === filterTipo);
  }, [data, filterTipo]);

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
        {positive ? "+" : "-"}{formatCurrency(Number(m.valor))}
      </span>;
    }},
    { key: "saldo_atual", label: "Saldo", render: (m: CaixaMov) => <span className="font-semibold mono">{formatCurrency(Number(m.saldo_atual))}</span> },
    { key: "created_at", label: "Data/Hora", render: (m: CaixaMov) => new Date(m.created_at).toLocaleString("pt-BR") },
  ];

  return (
    <AppLayout>
      <ModulePage title="Caixa" subtitle="Movimentações e controle de caixa" addLabel="Nova Movimentação" onAdd={() => setModalOpen(true)} count={filteredData.length}>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Saldo Atual" value={formatCurrency(saldoAtual)} icon={Wallet} variant={saldoAtual >= 0 ? "success" : "danger"} />
          <SummaryCard title="Entradas Hoje" value={formatCurrency(kpis.entradasHoje)} icon={TrendingUp} variant="success" />
          <SummaryCard title="Saídas Hoje" value={formatCurrency(kpis.saidasHoje)} icon={TrendingDown} variant="danger" />
          <SummaryCard title="Mov. Hoje" value={kpis.movHoje.toString()} icon={ArrowUpDown} variant="info" />
        </div>

        {/* Type filter */}
        <div className="flex gap-1 mb-4">
          {["todos", "abertura", "suprimento", "sangria", "venda", "pagamento", "fechamento"].map(t => (
            <Button key={t} size="sm" variant={filterTipo === t ? "default" : "outline"} onClick={() => setFilterTipo(t)}>
              {t === "todos" ? "Todos" : typeLabels[t] || t}
            </Button>
          ))}
        </div>

        <DataTable columns={columns} data={filteredData} loading={loading}
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
            <div><span className="text-xs text-muted-foreground">Valor</span><p className="font-semibold">{formatCurrency(Number(selected.valor))}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Saldo Anterior</span><p>{formatCurrency(Number(selected.saldo_anterior))}</p></div>
              <div><span className="text-xs text-muted-foreground">Saldo Atual</span><p className="font-semibold">{formatCurrency(Number(selected.saldo_atual))}</p></div>
            </div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Caixa;
