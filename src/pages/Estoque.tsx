import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryCard } from "@/components/SummaryCard";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
import { Card, CardContent } from "@/components/ui/card";
import { AdvancedFilterBar } from "@/components/AdvancedFilterBar";
import type { FilterChip } from "@/components/AdvancedFilterBar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatNumber, formatCurrency } from "@/lib/format";
import { AlertTriangle, ArrowUpCircle, ArrowDownCircle, RotateCcw, TrendingDown, Package } from "lucide-react";

interface Movimento {
  id: string; produto_id: string; tipo: string; quantidade: number;
  saldo_anterior: number; saldo_atual: number; motivo: string;
  documento_tipo: string; documento_id: string; created_at: string;
  produtos?: { nome: string; sku: string };
}

interface ProdutoPosicao {
  id: string; nome: string; sku: string; codigo_interno: string;
  unidade_medida: string; estoque_atual: number; estoque_minimo: number;
  preco_venda: number;
}

const Estoque = () => {
  const { data, loading, create } = useSupabaseCrud<Movimento>({
    table: "estoque_movimentos", select: "*, produtos(nome, sku)", hasAtivo: false,
  });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Movimento | null>(null);
  const [form, setForm] = useState({ produto_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
  const [saving, setSaving] = useState(false);
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [searchPosicao, setSearchPosicao] = useState("");

  // Produtos abaixo do mínimo
  const abaixoMinimo = useMemo(() =>
    produtosCrud.data.filter((p: any) => p.ativo && p.estoque_minimo > 0 && Number(p.estoque_atual || 0) <= Number(p.estoque_minimo)),
    [produtosCrud.data]
  );

  // KPIs
  const kpis = useMemo(() => {
    const entradas = data.filter(m => m.tipo === "entrada");
    const saidas = data.filter(m => m.tipo === "saida");
    const ajustes = data.filter(m => m.tipo === "ajuste");
    return {
      totalEntradas: entradas.reduce((s, m) => s + Number(m.quantidade), 0),
      totalSaidas: saidas.reduce((s, m) => s + Number(m.quantidade), 0),
      totalAjustes: ajustes.length,
      abaixoMinimo: abaixoMinimo.length,
    };
  }, [data, abaixoMinimo]);

  // Posição atual
  const posicaoAtual = useMemo(() => {
    const items = produtosCrud.data.filter((p: any) => p.ativo) as ProdutoPosicao[];
    if (!searchPosicao) return items;
    const q = searchPosicao.toLowerCase();
    return items.filter(p =>
      p.nome?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.codigo_interno?.toLowerCase().includes(q)
    );
  }, [produtosCrud.data, searchPosicao]);

  const posicaoKpis = useMemo(() => {
    const items = produtosCrud.data.filter((p: any) => p.ativo);
    const totalItens = items.length;
    const totalEstoque = items.reduce((s: number, p: any) => s + Number(p.estoque_atual || 0), 0);
    const valorEstoque = items.reduce((s: number, p: any) => s + (Number(p.estoque_atual || 0) * Number(p.preco_venda || 0)), 0);
    return { totalItens, totalEstoque, valorEstoque };
  }, [produtosCrud.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.produto_id || !form.quantidade) { toast.error("Produto e quantidade são obrigatórios"); return; }
    setSaving(true);
    try {
      const produto = produtosCrud.data.find((p: any) => p.id === form.produto_id);
      const saldo_anterior = Number(produto?.estoque_atual || 0);
      const qty = form.tipo === "saida" ? -form.quantidade : form.tipo === "ajuste" ? form.quantidade - saldo_anterior : form.quantidade;
      const saldo_atual = form.tipo === "ajuste" ? form.quantidade : saldo_anterior + qty;

      await create({ ...form, quantidade: Math.abs(qty), saldo_anterior, saldo_atual, documento_tipo: "manual" });
      await supabase.from("produtos").update({ estoque_atual: saldo_atual }).eq("id", form.produto_id);
      produtosCrud.fetchData();
      setModalOpen(false);
      setForm({ produto_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
    } catch (err) {
      console.error('[estoque] erro ao salvar:', err);
      toast.error("Erro ao registrar movimentação de estoque");
    }
    setSaving(false);
  };

  const filteredData = data.filter(m => {
    if (tipoFilters.length > 0 && !tipoFilters.includes(m.tipo)) return false;
    if (dataInicio && m.created_at < dataInicio) return false;
    if (dataFim && m.created_at > dataFim + "T23:59:59") return false;
    return true;
  });

  const movActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    tipoFilters.forEach(f => {
      chips.push({
        key: "tipo",
        label: "Tipo",
        value: [f],
        displayValue: f === "entrada" ? "Entrada" : f === "saida" ? "Saída" : "Ajuste"
      });
    });
    return chips;
  }, [tipoFilters]);

  const handleRemoveMovFilter = (key: string, value?: string) => {
    if (key === "tipo") setTipoFilters(prev => prev.filter(v => v !== value));
  };

  const tipoOptions: MultiSelectOption[] = [
    { label: "Entrada", value: "entrada" },
    { label: "Saída", value: "saida" },
    { label: "Ajuste", value: "ajuste" },
  ];

  const origemLabel = (m: Movimento) => {
    if (!m.documento_tipo) return "—";
    const labels: Record<string, string> = { manual: "Manual", fiscal: "Fiscal", compra: "Compra", venda: "Venda", ajuste: "Ajuste", estorno_fiscal: "Estorno" };
    return labels[m.documento_tipo] || m.documento_tipo;
  };

  const movColumns = [
    { key: "produto", label: "Produto", render: (m: Movimento) => (
      <div><span className="font-medium">{(m as any).produtos?.nome || "—"}</span><br/><span className="text-xs text-muted-foreground font-mono">{(m as any).produtos?.sku}</span></div>
    )},
    { key: "tipo", label: "Tipo", render: (m: Movimento) => (
      <StatusBadge status={m.tipo === "entrada" ? "confirmado" : m.tipo === "saida" ? "cancelado" : "pendente"} label={m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Ajuste"} />
    )},
    { key: "quantidade", label: "Qtd", render: (m: Movimento) => (
      <span className={`font-mono font-semibold ${m.tipo === "saida" ? "text-destructive" : "text-success"}`}>{m.tipo === "saida" ? "-" : "+"}{m.quantidade}</span>
    )},
    { key: "saldo_atual", label: "Saldo", render: (m: Movimento) => <span className="font-semibold font-mono">{m.saldo_atual}</span> },
    { key: "origem", label: "Origem", render: origemLabel },
    { key: "motivo", label: "Motivo", render: (m: Movimento) => m.motivo || "—" },
    { key: "created_at", label: "Data", render: (m: Movimento) => new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) },
  ];

  const posColumns = [
    { key: "nome", label: "Produto", render: (p: ProdutoPosicao) => (
      <div><span className="font-medium">{p.nome}</span>{p.sku && <><br/><span className="text-xs text-muted-foreground font-mono">{p.sku}</span></>}</div>
    )},
    { key: "unidade", label: "Unid.", render: (p: ProdutoPosicao) => p.unidade_medida || "UN" },
    { key: "estoque_atual", label: "Saldo", render: (p: ProdutoPosicao) => {
      const baixo = p.estoque_minimo > 0 && Number(p.estoque_atual || 0) <= p.estoque_minimo;
      return <span className={`font-semibold font-mono ${baixo ? "text-destructive" : ""}`}>{formatNumber(Number(p.estoque_atual || 0))}</span>;
    }},
    { key: "estoque_minimo", label: "Mín.", render: (p: ProdutoPosicao) => <span className="font-mono text-muted-foreground">{p.estoque_minimo > 0 ? formatNumber(p.estoque_minimo) : "—"}</span> },
    { key: "preco_venda", label: "Preço Unit.", render: (p: ProdutoPosicao) => <span className="font-mono">{formatCurrency(Number(p.preco_venda || 0))}</span> },
    { key: "valor_estoque", label: "Valor Est.", render: (p: ProdutoPosicao) => <span className="font-mono font-medium">{formatCurrency(Number(p.estoque_atual || 0) * Number(p.preco_venda || 0))}</span> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Estoque" subtitle="Posição atual e histórico de movimentações" addLabel="Nova Movimentação" onAdd={() => setModalOpen(true)} count={undefined}>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Entradas" value={formatNumber(kpis.totalEntradas)} icon={ArrowUpCircle} variationType="positive" variation="total acumulado" />
          <SummaryCard title="Saídas" value={formatNumber(kpis.totalSaidas)} icon={ArrowDownCircle} variationType="negative" variation="total acumulado" />
          <SummaryCard title="Ajustes" value={formatNumber(kpis.totalAjustes)} icon={RotateCcw} variationType="neutral" variation="registros" />
          <SummaryCard title="Abaixo do Mínimo" value={formatNumber(kpis.abaixoMinimo)} icon={TrendingDown} variationType={kpis.abaixoMinimo > 0 ? "negative" : "positive"} variant={kpis.abaixoMinimo > 0 ? "danger" : undefined} variation="produtos" />
        </div>

        {abaixoMinimo.length > 0 && (
          <Card className="mb-4 border-destructive/50 bg-destructive/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-1">
                <AlertTriangle className="w-4 h-4" /> {abaixoMinimo.length} produto(s) abaixo do estoque mínimo
              </div>
              <div className="flex flex-wrap gap-2">
                {abaixoMinimo.slice(0, 8).map((p: any) => (
                  <span key={p.id} className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                    {p.nome} ({p.estoque_atual}/{p.estoque_minimo})
                  </span>
                ))}
                {abaixoMinimo.length > 8 && <span className="text-xs text-muted-foreground">+{abaixoMinimo.length - 8} mais</span>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs: Posição Atual vs Movimentação */}
        <Tabs defaultValue="posicao" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="posicao" className="gap-1.5"><Package className="h-3.5 w-3.5" />Posição Atual</TabsTrigger>
            <TabsTrigger value="movimentacao" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" />Movimentação</TabsTrigger>
          </TabsList>

          <TabsContent value="posicao">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Input
                value={searchPosicao}
                onChange={(e) => setSearchPosicao(e.target.value)}
                placeholder="Buscar produto por nome, SKU ou código..."
                className="sm:max-w-sm"
              />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{posicaoKpis.totalItens} produtos</span>
                <span className="font-mono font-medium">{formatNumber(posicaoKpis.totalEstoque)} unid.</span>
                <span className="font-mono font-semibold text-foreground">{formatCurrency(posicaoKpis.valorEstoque)}</span>
              </div>
            </div>
            <DataTable columns={posColumns} data={posicaoAtual} loading={produtosCrud.loading} />
          </TabsContent>

          <TabsContent value="movimentacao">
            <AdvancedFilterBar
              activeFilters={movActiveFilters}
              onRemoveFilter={handleRemoveMovFilter}
              onClearAll={() => setTipoFilters([])}
              count={filteredData.length}
            >
              <MultiSelect
                options={tipoOptions}
                selected={tipoFilters}
                onChange={setTipoFilters}
                placeholder="Tipos de Movimento"
                className="w-[200px]"
              />
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">De</Label>
                  <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-9 w-36 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Até</Label>
                  <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-9 w-36 text-xs" />
                </div>
                {(dataInicio || dataFim) && (
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => { setDataInicio(""); setDataFim(""); }}>Limpar Datas</Button>
                )}
              </div>
            </AdvancedFilterBar>
            <DataTable columns={movColumns} data={filteredData} loading={loading}
              onView={(m) => { setSelected(m); setDrawerOpen(true); }} />
          </TabsContent>
        </Tabs>

      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Movimentação" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Produto *</Label>
            <Select value={form.produto_id} onValueChange={(v) => setForm({ ...form, produto_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{produtosCrud.data.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.nome} <span className="text-muted-foreground">(Est: {p.estoque_atual})</span></SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                  <SelectItem value="ajuste">Ajuste (definir saldo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{form.tipo === "ajuste" ? "Novo Saldo *" : "Quantidade *"}</Label>
              <Input type="number" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="space-y-2"><Label>Motivo</Label><Textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Motivo da movimentação..." /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Movimentação">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Produto</span><p className="font-medium">{(selected as any).produtos?.nome}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Tipo</span><p className="capitalize">{selected.tipo}</p></div>
              <div><span className="text-xs text-muted-foreground">Origem</span><p>{origemLabel(selected)}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Quantidade</span><p className="font-mono">{selected.quantidade}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Saldo Anterior</span><p className="font-mono">{selected.saldo_anterior}</p></div>
              <div><span className="text-xs text-muted-foreground">Saldo Atual</span><p className="font-semibold font-mono">{selected.saldo_atual}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Motivo</span><p>{selected.motivo || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">Data</span><p>{new Date(selected.created_at).toLocaleString("pt-BR")}</p></div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Estoque;
