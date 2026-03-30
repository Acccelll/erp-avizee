import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AdvancedFilterBar, type FilterChip } from "@/components/AdvancedFilterBar";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, CreditCard, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SummaryCard } from "@/components/SummaryCard";
import { PeriodFilter, financialPeriods, type Period } from "@/components/dashboard/PeriodFilter";
import { periodToFinancialRange } from "@/lib/periodFilter";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Clock, AlertTriangle, CheckCircle, CalendarClock, Download, List, CalendarDays } from "lucide-react";
import { FinanceiroCalendar } from "@/components/financeiro/FinanceiroCalendar";
import { BaixaParcialDialog } from "@/components/financeiro/BaixaParcialDialog";

interface Lancamento {
  id: string; tipo: string; descricao: string; valor: number;
  data_vencimento: string; data_pagamento: string; status: string;
  forma_pagamento: string; banco: string; cartao: string;
  cliente_id: string; fornecedor_id: string; nota_fiscal_id: string;
  conta_bancaria_id: string; conta_contabil_id: string;
  parcela_numero: number; parcela_total: number;
  documento_pai_id: string; saldo_restante: number | null;
  observacoes: string; ativo: boolean;
  clientes?: { nome_razao_social: string }; fornecedores?: { nome_razao_social: string };
  contas_bancarias?: { descricao: string; bancos?: { nome: string } };
  contas_contabeis?: { codigo: string; descricao: string };
}

interface ContaBancaria {
  id: string; descricao: string; banco_id: string;
  agencia: string; conta: string; titular: string; saldo_atual: number; ativo: boolean;
  bancos?: { nome: string };
}

const emptyForm: Record<string, any> = {
  tipo: "receber", descricao: "", valor: 0, data_vencimento: new Date().toISOString().split("T")[0],
  data_pagamento: "", status: "aberto", forma_pagamento: "", banco: "", cartao: "",
  cliente_id: "", fornecedor_id: "", conta_bancaria_id: "", conta_contabil_id: "", observacoes: "",
  gerar_parcelas: false, num_parcelas: 2, intervalo_dias: 30,
};

