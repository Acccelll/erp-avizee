import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, AlertTriangle, CheckCircle2, ShieldAlert, Building2, Info, Star, FileText, TrendingUp } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

interface GrupoEconomico {
  id: string;
  nome: string;
  empresa_matriz_id: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

interface ClienteDoGrupo {
  id: string;
  nome_razao_social: string;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  tipo_relacao_grupo: string | null;
  cidade: string | null;
  uf: string | null;
}

interface ClienteSimples {
  id: string;
  nome_razao_social: string;
}

const emptyForm: Record<string, any> = { nome: "", observacoes: "", empresa_matriz_id: "" };

const relacaoLabel: Record<string, string> = {
  matriz: "Matriz",
  filial: "Filial",
  coligada: "Coligada",
  independente: "Independente",
};

const relacaoOrder: Record<string, number> = {
  matriz: 0,
  filial: 1,
  coligada: 2,
  independente: 3,
};

const DEFAULT_RELACAO_ORDER = 99;

function formatLocation(cidade: string | null, uf: string | null): string {
  return cidade ? `${cidade}/${uf}` : "—";
}

function getRiskInfo(titulosVencidos: number, saldoConsolidado: number) {
  if (titulosVencidos > 0)
    return { label: "Risco", Icon: ShieldAlert, colorClass: "bg-destructive/10 text-destructive", badgeClass: "border-destructive/50 text-destructive" };
  if (saldoConsolidado > 0)
    return { label: "Atenção", Icon: AlertTriangle, colorClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400", badgeClass: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400" };
  return { label: "Saudável", Icon: CheckCircle2, colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", badgeClass: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" };
}

const GruposEconomicos = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<GrupoEconomico>({ table: "grupos_economicos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<GrupoEconomico | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<ClienteDoGrupo[]>([]);
  const [saldoConsolidado, setSaldoConsolidado] = useState(0);
  const [titulosVencidos, setTitulosVencidos] = useState(0);
  const [titulosAbertos, setTitulosAbertos] = useState(0);
  const [matrizInfo, setMatrizInfo] = useState<ClienteDoGrupo | null>(null);
  const [perEmpresaFinanceiro, setPerEmpresaFinanceiro] = useState<Record<string, { saldo: number; vencidos: number }>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // modal-specific state for the improved edit form
  const [clientesDisponiveis, setClientesDisponiveis] = useState<ClienteSimples[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [modalEmpresas, setModalEmpresas] = useState<ClienteDoGrupo[]>([]);
  const [modalSaldo, setModalSaldo] = useState(0);
  const [modalVencidos, setModalVencidos] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const isDirty =
    form.nome !== initialForm.nome ||
    (form.observacoes || "") !== (initialForm.observacoes || "") ||
    (form.empresa_matriz_id || "") !== (initialForm.empresa_matriz_id || "");

  const loadClientes = async () => {
    if (clientesDisponiveis.length > 0) return;
    setLoadingClientes(true);
    try {
      const { data: c } = await supabase
        .from("clientes")
        .select("id, nome_razao_social")
        .eq("ativo", true)
        .order("nome_razao_social");
      setClientesDisponiveis((c as ClienteSimples[]) || []);
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadModalSummary = async (g: GrupoEconomico) => {
    setLoadingSummary(true);
    setModalEmpresas([]);
    setModalSaldo(0);
    setModalVencidos(0);
    try {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome_razao_social, nome_fantasia, cpf_cnpj, tipo_relacao_grupo, cidade, uf")
        .eq("grupo_economico_id", g.id)
        .eq("ativo", true);
      const clientesList: ClienteDoGrupo[] = (clientes as ClienteDoGrupo[]) || [];
      setModalEmpresas(clientesList);
      const clienteIds = clientesList.map((c) => c.id);
      if (clienteIds.length > 0) {
        const { data: titulos } = await supabase
          .from("financeiro_lancamentos")
          .select("valor, status")
          .in("cliente_id", clienteIds)
          .eq("tipo", "receber")
          .eq("ativo", true)
          .in("status", ["aberto", "vencido"]);
        const tots = (titulos || []) as { valor: string | number; status: string }[];
        setModalSaldo(tots.reduce((s, t) => s + Number(t.valor || 0), 0));
        setModalVencidos(tots.filter((t) => t.status === "vencido").length);
      }
    } finally {
      setLoadingSummary(false);
    }
  };

  const openCreate = () => {
    setMode("create");
    const f = { ...emptyForm };
    setForm(f);
    setInitialForm(f);
    setSelected(null);
    setModalEmpresas([]);
    setModalSaldo(0);
    setModalVencidos(0);
    setModalOpen(true);
    loadClientes();
  };

  const openEdit = (g: GrupoEconomico) => {
    setMode("edit");
    setSelected(g);
    const f = { nome: g.nome, observacoes: g.observacoes || "", empresa_matriz_id: g.empresa_matriz_id || "" };
    setForm(f);
    setInitialForm(f);
    setModalOpen(true);
    loadClientes();
    loadModalSummary(g);
  };

  const openView = async (g: GrupoEconomico) => {
    setSelected(g);
    setDrawerOpen(true);
    setEmpresas([]);
    setSaldoConsolidado(0);
    setTitulosVencidos(0);
    setTitulosAbertos(0);
    setMatrizInfo(null);
    setPerEmpresaFinanceiro({});

    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nome_razao_social, nome_fantasia, cpf_cnpj, tipo_relacao_grupo, cidade, uf")
      .eq("grupo_economico_id", g.id)
      .eq("ativo", true);

    const clientesList: ClienteDoGrupo[] = [...(clientes || [])];
    clientesList.sort((a, b) => {
      const orderA = relacaoOrder[a.tipo_relacao_grupo ?? "independente"] ?? DEFAULT_RELACAO_ORDER;
      const orderB = relacaoOrder[b.tipo_relacao_grupo ?? "independente"] ?? DEFAULT_RELACAO_ORDER;
      return orderA - orderB;
    });
    setEmpresas(clientesList);

    // Resolve matriz: prefer empresa_matriz_id, then tipo_relacao_grupo === "matriz"
    const matriz =
      (g.empresa_matriz_id ? clientesList.find((c) => c.id === g.empresa_matriz_id) : undefined) ??
      clientesList.find((c) => c.tipo_relacao_grupo === "matriz") ??
      null;
    setMatrizInfo(matriz);

    // Consolidate financials
    const clienteIds = clientesList.map((c) => c.id);
    if (clienteIds.length > 0) {
      const { data: titulos } = await supabase
        .from("financeiro_lancamentos")
        .select("valor, status, cliente_id")
        .in("cliente_id", clienteIds)
        .eq("tipo", "receber")
        .eq("ativo", true)
        .in("status", ["aberto", "vencido"]);

      const tots = titulos || [];
      setSaldoConsolidado(tots.reduce((s, t: any) => s + Number(t.valor || 0), 0));
      setTitulosVencidos(tots.filter((t: any) => t.status === "vencido").length);
      setTitulosAbertos(tots.filter((t: any) => t.status === "aberto").length);

      const perEmp: Record<string, { saldo: number; vencidos: number }> = {};
      for (const c of clientesList) {
        const empTitulos = tots.filter((t: any) => t.cliente_id === c.id);
        perEmp[c.id] = {
          saldo: empTitulos.reduce((s, t: any) => s + Number(t.valor || 0), 0),
          vencidos: empTitulos.filter((t: any) => t.status === "vencido").length,
        };
      }
      setPerEmpresaFinanceiro(perEmp);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = form.nome.trim();
    if (!nome || nome.length < 2) return;
    setSaving(true);
    try {
      const payload = {
        nome,
        observacoes: form.observacoes?.trim() || null,
        empresa_matriz_id: form.empresa_matriz_id || null,
      };
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch (err) {
      console.error("[grupos-economicos] erro ao salvar:", err);
      toast.error("Erro ao salvar grupo econômico");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await remove(selected.id);
      setDeleteConfirmOpen(false);
      setDrawerOpen(false);
    } catch (err) {
      console.error("[grupos-economicos] erro ao excluir:", err);
      toast.error("Erro ao excluir grupo econômico");
    }
    setDeleting(false);
  };

  const columns = [
    { key: "nome", label: "Nome do Grupo" },
    { key: "ativo", label: "Status", render: (g: GrupoEconomico) => <StatusBadge status={g.ativo ? "Ativo" : "Inativo"} /> },
  ];

  // Derived values used across tabs
  const riskInfo = getRiskInfo(titulosVencidos, saldoConsolidado);
  const { Icon: RiskIcon } = riskInfo;
  const empresasComInadimplencia = empresas.filter((e) => (perEmpresaFinanceiro[e.id]?.vencidos ?? 0) > 0);
  const demaisEmpresas = empresas.filter((e) => e.id !== matrizInfo?.id);

  /* ── Tab: Resumo ── */
  const tabResumo = (
    <div className="space-y-4">
      <ViewSection title="Identificação">
        <div className="grid grid-cols-2 gap-4">
          <ViewField label="Nome do Grupo">{selected?.nome}</ViewField>
          <ViewField label="Status"><StatusBadge status={selected?.ativo ? "Ativo" : "Inativo"} /></ViewField>
        </div>
        {matrizInfo && (
          <ViewField label="Empresa Matriz">
            <RelationalLink type="cliente" id={matrizInfo.id}>{matrizInfo.nome_razao_social}</RelationalLink>
          </ViewField>
        )}
      </ViewSection>

      <ViewSection title="Situação Consolidada">
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${riskInfo.colorClass}`}>
          <RiskIcon className="w-4 h-4 shrink-0" />
          <span>
            Grupo {riskInfo.label}
            {riskInfo.label === "Risco" && ` — ${titulosVencidos} título(s) vencido(s)`}
            {riskInfo.label === "Atenção" && ` — saldo aberto de ${formatCurrency(saldoConsolidado)}`}
            {riskInfo.label === "Saudável" && " — sem títulos em aberto"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div className="rounded-lg border bg-card p-3 text-center space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Empresas</p>
            <p className="font-bold text-2xl text-foreground">{empresas.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Saldo Aberto</p>
            <p className={`font-mono font-bold text-xs ${saldoConsolidado > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
              {formatCurrency(saldoConsolidado)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Vencidos</p>
            <p className={`font-bold text-2xl ${titulosVencidos > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {titulosVencidos}
            </p>
          </div>
        </div>
      </ViewSection>

      {selected?.observacoes && (
        <ViewSection title="Observações">
          <p className="text-sm text-muted-foreground leading-relaxed">{selected.observacoes}</p>
        </ViewSection>
      )}
    </div>
  );

  /* ── Tab: Empresas ── */
  const tabEmpresas = (
    <div className="space-y-4">
      {empresas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma empresa vinculada a este grupo.</p>
      ) : (
        <>
          {matrizInfo && (
            <ViewSection title="Empresa Matriz">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <RelationalLink type="cliente" id={matrizInfo.id}>
                      <span className="font-semibold text-sm">{matrizInfo.nome_razao_social}</span>
                    </RelationalLink>
                    {matrizInfo.nome_fantasia && (
                      <p className="text-xs text-muted-foreground">{matrizInfo.nome_fantasia}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {matrizInfo.cpf_cnpj || "—"} • {formatLocation(matrizInfo.cidade, matrizInfo.uf)}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-primary/40 text-primary shrink-0">Matriz</Badge>
                </div>
              </div>
            </ViewSection>
          )}

          {demaisEmpresas.length > 0 && (
            <ViewSection title={`Empresas Vinculadas (${demaisEmpresas.length})`}>
              <div className="space-y-1">
                {demaisEmpresas.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <RelationalLink type="cliente" id={emp.id}>
                        <span className="font-medium text-sm">{emp.nome_razao_social}</span>
                      </RelationalLink>
                      {emp.nome_fantasia && <p className="text-xs text-muted-foreground truncate">{emp.nome_fantasia}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {emp.cpf_cnpj || "—"} • {formatLocation(emp.cidade, emp.uf)}
                      </p>
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                      {relacaoLabel[emp.tipo_relacao_grupo ?? "independente"] ?? emp.tipo_relacao_grupo}
                    </span>
                  </div>
                ))}
              </div>
            </ViewSection>
          )}
        </>
      )}
    </div>
  );

  /* ── Tab: Financeiro ── */
  const hasFinanceiro = empresas.some((e) => (perEmpresaFinanceiro[e.id]?.saldo ?? 0) > 0 || (perEmpresaFinanceiro[e.id]?.vencidos ?? 0) > 0);

  const tabFinanceiro = (
    <div className="space-y-4">
      <ViewSection title="Resumo Consolidado">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Saldo Total em Aberto</p>
            <p className={`font-mono font-bold text-xs ${saldoConsolidado > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
              {formatCurrency(saldoConsolidado)}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Títulos Vencidos</p>
            <p className={`font-bold text-2xl ${titulosVencidos > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {titulosVencidos}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Títulos a Vencer</p>
            <p className="font-bold text-2xl text-foreground">{titulosAbertos}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Empresas Inadimplentes</p>
            <p className={`font-bold text-2xl ${empresasComInadimplencia.length > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {empresasComInadimplencia.length}
            </p>
          </div>
        </div>
        {titulosVencidos > 0 && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2 mt-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Risco financeiro consolidado — {titulosVencidos} título(s) vencido(s) em {empresasComInadimplencia.length} empresa(s)
          </div>
        )}
      </ViewSection>

      <ViewSection title="Exposição por Empresa">
        {!hasFinanceiro ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem títulos em aberto para este grupo.</p>
        ) : (
          <div className="space-y-1">
            {empresas
              .filter((e) => (perEmpresaFinanceiro[e.id]?.saldo ?? 0) > 0 || (perEmpresaFinanceiro[e.id]?.vencidos ?? 0) > 0)
              .map((emp) => {
                const fin = perEmpresaFinanceiro[emp.id] ?? { saldo: 0, vencidos: 0 };
                return (
                  <div key={emp.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <RelationalLink type="cliente" id={emp.id}>
                        <span className="font-medium text-sm">{emp.nome_razao_social}</span>
                      </RelationalLink>
                      <p className="text-xs text-muted-foreground">
                        {relacaoLabel[emp.tipo_relacao_grupo ?? "independente"] ?? emp.tipo_relacao_grupo}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2 space-y-0.5">
                      <p className={`font-mono text-xs font-semibold ${fin.saldo > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                        {formatCurrency(fin.saldo)}
                      </p>
                      {fin.vencidos > 0 && (
                        <p className="text-[10px] text-destructive font-medium">{fin.vencidos} vencido(s)</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </ViewSection>
    </div>
  );

  /* ── Tab: Observações ── */
  const tabObservacoes = (
    <div className="space-y-4">
      <ViewSection title="Observações do Grupo">
        {selected?.observacoes ? (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.observacoes}</p>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma observação registrada para este grupo.</p>
        )}
      </ViewSection>

      <ViewSection title="Composição">
        <div className="grid grid-cols-2 gap-4">
          <ViewField label="Total de Empresas">{String(empresas.length)}</ViewField>
          <ViewField label="Empresa Matriz">{matrizInfo?.nome_razao_social ?? "—"}</ViewField>
          <ViewField label="Filiais">{String(empresas.filter((e) => e.tipo_relacao_grupo === "filial").length)}</ViewField>
          <ViewField label="Coligadas">{String(empresas.filter((e) => e.tipo_relacao_grupo === "coligada").length)}</ViewField>
        </div>
      </ViewSection>
    </div>
  );

  /* ── Risk badge for drawer header ── */
  const riskBadge = selected ? (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${riskInfo.badgeClass}`}>
      <RiskIcon className="w-2.5 h-2.5 mr-1" />
      {riskInfo.label}
    </Badge>
  ) : undefined;

  /* ── Delete confirmation description ── */
  const deleteDescription = [
    `Tem certeza que deseja excluir o grupo "${selected?.nome}"?`,
    empresas.length > 0 && `Este grupo possui ${empresas.length} empresa(s) vinculada(s).`,
    saldoConsolidado > 0 && `Há saldo aberto de ${formatCurrency(saldoConsolidado)}.`,
    titulosVencidos > 0 && `Existem ${titulosVencidos} título(s) vencido(s).`,
    empresas.length > 0 && "Considere inativar o grupo em vez de excluí-lo.",
    "Esta ação não pode ser desfeita.",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AppLayout>
      <ModulePage
        title="Grupos Econômicos"
        subtitle="Gestão de grupos (matriz, filial, coligada)"
        addLabel="Novo Grupo"
        onAdd={openCreate}
        count={data.length}
      >
        <DataTable columns={columns} data={data} loading={loading} onView={openView} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Grupo Econômico" : "Editar Grupo Econômico"} size="lg">
        {/* Edit mode context bar */}
        {mode === "edit" && selected && (
          <div className="flex flex-wrap items-center gap-3 bg-muted/40 rounded-lg px-3 py-2 mb-4 text-xs text-muted-foreground border">
            <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
            {isDirty && (
              <span className="flex items-center gap-1 text-amber-600 ml-auto font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                Alterações não salvas
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-0">
          {/* ── BLOCO 1: IDENTIFICAÇÃO DO GRUPO ── */}
          <div className="flex items-center gap-2 pb-3 border-b mb-3">
            <Building2 className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Identificação do Grupo</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Defina como o grupo será identificado no sistema. O nome é usado para consolidar dados comerciais e financeiros das empresas vinculadas.
          </p>
          <div className="mb-6 space-y-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium">Nome do Grupo *</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-xs">
                  Grupos econômicos servem para consolidar empresas relacionadas e permitir leitura comercial e financeira conjunta. O nome deve ser único e representar claramente a estrutura.
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Grupo ABC, Holding XYZ..."
              required
              minLength={2}
              className="font-medium"
            />
            {form.nome.trim().length > 0 && form.nome.trim().length < 2 && (
              <p className="text-xs text-destructive mt-1">O nome deve ter ao menos 2 caracteres.</p>
            )}
          </div>

          {/* ── BLOCO 2: EMPRESA MATRIZ ── */}
          <div className="flex items-center gap-2 pt-2 pb-3 border-t border-b mb-3">
            <Star className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Empresa Matriz</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            A empresa matriz é a controladora principal do grupo. Sua definição facilita a consolidação de informações e aparece em destaque no painel do grupo.
          </p>
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center gap-1">
              <Label>Empresa Matriz</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-xs">
                  Selecione o cliente cadastrado que representa a empresa controladora deste grupo. A composição completa do grupo é definida pelos clientes vinculados a ele.
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={form.empresa_matriz_id || "nenhuma"}
              onValueChange={(v) => setForm({ ...form, empresa_matriz_id: v === "nenhuma" ? "" : v })}
              disabled={loadingClientes}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingClientes ? "Carregando clientes..." : "Selecionar empresa matriz..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Nenhuma</SelectItem>
                {clientesDisponiveis.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome_razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.empresa_matriz_id ? (
            <div className="mb-5 flex items-center gap-2 bg-primary/5 rounded-md px-3 py-2 text-xs text-muted-foreground border border-primary/20">
              <Star className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span>
                <strong className="text-foreground">
                  {clientesDisponiveis.find((c) => c.id === form.empresa_matriz_id)?.nome_razao_social ?? "—"}
                </strong>
                {" — definida como empresa controladora do grupo"}
              </span>
            </div>
          ) : (
            <div className="mb-5 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2 border">
              Sem empresa matriz definida. O grupo pode ser estruturado apenas com as empresas vinculadas.
            </div>
          )}

          {/* ── BLOCO 3: CONTEXTO / OBSERVAÇÕES ── */}
          <div className="flex items-center gap-2 pt-2 pb-3 border-t border-b mb-3">
            <FileText className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Contexto / Observações</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Observações comerciais, financeiras e estruturais sobre o grupo.
          </p>
          <div className="mb-5 space-y-1.5">
            <div className="flex items-center gap-1">
              <Label>Observações</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-xs">
                  Use este campo para registrar informações relevantes sobre o grupo: histórico, particularidades comerciais, condições especiais de relacionamento, etc.
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Registre informações relevantes sobre o grupo econômico: histórico, particularidades comerciais, condições especiais..."
              className="min-h-[96px] resize-y"
              rows={4}
            />
          </div>

          {/* ── BLOCO 4: RESUMO CONSOLIDADO (edit mode only) ── */}
          {mode === "edit" && (
            <>
              <div className="flex items-center gap-2 pt-2 pb-3 border-t border-b mb-3">
                <TrendingUp className="w-4 h-4 text-primary/70" />
                <h3 className="font-semibold text-sm">Resumo Consolidado</h3>
                <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">apenas leitura</span>
              </div>
              {loadingSummary ? (
                <div className="mb-5 h-[76px] rounded-lg bg-muted/30 animate-pulse" />
              ) : (
                <div className="mb-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Empresas</p>
                    <p className="font-bold text-2xl text-foreground">{modalEmpresas.length}</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Saldo Aberto</p>
                    <p className={`font-mono font-bold text-xs ${modalSaldo > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                      {formatCurrency(modalSaldo)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Vencidos</p>
                    <p className={`font-bold text-2xl ${modalVencidos > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {modalVencidos}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── FOOTER ── */}
          <div className="flex items-center justify-between pt-4 border-t">
            {isDirty ? (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                Alterações não salvas
              </span>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={saving || !form.nome.trim() || form.nome.trim().length < 2}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </FormModal>

      <ViewDrawerV2
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.nome ?? "Grupo Econômico"}
        badge={
          selected ? (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
              {riskBadge}
            </div>
          ) : undefined
        }
        actions={
          selected ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
            </>
          ) : undefined
        }
        tabs={[
          { value: "resumo", label: "Resumo", content: tabResumo },
          { value: "empresas", label: `Empresas (${empresas.length})`, content: tabEmpresas },
          { value: "financeiro", label: "Financeiro", content: tabFinanceiro },
          { value: "observacoes", label: "Observações", content: tabObservacoes },
        ]}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Excluir Grupo Econômico"
        description={deleteDescription}
      />
    </AppLayout>
  );
};

export default GruposEconomicos;
