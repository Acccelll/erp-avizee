import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatNumber, formatDate, formatCurrency } from "@/lib/format";
import { Calendar, Package, AlertTriangle, Lock } from "lucide-react";

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
  const { data, loading, create, fetchData } = useSupabaseCrud<Movimento>({
    table: "estoque_movimentos", select: "*, produtos(nome, sku)", hasAtivo: false,
  });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Movimento | null>(null);
  const [form, setForm] = useState({ produto_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
  const [saving, setSaving] = useState(false);
  const [filterTipo, setFilterTipo] = useState("todos");

  // Date filters
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Position by date
  const [dataReferencia, setDataReferencia] = useState(new Date().toISOString().split("T")[0]);
  const [posicaoData, setPosicaoData] = useState<PosicaoEstoque[]>([]);
  const [loadingPosicao, setLoadingPosicao] = useState(false);

  // Low stock
  const [abaixoMinimo, setAbaixoMinimo] = useState<any[]>([]);

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

  // Filter by date range and type
  const filteredData = data.filter(m => {
    if (filterTipo !== "todos" && m.tipo !== filterTipo) return false;
    if (dataInicio && m.created_at < dataInicio) return false;
    if (dataFim && m.created_at > dataFim + "T23:59:59") return false;
    return true;
  });

  // Load stock position at reference date
  const loadPosicao = useCallback(async () => {
    setLoadingPosicao(true);
    try {
      // Get all products
      const { data: produtos } = await (supabase as any).from("produtos")
        .select("id, nome, sku, estoque_atual, estoque_minimo")
        .eq("ativo", true).order("nome");

      // Get all movements up to the reference date
      const refEnd = dataReferencia + "T23:59:59.999Z";
      const { data: movimentos } = await (supabase as any).from("estoque_movimentos")
        .select("produto_id, tipo, quantidade")
        .lte("created_at", refEnd)
        .order("created_at");

      // Calculate balance per product at the reference date
      const saldoMap: Record<string, number> = {};
      (movimentos || []).forEach((m: any) => {
        if (!saldoMap[m.produto_id]) saldoMap[m.produto_id] = 0;
        if (m.tipo === "entrada") saldoMap[m.produto_id] += Number(m.quantidade);
        else if (m.tipo === "saida") saldoMap[m.produto_id] -= Number(m.quantidade);
        else if (m.tipo === "ajuste") {
          // For adjustments, use the last saldo_atual
        }
      });

      // For adjustments, get the last movement's saldo_atual per product
      const { data: lastAjustes } = await (supabase as any).from("estoque_movimentos")
        .select("produto_id, saldo_atual, created_at")
        .eq("tipo", "ajuste")
        .lte("created_at", refEnd)
        .order("created_at", { ascending: false });

      // Build position - use last known saldo_atual from movements
      const posicao: PosicaoEstoque[] = (produtos || []).map((p: any) => {
        // Get last movement for this product before ref date
        const prodMovs = (movimentos || []).filter((m: any) => m.produto_id === p.id);
        // Simple approach: replay movements
        let saldo = 0;
        // Check if there are any movements
        const allMovs = data.filter(m => m.produto_id === p.id && m.created_at <= refEnd)
          .sort((a, b) => a.created_at.localeCompare(b.created_at));

        if (allMovs.length > 0) {
          saldo = allMovs[allMovs.length - 1].saldo_atual;
        }

        return {
          produto_id: p.id,
          nome: p.nome,
          sku: p.sku || "",
          estoque_atual: p.estoque_atual || 0,
          estoque_minimo: p.estoque_minimo || 0,
          saldo_na_data: saldo,
        };
      }).filter((p: PosicaoEstoque) => p.saldo_na_data !== 0 || p.estoque_atual !== 0);

      setPosicaoData(posicao);
    } catch (err) {
      console.error(err);
    }
    setLoadingPosicao(false);
  }, [dataReferencia, data]);

  // Load low stock products
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
      <StatusBadge status={m.tipo === "entrada" ? "Confirmado" : m.tipo === "saida" ? "Cancelado" : "Pendente"} />
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
      return <span className={`font-mono ${diff > 0 ? "text-green-600" : diff < 0 ? "text-destructive" : ""}`}>{diff > 0 ? "+" : ""}{formatNumber(diff)}</span>;
    }},
    { key: "status", label: "Status", render: (p: PosicaoEstoque) => (
      p.estoque_minimo > 0 && p.saldo_na_data <= p.estoque_minimo
        ? <span className="text-destructive text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Abaixo mín.</span>
        : <span className="text-xs text-muted-foreground">OK</span>
    )},
  ];

  return (
    <AppLayout>
      <ModulePage title="Estoque" subtitle="Movimentações e rastreabilidade" addLabel="Nova Movimentação" onAdd={() => setModalOpen(true)} count={filteredData.length}>

        {/* Alert: Low Stock */}
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

        <Tabs defaultValue="movimentacoes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="posicao">Posição por Data</TabsTrigger>
          </TabsList>

          <TabsContent value="movimentacoes" className="space-y-4">
            {/* Type + Date Filters */}
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
