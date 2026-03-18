import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Produto {
  id: string; sku: string; codigo_interno: string; nome: string; descricao: string;
  grupo_id: string; unidade_medida: string; preco_custo: number; preco_venda: number;
  estoque_atual: number; estoque_minimo: number; ncm: string; peso: number;
  eh_composto: boolean; ativo: boolean; created_at: string;
}

interface ComposicaoItem {
  id?: string;
  produto_filho_id: string;
  quantidade: number;
  ordem: number;
  // joined
  nome?: string;
  sku?: string;
  preco_custo?: number;
}

const emptyProduto: Record<string, any> = {
  nome: "", sku: "", codigo_interno: "", descricao: "", unidade_medida: "UN",
  preco_custo: 0, preco_venda: 0, estoque_minimo: 0, ncm: "", peso: 0, eh_composto: false,
};

const Produtos = () => {
  const { data, loading, create, update, remove, duplicate, fetchData } = useSupabaseCrud<Produto>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Produto | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyProduto);
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [composicao, setComposicao] = useState<ComposicaoItem[]>([]);

  // Composition editing state
  const [editComposicao, setEditComposicao] = useState<ComposicaoItem[]>([]);
  const [margemLucro, setMargemLucro] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "simples" | "composto">("todos");
  const [estoqueFilter, setEstoqueFilter] = useState<"todos" | "baixo" | "ok">("todos");

  // All products for composition picker (exclude self)
  const produtosDisponiveis = data.filter(p => !selected || p.id !== selected.id);

  const custoComposto = editComposicao.reduce((s, c) => {
    const prod = data.find(p => p.id === c.produto_filho_id);
    return s + (c.quantidade * (prod?.preco_custo || 0));
  }, 0);

  const precoSugerido = custoComposto * (1 + margemLucro / 100);

  // View drawer calculated values
  const custoCompostoView = composicao.reduce((s, c) => s + (c.quantidade * (c.preco_custo || 0)), 0);

  const openCreate = () => {
    setMode("create"); setForm({ ...emptyProduto }); setSelected(null);
    setEditComposicao([]); setMargemLucro(30); setModalOpen(true);
  };

  const openEdit = async (p: Produto) => {
    setMode("edit"); setSelected(p);
    setForm({
      nome: p.nome, sku: p.sku || "", codigo_interno: p.codigo_interno || "", descricao: p.descricao || "",
      unidade_medida: p.unidade_medida, preco_custo: p.preco_custo || 0, preco_venda: p.preco_venda,
      estoque_minimo: p.estoque_minimo || 0, ncm: p.ncm || "", peso: p.peso || 0,
      eh_composto: p.eh_composto || false,
    });
    // Load existing composition
    if (p.eh_composto) {
      const { data: comp } = await (supabase as any).from("produto_composicoes")
        .select("id, produto_filho_id, quantidade, ordem, produtos:produto_filho_id(nome, sku, preco_custo)")
        .eq("produto_pai_id", p.id).order("ordem");
      setEditComposicao((comp || []).map((c: any) => ({
        id: c.id,
        produto_filho_id: c.produto_filho_id,
        quantidade: c.quantidade,
        ordem: c.ordem,
        nome: c.produtos?.nome,
        sku: c.produtos?.sku,
        preco_custo: c.produtos?.preco_custo,
      })));
    } else {
      setEditComposicao([]);
    }
    // Calc margin from current cost/price
    const custo = p.preco_custo || 0;
    setMargemLucro(custo > 0 ? Math.round(((p.preco_venda / custo) - 1) * 100) : 30);
    setModalOpen(true);
  };

  const openView = async (p: Produto) => {
    setSelected(p); setDrawerOpen(true);
    const { data: nfItens } = await (supabase as any).from("notas_fiscais_itens")
      .select("quantidade, valor_unitario, notas_fiscais(numero, tipo, data_emissao, fornecedores(nome_razao_social))")
      .eq("produto_id", p.id).limit(20);
    setHistorico(nfItens || []);
    if (p.eh_composto) {
      const { data: comp } = await (supabase as any).from("produto_composicoes")
        .select("quantidade, ordem, produtos:produto_filho_id(nome, sku, preco_custo)")
        .eq("produto_pai_id", p.id).order("ordem");
      setComposicao((comp || []).map((c: any) => ({
        produto_filho_id: "",
        quantidade: c.quantidade,
        ordem: c.ordem,
        nome: c.produtos?.nome,
        sku: c.produtos?.sku,
        preco_custo: c.produtos?.preco_custo,
      })));
    } else {
      setComposicao([]);
    }
  };

  const addComponent = () => {
    setEditComposicao([...editComposicao, {
      produto_filho_id: "",
      quantidade: 1,
      ordem: editComposicao.length + 1,
    }]);
  };

  const removeComponent = (idx: number) => {
    setEditComposicao(editComposicao.filter((_, i) => i !== idx));
  };

  const updateComponent = (idx: number, field: string, value: any) => {
    const updated = [...editComposicao];
    (updated[idx] as any)[field] = value;
    setEditComposicao(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.preco_venda) { toast.error("Nome e preço de venda são obrigatórios"); return; }

    // If composed, validate components
    if (form.eh_composto && editComposicao.length === 0) {
      toast.error("Produto composto precisa de ao menos um componente");
      return;
    }
    if (form.eh_composto && editComposicao.some(c => !c.produto_filho_id)) {
      toast.error("Selecione o produto para todos os componentes");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        preco_custo: form.eh_composto ? custoComposto : form.preco_custo,
      };

      let produtoId: string;
      if (mode === "create") {
        const result = await create(payload);
        produtoId = result.id;
      } else if (selected) {
        await update(selected.id, payload);
        produtoId = selected.id;
      } else {
        return;
      }

      // Save composition if eh_composto
      if (form.eh_composto) {
        // Delete old composition
        await (supabase as any).from("produto_composicoes").delete().eq("produto_pai_id", produtoId);
        // Insert new
        if (editComposicao.length > 0) {
          const rows = editComposicao.map((c, i) => ({
            produto_pai_id: produtoId,
            produto_filho_id: c.produto_filho_id,
            quantidade: c.quantidade,
            ordem: i + 1,
          }));
          const { error } = await (supabase as any).from("produto_composicoes").insert(rows);
          if (error) toast.error("Erro ao salvar composição: " + error.message);
        }
      }

      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const recalcularCusto = async (p: Produto) => {
    if (!p.eh_composto) return;
    const { data: comp } = await (supabase as any).from("produto_composicoes")
      .select("quantidade, produtos:produto_filho_id(preco_custo)")
      .eq("produto_pai_id", p.id);
    const custo = (comp || []).reduce((s: number, c: any) => s + (c.quantidade * (c.produtos?.preco_custo || 0)), 0);
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

      if (!query) return true;

      const haystack = [p.nome, p.sku, p.codigo_interno, p.descricao, p.ncm]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [data, estoqueFilter, searchTerm, tipoFilter]);

  const columns = [
    { key: "sku", label: "SKU", render: (p: Produto) => <span className="font-mono text-xs font-medium text-primary">{p.sku || "—"}</span> },
    { key: "nome", label: "Nome" },
    { key: "unidade_medida", label: "UN" },
    { key: "estoque_atual", label: "Estoque", render: (p: Produto) => (
      <span className={Number(p.estoque_atual) <= Number(p.estoque_minimo) ? "text-destructive font-semibold" : ""}>{p.estoque_atual}</span>
    )},
    { key: "preco_custo", label: "Custo", render: (p: Produto) => <span className="font-mono">{formatCurrency(p.preco_custo || 0)}</span> },
    { key: "preco_venda", label: "Preço Venda", render: (p: Produto) => <span className="font-semibold font-mono">{formatCurrency(p.preco_venda)}</span> },
    { key: "margem", label: "Margem", render: (p: Produto) => {
      const custo = Number(p.preco_custo || 0);
      const venda = Number(p.preco_venda);
      const margem = custo > 0 ? ((venda / custo) - 1) * 100 : 0;
      return <span className={`font-mono text-xs ${margem > 0 ? "text-green-600" : margem < 0 ? "text-destructive" : ""}`}>{custo > 0 ? `${margem.toFixed(1)}%` : "—"}</span>;
    }},
    { key: "eh_composto", label: "Tipo", render: (p: Produto) => p.eh_composto ? <StatusBadge status="Composto" /> : <StatusBadge status="Simples" /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Produtos" subtitle="Cadastro e gestão de produtos" addLabel="Novo Produto" onAdd={openCreate} count={filteredData.length}
        searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por nome, SKU ou código..."
        filters={<><Select value={tipoFilter} onValueChange={(v: any) => setTipoFilter(v)}><SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="simples">Somente simples</SelectItem><SelectItem value="composto">Somente compostos</SelectItem></SelectContent></Select><Select value={estoqueFilter} onValueChange={(v: any) => setEstoqueFilter(v)}><SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Estoque" /></SelectTrigger><SelectContent><SelectItem value="todos">Todo o estoque</SelectItem><SelectItem value="baixo">Abaixo do mínimo</SelectItem><SelectItem value="ok">Estoque normal</SelectItem></SelectContent></Select></>}
      >
        <DataTable columns={columns} data={filteredData} loading={loading}
          onView={openView} onEdit={openEdit} onDelete={(p) => remove(p.id)} onDuplicate={(p) => duplicate(p)} />
      </ModulePage>

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
            {!form.eh_composto && (
              <div className="space-y-2"><Label>Preço Custo</Label><Input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: Number(e.target.value) })} /></div>
            )}
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
          <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>

          {/* Composition Section */}
          {form.eh_composto && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Composição</h4>
                <Button type="button" size="sm" variant="outline" onClick={addComponent} className="gap-1">
                  <Plus className="w-3 h-3" /> Componente
                </Button>
              </div>

              {editComposicao.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum componente adicionado</p>
              )}

              {editComposicao.map((comp, idx) => {
                const prod = data.find(p => p.id === comp.produto_filho_id);
                return (
                  <div key={idx} className="grid grid-cols-[1fr_100px_80px_40px] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Produto</Label>
                      <Select value={comp.produto_filho_id} onValueChange={(v) => updateComponent(idx, "produto_filho_id", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {produtosDisponiveis.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.sku ? `[${p.sku}] ` : ""}{p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input type="number" min={0.01} step="0.01" value={comp.quantidade}
                        onChange={(e) => updateComponent(idx, "quantidade", Number(e.target.value))} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Custo</Label>
                      <p className="h-9 flex items-center text-xs font-mono text-muted-foreground">
                        {prod ? formatCurrency(comp.quantidade * (prod.preco_custo || 0)) : "—"}
                      </p>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeComponent(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}

              {editComposicao.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Custo Total Composto</span>
                    <span className="font-mono font-semibold text-primary">{formatCurrency(custoComposto)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Margem de Lucro (%)</Label>
                      <Input type="number" step="1" value={margemLucro}
                        onChange={(e) => setMargemLucro(Number(e.target.value))} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Preço Sugerido</Label>
                      <div className="h-9 flex items-center">
                        <span className="font-mono font-semibold text-sm">{formatCurrency(precoSugerido)}</span>
                        <Button type="button" size="sm" variant="link" className="ml-2 text-xs h-auto p-0"
                          onClick={() => setForm({ ...form, preco_venda: Number(precoSugerido.toFixed(2)) })}>
                          Usar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Produto">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">SKU</span><p className="font-medium font-mono">{selected.sku || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Código</span><p className="font-mono">{selected.codigo_interno || "—"}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Nome</span><p className="font-medium">{selected.nome}</p></div>
            <div className="grid grid-cols-3 gap-4">
              <div><span className="text-xs text-muted-foreground">Unidade</span><p>{selected.unidade_medida}</p></div>
              <div><span className="text-xs text-muted-foreground">Peso</span><p className="font-mono">{selected.peso || 0} kg</p></div>
              <div><span className="text-xs text-muted-foreground">NCM</span><p className="font-mono">{selected.ncm || "—"}</p></div>
            </div>

            {/* Pricing Card */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <h4 className="font-semibold text-sm">Precificação</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Preço Custo</span><p className="font-mono font-medium">{formatCurrency(selected.preco_custo || 0)}</p></div>
                <div><span className="text-xs text-muted-foreground">Preço Venda</span><p className="font-semibold font-mono text-primary">{formatCurrency(selected.preco_venda)}</p></div>
              </div>
              {(selected.preco_custo || 0) > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Margem de Lucro</span>
                    <p className={`font-mono font-semibold ${((selected.preco_venda / (selected.preco_custo || 1)) - 1) * 100 > 0 ? "text-green-600" : "text-destructive"}`}>
                      {(((selected.preco_venda / (selected.preco_custo || 1)) - 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Lucro Bruto</span>
                    <p className="font-mono">{formatCurrency(selected.preco_venda - (selected.preco_custo || 0))}</p>
                  </div>
                </div>
              )}
              {selected.eh_composto && (
                <Button size="sm" variant="outline" className="gap-1 mt-1" onClick={() => recalcularCusto(selected)}>
                  <RefreshCw className="w-3 h-3" /> Recalcular Custo
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Estoque Atual</span><p className={Number(selected.estoque_atual) <= Number(selected.estoque_minimo) ? "text-destructive font-semibold" : ""}>{selected.estoque_atual}</p></div>
              <div><span className="text-xs text-muted-foreground">Estoque Mínimo</span><p>{selected.estoque_minimo}</p></div>
            </div>

            {/* Composition */}
            {selected.eh_composto && composicao.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Composição</h4>
                <div className="space-y-1">
                  {composicao.map((c, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1.5 border-b last:border-b-0">
                      <span>{c.nome || "—"} <span className="text-muted-foreground font-mono text-xs">({c.sku})</span></span>
                      <div className="text-right">
                        <span className="font-mono">× {c.quantidade}</span>
                        <span className="font-mono text-muted-foreground ml-3">{formatCurrency(c.quantidade * (c.preco_custo || 0))}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-2">
                    <span>Custo Composto</span>
                    <span className="font-mono text-primary">{formatCurrency(custoCompostoView)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Document History */}
            {historico.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-2">Histórico de Notas ({historico.length})</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {historico.map((h: any, idx: number) => (
                    <div key={idx} className="text-sm py-1 border-b last:border-b-0">
                      <div className="flex justify-between">
                        <span className="font-mono text-xs text-primary">{h.notas_fiscais?.numero}</span>
                        <span className="text-xs text-muted-foreground">{new Date(h.notas_fiscais?.data_emissao).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>{h.notas_fiscais?.fornecedores?.nome_razao_social || "—"}</span>
                        <span className="font-mono">Qtd: {h.quantidade} × {formatCurrency(h.valor_unitario)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Produtos;
