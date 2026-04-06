import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormModal } from "@/components/FormModal";
import { AdvancedFilterBar } from "@/components/AdvancedFilterBar";
import type { FilterChip } from "@/components/AdvancedFilterBar";
import { ViewField, ViewSection } from "@/components/ViewDrawer";
import { ViewDrawerV2 } from "@/components/ViewDrawerV2";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Upload, ArrowLeftRight } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { AutocompleteSearch } from "@/components/ui/AutocompleteSearch";
import { ItemsGrid, type GridItem } from "@/components/ui/ItemsGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { FileText, DollarSign, CheckCircle, XCircle, Clock, Truck } from "lucide-react";
import { parseNFeXml, type NFeData } from "@/lib/nfeXmlParser";
import { DanfeViewer } from "@/components/DanfeViewer";
import { LogisticaRastreioSection } from "@/components/logistica/LogisticaRastreioSection";
import { DevolucaoDialog } from "@/components/fiscal/DevolucaoDialog";
import { confirmarNotaFiscal, estornarNotaFiscal } from "@/services/fiscal.service";

interface NotaFiscal {
  id: string; tipo: string; numero: string; serie: string; chave_acesso: string;
  data_emissao: string; fornecedor_id: string; cliente_id: string;
  valor_total: number; status: string; forma_pagamento: string; condicao_pagamento: string;
  observacoes: string; ativo: boolean; movimenta_estoque: boolean; gera_financeiro: boolean;
  ordem_venda_id: string | null; conta_contabil_id: string | null;
  modelo_documento: string; nf_referenciada_id: string | null; tipo_operacao: string;
  frete_valor: number; icms_valor: number; ipi_valor: number; pis_valor: number;
  cofins_valor: number; icms_st_valor: number; desconto_valor: number; outras_despesas: number;
  fornecedores?: { nome_razao_social: string; cpf_cnpj: string };
  clientes?: { nome_razao_social: string };
  ordens_venda?: { numero: string };
}

const emptyForm: Record<string, any> = {
  tipo: "entrada", numero: "", serie: "1", chave_acesso: "", data_emissao: new Date().toISOString().split("T")[0],
  fornecedor_id: "", cliente_id: "", valor_total: 0, status: "pendente", observacoes: "",
  movimenta_estoque: true, gera_financeiro: true, forma_pagamento: "", condicao_pagamento: "a_vista",
  ordem_venda_id: "", conta_contabil_id: "", modelo_documento: "55",
  frete_valor: 0, icms_valor: 0, ipi_valor: 0, pis_valor: 0, cofins_valor: 0,
  icms_st_valor: 0, desconto_valor: 0, outras_despesas: 0,
};

const modeloLabels: Record<string, string> = {
  '55': 'NF-e', '65': 'NFC-e', '57': 'CT-e', '67': 'CT-e OS', 'nfse': 'NFS-e', 'outro': 'Outro'
};