const Financeiro = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<Lancamento>({
    table: "financeiro_lancamentos",
    select: "*, clientes(nome_razao_social), fornecedores(nome_razao_social), contas_bancarias(descricao, bancos(nome))"
  });
  const clientesCrud = useSupabaseCrud<any>({ table: "clientes" });
  const fornecedoresCrud = useSupabaseCrud<any>({ table: "fornecedores" });

  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [contasContabeis, setContasContabeis] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Lancamento | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get("tipo");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterTipo, setFilterTipo] = useState<string>(tipoParam || "todos");
  const [filterBanco, setFilterBanco] = useState("todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [baixaDate, setBaixaDate] = useState(new Date().toISOString().split("T")[0]);
  const [baixaProcessing, setBaixaProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"lista" | "calendario">("lista");
  const [baixaParcialOpen, setBaixaParcialOpen] = useState(false);
  const [baixaParcialTarget, setBaixaParcialTarget] = useState<Lancamento | null>(null);
  const [estornoTarget, setEstornoTarget] = useState<Lancamento | null>(null);
  const [estornoProcessing, setEstornoProcessing] = useState(false);
  const [baixaFormaPagamento, setBaixaFormaPagamento] = useState("");
  const [baixaContaBancaria, setBaixaContaBancaria] = useState("");
  const [tipoBaixa, setTipoBaixa] = useState<"total" | "parcial">("total");
  const [valorPagoBaixa, setValorPagoBaixa] = useState(0);

  useEffect(() => { if (tipoParam) setFilterTipo(tipoParam); }, [tipoParam]);

  useEffect(() => {
    const load = async () => {
      const [{ data: contas }, { data: contabeis }] = await Promise.all([
        supabase.from("contas_bancarias").select("*, bancos(nome)").eq("ativo", true),
        supabase.from("contas_contabeis").select("id, codigo, descricao").eq("ativo", true).eq("aceita_lancamento", true).order("codigo"),
      ]);
      setContasBancarias(contas || []);
      setContasContabeis(contabeis || []);
    };
    load();
  }, []);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setModalOpen(true); };
  const openEdit = (l: Lancamento) => {
    setMode("edit"); setSelected(l);
    setForm({
      tipo: l.tipo, descricao: l.descricao, valor: l.valor, data_vencimento: l.data_vencimento,
      data_pagamento: l.data_pagamento || "", status: l.status,
      forma_pagamento: l.forma_pagamento || "", banco: l.banco || "", cartao: l.cartao || "",
      cliente_id: l.cliente_id || "", fornecedor_id: l.fornecedor_id || "",
      conta_bancaria_id: l.conta_bancaria_id || "", conta_contabil_id: l.conta_contabil_id || "",
      observacoes: l.observacoes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao || !form.valor) { toast.error("Descrição e valor são obrigatórios"); return; }
    if (form.status === "pago") {
      if (!form.data_pagamento) { toast.error("Data de pagamento é obrigatória para status Pago"); return; }
      if (!form.forma_pagamento) { toast.error("Forma de pagamento é obrigatória para status Pago"); return; }
      if (!form.conta_bancaria_id) { toast.error("Conta bancária é obrigatória para baixa"); return; }
    }
    setSaving(true);
    try {
      const basePayload = {
        tipo: form.tipo, descricao: form.descricao, valor: form.valor,
        data_vencimento: form.data_vencimento, status: form.status,
        forma_pagamento: form.forma_pagamento || null, banco: form.banco || null,
        cartao: form.cartao || null,
        cliente_id: form.cliente_id || null,
        fornecedor_id: form.fornecedor_id || null,
        conta_bancaria_id: form.conta_bancaria_id || null,
        conta_contabil_id: form.conta_contabil_id || null,
        data_pagamento: form.data_pagamento || null,
        observacoes: form.observacoes || null,
      };

      if (mode === "create" && form.gerar_parcelas && form.num_parcelas > 1) {
        // Gerar parcelas automáticas
        const numP = Number(form.num_parcelas);
        const intervalo = Number(form.intervalo_dias) || 30;
        const valorParcela = Number((form.valor / numP).toFixed(2));
        const resto = Number((form.valor - valorParcela * numP).toFixed(2));

        // Create parent record first
        const parentPayload = {
          ...basePayload,
          descricao: `${form.descricao} (agrupador)`,
          parcela_numero: 0, parcela_total: numP,
        };
        const parentResult = await create(parentPayload);
        const parentId = (parentResult as any)?.id;

        for (let i = 0; i < numP; i++) {
          const venc = new Date(form.data_vencimento);
          venc.setDate(venc.getDate() + intervalo * i);
          await create({
            ...basePayload,
            descricao: `${form.descricao} - ${i + 1}/${numP}`,
            valor: i === numP - 1 ? valorParcela + resto : valorParcela,
            data_vencimento: venc.toISOString().split("T")[0],
            parcela_numero: i + 1,
            parcela_total: numP,
            documento_pai_id: parentId || null,
          });
        }
        toast.success(`${numP} parcelas geradas com sucesso!`);
      } else if (mode === "create") {
        await create(basePayload);
      } else if (selected) {
        await update(selected.id, basePayload);
      }
      setModalOpen(false);
    } catch { }
    setSaving(false);
  };

  const hoje = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const getEffectiveStatus = (lancamento: Lancamento) => {
    const status = (lancamento.status || "").toLowerCase();
    if (status === "aberto" && lancamento.data_vencimento) {
      const vencimento = new Date(lancamento.data_vencimento);
      vencimento.setHours(0, 0, 0, 0);
      if (vencimento < hoje) return "vencido";
    }
    return status || "aberto";
  };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const { dateFrom, dateTo } = periodToFinancialRange(period);
    const isOverdueFilter = period === "vencidos";
    const todayStr = hoje.toISOString().split("T")[0];

    return data.filter((l) => {
      const effectiveStatus = getEffectiveStatus(l);

      // Period filter (forward-looking for financial)
      if (period === "todos") {
        // No date filter - show all
      } else if (isOverdueFilter) {
        // Show all overdue (vencimento before today and not paid)
        if (effectiveStatus !== "vencido") return false;
      } else {
        // Forward-looking: show items with vencimento between today and today+N
        if (l.data_vencimento < dateFrom) return false;
        if (dateTo && l.data_vencimento > dateTo) return false;
      }

      if (filterStatus !== "todos" && effectiveStatus !== filterStatus) return false;
      if (filterTipo !== "todos" && l.tipo !== filterTipo) return false;
      if (filterBanco !== "todos" && l.conta_bancaria_id !== filterBanco) return false;
      if (query) {
        const haystack = [l.descricao, l.clientes?.nome_razao_social, l.fornecedores?.nome_razao_social].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [data, filterStatus, filterTipo, filterBanco, searchTerm, hoje, period]);

  // KPI calculations
  const kpis = useMemo(() => {
    const hojeStr = hoje.toISOString().split("T")[0];
    let aVencer = 0, venceHoje = 0, vencido = 0, pagoNoPeriodo = 0;
    let totalAVencer = 0, totalVencido = 0, totalPago = 0;
    let age1_30 = 0, age31_60 = 0, age61_90 = 0, age90plus = 0;

    filteredData.forEach(l => {
      const val = Number(l.valor || 0);
      const effectiveStatus = getEffectiveStatus(l);

      if (effectiveStatus === "pago") {
        pagoNoPeriodo++;
        totalPago += val;
      } else if (effectiveStatus === "vencido") {
        vencido++;
        totalVencido += val;
        const vencDate = new Date(l.data_vencimento);
        const diffDays = Math.floor((hoje.getTime() - vencDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) age1_30 += val;
        else if (diffDays <= 60) age31_60 += val;
        else if (diffDays <= 90) age61_90 += val;
        else age90plus += val;
      } else if (effectiveStatus === "aberto") {
        if (l.data_vencimento === hojeStr) venceHoje++;
        aVencer++;
        totalAVencer += val;
      }
    });

    return { aVencer, venceHoje, vencido, pagoNoPeriodo, totalAVencer, totalVencido, totalPago, age1_30, age31_60, age61_90, age90plus };
  }, [filteredData, hoje]);

  // Batch payment — open modal
  const openBaixaModal = () => {
    if (selectedIds.length === 0) { toast.error("Selecione os lançamentos para dar baixa"); return; }
    setBaixaDate(new Date().toISOString().split("T")[0]);
    setBaixaFormaPagamento("");
    setBaixaContaBancaria("");
    setTipoBaixa("total");
    setValorPagoBaixa(0);
    setBaixaModalOpen(true);
  };

  const selectedForBaixa = useMemo(() => {
    return data.filter(l => selectedIds.includes(l.id));
  }, [data, selectedIds]);

  const totalBaixa = useMemo(() => {
    return selectedForBaixa.reduce((s, l) => s + Number(l.saldo_restante != null ? l.saldo_restante : l.valor || 0), 0);
  }, [selectedForBaixa]);

  // Reset valorPagoBaixa when totalBaixa or tipoBaixa changes
  useEffect(() => {
    if (baixaModalOpen) setValorPagoBaixa(totalBaixa);
  }, [totalBaixa, baixaModalOpen]);

  const handleConfirmBaixa = async () => {
    if (!baixaDate) { toast.error("Data de baixa é obrigatória"); return; }
    if (!baixaFormaPagamento) { toast.error("Forma de pagamento é obrigatória"); return; }
    if (!baixaContaBancaria) { toast.error("Conta bancária é obrigatória"); return; }
    if (tipoBaixa === "parcial" && (valorPagoBaixa <= 0 || valorPagoBaixa >= totalBaixa)) {
      toast.error("Para baixa parcial, informe um valor menor que o total");
      return;
    }
    setBaixaProcessing(true);
    try {
      if (tipoBaixa === "total") {
        for (const id of selectedIds) {
          const l = selectedForBaixa.find(x => x.id === id);
          const valor = l ? Number(l.saldo_restante != null ? l.saldo_restante : l.valor) : 0;
          await supabase.from("financeiro_lancamentos").update({
            status: "pago", data_pagamento: baixaDate,
            valor_pago: valor, tipo_baixa: "total",
            forma_pagamento: baixaFormaPagamento,
            conta_bancaria_id: baixaContaBancaria,
            saldo_restante: 0,
          } as any).eq("id", id);
          // Insert baixa record
          await supabase.from("financeiro_baixas" as any).insert({
            lancamento_id: id, valor_pago: valor,
            data_baixa: baixaDate, forma_pagamento: baixaFormaPagamento,
            conta_bancaria_id: baixaContaBancaria,
          });
        }
        toast.success(`${selectedIds.length} lançamento(s) baixado(s) integralmente!`);
      } else {
        // Parcial — distribute valorPagoBaixa proportionally across selected
        const ratio = valorPagoBaixa / totalBaixa;
        for (const id of selectedIds) {
          const l = selectedForBaixa.find(x => x.id === id);
          const saldo = l ? Number(l.saldo_restante != null ? l.saldo_restante : l.valor) : 0;
          const pagoParcial = Math.round(saldo * ratio * 100) / 100;
          const novoSaldo = Math.max(0, saldo - pagoParcial);
          const novoStatus = novoSaldo <= 0.01 ? "pago" : "parcial";
          await supabase.from("financeiro_lancamentos").update({
            status: novoStatus,
            data_pagamento: novoStatus === "pago" ? baixaDate : null,
            valor_pago: pagoParcial, tipo_baixa: "parcial",
            forma_pagamento: baixaFormaPagamento,
            conta_bancaria_id: baixaContaBancaria,
            saldo_restante: novoSaldo,
          } as any).eq("id", id);
          await supabase.from("financeiro_baixas" as any).insert({
            lancamento_id: id, valor_pago: pagoParcial,
            data_baixa: baixaDate, forma_pagamento: baixaFormaPagamento,
            conta_bancaria_id: baixaContaBancaria,
          });
        }
        toast.success(`Baixa parcial registrada para ${selectedIds.length} lançamento(s)!`);
      }
      setSelectedIds([]);
      setBaixaModalOpen(false);
      window.location.reload();
    } catch {
      toast.error("Erro ao processar baixa em lote");
    }
    setBaixaProcessing(false);
  };

  const handleEstorno = async () => {
    if (!estornoTarget) return;
    setEstornoProcessing(true);
    try {
      // Reset the lancamento
      await supabase.from("financeiro_lancamentos").update({
        status: "aberto", data_pagamento: null,
        valor_pago: null, tipo_baixa: null,
        saldo_restante: null,
      } as any).eq("id", estornoTarget.id);
      // Delete related baixas
      await supabase.from("financeiro_baixas").delete().eq("lancamento_id", estornoTarget.id);
      // Deactivate child lancamentos (parcelas filhas criadas por baixa parcial)
      await supabase.from("financeiro_lancamentos").update({ ativo: false } as any).eq("documento_pai_id", estornoTarget.id);
      toast.success("Estorno realizado com sucesso!");
      setEstornoTarget(null);
      window.location.reload();
    } catch {
      toast.error("Erro ao estornar");
    }
    setEstornoProcessing(false);
  };

  const columns = [
    { key: "tipo", label: "Tipo", render: (l: Lancamento) => (
      <Badge variant="outline" className={l.tipo === "receber" ? "border-success/40 text-success bg-success/5" : "border-destructive/40 text-destructive bg-destructive/5"}>
        {l.tipo === "receber" ? "Receber" : "Pagar"}
      </Badge>
    )},
    { key: "descricao", label: "Descrição", sortable: true },
    { key: "parceiro", label: "Parceiro", render: (l: Lancamento) => l.tipo === "receber" ? l.clientes?.nome_razao_social || "—" : l.fornecedores?.nome_razao_social || "—" },
    { key: "valor", label: "Valor", sortable: true, render: (l: Lancamento) => <span className="font-semibold mono">{formatCurrency(Number(l.valor))}</span> },
    { key: "data_vencimento", label: "Vencimento", sortable: true, render: (l: Lancamento) => {
      const d = new Date(l.data_vencimento);
      const isOverdue = getEffectiveStatus(l) === "vencido";
      const isToday = l.data_vencimento === hoje.toISOString().split("T")[0];
      return <span className={isOverdue ? "text-destructive font-semibold" : isToday ? "text-warning font-semibold" : ""}>{d.toLocaleDateString("pt-BR")}</span>;
    }},
    { key: "conta_bancaria", label: "Banco/Conta", render: (l: Lancamento) => {
      if (!l.contas_bancarias) return <span className="text-muted-foreground text-xs">—</span>;
      return <span className="text-xs">{l.contas_bancarias.bancos?.nome} - {l.contas_bancarias.descricao}</span>;
    }},
    { key: "forma_pagamento", label: "Forma", render: (l: Lancamento) => l.forma_pagamento || "—" },
    { key: "status", label: "Status", sortable: true, render: (l: Lancamento) => <StatusBadge status={getEffectiveStatus(l)} /> },
  ];

  const finActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    if (filterTipo !== "todos") chips.push({ key: "tipo", label: "Tipo", value: filterTipo, displayValue: filterTipo === "receber" ? "A Receber" : "A Pagar" });
    if (filterStatus !== "todos") chips.push({ key: "status", label: "Status", value: filterStatus, displayValue: filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1) });
    if (filterBanco !== "todos") {
      const banco = contasBancarias.find(c => c.id === filterBanco);
      chips.push({ key: "banco", label: "Banco", value: filterBanco, displayValue: banco ? `${banco.bancos?.nome} - ${banco.descricao}` : filterBanco });
    }
    return chips;
  }, [filterTipo, filterStatus, filterBanco, contasBancarias]);

  const handleRemoveFinFilter = (key: string) => {
    if (key === "tipo") setFilterTipo("todos");
    if (key === "status") setFilterStatus("todos");
    if (key === "banco") setFilterBanco("todos");
  };

  const handleClearAllFinFilters = () => { setFilterTipo("todos"); setFilterStatus("todos"); setFilterBanco("todos"); };

  return (
    <AppLayout>
      <ModulePage title="Contas a Pagar/Receber" subtitle="Gestão unificada de contas a pagar e receber" addLabel="Novo Lançamento" onAdd={openCreate}>

        {/* Period filter + view toggle */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <PeriodFilter value={period} onChange={setPeriod} options={financialPeriods} />
          <div className="flex gap-1 ml-auto rounded-lg border p-0.5">
            <Button size="sm" variant={viewMode === "lista" ? "default" : "ghost"} className="h-7 gap-1.5 text-xs" onClick={() => setViewMode("lista")}>
              <List className="h-3.5 w-3.5" /> Lista
            </Button>
            <Button size="sm" variant={viewMode === "calendario" ? "default" : "ghost"} className="h-7 gap-1.5 text-xs" onClick={() => setViewMode("calendario")}>
              <CalendarDays className="h-3.5 w-3.5" /> Calendário
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="A Vencer" value={kpis.aVencer.toString()} subtitle={formatCurrency(kpis.totalAVencer)} icon={CalendarClock} variant="info" onClick={() => setFilterStatus("aberto")} />
          <SummaryCard title="Vence Hoje" value={kpis.venceHoje.toString()} icon={Clock} variant="warning" />
          <SummaryCard title="Vencidos" value={kpis.vencido.toString()} subtitle={formatCurrency(kpis.totalVencido)} icon={AlertTriangle} variant="danger" onClick={() => setFilterStatus("vencido")} />
          <SummaryCard title="Pagos" value={kpis.pagoNoPeriodo.toString()} subtitle={formatCurrency(kpis.totalPago)} icon={CheckCircle} variant="success" onClick={() => setFilterStatus("pago")} />
        </div>

        {/* AdvancedFilterBar */}
        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por descrição ou parceiro..."
          activeFilters={finActiveFilters}
          onRemoveFilter={handleRemoveFinFilter}
          onClearAll={handleClearAllFinFilters}
          count={filteredData.length}
          extra={selectedIds.length > 0 ? (
            <Button size="sm" variant="default" className="gap-2" onClick={openBaixaModal}>
              <Download className="w-3.5 h-3.5" /> Baixar {selectedIds.length} selecionado(s)
            </Button>
          ) : undefined}
        >
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="receber">A Receber</SelectItem>
              <SelectItem value="pagar">A Pagar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          {contasBancarias.length > 0 && (
            <Select value={filterBanco} onValueChange={setFilterBanco}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Banco" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os bancos</SelectItem>
                {contasBancarias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.bancos?.nome} - {c.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </AdvancedFilterBar>

        {viewMode === "calendario" ? (
          <FinanceiroCalendar data={filteredData as any} />
        ) : (
          <DataTable columns={columns} data={filteredData} loading={loading}
            selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds}
            onView={(l) => { setSelected(l); setDrawerOpen(true); }} />
        )}
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Lançamento" : "Editar Lançamento"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="receber">A Receber</SelectItem><SelectItem value="pagar">A Pagar</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Forma de Pagamento</Label>
              <Select value={form.forma_pagamento || "nenhum"} onValueChange={(v) => setForm({ ...form, forma_pagamento: v === "nenhum" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Selecione...</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 md:col-span-3 space-y-2"><Label>Descrição *</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} required /></div>
            <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data Pagamento</Label><Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Conta Bancária {form.status === "pago" ? "*" : ""}</Label>
              <Select value={form.conta_bancaria_id || "nenhum"} onValueChange={(v) => setForm({ ...form, conta_bancaria_id: v === "nenhum" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione conta..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Selecione...</SelectItem>
                  {contasBancarias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.bancos?.nome} - {c.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cartão</Label><Input value={form.cartao} onChange={(e) => setForm({ ...form, cartao: e.target.value })} /></div>
            {form.tipo === "receber" && (
              <div className="space-y-2"><Label>Cliente</Label>
                <Select value={form.cliente_id || "nenhum"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "nenhum" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Selecione...</SelectItem>
                    {clientesCrud.data.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.tipo === "pagar" && (
              <div className="space-y-2"><Label>Fornecedor</Label>
                <Select value={form.fornecedor_id || "nenhum"} onValueChange={(v) => setForm({ ...form, fornecedor_id: v === "nenhum" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Selecione...</SelectItem>
                    {fornecedoresCrud.data.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.nome_razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {contasContabeis.length > 0 && (
            <div className="space-y-2">
              <Label>Conta Contábil (opcional)</Label>
              <Select value={form.conta_contabil_id || "none"} onValueChange={(v) => setForm({ ...form, conta_contabil_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Vincular conta contábil..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {contasContabeis.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.status === "pago" && (!form.data_pagamento || !form.forma_pagamento || !form.conta_bancaria_id) && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
              ⚠️ Para confirmar como Pago, preencha Data de Pagamento, Forma de Pagamento e Conta Bancária.
            </div>
          )}

          {/* Parcelamento */}
          {mode === "create" && (
            <div className="space-y-3 rounded-lg border p-4">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.gerar_parcelas} onChange={(e) => setForm({ ...form, gerar_parcelas: e.target.checked })} className="rounded" />
                Gerar parcelas automaticamente
              </label>
              {form.gerar_parcelas && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Nº de Parcelas</Label>
                    <Input type="number" min={2} max={48} value={form.num_parcelas} onChange={(e) => setForm({ ...form, num_parcelas: Number(e.target.value) })} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Intervalo (dias)</Label>
                    <Input type="number" min={1} max={365} value={form.intervalo_dias} onChange={(e) => setForm({ ...form, intervalo_dias: Number(e.target.value) })} className="h-9" />
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {form.num_parcelas > 1 && form.valor > 0 && (
                      <span>{form.num_parcelas}× de <strong>{formatCurrency(form.valor / form.num_parcelas)}</strong> a cada {form.intervalo_dias} dias</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawerV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Lançamento"
        actions={selected ? <>
          {getEffectiveStatus(selected) !== "pago" && getEffectiveStatus(selected) !== "cancelado" && getEffectiveStatus(selected) !== "parcial" && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => { setBaixaParcialTarget(selected); setBaixaParcialOpen(true); }}><CreditCard className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Registrar Baixa</TooltipContent></Tooltip>
          )}
          {getEffectiveStatus(selected) === "parcial" && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => { setBaixaParcialTarget(selected); setBaixaParcialOpen(true); }}><CreditCard className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Continuar Baixa</TooltipContent></Tooltip>
          )}
          {(getEffectiveStatus(selected) === "pago" || getEffectiveStatus(selected) === "parcial") && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-warning hover:text-warning" onClick={() => { setDrawerOpen(false); setEstornoTarget(selected); }}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Estornar Baixa</TooltipContent></Tooltip>
          )}
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
        badge={selected ? <StatusBadge status={getEffectiveStatus(selected)} /> : undefined}
        tabs={selected ? [
          { value: "dados", label: "Dados", content: (
            <div className="space-y-4">
              <ViewSection title="Informações gerais">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Tipo">
                    <Badge variant="outline" className={selected.tipo === "receber" ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>
                      {selected.tipo === "receber" ? "A Receber" : "A Pagar"}
                    </Badge>
                  </ViewField>
                  <ViewField label="Status"><StatusBadge status={getEffectiveStatus(selected)} /></ViewField>
                </div>
                <ViewField label="Descrição">{selected.descricao}</ViewField>
              </ViewSection>

              <ViewSection title="Valores e datas">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Valor"><span className="font-semibold mono">{formatCurrency(Number(selected.valor))}</span></ViewField>
                  <ViewField label="Saldo Restante">
                    <span className="font-semibold mono">
                      {formatCurrency(selected.saldo_restante != null ? Number(selected.saldo_restante) : Number(selected.valor))}
                    </span>
                  </ViewField>
                  <ViewField label="Vencimento">{new Date(selected.data_vencimento).toLocaleDateString("pt-BR")}</ViewField>
                </div>
                {selected.data_pagamento && (
                  <ViewField label="Data Pagamento">{new Date(selected.data_pagamento).toLocaleDateString("pt-BR")}</ViewField>
                )}
              </ViewSection>
            </div>
          )},
          { value: "detalhes", label: "Detalhes", content: (
            <div className="space-y-4">
              <ViewSection title="Pagamento">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Forma">{selected.forma_pagamento || "—"}</ViewField>
                  <ViewField label="Banco/Conta">
                    {selected.contas_bancarias ? (
                      <RelationalLink to="/contas-bancarias">{selected.contas_bancarias.bancos?.nome} - {selected.contas_bancarias.descricao}</RelationalLink>
                    ) : "—"}
                  </ViewField>
                </div>
                {selected.parcela_numero && (
                  <ViewField label="Parcela"><span className="mono">{selected.parcela_numero}/{selected.parcela_total}</span></ViewField>
                )}
              </ViewSection>
              <ViewSection title="Vínculos">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Parceiro">
                    {selected.tipo === "receber" && selected.clientes?.nome_razao_social ? (
                      <RelationalLink to="/clientes">{selected.clientes.nome_razao_social}</RelationalLink>
                    ) : selected.tipo === "pagar" && selected.fornecedores?.nome_razao_social ? (
                      <RelationalLink to="/fornecedores">{selected.fornecedores.nome_razao_social}</RelationalLink>
                    ) : "—"}
                  </ViewField>
                  {selected.nota_fiscal_id && (
                    <ViewField label="Origem"><RelationalLink to="/fiscal">NF vinculada</RelationalLink></ViewField>
                  )}
                </div>
                {selected.contas_contabeis && (
                  <ViewField label="Conta Contábil">
                    <RelationalLink to="/contas-contabeis">{selected.contas_contabeis.codigo} - {selected.contas_contabeis.descricao}</RelationalLink>
                  </ViewField>
                )}
              </ViewSection>
              {selected.observacoes && (
                <ViewSection title="Observações">
                  <p className="text-sm">{selected.observacoes}</p>
                </ViewSection>
              )}
            </div>
          )},
        ] : undefined}
      />

      {/* Baixa Modal */}
      <Dialog open={baixaModalOpen} onOpenChange={setBaixaModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirmar Baixa — {selectedIds.length} título(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Parceiro</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Valor</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedForBaixa.map((l, idx) => (
                    <tr key={l.id} className={idx % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="px-3 py-2 text-xs">{l.descricao}</td>
                      <td className="px-3 py-2 text-xs">{l.tipo === "receber" ? l.clientes?.nome_razao_social : l.fornecedores?.nome_razao_social || "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono text-right font-semibold">{formatCurrency(Number(l.valor))}</td>
                      <td className="px-3 py-2 text-xs text-right">{new Date(l.data_vencimento).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={2} className="px-3 py-2 text-xs font-semibold">Total</td>
                    <td className="px-3 py-2 text-xs font-mono text-right font-bold text-primary">{formatCurrency(totalBaixa)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Baixa *</Label>
                <Input type="date" value={baixaDate} onChange={(e) => setBaixaDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Baixa</Label>
                <Select value={tipoBaixa} onValueChange={(v) => setTipoBaixa(v as "total" | "parcial")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select value={baixaFormaPagamento || "none"} onValueChange={(v) => setBaixaFormaPagamento(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conta Bancária *</Label>
                <Select value={baixaContaBancaria || "none"} onValueChange={(v) => setBaixaContaBancaria(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione conta..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione...</SelectItem>
                    {contasBancarias.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.bancos?.nome} - {c.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {tipoBaixa === "parcial" && (
              <div className="space-y-2">
                <Label>Valor a Pagar *</Label>
                <Input type="number" step="0.01" min={0.01} max={totalBaixa - 0.01}
                  value={valorPagoBaixa} onChange={(e) => setValorPagoBaixa(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Total selecionado: {formatCurrency(totalBaixa)} — Restante após baixa: {formatCurrency(Math.max(0, totalBaixa - valorPagoBaixa))}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaModalOpen(false)} disabled={baixaProcessing}>Cancelar</Button>
            <Button onClick={handleConfirmBaixa} disabled={baixaProcessing || !baixaDate}>
              {baixaProcessing ? "Processando..." : "Confirmar Baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estorno Confirm Dialog */}
      <ConfirmDialog
        open={!!estornoTarget}
        onClose={() => setEstornoTarget(null)}
        onConfirm={handleEstorno}
        title="Confirmar Estorno"
        description={`Deseja estornar a baixa do lançamento "${estornoTarget?.descricao}"? O status voltará para Aberto e as baixas registradas serão removidas.`}
        confirmLabel="Estornar"
        loading={estornoProcessing}
      />

      <BaixaParcialDialog
        open={baixaParcialOpen}
        onClose={() => setBaixaParcialOpen(false)}
        lancamento={baixaParcialTarget}
        contasBancarias={contasBancarias}
        onSuccess={() => { window.location.reload(); }}
      />
    </AppLayout>
  );
};

export default Financeiro;
