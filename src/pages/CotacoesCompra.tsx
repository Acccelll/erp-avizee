import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { SummaryCard } from "@/components/SummaryCard";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutocompleteSearch } from "@/components/ui/AutocompleteSearch";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  ShoppingCart, Edit, Trash2, Plus, CheckCircle2, Clock,
  FileSearch, Trophy, X, PackageSearch,
} from "lucide-react";

interface CotacaoCompra {
  id: string;
  numero: string;
  data_cotacao: string;
  data_validade: string | null;
  status: string;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

interface CotacaoItem {
  id: string;
  cotacao_compra_id: string;
  produto_id: string;
  quantidade: number;
  unidade: string;
  produtos?: { nome: string; codigo_interno: string; sku: string };
}

interface Proposta {
  id?: string;
  cotacao_compra_id: string;
  item_id: string;
  fornecedor_id: string;
  preco_unitario: number;
  prazo_entrega_dias: number | null;
  observacoes: string | null;
  selecionado: boolean;
  fornecedores?: { nome_razao_social: string };
}

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  em_analise: "Em Análise",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

const emptyForm = {
  numero: "",
  data_cotacao: new Date().toISOString().split("T")[0],
  data_validade: "",
  observacoes: "",
  status: "aberta",
};

interface LocalItem {
  _localId: string;
  id?: string;
  produto_id: string;
  quantidade: number;
  unidade: string;
}

export default function CotacoesCompra() {
  const { data, loading, fetchData, remove } = useSupabaseCrud<CotacaoCompra>({
    table: "cotacoes_compra",
    orderBy: "created_at",
    ascending: false,
  });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });

  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CotacaoCompra | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);
  const [saving, setSaving] = useState(false);

  // View drawer state
  const [viewItems, setViewItems] = useState<CotacaoItem[]>([]);
  const [viewPropostas, setViewPropostas] = useState<Proposta[]>([]);

  // Proposal add inline
  const [addingProposal, setAddingProposal] = useState<string | null>(null); // item_id
  const [proposalForm, setProposalForm] = useState({ fornecedor_id: "", preco_unitario: 0, prazo_entrega_dias: "", observacoes: "" });

  // KPIs
  const kpis = useMemo(() => {
    const abertas = data.filter((c) => c.status === "aberta").length;
    const emAnalise = data.filter((c) => c.status === "em_analise").length;
    const finalizadas = data.filter((c) => c.status === "finalizada").length;
    return { total: data.length, abertas, emAnalise, finalizadas };
  }, [data]);

  const openCreate = () => {
    setMode("create");
    setForm({ ...emptyForm, numero: `COT-C-${String(data.length + 1).padStart(4, "0")}` });
    setLocalItems([]);
    setSelected(null);
    setModalOpen(true);
  };

  const openEdit = async (c: CotacaoCompra) => {
    setMode("edit");
    setSelected(c);
    setForm({
      numero: c.numero,
      data_cotacao: c.data_cotacao,
      data_validade: c.data_validade || "",
      observacoes: c.observacoes || "",
      status: c.status,
    });
    const { data: itens } = await supabase
      .from("cotacoes_compra_itens")
      .select("*, produtos(nome, codigo_interno, sku)")
      .eq("cotacao_compra_id", c.id);
    setLocalItems(
      (itens || []).map((i: any) => ({
        _localId: i.id,
        id: i.id,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        unidade: i.unidade || "UN",
      }))
    );
    setModalOpen(true);
  };

  const openView = async (c: CotacaoCompra) => {
    setSelected(c);
    setDrawerOpen(true);
    const [{ data: itens }, { data: propostas }] = await Promise.all([
      supabase
        .from("cotacoes_compra_itens")
        .select("*, produtos(nome, codigo_interno, sku)")
        .eq("cotacao_compra_id", c.id),
      supabase
        .from("cotacoes_compra_propostas")
        .select("*, fornecedores(nome_razao_social)")
        .eq("cotacao_compra_id", c.id),
    ]);
    setViewItems(itens || []);
    setViewPropostas(propostas || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    if (localItems.length === 0) { toast.error("Adicione ao menos um item"); return; }
    setSaving(true);
    try {
      const payload = {
        numero: form.numero,
        data_cotacao: form.data_cotacao,
        data_validade: form.data_validade || null,
        observacoes: form.observacoes || null,
        status: form.status,
      };
      let cotacaoId = selected?.id;
      if (mode === "create") {
        const { data: newC, error } = await supabase.from("cotacoes_compra").insert(payload).select().single();
        if (error) throw error;
        cotacaoId = newC.id;
      } else if (selected) {
        const { error } = await supabase.from("cotacoes_compra").update(payload).eq("id", selected.id);
        if (error) throw error;
        // Delete old items (cascade deletes propostas too)
        await supabase.from("cotacoes_compra_itens").delete().eq("cotacao_compra_id", selected.id);
      }
      if (cotacaoId && localItems.length > 0) {
        const itemsPayload = localItems.filter((i) => i.produto_id).map((i) => ({
          cotacao_compra_id: cotacaoId,
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          unidade: i.unidade,
        }));
        await supabase.from("cotacoes_compra_itens").insert(itemsPayload);
      }
      toast.success("Cotação de compra salva!");
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("[cotacoes_compra]", err);
      toast.error("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  };

  // Local items management
  const addLocalItem = () => {
    setLocalItems([...localItems, { _localId: crypto.randomUUID(), produto_id: "", quantidade: 1, unidade: "UN" }]);
  };
  const updateLocalItem = (localId: string, field: string, value: any) => {
    setLocalItems(localItems.map((i) => (i._localId === localId ? { ...i, [field]: value } : i)));
  };
  const removeLocalItem = (localId: string) => {
    setLocalItems(localItems.filter((i) => i._localId !== localId));
  };

  // Propostas management in drawer
  const handleAddProposal = async (itemId: string) => {
    if (!proposalForm.fornecedor_id || !selected) return;
    try {
      await supabase.from("cotacoes_compra_propostas").insert({
        cotacao_compra_id: selected.id,
        item_id: itemId,
        fornecedor_id: proposalForm.fornecedor_id,
        preco_unitario: proposalForm.preco_unitario,
        prazo_entrega_dias: proposalForm.prazo_entrega_dias ? Number(proposalForm.prazo_entrega_dias) : null,
        observacoes: proposalForm.observacoes || null,
        selecionado: false,
      });
      toast.success("Proposta adicionada!");
      setAddingProposal(null);
      setProposalForm({ fornecedor_id: "", preco_unitario: 0, prazo_entrega_dias: "", observacoes: "" });
      // Reload propostas
      const { data: propostas } = await supabase
        .from("cotacoes_compra_propostas")
        .select("*, fornecedores(nome_razao_social)")
        .eq("cotacao_compra_id", selected.id);
      setViewPropostas(propostas || []);
    } catch (err) {
      toast.error("Erro ao adicionar proposta");
    }
  };

  const handleSelectProposal = async (propostaId: string, itemId: string) => {
    if (!selected) return;
    try {
      // Deselect all proposals for this item first
      await supabase
        .from("cotacoes_compra_propostas")
        .update({ selecionado: false })
        .eq("cotacao_compra_id", selected.id)
        .eq("item_id", itemId);
      // Select the chosen one
      await supabase
        .from("cotacoes_compra_propostas")
        .update({ selecionado: true })
        .eq("id", propostaId);
      toast.success("Fornecedor selecionado!");
      const { data: propostas } = await supabase
        .from("cotacoes_compra_propostas")
        .select("*, fornecedores(nome_razao_social)")
        .eq("cotacao_compra_id", selected.id);
      setViewPropostas(propostas || []);
    } catch {
      toast.error("Erro ao selecionar proposta");
    }
  };

  const handleDeleteProposal = async (propostaId: string) => {
    if (!selected) return;
    await supabase.from("cotacoes_compra_propostas").delete().eq("id", propostaId);
    toast.success("Proposta removida");
    const { data: propostas } = await supabase
      .from("cotacoes_compra_propostas")
      .select("*, fornecedores(nome_razao_social)")
      .eq("cotacao_compra_id", selected.id);
    setViewPropostas(propostas || []);
  };

  const handleFinalize = async () => {
    if (!selected) return;
    await supabase.from("cotacoes_compra").update({ status: "finalizada" }).eq("id", selected.id);
    toast.success("Cotação finalizada!");
    setDrawerOpen(false);
    fetchData();
  };

  const produtoOptions = produtosCrud.data.map((p: any) => ({
    id: p.id,
    label: p.nome,
    sublabel: p.codigo_interno || p.sku || "",
  }));
  const fornecedorOptions = fornecedoresCrud.data.map((f: any) => ({
    id: f.id,
    label: f.nome_razao_social,
    sublabel: f.cpf_cnpj || "",
  }));

  const columns = [
    { key: "numero", label: "Nº", render: (c: CotacaoCompra) => <span className="font-mono text-xs font-medium text-primary">{c.numero}</span> },
    { key: "data_cotacao", label: "Data", render: (c: CotacaoCompra) => new Date(c.data_cotacao).toLocaleDateString("pt-BR") },
    { key: "data_validade", label: "Validade", render: (c: CotacaoCompra) => c.data_validade ? new Date(c.data_validade).toLocaleDateString("pt-BR") : "—" },
    { key: "status", label: "Status", render: (c: CotacaoCompra) => <StatusBadge status={c.status} label={statusLabels[c.status] || c.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage
        title="Cotações de Compra"
        subtitle="Compare propostas de fornecedores e selecione as melhores condições."
        addLabel="Nova Cotação de Compra"
        onAdd={openCreate}
        count={data.length}
      >
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total" value={formatNumber(kpis.total)} icon={ShoppingCart} variationType="neutral" variation="cotações" />
          <SummaryCard title="Abertas" value={formatNumber(kpis.abertas)} icon={Clock} variationType={kpis.abertas > 0 ? "negative" : "positive"} variation="aguardando propostas" />
          <SummaryCard title="Em Análise" value={formatNumber(kpis.emAnalise)} icon={FileSearch} variationType="neutral" variation="comparando" />
          <SummaryCard title="Finalizadas" value={formatNumber(kpis.finalizadas)} icon={CheckCircle2} variationType="positive" variation="concluídas" />
        </div>

        <DataTable columns={columns} data={data} loading={loading} onView={openView} />
      </ModulePage>

      {/* Create/Edit Modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Cotação de Compra" : "Editar Cotação de Compra"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Número *</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Data Cotação</Label>
              <Input type="date" value={form.data_cotacao} onChange={(e) => setForm({ ...form, data_cotacao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Validade</Label>
              <Input type="date" value={form.data_validade} onChange={(e) => setForm({ ...form, data_validade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Itens Solicitados</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLocalItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Adicionar Item
              </Button>
            </div>
            {localItems.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum item adicionado. Clique em "Adicionar Item" para começar.
              </div>
            ) : (
              <div className="space-y-2">
                {localItems.map((item, idx) => (
                  <div key={item._localId} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <span className="text-xs text-muted-foreground font-mono w-6">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <AutocompleteSearch
                        options={produtoOptions}
                        value={item.produto_id}
                        onChange={(id) => updateLocalItem(item._localId, "produto_id", id)}
                        placeholder="Buscar produto..."
                      />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantidade}
                      onChange={(e) => updateLocalItem(item._localId, "quantidade", Number(e.target.value))}
                      className="w-24 font-mono"
                      placeholder="Qtd"
                    />
                    <Input
                      value={item.unidade}
                      onChange={(e) => updateLocalItem(item._localId, "unidade", e.target.value)}
                      className="w-16 text-center"
                      placeholder="UN"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLocalItem(item._localId)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      {/* View Drawer with Comparison */}
      <ViewDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setAddingProposal(null); }}
        title="Cotação de Compra"
        actions={
          selected ? (
            <>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Número</span><p className="font-medium font-mono">{selected.numero}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><div className="mt-0.5"><StatusBadge status={selected.status} label={statusLabels[selected.status] || selected.status} /></div></div>
              <div><span className="text-xs text-muted-foreground">Data</span><p>{new Date(selected.data_cotacao).toLocaleDateString("pt-BR")}</p></div>
              <div><span className="text-xs text-muted-foreground">Validade</span><p>{selected.data_validade ? new Date(selected.data_validade).toLocaleDateString("pt-BR") : "—"}</p></div>
            </div>

            {selected.observacoes && (
              <div><span className="text-xs text-muted-foreground">Observações</span><p className="text-sm">{selected.observacoes}</p></div>
            )}

            {/* Items + Proposals comparison */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <PackageSearch className="h-4 w-4" /> Itens e Propostas ({viewItems.length})
              </h4>

              {viewItems.map((item) => {
                const itemPropostas = viewPropostas.filter((p) => p.item_id === item.id);
                const bestPrice = itemPropostas.length > 0
                  ? Math.min(...itemPropostas.map((p) => Number(p.preco_unitario)))
                  : null;

                return (
                  <Card key={item.id} className="border">
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>
                          {item.produtos?.nome || "—"}
                          <span className="ml-2 text-xs text-muted-foreground font-mono">
                            {item.produtos?.codigo_interno || item.produtos?.sku || ""}
                          </span>
                        </span>
                        <Badge variant="outline" className="font-mono">
                          {item.quantidade} {item.unidade || "UN"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2">
                      {itemPropostas.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhuma proposta cadastrada.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {itemPropostas.map((p) => {
                            const isBest = Number(p.preco_unitario) === bestPrice;
                            const totalProposta = Number(p.preco_unitario) * item.quantidade;
                            return (
                              <div
                                key={p.id}
                                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                  p.selecionado
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                    : isBest
                                    ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
                                    : ""
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {p.selecionado && <Trophy className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                                  {isBest && !p.selecionado && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">MENOR</span>}
                                  <span className="truncate font-medium">{p.fornecedores?.nome_razao_social || "—"}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <div className="text-right">
                                    <p className="font-mono font-semibold">{formatCurrency(Number(p.preco_unitario))}<span className="text-muted-foreground">/un</span></p>
                                    <p className="text-[10px] text-muted-foreground font-mono">Total: {formatCurrency(totalProposta)}</p>
                                  </div>
                                  {p.prazo_entrega_dias && (
                                    <Badge variant="secondary" className="text-[10px]">{p.prazo_entrega_dias}d</Badge>
                                  )}
                                  <div className="flex gap-1">
                                    {!p.selecionado && selected.status !== "finalizada" && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSelectProposal(p.id!, item.id)}>
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Selecionar</TooltipContent>
                                      </Tooltip>
                                    )}
                                    {selected.status !== "finalizada" && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteProposal(p.id!)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Remover</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add proposal inline */}
                      {selected.status !== "finalizada" && selected.status !== "cancelada" && (
                        <>
                          {addingProposal === item.id ? (
                            <div className="rounded-lg border border-dashed p-3 space-y-3 bg-muted/30">
                              <div className="space-y-2">
                                <Label className="text-xs">Fornecedor</Label>
                                <AutocompleteSearch
                                  options={fornecedorOptions}
                                  value={proposalForm.fornecedor_id}
                                  onChange={(id) => setProposalForm({ ...proposalForm, fornecedor_id: id })}
                                  placeholder="Selecionar fornecedor..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Preço Unitário</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={proposalForm.preco_unitario}
                                    onChange={(e) => setProposalForm({ ...proposalForm, preco_unitario: Number(e.target.value) })}
                                    className="h-8 font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Prazo (dias)</Label>
                                  <Input
                                    type="number"
                                    value={proposalForm.prazo_entrega_dias}
                                    onChange={(e) => setProposalForm({ ...proposalForm, prazo_entrega_dias: e.target.value })}
                                    className="h-8 font-mono"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={() => handleAddProposal(item.id)} disabled={!proposalForm.fornecedor_id}>Salvar</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setAddingProposal(null)}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full gap-1.5 text-xs"
                              onClick={() => {
                                setAddingProposal(item.id);
                                setProposalForm({ fornecedor_id: "", preco_unitario: 0, prazo_entrega_dias: "", observacoes: "" });
                              }}
                            >
                              <Plus className="h-3 w-3" /> Adicionar Proposta
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Finalize button */}
            {selected.status !== "finalizada" && selected.status !== "cancelada" && viewPropostas.some((p) => p.selecionado) && (
              <Button className="w-full gap-2" onClick={handleFinalize}>
                <CheckCircle2 className="h-4 w-4" /> Finalizar Cotação
              </Button>
            )}
          </div>
        )}
      </ViewDrawerV2>
    </AppLayout>
  );
}
