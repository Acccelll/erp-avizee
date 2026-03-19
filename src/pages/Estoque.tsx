import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { SummaryCard } from "@/components/SummaryCard";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatNumber, formatCurrency } from "@/lib/format";
import { Calendar, Package, AlertTriangle, Lock, ArrowUpCircle, ArrowDownCircle, RotateCcw, TrendingDown } from "lucide-react";

interface Movimento {
  id: string; produto_id: string; tipo: string; quantidade: number;
  saldo_anterior: number; saldo_atual: number; motivo: string;
  documento_tipo: string; documento_id: string; created_at: string;
  produtos?: { nome: string; sku: string };
}

interface PosicaoEstoque {
  produto_id: string;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  saldo_na_data: number;
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
  const [filterTipo, setFilterTipo] = useState("todos");
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("view") || "movimentacoes";
  const [activeTab, setActiveTab] = useState(viewParam);

  useEffect(() => {
    if (viewParam !== activeTab) setActiveTab(viewParam);
  }, [activeTab, viewParam]);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().split("T")[0]);
  const [posicaoData, setPosicaoData] = useState<PosicaoEstoque[]>([]);
  const [loadingPosicao, setLoadingPosicao] = useState(false);
  const [abaixoMinimo, setAbaixoMinimo] = useState<any[]>([]);
  const [mesFechamento, setMesFechamento] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [fechamentoData, setFechamentoData] = useState<any[]>([]);
  const [loadingFechamento, setLoadingFechamento] = useState(false);

  // KPI stats
  const kpis = (() => {
    const entradas = data.filter(m => m.tipo === "entrada");
    const saidas = data.filter(m => m.tipo === "saida");
    const ajustes = data.filter(m => m.tipo === "ajuste");
    return {
      totalEntradas: entradas.reduce((s, m) => s + Number(m.quantidade), 0),
      totalSaidas: saidas.reduce((s, m) => s + Number(m.quantidade), 0),
      totalAjustes: ajustes.length,
      abaixoMinimo: abaixoMinimo.length,
    };
  })();

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
      await (supabase as any).from("produtos").update({ estoque_atual: saldo_atual }).eq("id", form.produto_id);
      produtosCrud.fetchData();
      setModalOpen(false);
      setForm({ produto_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
    } catch {}
    setSaving(false);
  };

  const filteredData = data.filter(m => {
    if (filterTipo !== "todos" && m.tipo !== filterTipo) return false;
    if (dataInicio && m.created_at < dataInicio) return false;
    if (dataFim && m.created_at > dataFim + "T23:59:59") return false;
    return true;
  });

  const loadPosicao = useCallback(async () => {
    setLoadingPosicao(true);
    try {
      const { data: produtos } = await (supabase as any).from("produtos")
        .select("id, nome, sku, estoque_atual, estoque_minimo").eq("ativo", true).order("nome");
      const refEnd = dataReferencia + "T23:59:59.999Z";
      const allMovs = data.filter(m => m.created_at <= refEnd).sort((a, b) => a.created_at.localeCompare(b.created_at));

      const posicao: PosicaoEstoque[] = (produtos || []).map((p: any) => {
        const prodMovs = allMovs.filter(m => m.produto_id === p.id);
        const saldo = prodMovs.length > 0 ? prodMovs[prodMovs.length - 1].saldo_atual : 0;
        return {
          produto_id: p.id, nome: p.nome, sku: p.sku || "",
          estoque_atual: p.estoque_atual || 0, estoque_minimo: p.estoque_minimo || 0,
          saldo_na_data: saldo,
        };
      }).filter((p: PosicaoEstoque) => p.saldo_na_data !== 0 || p.estoque_atual !== 0);
      setPosicaoData(posicao);
    } catch (err) { console.error(err); }
    setLoadingPosicao(false);
  }, [dataReferencia, data]);

  useEffect(() => {
    const low = produtosCrud.data.filter((p: any) =>
      p.ativo && p.estoque_minimo > 0 && Number(p.estoque_atual || 0) <= Number(p.estoque_minimo)
    );
    setAbaixoMinimo(low);
  }, [produtosCrud.data]);

  const origemLabel = (m: Movimento) => {
    if (!m.documento_tipo) return "—";
    const labels: Record<string, string> = { manual: "Manual", fiscal: "Fiscal", compra: "Compra", venda: "Venda", ajuste: "Ajuste" };
    return labels[m.documento_tipo] || m.documento_tipo;
  };

  const columns = [
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

  const posicaoColumns = [
    { key: "sku", label: "SKU", render: (p: PosicaoEstoque) => <span className="font-mono text-xs text-primary">{p.sku || "—"}</span> },
    { key: "nome", label: "Produto" },
    { key: "saldo_na_data", label: "Saldo na Data", render: (p: PosicaoEstoque) => <span className="font-mono font-semibold">{formatNumber(p.saldo_na_data)}</span> },
    { key: "estoque_atual", label: "Saldo Atual", render: (p: PosicaoEstoque) => <span className="font-mono">{formatNumber(p.estoque_atual)}</span> },
    { key: "diff", label: "Diferença", render: (p: PosicaoEstoque) => {
      const diff = p.estoque_atual - p.saldo_na_data;
      return <span className={`font-mono ${diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : ""}`}>{diff > 0 ? "+" : ""}{formatNumber(diff)}</span>;
    }},
    { key: "status", label: "Status", render: (p: PosicaoEstoque) => (
      p.estoque_minimo > 0 && p.saldo_na_data <= p.estoque_minimo
        ? <span className="text-destructive text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Abaixo mín.</span>
        : <span className="text-xs text-muted-foreground">OK</span>
    )},
  ];

  const subtitleMap: Record<string, string> = {
    movimentacoes: "Entradas, saídas e ajustes com rastreabilidade por origem.",
    posicao: "Consulta de posição histórica do estoque por data de referência.",
    fechamento: "Fechamento mensal do estoque com visão de quantidade e custo.",
  };

  const displayCount = activeTab === "movimentacoes" ? filteredData.length : activeTab === "posicao" ? posicaoData.length : fechamentoData.length;

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", nextTab);
      return next;
    });
  };

  return (
    <AppLayout>
      <ModulePage title="Estoque" subtitle={subtitleMap[activeTab] || subtitleMap.movimentacoes} addLabel="Nova Movimentação" onAdd={() => setModalOpen(true)} count={displayCount}>

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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="posicao">Posição por Data</TabsTrigger>
            <TabsTrigger value="fechamento">Fechamento Mensal</TabsTrigger>
          </TabsList>

          <TabsContent value="movimentacoes" className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex gap-1">
                {["todos", "entrada", "saida", "ajuste"].map(t => (
                  <Button key={t} size="sm" variant={filterTipo === t ? "default" : "outline"} onClick={() => setFilterTipo(t)} className="capitalize">
                    {t === "todos" ? "Todos" : t === "saida" ? "Saída" : t}
                  </Button>
                ))}
              </div>
              <div className="flex items-end gap-2 ml-auto">
                <div className="space-y-1">
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-8 w-36 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-8 w-36 text-xs" />
                </div>
                {(dataInicio || dataFim) && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setDataInicio(""); setDataFim(""); }}>
                    Limpar
                  </Button>
                )}
              </div>
            </div>
            <DataTable columns={columns} data={filteredData} loading={loading}
              onView={(m) => { setSelected(m); setDrawerOpen(true); }} />
          </TabsContent>

          <TabsContent value="posicao" className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Data de Referência</Label>
                <Input type="date" value={dataReferencia} onChange={e => setDataReferencia(e.target.value)} className="h-9 w-44" />
              </div>
              <Button size="sm" onClick={loadPosicao} disabled={loadingPosicao}>
                {loadingPosicao ? "Consultando..." : "Consultar Posição"}
              </Button>
            </div>
            {posicaoData.length > 0 ? (
              <DataTable columns={posicaoColumns} data={posicaoData} loading={loadingPosicao} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione uma data e clique em "Consultar Posição" para ver o saldo de estoque na data.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="fechamento" className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Lock className="w-3 h-3" /> Mês de Referência</Label>
                <Input type="month" value={mesFechamento} onChange={e => setMesFechamento(e.target.value)} className="h-9 w-44" />
              </div>
              <Button size="sm" onClick={async () => {
                setLoadingFechamento(true);
                try {
                  const [year, month] = mesFechamento.split("-").map(Number);
                  const lastDay = new Date(year, month, 0).getDate();
                  const dataCorte = `${mesFechamento}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;
                  const { data: produtos } = await (supabase as any).from("produtos")
                    .select("id, nome, sku, estoque_atual, estoque_minimo, preco_custo").eq("ativo", true).order("nome");
                  const allMovs = data.filter(m => m.created_at <= dataCorte).sort((a, b) => a.created_at.localeCompare(b.created_at));
                  const result = (produtos || []).map((p: any) => {
                    const prodMovs = allMovs.filter(m => m.produto_id === p.id);
                    const saldo = prodMovs.length > 0 ? prodMovs[prodMovs.length - 1].saldo_atual : 0;
                    const valorUnit = Number(p.preco_custo || 0);
                    return { id: p.id, nome: p.nome, sku: p.sku || "", saldo, valorUnit, valorTotal: saldo * valorUnit, estoque_minimo: p.estoque_minimo || 0 };
                  }).filter((p: any) => p.saldo !== 0 || Number(p.valorUnit) > 0);
                  setFechamentoData(result);
                } catch (err) { console.error(err); }
                setLoadingFechamento(false);
              }} disabled={loadingFechamento}>
                {loadingFechamento ? "Processando..." : "Gerar Fechamento"}
              </Button>
            </div>
            {fechamentoData.length > 0 ? (
              <>
                <div className="bg-accent/50 rounded-lg p-4 flex flex-wrap gap-6">
                  <div>
                    <span className="text-xs text-muted-foreground">Itens</span>
                    <p className="font-bold mono">{formatNumber(fechamentoData.length)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Qtd Total</span>
                    <p className="font-bold mono">{formatNumber(fechamentoData.reduce((s, p) => s + p.saldo, 0))}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Valor Total (custo)</span>
                    <p className="font-bold mono">{formatCurrency(fechamentoData.reduce((s, p) => s + p.valorTotal, 0))}</p>
                  </div>
                </div>
                <DataTable
                  columns={[
                    { key: "sku", label: "SKU", render: (p: any) => <span className="font-mono text-xs text-primary">{p.sku || "—"}</span> },
                    { key: "nome", label: "Produto" },
                    { key: "saldo", label: "Saldo", render: (p: any) => <span className="font-mono font-semibold">{formatNumber(p.saldo)}</span> },
                    { key: "valorUnit", label: "Custo Unit.", render: (p: any) => <span className="font-mono text-sm">{formatCurrency(p.valorUnit)}</span> },
                    { key: "valorTotal", label: "Valor Total", render: (p: any) => <span className="font-mono font-semibold">{formatCurrency(p.valorTotal)}</span> },
                    { key: "status", label: "Status", render: (p: any) => (
                      p.estoque_minimo > 0 && p.saldo <= p.estoque_minimo
                        ? <span className="text-destructive text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Abaixo mín.</span>
                        : <span className="text-xs text-muted-foreground">OK</span>
                    )},
                  ]}
                  data={fechamentoData}
                  loading={loadingFechamento}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Lock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione o mês e clique em "Gerar Fechamento" para obter a posição de estoque no último dia do mês.</p>
                </CardContent>
              </Card>
            )}
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