const Fiscal = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, loading, create, update, remove, fetchData } = useSupabaseCrud<NotaFiscal>({
    table: "notas_fiscais", select: "*, fornecedores(nome_razao_social, cpf_cnpj), clientes(nome_razao_social), ordens_venda(numero)"
  });
  const { pushView } = useRelationalNavigation();
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });
  const clientesCrud = useSupabaseCrud<any>({ table: "clientes" });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [ordensVenda, setOrdensVenda] = useState<any[]>([]);
  const [contasContabeis, setContasContabeis] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<NotaFiscal | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({ ...emptyForm });
  const [items, setItems] = useState<GridItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const [consultaSearch, setConsultaSearch] = useState("");
  const [itemContaContabil, setItemContaContabil] = useState<Record<number, string>>({});
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const [danfeOpen, setDanfeOpen] = useState(false);
  const [danfeData, setDanfeData] = useState<any>(null);
  const [modeloFilters, setModeloFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  // Devolução
  const [devolucaoModalOpen, setDevolucaoModalOpen] = useState(false);
  const [devolucaoNF, setDevolucaoNF] = useState<NotaFiscal | null>(null);
  const [devolucaoItens, setDevolucaoItens] = useState<any[]>([]);

  const valorProdutos = items.reduce((s, i) => s + (i.valor_total || 0), 0);
  const totalImpostos = Number(form.icms_valor || 0) + Number(form.ipi_valor || 0) + Number(form.pis_valor || 0) + Number(form.cofins_valor || 0) + Number(form.icms_st_valor || 0);
  const totalNF = valorProdutos + Number(form.frete_valor || 0) + totalImpostos + Number(form.outras_despesas || 0) - Number(form.desconto_valor || 0);

  useEffect(() => {
    const load = async () => {
      const [{ data: ovs }, { data: contas }] = await Promise.all([
        supabase.from("ordens_venda").select("id, numero, cliente_id, clientes(nome_razao_social)").eq("ativo", true).in("status", ["aprovada", "em_separacao"]).order("numero"),
        supabase.from("contas_contabeis").select("id, codigo, descricao").eq("ativo", true).eq("aceita_lancamento", true).order("codigo"),
      ]);
      setOrdensVenda(ovs || []);
      setContasContabeis(contas || []);
    };
    load();
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const tipoParam = searchParams.get("tipo");
    const filtered = tipoParam ? data.filter(n => n.tipo === tipoParam) : data;
    const total = filtered.length;
    const pendentes = filtered.filter(n => n.status === "pendente").length;
    const confirmadas = filtered.filter(n => n.status === "confirmada").length;
    const valorTotal = filtered.reduce((s, n) => s + Number(n.valor_total || 0), 0);
    return { total, pendentes, confirmadas, valorTotal };
  }, [data, searchParams]);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setItems([]); setSelected(null); setParcelas(1); setItemContaContabil({}); setModalOpen(true); };
  const openEdit = async (n: NotaFiscal) => {
    setMode("edit"); setSelected(n);
    setForm({
      tipo: n.tipo, numero: n.numero, serie: n.serie || "1", chave_acesso: n.chave_acesso || "",
      data_emissao: n.data_emissao, fornecedor_id: n.fornecedor_id || "", cliente_id: n.cliente_id || "",
      valor_total: n.valor_total, status: n.status, observacoes: n.observacoes || "",
      movimenta_estoque: n.movimenta_estoque !== false, gera_financeiro: n.gera_financeiro !== false,
      forma_pagamento: n.forma_pagamento || "", condicao_pagamento: n.condicao_pagamento || "a_vista",
      ordem_venda_id: n.ordem_venda_id || "", conta_contabil_id: n.conta_contabil_id || "",
      modelo_documento: n.modelo_documento || "55",
      frete_valor: n.frete_valor || 0, icms_valor: n.icms_valor || 0, ipi_valor: n.ipi_valor || 0,
      pis_valor: n.pis_valor || 0, cofins_valor: n.cofins_valor || 0, icms_st_valor: n.icms_st_valor || 0,
      desconto_valor: n.desconto_valor || 0, outras_despesas: n.outras_despesas || 0,
    });
    const { data: itens } = await supabase.from("notas_fiscais_itens")
      .select("*, produtos(nome, sku)").eq("nota_fiscal_id", n.id);
    const loadedItems = (itens || []).map((i: any) => ({
      id: i.id, produto_id: i.produto_id, codigo: i.produtos?.sku || "",
      descricao: i.produtos?.nome || "", quantidade: i.quantidade,
      valor_unitario: i.valor_unitario, valor_total: i.quantidade * i.valor_unitario,
    }));
    setItems(loadedItems);
    const contaMap: Record<number, string> = {};
    (itens || []).forEach((i: any, idx: number) => {
      if (i.conta_contabil_id) contaMap[idx] = i.conta_contabil_id;
    });
    setItemContaContabil(contaMap);
    setModalOpen(true);
  };

  const openView = async (n: NotaFiscal) => {
    setSelected(n);
    const { data: itens } = await supabase.from("notas_fiscais_itens")
      .select("*, produtos(nome, sku), contas_contabeis(codigo, descricao)")
      .eq("nota_fiscal_id", n.id);
    setViewItems(itens || []);
    setDrawerOpen(true);
  };

  const openDanfe = async (n: NotaFiscal) => {
    const { data: itens } = await supabase.from("notas_fiscais_itens")
      .select("*, produtos(nome, sku)").eq("nota_fiscal_id", n.id);
    const { data: empresa } = await supabase.from("empresa_config").select("*").limit(1).single();
    setDanfeData({
      numero: n.numero, serie: n.serie, chave_acesso: n.chave_acesso,
      data_emissao: n.data_emissao, tipo: n.tipo, status: n.status,
      emitente: n.tipo === "saida" && empresa ? { nome: empresa.razao_social, cnpj: empresa.cnpj, endereco: empresa.logradouro, cidade: empresa.cidade, uf: empresa.uf } : (n.fornecedores ? { nome: n.fornecedores.nome_razao_social, cnpj: n.fornecedores.cpf_cnpj } : undefined),
      destinatario: n.tipo === "saida" && n.clientes ? { nome: n.clientes.nome_razao_social } : (empresa ? { nome: empresa.razao_social, cnpj: empresa.cnpj } : undefined),
      itens: (itens || []).map((i: any) => ({ descricao: i.produtos?.nome || "", quantidade: i.quantidade, valor_unitario: i.valor_unitario, cfop: i.cfop, cst: i.cst, icms_valor: i.icms_valor, ipi_valor: i.ipi_valor, pis_valor: i.pis_valor, cofins_valor: i.cofins_valor })),
      valor_total: n.valor_total, frete_valor: n.frete_valor, icms_valor: n.icms_valor,
      ipi_valor: n.ipi_valor, pis_valor: n.pis_valor, cofins_valor: n.cofins_valor,
      desconto_valor: n.desconto_valor, outras_despesas: n.outras_despesas,
      observacoes: n.observacoes, forma_pagamento: n.forma_pagamento, condicao_pagamento: n.condicao_pagamento,
    });
    setDanfeOpen(true);
  };

  const handleConfirmar = async (nf: NotaFiscal) => {
    try {
      await confirmarNotaFiscal({ nf, parcelas });
      toast.success("Nota fiscal confirmada! Estoque e financeiro atualizados.");
      fetchData();
    } catch (err: any) {
      console.error('[fiscal] confirmar NF:', err);
      toast.error("Erro ao confirmar nota fiscal.");
    }
  };

  const handleEstornar = async (nf: NotaFiscal) => {
    if (!window.confirm(`Deseja estornar a NF ${nf.numero}? Isso reverterá movimentos de estoque e lançamentos financeiros vinculados.`)) return;
    try {
      await estornarNotaFiscal(nf);
      toast.success(`NF ${nf.numero} estornada! Estoque e financeiro revertidos.`);
      fetchData();
    } catch (err: any) {
      console.error('[fiscal] estornar NF:', err);
      toast.error("Erro ao estornar nota fiscal.");
    }
  };

  const handleXmlImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const xmlText = await file.text();
      const nfe: NFeData = parseNFeXml(xmlText);
      let fornecedorId = "";
      if (nfe.emitente.cnpj) {
        const cnpjClean = nfe.emitente.cnpj.replace(/\D/g, "");
        const matched = fornecedoresCrud.data.find((f: any) => (f.cpf_cnpj || "").replace(/\D/g, "") === cnpjClean);
        if (matched) { fornecedorId = matched.id; toast.info(`Fornecedor identificado: ${matched.nome_razao_social}`); }
        else { toast.info(`Fornecedor CNPJ ${nfe.emitente.cnpj} não encontrado no cadastro. Preencha manualmente.`); }
      }
      const mappedItems: GridItem[] = nfe.itens.map((nfeItem) => {
        const matchedProd = produtosCrud.data.find((p: any) => p.codigo_interno === nfeItem.codigo || p.sku === nfeItem.codigo);
        return { produto_id: matchedProd?.id || "", codigo: nfeItem.codigo, descricao: matchedProd?.nome || nfeItem.descricao, quantidade: nfeItem.quantidade, valor_unitario: nfeItem.valorUnitario, valor_total: nfeItem.valorTotal };
      });
      setForm({ ...emptyForm, tipo: "entrada", numero: nfe.numero, serie: nfe.serie, chave_acesso: nfe.chaveAcesso, data_emissao: nfe.dataEmissao || new Date().toISOString().split("T")[0], fornecedor_id: fornecedorId, frete_valor: nfe.valorFrete, icms_valor: nfe.icmsTotal, ipi_valor: nfe.ipiTotal, pis_valor: nfe.pisTotal, cofins_valor: nfe.cofinsTotal, icms_st_valor: nfe.icmsStTotal, desconto_valor: nfe.valorDesconto, outras_despesas: nfe.valorOutrasDespesas, valor_total: nfe.valorTotal });
      setItems(mappedItems); setMode("create"); setSelected(null); setItemContaContabil({}); setModalOpen(true);
      const unmatchedCount = mappedItems.filter((i) => !i.produto_id).length;
      if (unmatchedCount > 0) toast.warning(`${unmatchedCount} item(ns) não foram vinculados automaticamente. Vincule manualmente.`);
      else toast.success("XML importado com sucesso! Todos os itens foram vinculados.");
    } catch (err: any) {
      console.error("[fiscal] XML import:", err);
      toast.error(`Erro ao importar XML: ${err.message}`);
    }
    if (xmlInputRef.current) xmlInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero) { toast.error("Número é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = { ...form, fornecedor_id: form.fornecedor_id || null, cliente_id: form.cliente_id || null, ordem_venda_id: form.ordem_venda_id || null, conta_contabil_id: form.conta_contabil_id || null, valor_total: totalNF || form.valor_total };
      let nfId = selected?.id;
      if (mode === "create") {
        const { data: newNf, error } = await supabase.from("notas_fiscais").insert(payload as any).select().single();
        if (error) throw error;
        nfId = newNf.id;
      } else if (selected) {
        await supabase.from("notas_fiscais").update(payload).eq("id", selected.id);
        await supabase.from("notas_fiscais_itens").delete().eq("nota_fiscal_id", selected.id);
      }
      if (items.length > 0 && nfId) {
        const itemsPayload = items.filter(i => i.produto_id).map((i, idx) => ({ nota_fiscal_id: nfId, produto_id: i.produto_id, quantidade: i.quantidade, valor_unitario: i.valor_unitario, conta_contabil_id: itemContaContabil[idx] || null }));
        if (itemsPayload.length > 0) await supabase.from("notas_fiscais_itens").insert(itemsPayload);
      }
      toast.success("Nota fiscal salva!"); setModalOpen(false); fetchData();
    } catch (err: any) { console.error('[fiscal] salvar NF:', err); toast.error("Erro ao salvar nota fiscal."); }
    setSaving(false);
  };

  const openDevolucao = async (nf: NotaFiscal) => {
    const { data: itens } = await supabase.from("notas_fiscais_itens").select("*, produtos(nome, sku)").eq("nota_fiscal_id", nf.id);
    setDevolucaoNF(nf);
    setDevolucaoItens((itens || []).map((i: any) => ({ ...i, qtd_devolver: 0, nome: i.produtos?.nome || "—" })));
    setDevolucaoModalOpen(true);
  };

  const tipoParam = searchParams.get("tipo");
  const viewParam = searchParams.get("view");
  const filteredData = useMemo(() => {
    const query = consultaSearch.trim().toLowerCase();
    return data.filter((n) => {
      if (tipoParam && n.tipo !== tipoParam) return false;
      if (tipoFilters.length > 0 && !tipoFilters.includes(n.tipo)) return false;
      if (modeloFilters.length > 0 && !modeloFilters.includes(n.modelo_documento || "55")) return false;
      if (statusFilters.length > 0 && !statusFilters.includes(n.status)) return false;
      if (viewParam !== "consulta" || !query) return true;
      const parceiro = n.tipo === "entrada" ? n.fornecedores?.nome_razao_social : n.clientes?.nome_razao_social;
      const haystack = [n.numero, n.serie, n.chave_acesso, parceiro, n.ordens_venda?.numero].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [consultaSearch, data, tipoParam, viewParam, modeloFilters, statusFilters, tipoFilters]);

  const fiscalActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    tipoFilters.forEach(f => chips.push({ key: "tipo", label: "Tipo", value: [f], displayValue: f === "entrada" ? "Entrada" : "Saída" }));
    modeloFilters.forEach(f => chips.push({ key: "modelo", label: "Modelo", value: [f], displayValue: modeloLabels[f] || f }));
    statusFilters.forEach(f => chips.push({ key: "status", label: "Status", value: [f], displayValue: f.charAt(0).toUpperCase() + f.slice(1) }));
    return chips;
  }, [tipoFilters, modeloFilters, statusFilters]);

  const handleRemoveFiscalFilter = (key: string, value?: string) => {
    if (key === "tipo") setTipoFilters(prev => prev.filter(v => v !== value));
    if (key === "modelo") setModeloFilters(prev => prev.filter(v => v !== value));
    if (key === "status") setStatusFilters(prev => prev.filter(v => v !== value));
  };

  const tipoOptions: MultiSelectOption[] = [{ label: "Entrada", value: "entrada" }, { label: "Saída", value: "saida" }];
  const modeloOptions: MultiSelectOption[] = Object.entries(modeloLabels).map(([v, l]) => ({ label: l, value: v }));
  const statusOptions: MultiSelectOption[] = [{ label: "Pendente", value: "pendente" }, { label: "Confirmada", value: "confirmada" }, { label: "Cancelada", value: "cancelada" }];

  const fiscalSubtitle = viewParam === "consulta"
    ? "Consulta rápida de documentos fiscais e chaves de acesso"
    : tipoParam === "entrada" ? "Notas fiscais de entrada e documentos de recebimento"
    : tipoParam === "saida" ? "Notas fiscais de saída e faturamento"
    : "Notas fiscais, faturas e documentos";

  const columns = [
    { key: "tipo", label: "Tipo", render: (n: NotaFiscal) => n.tipo === "entrada" ? "Entrada" : "Saída" },
    { key: "modelo", label: "Modelo", render: (n: NotaFiscal) => <span className="text-xs font-mono font-medium">{modeloLabels[n.modelo_documento || '55'] || n.modelo_documento}</span> },
    { key: "numero", label: "Número", render: (n: NotaFiscal) => <span className="font-mono text-xs font-medium text-primary">{n.numero}</span> },
    { key: "parceiro", label: "Parceiro", render: (n: NotaFiscal) => n.tipo === "entrada" ? n.fornecedores?.nome_razao_social || "—" : n.clientes?.nome_razao_social || "—" },
    { key: "ov", label: "Pedido", render: (n: NotaFiscal) => n.ordens_venda?.numero ? <span className="font-mono text-xs">{n.ordens_venda.numero}</span> : "—" },
    { key: "data_emissao", label: "Emissão", render: (n: NotaFiscal) => formatDate(n.data_emissao) },
    { key: "valor_total", label: "Total", render: (n: NotaFiscal) => <span className="font-semibold font-mono">{formatCurrency(Number(n.valor_total))}</span> },
    { key: "operacao", label: "Operação", render: (n: NotaFiscal) => {
      if ((n.tipo_operacao || "normal") === "devolucao") return <span className="text-xs text-warning font-medium">Devolução</span>;
      return <span className="text-xs text-muted-foreground">Normal</span>;
    }},
    { key: "status", label: "Status", render: (n: NotaFiscal) => <StatusBadge status={n.status} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Fiscal" subtitle={fiscalSubtitle} addLabel="Nova NF" onAdd={openCreate}
        headerActions={<>
          <input ref={xmlInputRef} type="file" accept=".xml" className="hidden" onChange={handleXmlImport} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => xmlInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Importar XML
          </Button>
        </>}
      >
        <AdvancedFilterBar
          searchValue={viewParam === "consulta" ? consultaSearch : ""}
          onSearchChange={viewParam === "consulta" ? setConsultaSearch : undefined}
          searchPlaceholder="Buscar por número, chave ou parceiro..."
          activeFilters={fiscalActiveFilters}
          onRemoveFilter={handleRemoveFiscalFilter}
          onClearAll={() => { setTipoFilters([]); setModeloFilters([]); setStatusFilters([]); }}
          count={filteredData.length}
        >
          {!tipoParam && <MultiSelect options={tipoOptions} selected={tipoFilters} onChange={setTipoFilters} placeholder="Tipo" className="w-[150px]" />}
          <MultiSelect options={modeloOptions} selected={modeloFilters} onChange={setModeloFilters} placeholder="Modelos" className="w-[180px]" />
          <MultiSelect options={statusOptions} selected={statusFilters} onChange={setStatusFilters} placeholder="Status" className="w-[180px]" />
        </AdvancedFilterBar>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total de NFs" value={String(kpis.total)} icon={FileText} variationType="neutral" variation="registros" />
          <SummaryCard title="Valor Total" value={formatCurrency(kpis.valorTotal)} icon={DollarSign} variationType="neutral" variation="acumulado" />
          <SummaryCard title="Pendentes" value={String(kpis.pendentes)} icon={Clock} variationType={kpis.pendentes > 0 ? "negative" : "neutral"} variation="aguardando confirmação" />
          <SummaryCard title="Confirmadas" value={String(kpis.confirmadas)} icon={CheckCircle} variationType="positive" variation="processadas" />
        </div>

        <DataTable columns={columns} data={filteredData} loading={loading} onView={openView} onEdit={openEdit} />
      </ModulePage>

      {/* Form Modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Nota Fiscal" : "Editar Nota Fiscal"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Modelo</Label>
              <Select value={form.modelo_documento || "55"} onValueChange={(v) => setForm({ ...form, modelo_documento: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="55">NF-e (Modelo 55)</SelectItem><SelectItem value="65">NFC-e (Modelo 65)</SelectItem><SelectItem value="57">CT-e (Modelo 57)</SelectItem><SelectItem value="67">CT-e OS (Modelo 67)</SelectItem><SelectItem value="nfse">NFS-e (Serviço)</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required className="font-mono" /></div>
            <div className="space-y-2"><Label>Série</Label><Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data Emissão</Label><Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} /></div>
          </div>
          <div className="col-span-2 space-y-2"><Label>Chave de Acesso</Label><Input value={form.chave_acesso} onChange={(e) => setForm({ ...form, chave_acesso: e.target.value })} className="font-mono text-xs" /></div>
          <div className="bg-accent/30 rounded-lg p-4 space-y-3">
            {form.tipo === "entrada" ? (
              <><Label className="text-sm font-semibold">Fornecedor</Label><AutocompleteSearch options={fornecedoresCrud.data.map((f: any) => ({ id: f.id, label: f.nome_razao_social, sublabel: f.cpf_cnpj }))} value={form.fornecedor_id} onChange={(id) => setForm({ ...form, fornecedor_id: id })} placeholder="Buscar fornecedor..." /></>
            ) : (
              <><Label className="text-sm font-semibold">Cliente</Label><AutocompleteSearch options={clientesCrud.data.map((c: any) => ({ id: c.id, label: c.nome_razao_social, sublabel: c.cpf_cnpj }))} value={form.cliente_id} onChange={(id) => setForm({ ...form, cliente_id: id })} placeholder="Buscar cliente..." /></>
            )}
          </div>
          {form.tipo === "saida" && ordensVenda.length > 0 && (
            <div className="space-y-2"><Label>Pedido (opcional)</Label>
              <Select value={form.ordem_venda_id || "none"} onValueChange={(v) => setForm({ ...form, ordem_venda_id: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Vincular a um Pedido..." /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{ordensVenda.map((ov: any) => (<SelectItem key={ov.id} value={ov.id}>{ov.numero} — {ov.clientes?.nome_razao_social || ""}</SelectItem>))}</SelectContent></Select>
            </div>
          )}
          <ItemsGrid items={items} onChange={setItems} produtos={produtosCrud.data} title="Itens da Nota" />
          {items.length > 0 && contasContabeis.length > 0 && (
            <div className="space-y-2"><Label className="text-sm font-semibold">Conta Contábil por Item</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground min-w-[120px] truncate">{item.descricao || `Item ${idx + 1}`}</span>
                    <Select value={itemContaContabil[idx] || "none"} onValueChange={(v) => setItemContaContabil(prev => ({ ...prev, [idx]: v === "none" ? "" : v }))}><SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Conta contábil..." /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{contasContabeis.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>))}</SelectContent></Select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3"><Label className="text-sm font-semibold">Frete, Impostos e Despesas</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[{ label: "Frete", key: "frete_valor" }, { label: "ICMS", key: "icms_valor" }, { label: "IPI", key: "ipi_valor" }, { label: "PIS", key: "pis_valor" }, { label: "COFINS", key: "cofins_valor" }, { label: "ICMS-ST", key: "icms_st_valor" }, { label: "Desconto", key: "desconto_valor" }, { label: "Outras Despesas", key: "outras_despesas" }].map(({ label, key }) => (
                <div key={key} className="space-y-1"><Label className="text-xs">{label}</Label><Input type="number" step="0.01" value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} className="h-8 text-xs" /></div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2"><Label>Forma de Pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="boleto">Boleto</SelectItem><SelectItem value="cartao">Cartão</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="transferencia">Transferência</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Condição</Label>
              <Select value={form.condicao_pagamento} onValueChange={(v) => setForm({ ...form, condicao_pagamento: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a_vista">À Vista</SelectItem><SelectItem value="a_prazo">A Prazo</SelectItem></SelectContent></Select>
            </div>
            {form.condicao_pagamento === "a_prazo" && <div className="space-y-2"><Label>Nº Parcelas</Label><Input type="number" min={1} max={48} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} /></div>}
            <div className="space-y-2 flex items-end gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={form.movimenta_estoque} onChange={(e) => setForm({ ...form, movimenta_estoque: e.target.checked })} className="rounded" />Mov. Estoque</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={form.gera_financeiro} onChange={(e) => setForm({ ...form, gera_financeiro: e.target.checked })} className="rounded" />Gera Financeiro</label>
            </div>
          </div>
          {contasContabeis.length > 0 && (
            <div className="space-y-2"><Label>Conta Contábil Geral (fallback para itens sem conta)</Label>
              <Select value={form.conta_contabil_id || "none"} onValueChange={(v) => setForm({ ...form, conta_contabil_id: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Vincular conta contábil..." /></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{contasContabeis.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>))}</SelectContent></Select>
            </div>
          )}
          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Produtos:</span><span className="font-mono font-semibold">{formatCurrency(valorProdutos)}</span></div>
            {Number(form.frete_valor || 0) > 0 && <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Frete:</span><span className="font-mono">{formatCurrency(Number(form.frete_valor))}</span></div>}
            {totalImpostos > 0 && <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Impostos:</span><span className="font-mono">{formatCurrency(totalImpostos)}</span></div>}
            {Number(form.desconto_valor || 0) > 0 && <div className="flex justify-between items-center text-sm text-destructive"><span>Desconto:</span><span className="font-mono">-{formatCurrency(Number(form.desconto_valor))}</span></div>}
            <div className="flex justify-between items-center text-sm font-bold border-t pt-2"><span>Total da NF:</span><span className="font-mono text-lg">{formatCurrency(totalNF)}</span></div>
            {form.condicao_pagamento === "a_prazo" && parcelas > 1 && <div className="flex justify-between items-center text-xs text-muted-foreground"><span>{parcelas}× de</span><span className="font-mono font-semibold">{formatCurrency(totalNF / parcelas)}</span></div>}
          </div>
          {!form.gera_financeiro && <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">⚠️ "Gera Financeiro" está desmarcado — esta NF <strong>não</strong> gerará lançamentos financeiros ao ser confirmada.</div>}
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      {/* View Drawer */}
      {selected && (() => {
        const subtotalProdutos = viewItems.reduce((s: number, i: any) => s + (i.quantidade * i.valor_unitario), 0);
        const totalImpostosView = Number(selected.icms_valor || 0) + Number(selected.ipi_valor || 0) + Number(selected.pis_valor || 0) + Number(selected.cofins_valor || 0) + Number(selected.icms_st_valor || 0);
        const condicaoLabel = selected.condicao_pagamento === 'a_vista' ? 'À Vista' : selected.condicao_pagamento === 'a_prazo' ? 'A Prazo' : selected.condicao_pagamento || '—';

        return (
          <ViewDrawerV2
            open={drawerOpen} onClose={() => setDrawerOpen(false)} title={`NF ${selected.numero}`}
            badge={<StatusBadge status={selected.status} />}
            actions={<>
              {selected.status === "confirmada" && selected.tipo === "saida" && (selected.tipo_operacao || "normal") === "normal" && (
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-warning hover:text-warning" onClick={() => { setDrawerOpen(false); openDevolucao(selected); }}><ArrowLeftRight className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Gerar Devolução</TooltipContent></Tooltip>
              )}
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
            </>}
            summary={
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-accent/30 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Tipo</p><p className="font-semibold text-sm capitalize">{selected.tipo === 'entrada' ? 'Entrada' : 'Saída'}</p></div>
                <div className="bg-accent/30 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Itens</p><p className="font-semibold text-sm font-mono">{viewItems.length}</p></div>
                <div className="bg-accent/30 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold text-sm font-mono">{formatCurrency(Number(selected.valor_total))}</p></div>
              </div>
            }
            tabs={[
              { value: "resumo", label: "Resumo", content: (
                <div className="space-y-5">
                  <ViewSection title="Informações Gerais"><div className="grid grid-cols-2 gap-4">
                    <ViewField label="Tipo"><span className="capitalize font-medium">{selected.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></ViewField>
                    <ViewField label="Modelo"><span className="font-mono font-medium">{modeloLabels[selected.modelo_documento || '55'] || selected.modelo_documento}</span></ViewField>
                    <ViewField label="Número / Série"><span className="font-mono font-medium">{selected.numero} / {selected.serie || '1'}</span></ViewField>
                    <ViewField label="Data Emissão">{formatDate(selected.data_emissao)}</ViewField>
                    <ViewField label="Status"><StatusBadge status={selected.status} /></ViewField>
                    {(selected.tipo_operacao || 'normal') !== 'normal' && <ViewField label="Operação"><span className="font-medium capitalize text-warning">{selected.tipo_operacao}</span></ViewField>}
                  </div>
                  {selected.chave_acesso && <div className="mt-3"><ViewField label="Chave de Acesso"><span className="font-mono text-xs break-all">{selected.chave_acesso}</span></ViewField></div>}
                  </ViewSection>
                  <ViewSection title="Parceiro"><div className="grid grid-cols-2 gap-4">
                    <ViewField label={selected.tipo === "entrada" ? "Fornecedor" : "Cliente"}>{selected.tipo === "entrada" ? selected.fornecedores?.nome_razao_social || "—" : selected.clientes?.nome_razao_social || "—"}</ViewField>
                    {selected.ordem_venda_id && selected.ordens_venda && <ViewField label="Pedido"><span className="font-mono font-medium">{selected.ordens_venda.numero}</span></ViewField>}
                  </div></ViewSection>
                  <ViewSection title="Pagamento"><div className="grid grid-cols-2 gap-4">
                    <ViewField label="Condição">{condicaoLabel}</ViewField>
                    <ViewField label="Forma"><span className="capitalize">{selected.forma_pagamento || '—'}</span></ViewField>
                    <ViewField label="Gera Financeiro"><span className={selected.gera_financeiro !== false ? "text-green-600 font-medium" : "text-muted-foreground"}>{selected.gera_financeiro !== false ? "Sim" : "Não"}</span></ViewField>
                    <ViewField label="Mov. Estoque"><span className={selected.movimenta_estoque !== false ? "text-green-600 font-medium" : "text-muted-foreground"}>{selected.movimenta_estoque !== false ? "Sim" : "Não"}</span></ViewField>
                  </div></ViewSection>
                  {selected.observacoes && <ViewSection title="Observações"><p className="text-sm text-muted-foreground">{selected.observacoes}</p></ViewSection>}
                </div>
              )},
              { value: "itens", label: `Itens (${viewItems.length})`, content: (
                <div className="space-y-4">
                  {viewItems.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-muted/50 border-b">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Produto</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Qtd</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Vlr. Unit.</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">CST</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">CFOP</th>
                    </tr></thead><tbody>
                      {viewItems.map((i: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/20">
                          <td className="px-3 py-2">{i.produtos?.nome || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{i.quantidade}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatCurrency(i.valor_unitario)}</td>
                          <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(i.quantidade * i.valor_unitario)}</td>
                          <td className="px-3 py-2 text-center font-mono text-xs">{i.cst || "—"}</td>
                          <td className="px-3 py-2 text-center font-mono text-xs">{i.cfop || "—"}</td>
                        </tr>
                      ))}
                    </tbody></table></div>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhum item</p>}
                </div>
              )},
              { value: "impostos", label: "Impostos", content: (
                <div className="bg-accent/30 rounded-lg p-4 space-y-2">
                  {[{ label: "Subtotal Produtos", val: subtotalProdutos }, { label: "Frete", val: Number(selected.frete_valor || 0) }, { label: "ICMS", val: Number(selected.icms_valor || 0) }, { label: "IPI", val: Number(selected.ipi_valor || 0) }, { label: "PIS", val: Number(selected.pis_valor || 0) }, { label: "COFINS", val: Number(selected.cofins_valor || 0) }, { label: "ICMS-ST", val: Number(selected.icms_st_valor || 0) }, { label: "Outras Despesas", val: Number(selected.outras_despesas || 0) }].map(({ label, val }) => (
                    <div key={label} className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono">{val > 0 ? formatCurrency(val) : '—'}</span></div>
                  ))}
                  {Number(selected.desconto_valor || 0) > 0 && <div className="flex justify-between text-sm text-destructive"><span>Desconto</span><span className="font-mono">-{formatCurrency(Number(selected.desconto_valor))}</span></div>}
                  <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Total da NF</span><span className="font-mono text-lg">{formatCurrency(Number(selected.valor_total))}</span></div>
                </div>
              )},
              { value: "logistica", label: "Logística", content: (
                <div className="space-y-4"><h4 className="text-sm font-semibold flex items-center gap-2 px-1"><Truck className="w-4 h-4" /> Rastreamento Logístico</h4><LogisticaRastreioSection notaFiscalId={selected.id} /></div>
              )},
              { value: "vinculos", label: "Vínculos", content: (
                <div className="space-y-4">
                  <ViewSection title="Vínculos"><div className="grid grid-cols-2 gap-4">
                    <ViewField label="Pedido">{selected.ordens_venda?.numero || "—"}</ViewField>
                    <ViewField label={selected.tipo === "entrada" ? "Fornecedor" : "Cliente"}>{selected.tipo === "entrada" ? selected.fornecedores?.nome_razao_social || "—" : selected.clientes?.nome_razao_social || "—"}</ViewField>
                  </div></ViewSection>
                  {viewItems.some((i: any) => i.contas_contabeis) && (
                    <ViewSection title="Contas Contábeis por Item"><div className="space-y-1">
                      {viewItems.filter((i: any) => i.contas_contabeis).map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm"><span className="text-muted-foreground truncate">{i.produtos?.nome || `Item ${idx + 1}`}</span><span className="font-mono text-xs">{i.contas_contabeis.codigo}</span></div>
                      ))}
                    </div></ViewSection>
                  )}
                </div>
              )},
            ]}
            footer={
              <div className="space-y-2">
                {selected.status === "pendente" && <Button className="w-full" onClick={() => { handleConfirmar(selected); setDrawerOpen(false); }}><CheckCircle className="w-4 h-4 mr-2" /> Confirmar Nota Fiscal</Button>}
                {selected.status === "confirmada" && selected.tipo === "saida" && (selected.tipo_operacao || "normal") === "normal" && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setDrawerOpen(false); openDevolucao(selected); }}><ArrowLeftRight className="w-4 h-4" /> Gerar Nota de Devolução</Button>
                )}
                {selected.status === "confirmada" && <Button variant="destructive" className="w-full" onClick={() => { handleEstornar(selected); setDrawerOpen(false); }}><XCircle className="w-4 h-4 mr-2" /> Estornar Nota Fiscal</Button>}
                <Button variant="outline" className="w-full" onClick={() => { setDrawerOpen(false); openDanfe(selected); }}><FileText className="w-4 h-4 mr-2" /> Visualizar DANFE</Button>
              </div>
            }
          />
        );
      })()}

      {/* Devolução Dialog */}
      <DevolucaoDialog
        open={devolucaoModalOpen}
        onOpenChange={setDevolucaoModalOpen}
        devolucaoNF={devolucaoNF}
        devolucaoItens={devolucaoItens}
        setDevolucaoItens={setDevolucaoItens}
        onSuccess={fetchData}
      />

      <DanfeViewer open={danfeOpen} onClose={() => setDanfeOpen(false)} data={danfeData} />
    </AppLayout>
  );
};

export default Fiscal;
