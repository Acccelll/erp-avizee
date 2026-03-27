import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { AdvancedFilterBar, type FilterChip } from "@/components/AdvancedFilterBar";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Copy } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Package, TrendingUp, AlertTriangle, Archive, FileText, History } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { FiscalAutocomplete } from "@/components/ui/FiscalAutocomplete";
import { cfopCodes, cstIcmsCodes } from "@/lib/fiscalData";

interface Produto {
  id: string;sku: string;codigo_interno: string;nome: string;descricao: string;
  grupo_id: string;unidade_medida: string;preco_custo: number;preco_venda: number;
  estoque_atual: number;estoque_minimo: number;ncm: string;cst: string;cfop_padrao: string;
  peso: number;eh_composto: boolean;ativo: boolean;created_at: string;
}

interface ComposicaoItem {
  id?: string;
  produto_filho_id: string;
  quantidade: number;
  ordem: number;
  nome?: string;
  sku?: string;
  preco_custo?: number;
}

const emptyProduto: Record<string, any> = {
  nome: "", sku: "", codigo_interno: "", descricao: "", unidade_medida: "UN",
  preco_custo: 0, preco_venda: 0, estoque_minimo: 0, ncm: "", cst: "", cfop_padrao: "", peso: 0, eh_composto: false
};

