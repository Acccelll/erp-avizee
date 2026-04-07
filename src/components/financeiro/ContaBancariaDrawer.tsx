import { useState, useEffect } from "react";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RelationalLink } from "@/components/ui/RelationalLink";
import {
  Edit,
  Trash2,
  Landmark,
  TrendingUp,
  TrendingDown,
  Clock,
  X,
  Save,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Banco {
  id: string;
  nome: string;
  tipo: string;
}

interface ContaBancaria {
  id: string;
  banco_id: string;
  descricao: string;
  agencia: string | null;
  conta: string | null;
  titular: string | null;
  saldo_atual: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  bancos?: { nome: string; tipo: string };
}

interface LancamentoResumo {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  forma_pagamento: string | null;
  clientes?: { nome_razao_social: string } | null;
  fornecedores?: { nome_razao_social: string } | null;
}

interface BaixaResumo {
  id: string;
  valor_pago: number;
  data_baixa: string;
  forma_pagamento: string | null;
  lancamento_id: string;
}

interface CaixaMovimento {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  created_at: string;
}

interface EditForm {
  descricao: string;
  banco_id: string;
  agencia: string;
  conta: string;
  titular: string;
  ativo: boolean;
}

interface EditErrors {
  descricao?: string;
  banco_id?: string;
}

interface ContaBancariaDrawerProps {
  open: boolean;
  onClose: () => void;
  selected: ContaBancaria | null;
  bancos: Banco[];
  onSaved: () => void;
  onDelete: (c: ContaBancaria) => void;
}

const tipoContaLabel: Record<string, string> = {
  corrente: "Conta Corrente",
  poupanca: "Poupança",
  investimento: "Investimento",
  caixa: "Caixa",
};

function getTipoLabel(tipo: string | undefined) {
  if (!tipo) return "—";
  return tipoContaLabel[tipo.toLowerCase()] ?? tipo;
}

export function ContaBancariaDrawer({
  open,
  onClose,
  selected,
  bancos,
  onSaved,
  onDelete,
}: ContaBancariaDrawerProps) {
  const [lancamentos, setLancamentos] = useState<LancamentoResumo[]>([]);
  const [baixas, setBaixas] = useState<BaixaResumo[]>([]);
  const [caixaMovs, setCaixaMovs] = useState<CaixaMovimento[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit mode state
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editForm, setEditForm] = useState<EditForm>({
    descricao: "",
    banco_id: "",
    agencia: "",
    conta: "",
    titular: "",
    ativo: true,
  });
  const [editErrors, setEditErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmInactivate, setConfirmInactivate] = useState(false);

  // Reset to view mode when drawer closes or selection changes
  useEffect(() => {
    if (!open) setMode("view");
  }, [open]);

  useEffect(() => {
    if (!open || !selected) {
      setLancamentos([]);
      setBaixas([]);
      setCaixaMovs([]);
      return;
    }
    setLoading(true);
    Promise.all([
      supabase
        .from("financeiro_lancamentos")
        .select(
          "id, tipo, descricao, valor, data_vencimento, status, forma_pagamento, clientes(nome_razao_social), fornecedores(nome_razao_social)"
        )
        .eq("conta_bancaria_id", selected.id)
        .eq("ativo", true)
        .order("data_vencimento", { ascending: false })
        .limit(10),
      supabase
        .from("financeiro_baixas" as any)
        .select("id, valor_pago, data_baixa, forma_pagamento, lancamento_id")
        .eq("conta_bancaria_id", selected.id)
        .order("data_baixa", { ascending: false })
        .limit(10),
      supabase
        .from("caixa_movimentos")
        .select("id, tipo, descricao, valor, created_at")
        .eq("conta_bancaria_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([lanc, bx, cx]) => {
      setLancamentos((lanc.data as LancamentoResumo[]) || []);
      setBaixas((bx.data as BaixaResumo[]) || []);
      setCaixaMovs((cx.data as CaixaMovimento[]) || []);
      setLoading(false);
    });
  }, [open, selected?.id]);

  const enterEditMode = () => {
    if (!selected) return;
    setEditForm({
      descricao: selected.descricao,
      banco_id: selected.banco_id,
      agencia: selected.agencia ?? "",
      conta: selected.conta ?? "",
      titular: selected.titular ?? "",
      ativo: selected.ativo,
    });
    setEditErrors({});
    setMode("edit");
  };

  const cancelEdit = () => {
    setMode("view");
    setEditErrors({});
  };

  const validateEditForm = (): boolean => {
    const errors: EditErrors = {};
    if (!editForm.descricao.trim()) errors.descricao = "Descrição é obrigatória";
    if (!editForm.banco_id) errors.banco_id = "Banco é obrigatório";
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!selected) return;
    if (!validateEditForm()) return;

    // If deactivating an account that is in use, request confirmation
    const inUse = lancamentos.length > 0 || baixas.length > 0 || caixaMovs.length > 0;
    if (!editForm.ativo && selected.ativo && inUse) {
      setConfirmInactivate(true);
      return;
    }

    await persistSave();
  };

  const persistSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contas_bancarias")
        .update({
          descricao: editForm.descricao.trim(),
          banco_id: editForm.banco_id,
          agencia: editForm.agencia.trim() || null,
          conta: editForm.conta.trim() || null,
          titular: editForm.titular.trim() || null,
          ativo: editForm.ativo,
        })
        .eq("id", selected.id);

      if (error) throw error;
      toast.success("Conta bancária atualizada com sucesso!");
      onSaved();
      setMode("view");
    } catch (err: unknown) {
      console.error("[conta-bancaria-drawer]", err);
      toast.error("Erro ao salvar conta bancária.");
    } finally {
      setSaving(false);
    }
  };

  if (!selected) return <ViewDrawerV2 open={open} onClose={onClose} title="" />;

  const saldo = Number(selected.saldo_atual ?? 0);
  const totalReceber = lancamentos
    .filter((l) => l.tipo === "receber" && l.status !== "pago" && l.status !== "cancelado")
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalPagar = lancamentos
    .filter((l) => l.tipo === "pagar" && l.status !== "pago" && l.status !== "cancelado")
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalBaixas = baixas.reduce((s, b) => s + Number(b.valor_pago), 0);

  const ultimaBaixa = baixas[0]
    ? new Date(baixas[0].data_baixa).toLocaleDateString("pt-BR")
    : null;

  const formasPagamento = Array.from(
    new Set(
      baixas
        .map((b) => b.forma_pagamento)
        .filter(Boolean) as string[]
    )
  );

  const bancoLabel = selected.bancos?.nome ?? "—";
  const tipoLabel = getTipoLabel(selected.bancos?.tipo);
  const inUseCount = lancamentos.length + baixas.length + caixaMovs.length;

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (mode === "edit") {
    const editBancoNome =
      bancos.find((b) => b.id === editForm.banco_id)?.nome ?? bancoLabel;
    const willDeactivate = !editForm.ativo && selected.ativo;
    const inUse = inUseCount > 0;

    return (
      <>
        <ViewDrawerV2
          open={open}
          onClose={onClose}
          title={`Editando: ${selected.descricao}`}
          subtitle={
            <span className="flex items-center gap-1">
              <Landmark className="inline h-3 w-3 text-muted-foreground" />
              {editBancoNome}
              <span className="text-muted-foreground/60 mx-1">·</span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Modo de edição administrativa
              </span>
            </span>
          }
          badge={
            <Badge
              variant="outline"
              className={
                selected.ativo
                  ? "border-success/40 text-success"
                  : "border-muted-foreground/40 text-muted-foreground"
              }
            >
              {selected.ativo ? "Ativa" : "Inativa"}
            </Badge>
          }
          actions={
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancelar edição</TooltipContent>
              </Tooltip>
            </>
          }
          footer={
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* BLOCO 1 — Dados da Conta */}
            <ViewSection title="Dados da Conta">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-descricao">
                    Descrição / Apelido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-descricao"
                    value={editForm.descricao}
                    onChange={(e) => {
                      setEditForm({ ...editForm, descricao: e.target.value });
                      if (editErrors.descricao) setEditErrors({ ...editErrors, descricao: undefined });
                    }}
                    placeholder="Ex: Conta Corrente Principal"
                    className={editErrors.descricao ? "border-destructive" : ""}
                  />
                  {editErrors.descricao && (
                    <p className="text-xs text-destructive">{editErrors.descricao}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-banco">
                    Banco <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={editForm.banco_id}
                    onValueChange={(v) => {
                      setEditForm({ ...editForm, banco_id: v });
                      if (editErrors.banco_id) setEditErrors({ ...editErrors, banco_id: undefined });
                    }}
                  >
                    <SelectTrigger
                      id="edit-banco"
                      className={editErrors.banco_id ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Selecione o banco..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editErrors.banco_id && (
                    <p className="text-xs text-destructive">{editErrors.banco_id}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-agencia">Agência</Label>
                    <Input
                      id="edit-agencia"
                      value={editForm.agencia}
                      onChange={(e) => setEditForm({ ...editForm, agencia: e.target.value })}
                      placeholder="Ex: 0001"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-conta">Número da Conta</Label>
                    <Input
                      id="edit-conta"
                      value={editForm.conta}
                      onChange={(e) => setEditForm({ ...editForm, conta: e.target.value })}
                      placeholder="Ex: 12345-6"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-titular">Titular</Label>
                  <Input
                    id="edit-titular"
                    value={editForm.titular}
                    onChange={(e) => setEditForm({ ...editForm, titular: e.target.value })}
                    placeholder="Nome do titular da conta"
                  />
                </div>
              </div>
            </ViewSection>

            {/* BLOCO 2 — Configuração */}
            <ViewSection title="Configuração">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-ativo" className="text-sm font-medium cursor-pointer">
                      Conta ativa
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Contas inativas não aparecem para seleção em lançamentos
                    </p>
                  </div>
                  <Switch
                    id="edit-ativo"
                    checked={editForm.ativo}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, ativo: checked })}
                  />
                </div>

                {willDeactivate && inUse && (
                  <Alert variant="destructive" className="border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300 [&>svg]:text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs space-y-1">
                      <p className="font-semibold">Esta conta está em uso no sistema</p>
                      <p>
                        Foram encontrados{" "}
                        {lancamentos.length > 0 && `${lancamentos.length} lançamento(s)`}
                        {lancamentos.length > 0 && baixas.length > 0 && ", "}
                        {baixas.length > 0 && `${baixas.length} baixa(s)`}
                        {(lancamentos.length > 0 || baixas.length > 0) && caixaMovs.length > 0 && " e "}
                        {caixaMovs.length > 0 && `${caixaMovs.length} movimento(s) de caixa`}
                        {" "}vinculados a esta conta.
                      </p>
                      <p>Ao salvar, você será solicitado a confirmar a inativação.</p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ViewSection>

            {/* BLOCO 3 — Informativo (read-only) */}
            <ViewSection title="Informações da Conta">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Saldo Atual">
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      saldo >= 0 ? "text-success" : "text-destructive"
                    )}
                  >
                    {formatCurrency(saldo)}
                  </span>
                </ViewField>
                {selected.created_at && (
                  <ViewField label="Cadastrada em">
                    {new Date(selected.created_at).toLocaleDateString("pt-BR")}
                  </ViewField>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                O saldo é atualizado automaticamente pelas movimentações financeiras.
              </p>
            </ViewSection>
          </div>
        </ViewDrawerV2>

        <AlertDialog open={confirmInactivate} onOpenChange={setConfirmInactivate}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Confirmar inativação da conta
              </AlertDialogTitle>
              <AlertDialogDescription className="sr-only">
                Confirmar inativação
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="px-6 pb-2 space-y-2 text-sm">
              <p>
                A conta <strong>{selected.descricao}</strong> ({bancoLabel}) está vinculada a:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {lancamentos.length > 0 && (
                  <li>{lancamentos.length} lançamento(s) financeiro(s)</li>
                )}
                {baixas.length > 0 && <li>{baixas.length} baixa(s) registrada(s)</li>}
                {caixaMovs.length > 0 && (
                  <li>{caixaMovs.length} movimento(s) de caixa</li>
                )}
              </ul>
              <p className="font-medium text-foreground">
                Deseja realmente inativar esta conta? Os vínculos existentes não serão removidos,
                mas a conta deixará de aparecer para novos lançamentos.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmInactivate(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  await persistSave();
                  setConfirmInactivate(false);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirmar inativação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  const summary = (
    <div className="grid grid-cols-2 gap-2">
      <div
        className={cn(
          "rounded-lg border p-3 space-y-0.5",
          saldo >= 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Saldo Atual
        </span>
        <p
          className={cn(
            "text-sm font-bold font-mono",
            saldo >= 0 ? "text-success" : "text-destructive"
          )}
        >
          {formatCurrency(saldo)}
        </p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Lançamentos
        </span>
        <p className="text-sm font-bold font-mono">{lancamentos.length}</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Total Baixado
        </span>
        <p className="text-sm font-bold font-mono text-success">{formatCurrency(totalBaixas)}</p>
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 space-y-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Última Baixa
        </span>
        <p className="text-sm font-semibold">{ultimaBaixa ?? "—"}</p>
      </div>
    </div>
  );

  return (
    <ViewDrawerV2
      open={open}
      onClose={onClose}
      title={selected.descricao}
      subtitle={
        <span>
          <Landmark className="inline h-3 w-3 mr-1 text-muted-foreground" />
          {bancoLabel}
          {tipoLabel !== "—" ? ` · ${tipoLabel}` : ""}
        </span>
      }
      badge={
        <Badge
          variant="outline"
          className={
            selected.ativo
              ? "border-success/40 text-success"
              : "border-muted-foreground/40 text-muted-foreground"
          }
        >
          {selected.ativo ? "Ativa" : "Inativa"}
        </Badge>
      }
      summary={summary}
      actions={
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={enterEditMode}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => { onClose(); onDelete(selected); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </>
      }
      tabs={[
        {
          value: "resumo",
          label: "Resumo",
          content: (
            <div className="space-y-4">
              <ViewSection title="Dados da Conta">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Banco">{bancoLabel}</ViewField>
                  <ViewField label="Tipo">{tipoLabel}</ViewField>
                  {selected.agencia && (
                    <ViewField label="Agência">
                      <span className="font-mono">{selected.agencia}</span>
                    </ViewField>
                  )}
                  {selected.conta && (
                    <ViewField label="Conta">
                      <span className="font-mono">{selected.conta}</span>
                    </ViewField>
                  )}
                  {selected.titular && (
                    <ViewField label="Titular">{selected.titular}</ViewField>
                  )}
                  <ViewField label="Status">
                    <Badge
                      variant="outline"
                      className={
                        selected.ativo
                          ? "border-success/40 text-success"
                          : "border-muted-foreground/40 text-muted-foreground"
                      }
                    >
                      {selected.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </ViewField>
                </div>
              </ViewSection>
              <ViewSection title="Posição Financeira">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Saldo Atual">
                    <span
                      className={cn(
                        "font-mono font-bold",
                        saldo >= 0 ? "text-success" : "text-destructive"
                      )}
                    >
                      {formatCurrency(saldo)}
                    </span>
                  </ViewField>
                  <ViewField label="Lançamentos Ativos">
                    <span className="font-mono">{lancamentos.length}</span>
                  </ViewField>
                  <ViewField label="A Receber (aberto)">
                    <span className="font-mono text-success">{formatCurrency(totalReceber)}</span>
                  </ViewField>
                  <ViewField label="A Pagar (aberto)">
                    <span className="font-mono text-destructive">{formatCurrency(totalPagar)}</span>
                  </ViewField>
                </div>
              </ViewSection>
            </div>
          ),
        },
        {
          value: "movimentacoes",
          label: lancamentos.length > 0 ? `Movimentações (${lancamentos.length})` : "Movimentações",
          content: (
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : lancamentos.length === 0 && baixas.length === 0 && caixaMovs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma movimentação registrada</p>
                  <p className="text-xs mt-1">
                    Esta conta ainda não está vinculada a lançamentos ou baixas.
                  </p>
                </div>
              ) : (
                <>
                  {lancamentos.length > 0 && (
                    <ViewSection title="Últimos Lançamentos">
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                                Descrição
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                                Venc.
                              </th>
                              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                                Valor
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {lancamentos.map((l, i) => (
                              <tr
                                key={l.id}
                                className={cn(
                                  "border-b last:border-0",
                                  i % 2 !== 0 && "bg-muted/20"
                                )}
                              >
                                <td className="px-3 py-2 max-w-[120px] truncate">
                                  {l.descricao || "—"}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {new Date(
                                    l.data_vencimento + "T00:00:00"
                                  ).toLocaleDateString("pt-BR")}
                                </td>
                                <td
                                  className={cn(
                                    "px-3 py-2 text-right font-mono font-semibold whitespace-nowrap",
                                    l.tipo === "receber"
                                      ? "text-success"
                                      : "text-destructive"
                                  )}
                                >
                                  {l.tipo === "receber" ? "+" : "-"}
                                  {formatCurrency(Number(l.valor))}
                                </td>
                                <td className="px-3 py-2">
                                  <StatusBadge status={l.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span>{lancamentos.length} lançamento(s) exibido(s)</span>
                        <RelationalLink to="/financeiro">Ver todos no Financeiro</RelationalLink>
                      </div>
                    </ViewSection>
                  )}

                  {baixas.length > 0 && (
                    <ViewSection title="Últimas Baixas">
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                                Data
                              </th>
                              <th className="text-right px-3 py-2 font-semibold text-muted-foreground">
                                Valor
                              </th>
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                                Forma
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {baixas.map((b, i) => (
                              <tr
                                key={b.id}
                                className={cn(
                                  "border-b last:border-0",
                                  i % 2 !== 0 && "bg-muted/20"
                                )}
                              >
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {new Date(b.data_baixa).toLocaleDateString("pt-BR")}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-semibold text-success whitespace-nowrap">
                                  {formatCurrency(Number(b.valor_pago))}
                                </td>
                                <td className="px-3 py-2">{b.forma_pagamento || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ViewSection>
                  )}

                  {caixaMovs.length > 0 && (
                    <ViewSection title="Caixa / Movimentos">
                      <div className="space-y-1.5">
                        {caixaMovs.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {m.tipo === "entrada" ? (
                                <TrendingUp className="h-3 w-3 text-success shrink-0" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-destructive shrink-0" />
                              )}
                              <span className="truncate">{m.descricao}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <span
                                className={cn(
                                  "font-mono font-semibold",
                                  m.tipo === "entrada"
                                    ? "text-success"
                                    : "text-destructive"
                                )}
                              >
                                {m.tipo === "entrada" ? "+" : "-"}
                                {formatCurrency(Number(m.valor))}
                              </span>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(m.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ViewSection>
                  )}
                </>
              )}
            </div>
          ),
        },
        {
          value: "configuracao",
          label: "Configuração",
          content: (
            <div className="space-y-4">
              <ViewSection title="Dados Bancários">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Banco">{bancoLabel}</ViewField>
                  <ViewField label="Tipo de Conta">{tipoLabel}</ViewField>
                  <ViewField label="Agência">
                    <span className="font-mono">{selected.agencia || "—"}</span>
                  </ViewField>
                  <ViewField label="Número da Conta">
                    <span className="font-mono">{selected.conta || "—"}</span>
                  </ViewField>
                  <ViewField label="Titular">{selected.titular || "—"}</ViewField>
                  <ViewField label="Saldo Inicial / Atual">
                    <span className={cn("font-mono font-semibold", saldo >= 0 ? "text-success" : "text-destructive")}>
                      {formatCurrency(saldo)}
                    </span>
                  </ViewField>
                </div>
              </ViewSection>
              <ViewSection title="Controle">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Status">
                    <Badge
                      variant="outline"
                      className={
                        selected.ativo
                          ? "border-success/40 text-success"
                          : "border-muted-foreground/40 text-muted-foreground"
                      }
                    >
                      {selected.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </ViewField>
                  {selected.created_at && (
                    <ViewField label="Cadastrada em">
                      {new Date(selected.created_at).toLocaleDateString("pt-BR")}
                    </ViewField>
                  )}
                  {selected.updated_at && (
                    <ViewField label="Última atualização">
                      {new Date(selected.updated_at).toLocaleDateString("pt-BR")}
                    </ViewField>
                  )}
                </div>
              </ViewSection>
            </div>
          ),
        },
        {
          value: "vinculos",
          label: "Vínculos",
          content: (
            <div className="space-y-4">
              <ViewSection title="Uso no Financeiro">
                <div className="grid grid-cols-2 gap-4">
                  <ViewField label="Lançamentos Vinculados">
                    <span className="font-mono font-semibold">{lancamentos.length}</span>
                    {lancamentos.length > 0 && (
                      <span className="ml-1 text-muted-foreground">(exibindo até 10)</span>
                    )}
                  </ViewField>
                  <ViewField label="Baixas Registradas">
                    <span className="font-mono font-semibold">{baixas.length}</span>
                  </ViewField>
                  <ViewField label="Total Baixado">
                    <span className="font-mono font-semibold text-success">
                      {formatCurrency(totalBaixas)}
                    </span>
                  </ViewField>
                  <ViewField label="Movimentos de Caixa">
                    <span className="font-mono font-semibold">{caixaMovs.length}</span>
                  </ViewField>
                </div>
              </ViewSection>

              {formasPagamento.length > 0 && (
                <ViewSection title="Formas de Pagamento Utilizadas">
                  <div className="flex flex-wrap gap-2">
                    {formasPagamento.map((fp) => (
                      <Badge key={fp} variant="secondary">
                        {fp}
                      </Badge>
                    ))}
                  </div>
                </ViewSection>
              )}

              <ViewSection title="Navegação Rápida">
                <div className="space-y-2">
                  <RelationalLink to="/financeiro">
                    Ver lançamentos desta conta no Financeiro
                  </RelationalLink>
                  <RelationalLink to="/caixa">
                    Ver movimentos no Caixa
                  </RelationalLink>
                </div>
              </ViewSection>

              <ViewSection title="Evolução Futura">
                <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold">Conciliação bancária</p>
                  <p>
                    Esta conta está preparada para futura importação de extrato (OFX/CSV) e
                    conciliação automática ou manual entre extrato e lançamentos ERP.
                  </p>
                </div>
              </ViewSection>
            </div>
          ),
        },
      ]}
    />
  );
}

