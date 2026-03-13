import { useState } from "react";
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

interface Produto {
  id: string; sku: string; codigo_interno: string; nome: string; descricao: string;
  grupo_id: string; unidade_medida: string; preco_custo: number; preco_venda: number;
  estoque_atual: number; estoque_minimo: number; ncm: string; peso: number;
  eh_composto: boolean; ativo: boolean; created_at: string;
}

const emptyProduto: Record<string, any> = {
  nome: "", sku: "", codigo_interno: "", descricao: "", unidade_medida: "UN",
  preco_custo: 0, preco_venda: 0, estoque_minimo: 0, ncm: "", peso: 0, eh_composto: false,
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
  const [composicao, setComposicao] = useState<any[]>([]);

  const openCreate = () => { setMode("create"); setForm({...emptyProduto}); setSelected(null); setModalOpen(true); };
  const openEdit = (p: Produto) => {
    setMode("edit"); setSelected(p);
    setForm({
      nome: p.nome, sku: p.sku || "", codigo_interno: p.codigo_interno || "", descricao: p.descricao || "",
      unidade_medida: p.unidade_medida, preco_custo: p.preco_custo || 0, preco_venda: p.preco_venda,
      estoque_minimo: p.estoque_minimo || 0, ncm: p.ncm || "", peso: p.peso || 0,
      eh_composto: p.eh_composto || false,
    });
    setModalOpen(true);
  };

  const openView = async (p: Produto) => {
    setSelected(p); setDrawerOpen(true);
    // Load document history
    const { data: nfItens } = await (supabase as any).from("notas_fiscais_itens")
      .select("quantidade, valor_unitario, notas_fiscais(numero, tipo, data_emissao, fornecedores(nome_razao_social))")
      .eq("produto_id", p.id).limit(20);
    setHistorico(nfItens || []);
    // Load composition
    if (p.eh_composto) {
      const { data: comp } = await (supabase as any).from("produto_composicoes")
        .select("quantidade, ordem, produtos:produto_filho_id(nome, sku, preco_custo)")
        .eq("produto_pai_id", p.id).order("ordem");
      setComposicao(comp || []);
    } else {
      setComposicao([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.preco_venda) { toast.error("Nome e preço de venda são obrigatórios"); return; }
    setSaving(true);
    try {
      if (mode === "create") await create(form);
      else if (selected) await update(selected.id, form);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const columns = [
    { key: "sku", label: "SKU", render: (p: Produto) => <span className="font-mono text-xs font-medium text-primary">{p.sku || "—"}</span> },
    { key: "nome", label: "Nome" },
    { key: "unidade_medida", label: "UN" },
    { key: "estoque_atual", label: "Estoque", render: (p: Produto) => (
      <span className={Number(p.estoque_atual) <= Number(p.estoque_minimo) ? "text-destructive font-semibold" : ""}>{p.estoque_atual}</span>
    )},
    { key: "preco_custo", label: "Custo", render: (p: Produto) => <span className="font-mono">R$ {Number(p.preco_custo || 0).toFixed(2)}</span> },
    { key: "preco_venda", label: "Preço Venda", render: (p: Produto) => <span className="font-semibold font-mono">R$ {Number(p.preco_venda).toFixed(2)}</span> },
    { key: "eh_composto", label: "Tipo", render: (p: Produto) => p.eh_composto ? <StatusBadge status="Composto" /> : <StatusBadge status="Simples" /> },
    { key: "ativo", label: "Status", render: (p: Produto) => <StatusBadge status={p.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Produtos" subtitle="Cadastro e gestão de produtos" addLabel="Novo Produto" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={openView} onEdit={openEdit} onDelete={(p) => remove(p.id)} onDuplicate={(p) => duplicate(p)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Produto" : "Editar Produto"} size="lg">
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
            <div className="space-y-2"><Label>Preço Custo</Label><Input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: Number(e.target.value) })} /></div>
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
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Preço Custo</span><p className="font-mono">R$ {Number(selected.preco_custo || 0).toFixed(2)}</p></div>
              <div><span className="text-xs text-muted-foreground">Preço Venda</span><p className="font-semibold font-mono">R$ {Number(selected.preco_venda).toFixed(2)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Estoque Atual</span><p className={Number(selected.estoque_atual) <= Number(selected.estoque_minimo) ? "text-destructive font-semibold" : ""}>{selected.estoque_atual}</p></div>
              <div><span className="text-xs text-muted-foreground">Estoque Mínimo</span><p>{selected.estoque_minimo}</p></div>
            </div>

            {/* Composition */}
            {selected.eh_composto && composicao.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-2">Composição</h4>
                <div className="space-y-1">
                  {composicao.map((c: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                      <span>{c.produtos?.nome || "—"} <span className="text-muted-foreground font-mono text-xs">({c.produtos?.sku})</span></span>
                      <span className="font-mono">× {c.quantidade}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-1">
                    <span>Custo Composto</span>
                    <span className="font-mono text-primary">R$ {composicao.reduce((s: number, c: any) => s + (c.quantidade * (c.produtos?.preco_custo || 0)), 0).toFixed(2)}</span>
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
                        <span className="font-mono">Qtd: {h.quantidade} × R$ {Number(h.valor_unitario).toFixed(2)}</span>
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