const Produtos = () => {
  const { data, loading, create, update, remove, duplicate } = useSupabaseCrud<Produto>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Produto | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyProduto);
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [composicao, setComposicao] = useState<ComposicaoItem[]>([]);
  const [editComposicao, setEditComposicao] = useState<ComposicaoItem[]>([]);
  const [margemLucro, setMargemLucro] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "simples" | "composto">("todos");
  const [estoqueFilter, setEstoqueFilter] = useState<"todos" | "baixo" | "ok">("todos");
  const [grupoFilter, setGrupoFilter] = useState<string>("todos");
  const [grupos, setGrupos] = useState<{id: string; nome: string}[]>([]);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [fornecedoresProd, setFornecedoresProd] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("grupos_produto").select("id, nome").eq("ativo", true).order("nome").then(({ data: g }) => {
      if (g) setGrupos(g);
    });
  }, []);

  const produtosDisponiveis = data.filter((p) => !selected || p.id !== selected.id);

  const custoComposto = editComposicao.reduce((s, c) => {
    const prod = data.find((p) => p.id === c.produto_filho_id);
    return s + c.quantidade * (prod?.preco_custo || 0);
  }, 0);

  const precoSugerido = custoComposto * (1 + margemLucro / 100);
  const custoCompostoView = composicao.reduce((s, c) => s + c.quantidade * (c.preco_custo || 0), 0);

  const openCreate = () => {
    setMode("create");setForm({ ...emptyProduto });setSelected(null);
    setEditComposicao([]);setMargemLucro(30);setModalOpen(true);
  };

  const openEdit = async (p: Produto) => {
    setMode("edit");setSelected(p);
    setForm({
      nome: p.nome, sku: p.sku || "", codigo_interno: p.codigo_interno || "", descricao: p.descricao || "",
      unidade_medida: p.unidade_medida, preco_custo: p.preco_custo || 0, preco_venda: p.preco_venda,
      estoque_minimo: p.estoque_minimo || 0, ncm: p.ncm || "", cst: p.cst || "", cfop_padrao: p.cfop_padrao || "",
      peso: p.peso || 0, eh_composto: p.eh_composto || false
    });
    if (p.eh_composto) {
      const { data: comp } = await supabase.from("produto_composicoes").
      select("id, produto_filho_id, quantidade, ordem, produtos:produto_filho_id(nome, sku, preco_custo)").
      eq("produto_pai_id", p.id).order("ordem");
      setEditComposicao((comp || []).map((c: any) => ({
        id: c.id, produto_filho_id: c.produto_filho_id, quantidade: c.quantidade, ordem: c.ordem,
        nome: c.produtos?.nome, sku: c.produtos?.sku, preco_custo: c.produtos?.preco_custo
      })));
    } else {setEditComposicao([]);}
    const custo = p.preco_custo || 0;
    setMargemLucro(custo > 0 ? Math.round((p.preco_venda / custo - 1) * 100) : 30);
    setModalOpen(true);
  };

  const openView = async (p: Produto) => {
    setSelected(p);setDrawerOpen(true);
    const [nfRes, compRes, movRes, fornRes] = await Promise.all([
    supabase.from("notas_fiscais_itens").
    select("quantidade, valor_unitario, notas_fiscais(numero, tipo, data_emissao, fornecedores(nome_razao_social))").
    eq("produto_id", p.id).limit(20),
    p.eh_composto ? supabase.from("produto_composicoes").
    select("quantidade, ordem, produtos:produto_filho_id(nome, sku, preco_custo)").
    eq("produto_pai_id", p.id).order("ordem") : Promise.resolve({ data: [] }),
    supabase.from("estoque_movimentos").
    select("tipo, quantidade, motivo, created_at, saldo_anterior, saldo_atual").
    eq("produto_id", p.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("produtos_fornecedores").
    select("preco_compra, lead_time_dias, referencia_fornecedor, fornecedores:fornecedor_id(nome_razao_social)").
    eq("produto_id", p.id)]
    );
    setHistorico(nfRes.data || []);
    setComposicao((compRes.data || []).map((c: any) => ({
      produto_filho_id: "", quantidade: c.quantidade, ordem: c.ordem,
      nome: c.produtos?.nome, sku: c.produtos?.sku, preco_custo: c.produtos?.preco_custo
    })));
    setMovimentos(movRes.data || []);
    setFornecedoresProd(fornRes.data || []);
  };

  const addComponent = () => {
    setEditComposicao([...editComposicao, { produto_filho_id: "", quantidade: 1, ordem: editComposicao.length + 1 }]);
  };
  const removeComponent = (idx: number) => setEditComposicao(editComposicao.filter((_, i) => i !== idx));
  const updateComponent = (idx: number, field: string, value: any) => {
    const updated = [...editComposicao];
    (updated[idx] as any)[field] = value;
    setEditComposicao(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.preco_venda) {toast.error("Nome e preço de venda são obrigatórios");return;}
    if (form.eh_composto && editComposicao.length === 0) {toast.error("Produto composto precisa de ao menos um componente");return;}
    if (form.eh_composto && editComposicao.some((c) => !c.produto_filho_id)) {toast.error("Selecione o produto para todos os componentes");return;}
    setSaving(true);
    try {
      const payload = { ...form, preco_custo: form.eh_composto ? custoComposto : form.preco_custo };
      let produtoId: string;
      if (mode === "create") {const result = await create(payload);produtoId = (result as any).id;} else
      if (selected) {await update(selected.id, payload);produtoId = selected.id;} else
      {return;}
      if (form.eh_composto) {
        await supabase.from("produto_composicoes").delete().eq("produto_pai_id", produtoId);
        if (editComposicao.length > 0) {
          const rows = editComposicao.map((c, i) => ({ produto_pai_id: produtoId, produto_filho_id: c.produto_filho_id, quantidade: c.quantidade, ordem: i + 1 }));
          const { error } = await supabase.from("produto_composicoes").insert(rows);
          if (error) {console.error('[produtos] composição:', error);toast.error("Erro ao salvar composição. Tente novamente.");}
        }
      }
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const recalcularCusto = async (p: Produto) => {
    if (!p.eh_composto) return;
    const { data: comp } = await supabase.from("produto_composicoes").
    select("quantidade, produtos:produto_filho_id(preco_custo)").
    eq("produto_pai_id", p.id);
    const custo = (comp || []).reduce((s: number, c: any) => s + c.quantidade * (c.produtos?.preco_custo || 0), 0);
    await update(p.id, { preco_custo: custo });
    toast.success(`Custo recalculado: ${formatCurrency(custo)}`);
  };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((p) => {
      const isComposto = Boolean(p.eh_composto);
      const baixoEstoque = Number(p.estoque_minimo || 0) > 0 && Number(p.estoque_atual || 0) <= Number(p.estoque_minimo || 0);
      if (tipoFilter === "composto" && !isComposto) return false;
      if (tipoFilter === "simples" && isComposto) return false;
      if (estoqueFilter === "baixo" && !baixoEstoque) return false;
      if (estoqueFilter === "ok" && baixoEstoque) return false;
      if (grupoFilter !== "todos" && p.grupo_id !== grupoFilter) return false;
      if (!query) return true;
      return [p.nome, p.sku, p.codigo_interno, p.descricao, p.ncm].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, estoqueFilter, searchTerm, tipoFilter, grupoFilter]);

  const columns = [
  { key: "sku", label: "SKU", render: (p: Produto) => <span className="font-mono text-xs font-medium text-primary">{p.sku || "—"}</span> },
  { key: "nome", label: "Nome" },
  { key: "unidade_medida", label: "UN" },
  { key: "estoque_atual", label: "Estoque", render: (p: Produto) =>
    <span className={Number(p.estoque_atual) <= Number(p.estoque_minimo) && Number(p.estoque_minimo) > 0 ? "text-destructive font-semibold" : ""}>{p.estoque_atual}</span>
  },
  { key: "preco_custo", label: "Custo", render: (p: Produto) => <span className="font-mono">{formatCurrency(p.preco_custo || 0)}</span> },
  { key: "preco_venda", label: "Preço Venda", render: (p: Produto) => <span className="font-semibold font-mono">{formatCurrency(p.preco_venda)}</span> },
  { key: "margem", label: "Margem", render: (p: Produto) => {
      const custo = Number(p.preco_custo || 0);
      const venda = Number(p.preco_venda);
      const margem = custo > 0 ? (venda / custo - 1) * 100 : 0;
      return <span className={`font-mono text-xs ${margem > 0 ? "text-success" : margem < 0 ? "text-destructive" : ""}`}>{custo > 0 ? `${margem.toFixed(1)}%` : "—"}</span>;
    } },
  { key: "eh_composto", label: "Tipo", render: (p: Produto) => p.eh_composto ? <StatusBadge status="Composto" /> : <StatusBadge status="Simples" /> }];


  const selectedMargem = selected && (selected.preco_custo || 0) > 0 ? (selected.preco_venda / (selected.preco_custo || 1) - 1) * 100 : 0;

  return (
    <AppLayout>
      <ModulePage title="Produtos" subtitle="Cadastro e gestão de produtos" addLabel="Novo Produto" onAdd={openCreate} count={filteredData.length}
      searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por nome, SKU ou código..."
      filters={<><Select value={tipoFilter} onValueChange={(v: any) => setTipoFilter(v)}><SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="simples">Somente simples</SelectItem><SelectItem value="composto">Somente compostos</SelectItem></SelectContent></Select><Select value={estoqueFilter} onValueChange={(v: any) => setEstoqueFilter(v)}><SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Estoque" /></SelectTrigger><SelectContent><SelectItem value="todos">Todo o estoque</SelectItem><SelectItem value="baixo">Abaixo do mínimo</SelectItem><SelectItem value="ok">Estoque normal</SelectItem></SelectContent></Select><Select value={grupoFilter} onValueChange={setGrupoFilter}><SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Grupo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os grupos</SelectItem>{grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent></Select></>}>
        
        <DataTable columns={columns} data={filteredData} loading={loading}
        onView={openView} />
      </ModulePage>

      {/* Form Modal - same as before */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Produto" : "Editar Produto"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="font-mono" /></div>
            <div className="space-y-2"><Label>Código Interno</Label><Input value={form.codigo_interno} onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })} /></div>
            <div className="space-y-2"><Label>Unidade</Label>
              <Select value={form.unidade_medida} onValueChange={(v) => setForm({ ...form, unidade_medida: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN</SelectItem><SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="MT">MT</SelectItem><SelectItem value="CX">CX</SelectItem>
                  <SelectItem value="PC">PC</SelectItem><SelectItem value="LT">LT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>NCM</Label><Input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} /></div>
            {!form.eh_composto &&
            <div className="space-y-2"><Label>Preço Custo</Label><Input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: Number(e.target.value) })} /></div>
            }
            <div className="space-y-2"><Label>Preço Venda *</Label><Input type="number" step="0.01" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: Number(e.target.value) })} required /></div>
            <div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" step="0.001" value={form.peso} onChange={(e) => setForm({ ...form, peso: Number(e.target.value) })} /></div>
            <div className="space-y-2 flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.eh_composto} onChange={(e) => setForm({ ...form, eh_composto: e.target.checked })} className="rounded" />
                Produto Composto
              </label>
            </div>
          </div>

          {/* Fiscal */}
          <h3 className="font-semibold text-sm pt-2 border-t flex items-center gap-2"><FileText className="w-4 h-4" /> Dados Fiscais</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CST</Label><FiscalAutocomplete data={cstIcmsCodes} value={form.cst} onChange={(v) => setForm({ ...form, cst: v })} placeholder="Ex: 000" /></div>
            <div className="space-y-2"><Label>CFOP Padrão</Label><FiscalAutocomplete data={cfopCodes} value={form.cfop_padrao} onChange={(v) => setForm({ ...form, cfop_padrao: v })} placeholder="Ex: 5102" /></div>
            <div className="space-y-2"><Label>NCM</Label><Input value={form.ncm} onChange={(e) => setForm({ ...form, ncm: e.target.value })} /></div>
          </div>

          <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>

          {form.eh_composto &&
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Composição</h4>
                <Button type="button" size="sm" variant="outline" onClick={addComponent} className="gap-1"><Plus className="w-3 h-3" /> Componente</Button>
              </div>
              {editComposicao.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum componente adicionado</p>}
              {editComposicao.map((comp, idx) => {
              const prod = data.find((p) => p.id === comp.produto_filho_id);
              return (
                <div key={idx} className="grid grid-cols-[1fr_100px_80px_40px] gap-2 items-end">
                    <div className="space-y-1"><Label className="text-xs">Produto</Label>
                      <Select value={comp.produto_filho_id} onValueChange={(v) => updateComponent(idx, "produto_filho_id", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{produtosDisponiveis.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku ? `[${p.sku}] ` : ""}{p.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Qtd</Label><Input type="number" min={0.01} step="0.01" value={comp.quantidade} onChange={(e) => updateComponent(idx, "quantidade", Number(e.target.value))} className="h-9" /></div>
                    <div className="space-y-1"><Label className="text-xs">Custo</Label><p className="h-9 flex items-center text-xs font-mono text-muted-foreground">{prod ? formatCurrency(comp.quantidade * (prod.preco_custo || 0)) : "—"}</p></div>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeComponent(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>);

            })}
              {editComposicao.length > 0 &&
            <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-medium">Custo Total Composto</span><span className="font-mono font-semibold text-primary">{formatCurrency(custoComposto)}</span></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Margem (%)</Label><Input type="number" step="1" value={margemLucro} onChange={(e) => setMargemLucro(Number(e.target.value))} className="h-9" /></div>
                    <div className="space-y-1"><Label className="text-xs">Preço Sugerido</Label><div className="h-9 flex items-center"><span className="font-mono font-semibold text-sm">{formatCurrency(precoSugerido)}</span><Button type="button" size="sm" variant="link" className="ml-2 text-xs h-auto p-0" onClick={() => setForm({ ...form, preco_venda: Number(precoSugerido.toFixed(2)) })}>Usar</Button></div></div>
                  </div>
                </div>
            }
            </div>
          }

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      {/* View Drawer with Tabs */}
      <ViewDrawerV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Produto"
      actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setDrawerOpen(false);openEdit(selected);}}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setDrawerOpen(false);duplicate(selected);}}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Duplicar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {setDrawerOpen(false);remove(selected.id);}}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}>
        
        {selected &&
        <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">{selected.nome}</h3>
                  <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
                </div>
                {selected.sku && (
                  <p className="text-sm text-muted-foreground truncate">{selected.sku}</p>
                )}
                {selected.codigo_interno && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.codigo_interno}</p>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Preço Venda</p>
                <p className="font-mono font-bold text-sm text-foreground">{formatCurrency(selected.preco_venda)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Custo</p>
                <p className="font-mono font-bold text-sm text-foreground">{formatCurrency(selected.preco_custo || 0)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Margem</p>
                <p className={`font-mono font-bold text-sm ${selectedMargem > 0 ? "text-emerald-600 dark:text-emerald-400" : selectedMargem < 0 ? "text-destructive" : "text-foreground"}`}>{(selected.preco_custo || 0) > 0 ? `${selectedMargem.toFixed(1)}%` : "—"}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estoque</p>
                <p className={`font-mono font-bold text-sm ${(selected.estoque_atual || 0) <= (selected.estoque_minimo || 0) ? "text-destructive" : "text-foreground"}`}>{selected.estoque_atual ?? 0} {selected.unidade_medida}</p>
              </div>
            </div>

            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="w-full grid grid-cols-6">
                <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
                <TabsTrigger value="preco" className="text-xs">Preço</TabsTrigger>
                <TabsTrigger value="estoque" className="text-xs">Estoque</TabsTrigger>
                <TabsTrigger value="fiscal" className="text-xs">Fiscal</TabsTrigger>
                <TabsTrigger value="cod_fornecedor" className="text-xs">Cód. Forn.</TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs text-muted-foreground">SKU</span><p className="font-mono">{selected.sku || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Código</span><p className="font-mono">{selected.codigo_interno || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Unidade</span><p>{selected.unidade_medida}</p></div>
                  <div><span className="text-xs text-muted-foreground">Peso</span><p className="font-mono">{selected.peso || 0} kg</p></div>
                </div>
                {selected.descricao && <div><span className="text-xs text-muted-foreground">Descrição</span><p className="text-sm">{selected.descricao}</p></div>}
                {selected.eh_composto && composicao.length > 0 &&
              <div className="border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Composição</h4>
                    <div className="space-y-1">
                      {composicao.map((c, idx) =>
                  <div key={idx} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                          <span>{c.nome} <span className="text-muted-foreground font-mono text-xs">({c.sku})</span></span>
                          <div className="text-right"><span className="font-mono">× {c.quantidade}</span><span className="font-mono text-muted-foreground ml-3">{formatCurrency(c.quantidade * (c.preco_custo || 0))}</span></div>
                        </div>
                  )}
                      <div className="flex justify-between text-sm font-semibold pt-2"><span>Custo Composto</span><span className="font-mono text-primary">{formatCurrency(custoCompostoView)}</span></div>
                    </div>
                  </div>
              }
                {fornecedoresProd.length > 0 &&
              <div className="border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2">Fornecedores</h4>
                    {fornecedoresProd.map((f: any, idx: number) =>
                <div key={idx} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                        <span>{f.fornecedores?.nome_razao_social || "—"}</span>
                        <div className="text-right text-xs">
                          {f.preco_compra && <span className="font-mono">{formatCurrency(f.preco_compra)}</span>}
                          {f.lead_time_dias && <span className="text-muted-foreground ml-2">{f.lead_time_dias}d</span>}
                        </div>
                      </div>
                )}
                  </div>
              }
              </TabsContent>

              <TabsContent value="preco" className="space-y-3 mt-3">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><span className="text-xs text-muted-foreground block">Custo</span><p className="font-mono font-medium text-lg">{formatCurrency(selected.preco_custo || 0)}</p></div>
                    <div><span className="text-xs text-muted-foreground block">Margem</span><p className={`font-mono font-semibold text-lg ${selectedMargem > 0 ? "text-success" : selectedMargem < 0 ? "text-destructive" : ""}`}>{(selected.preco_custo || 0) > 0 ? `${selectedMargem.toFixed(1)}%` : "—"}</p></div>
                    <div><span className="text-xs text-muted-foreground block">Venda</span><p className="font-mono font-semibold text-lg text-primary">{formatCurrency(selected.preco_venda)}</p></div>
                  </div>
                  {(selected.preco_custo || 0) > 0 &&
                <div className="text-center border-t pt-2">
                      <span className="text-xs text-muted-foreground">Lucro Bruto</span>
                      <p className="font-mono font-semibold">{formatCurrency(selected.preco_venda - (selected.preco_custo || 0))}</p>
                    </div>
                }
                </div>
                {selected.eh_composto &&
              <Button size="sm" variant="outline" className="gap-1 w-full" onClick={() => recalcularCusto(selected)}>
                    <RefreshCw className="w-3 h-3" /> Recalcular Custo da Composição
                  </Button>
              }
              </TabsContent>

              <TabsContent value="estoque" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Estoque Atual</p>
                    <p className={`text-2xl font-bold font-mono ${Number(selected.estoque_atual) <= Number(selected.estoque_minimo) && Number(selected.estoque_minimo) > 0 ? "text-destructive" : ""}`}>{selected.estoque_atual ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Estoque Mínimo</p>
                    <p className="text-2xl font-bold font-mono">{selected.estoque_minimo ?? 0}</p>
                  </div>
                </div>
                {Number(selected.estoque_atual) <= Number(selected.estoque_minimo) && Number(selected.estoque_minimo) > 0 &&
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4" /> Estoque abaixo do mínimo!
                  </div>
              }
                {movimentos.length > 0 &&
              <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Archive className="w-4 h-4" /> Últimas Movimentações</h4>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {movimentos.map((m: any, idx: number) =>
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${m.tipo === 'entrada' ? 'bg-success/10 text-success' : m.tipo === 'saida' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                              {m.tipo === 'entrada' ? '↑' : m.tipo === 'saida' ? '↓' : '↔'} {m.quantidade}
                            </span>
                            <span className="text-muted-foreground text-xs">{m.motivo || m.tipo}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(m.created_at)}</span>
                        </div>
                  )}
                    </div>
                  </div>
              }
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-xs text-muted-foreground">NCM</span><p className="font-mono">{selected.ncm || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">CST</span><p className="font-mono">{selected.cst || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">CFOP Padrão</span><p className="font-mono">{selected.cfop_padrao || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Unidade</span><p>{selected.unidade_medida}</p></div>
                </div>
              </TabsContent>

              <TabsContent value="cod_fornecedor" className="space-y-3 mt-3">
                <h4 className="font-semibold text-sm mb-2">Códigos de Fornecedores (De/Para)</h4>
                <p className="text-xs text-muted-foreground mb-3">Referências usadas na importação de XML para vínculo automático de produtos.</p>
                {fornecedoresProd.length === 0 ?
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum fornecedor vinculado</p> :
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Fornecedor</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Ref. Fornecedor</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Preço Compra</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Lead Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fornecedoresProd.map((f: any, idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? "bg-muted/20" : ""}>
                            <td className="px-3 py-2 text-xs">{f.fornecedores?.nome_razao_social || "—"}</td>
                            <td className="px-3 py-2 text-xs font-mono font-medium text-primary">{f.referencia_fornecedor || "—"}</td>
                            <td className="px-3 py-2 text-xs font-mono text-right">{f.preco_compra ? formatCurrency(f.preco_compra) : "—"}</td>
                            <td className="px-3 py-2 text-xs text-right">{f.lead_time_dias ? `${f.lead_time_dias} dias` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              </TabsContent>

              <TabsContent value="historico" className="space-y-3 mt-3">
                {historico.length === 0 ?
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico de notas</p> :

              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {historico.map((h: any, idx: number) =>
                <div key={idx} className="text-sm py-1.5 border-b last:border-b-0">
                        <div className="flex justify-between">
                          <span className="font-mono text-xs text-primary">{h.notas_fiscais?.numero}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(h.notas_fiscais?.data_emissao)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>{h.notas_fiscais?.fornecedores?.nome_razao_social || "—"}</span>
                          <span className="font-mono">Qtd: {h.quantidade} × {formatCurrency(h.valor_unitario)}</span>
                        </div>
                      </div>
                )}
                  </div>
              }
              </TabsContent>
            </Tabs>
          </div>
        }
      </ViewDrawerV2>
    </AppLayout>);

};

export default Produtos;