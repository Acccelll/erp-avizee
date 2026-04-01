import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField } from "@/components/ViewDrawerV2";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, DollarSign, Users, UserCheck, UserX, CalendarDays } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SummaryCard } from "@/components/SummaryCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

interface Funcionario {
  id: string; nome: string; cpf: string; cargo: string; departamento: string;
  data_admissao: string; data_demissao: string | null; salario_base: number;
  tipo_contrato: string; observacoes: string; ativo: boolean; created_at: string;
}

interface FolhaPagamento {
  id: string; funcionario_id: string; competencia: string; salario_base: number;
  proventos: number; descontos: number; valor_liquido: number; observacoes: string;
  status: string; financeiro_gerado: boolean;
}

const tipoContratoLabel: Record<string, string> = { clt: "CLT", pj: "PJ", estagio: "Estágio", temporario: "Temporário" };

const emptyForm: Record<string, any> = {
  nome: "", cpf: "", cargo: "", departamento: "", data_admissao: new Date().toISOString().split("T")[0],
  salario_base: 0, tipo_contrato: "clt", observacoes: "",
};

export default function Funcionarios() {
  const { data, loading, create, update, remove } = useSupabaseCrud<Funcionario>({ table: "funcionarios" as any });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Funcionario | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");

  // Folha states
  const [folhaModalOpen, setFolhaModalOpen] = useState(false);
  const [folhaForm, setFolhaForm] = useState({ competencia: "", proventos: 0, descontos: 0, observacoes: "" });
  const [folhas, setFolhas] = useState<FolhaPagamento[]>([]);
  const [loadingFolhas, setLoadingFolhas] = useState(false);

  const kpis = useMemo(() => {
    const ativos = data.filter(f => f.ativo);
    const totalSalarios = ativos.reduce((s, f) => s + Number(f.salario_base || 0), 0);
    return { total: data.length, ativos: ativos.length, inativos: data.length - ativos.length, totalSalarios };
  }, [data]);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setSelected(null); setModalOpen(true); };
  const openEdit = (f: Funcionario) => {
    setMode("edit"); setSelected(f);
    setForm({ nome: f.nome, cpf: f.cpf || "", cargo: f.cargo || "", departamento: f.departamento || "", data_admissao: f.data_admissao, salario_base: f.salario_base, tipo_contrato: f.tipo_contrato, observacoes: f.observacoes || "" });
    setModalOpen(true);
  };

  const openView = async (f: Funcionario) => {
    setSelected(f); setDrawerOpen(true); setLoadingFolhas(true);
    const { data: folhaData } = await supabase.from("folha_pagamento" as any).select("*").eq("funcionario_id", f.id).order("competencia", { ascending: false });
    setFolhas((folhaData as any[] || []) as FolhaPagamento[]); setLoadingFolhas(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    if (mode === "create") await create(form as any);
    else if (selected) await update(selected.id, form as any);
    setModalOpen(false);
  };

  const handleFolhaSubmit = async () => {
    if (!selected || !folhaForm.competencia) { toast.error("Competência é obrigatória"); return; }
    const liquido = Number(selected.salario_base) + Number(folhaForm.proventos) - Number(folhaForm.descontos);
    const { error } = await supabase.from("folha_pagamento" as any).insert({
      funcionario_id: selected.id,
      competencia: folhaForm.competencia,
      salario_base: selected.salario_base,
      proventos: folhaForm.proventos || 0,
      descontos: folhaForm.descontos || 0,
      valor_liquido: liquido,
      observacoes: folhaForm.observacoes || null,
      status: "processada",
    } as any);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Folha registrada!");
    setFolhaModalOpen(false);
    openView(selected);
  };

  const handleFecharFolha = async (folha: FolhaPagamento) => {
    if (folha.financeiro_gerado) {
      toast.warning('Lançamentos financeiros já foram gerados para esta folha.');
      return;
    }

    const competenciaDate = new Date(folha.competencia + '-01');
    const mesRef = competenciaDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Data de pagamento: 5º dia útil do mês seguinte (simplificado: dia 5)
    const proximoMes = new Date(competenciaDate.getFullYear(), competenciaDate.getMonth() + 1, 5);
    const dataPagamento = proximoMes.toISOString().slice(0, 10);

    // Data FGTS: dia 7 do mês seguinte
    const dataFgts = new Date(competenciaDate.getFullYear(), competenciaDate.getMonth() + 1, 7)
      .toISOString().slice(0, 10);

    // Lançamento do salário líquido
    await supabase.from('financeiro_lancamentos').insert({
      tipo: 'pagar',
      descricao: `Salário ${mesRef} — ${selected?.nome}`,
      valor: folha.valor_liquido,
      data_vencimento: dataPagamento,
      status: 'aberto',
      funcionario_id: folha.funcionario_id,
      ativo: true,
    } as any);

    // Calcular e lançar FGTS (8% do salário base)
    const fgts = Number(folha.salario_base) * 0.08;
    if (fgts > 0) {
      await supabase.from('financeiro_lancamentos').insert({
        tipo: 'pagar',
        descricao: `FGTS ${mesRef} — ${selected?.nome}`,
        valor: fgts,
        data_vencimento: dataFgts,
        status: 'aberto',
        ativo: true,
      } as any);
    }

    // Marcar folha como financeiro_gerado
    await supabase.from('folha_pagamento' as any)
      .update({ status: 'pago', financeiro_gerado: true })
      .eq('id', folha.id);

    toast.success(`Lançamentos financeiros gerados: salário (${dataPagamento}) e FGTS (${dataFgts}).`);
    openView(selected!);
  };

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter(f => [f.nome, f.cpf, f.cargo, f.departamento].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [data, searchTerm]);

  const columns = [
    { key: "nome", label: "Nome" },
    { key: "cargo", label: "Cargo", render: (f: Funcionario) => f.cargo || "—" },
    { key: "departamento", label: "Depto.", render: (f: Funcionario) => f.departamento || "—" },
    { key: "tipo_contrato", label: "Tipo", render: (f: Funcionario) => tipoContratoLabel[f.tipo_contrato] || f.tipo_contrato },
    { key: "salario_base", label: "Salário Base", render: (f: Funcionario) => <span className="font-mono">{formatCurrency(Number(f.salario_base))}</span> },
    { key: "data_admissao", label: "Admissão", render: (f: Funcionario) => formatDate(f.data_admissao) },
    { key: "ativo", label: "Status", render: (f: Funcionario) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> },
  ];

  // Current month as YYYY-MM for default competencia
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <AppLayout>
      <ModulePage title="Funcionários" subtitle="Cadastro e folha de pagamento simplificada" addLabel="Novo Funcionário" onAdd={openCreate}
        count={filteredData.length} searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por nome, cargo, CPF...">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total" value={formatNumber(kpis.total)} icon={Users} variationType="neutral" variation="funcionários" />
          <SummaryCard title="Ativos" value={formatNumber(kpis.ativos)} icon={UserCheck} variationType="positive" variation="em atividade" />
          <SummaryCard title="Inativos" value={formatNumber(kpis.inativos)} icon={UserX} variationType={kpis.inativos > 0 ? "negative" : "neutral"} variation="desligados" />
          <SummaryCard title="Folha Mensal" value={formatCurrency(kpis.totalSalarios)} icon={DollarSign} variationType="neutral" variation="salários base" />
        </div>

        <DataTable columns={columns} data={filteredData} loading={loading} onView={openView} />
      </ModulePage>

      {/* Create/Edit Modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Funcionário" : "Editar Funcionário"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" /></div>
            <div className="space-y-2"><Label>Tipo Contrato</Label>
              <Select value={form.tipo_contrato} onValueChange={v => setForm({ ...form, tipo_contrato: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clt">CLT</SelectItem>
                  <SelectItem value="pj">PJ</SelectItem>
                  <SelectItem value="estagio">Estágio</SelectItem>
                  <SelectItem value="temporario">Temporário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cargo</Label><Input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
            <div className="space-y-2"><Label>Departamento</Label><Input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data Admissão *</Label><Input type="date" value={form.data_admissao} onChange={e => setForm({ ...form, data_admissao: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Salário Base *</Label><Input type="number" step="0.01" min={0} value={form.salario_base} onChange={e => setForm({ ...form, salario_base: Number(e.target.value) })} required /></div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </FormModal>

      {/* View Drawer */}
      <ViewDrawerV2 open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Funcionário"
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
        badge={selected ? <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} /> : undefined}
        tabs={selected ? [
          { value: "dados", label: "Dados", content: (
            <div className="space-y-4">
              <ViewField label="Nome">{selected.nome}</ViewField>
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="CPF">{selected.cpf || "—"}</ViewField>
                <ViewField label="Tipo">{tipoContratoLabel[selected.tipo_contrato] || selected.tipo_contrato}</ViewField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Cargo">{selected.cargo || "—"}</ViewField>
                <ViewField label="Departamento">{selected.departamento || "—"}</ViewField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Admissão">{formatDate(selected.data_admissao)}</ViewField>
                <ViewField label="Desligamento">{selected.data_demissao ? formatDate(selected.data_demissao) : "—"}</ViewField>
              </div>
              <ViewField label="Salário Base"><span className="font-mono font-semibold text-lg">{formatCurrency(Number(selected.salario_base))}</span></ViewField>
              {selected.observacoes && <ViewField label="Observações">{selected.observacoes}</ViewField>}
            </div>
          )},
          { value: "folha", label: "Folha de Pagamento", content: (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Lançamentos da Folha</h4>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                  setFolhaForm({ competencia: currentMonth, proventos: 0, descontos: 0, observacoes: "" });
                  setFolhaModalOpen(true);
                }}>
                  <CalendarDays className="w-3 h-3" /> Registrar Folha
                </Button>
              </div>

              {loadingFolhas ? (
                <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : folhas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum lançamento de folha</p>
              ) : (
                <div className="space-y-2">
                  {folhas.map((f) => (
                    <div key={f.id} className="rounded-lg border bg-accent/20 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{f.competencia}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={f.status === "processada" ? "aprovada" : f.status} label={f.status === "processada" ? "Processada" : "Pendente"} />
                          {!f.financeiro_gerado && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => handleFecharFolha(f)}
                            >
                              Gerar lançamentos financeiros
                            </Button>
                          )}
                          {f.financeiro_gerado && (
                            <span className="text-xs text-success">✓ Lançamentos gerados</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Base:</span> <span className="font-mono">{formatCurrency(Number(f.salario_base))}</span></div>
                        <div><span className="text-muted-foreground">Proventos:</span> <span className="font-mono text-success">{formatCurrency(Number(f.proventos))}</span></div>
                        <div><span className="text-muted-foreground">Descontos:</span> <span className="font-mono text-destructive">{formatCurrency(Number(f.descontos))}</span></div>
                        <div><span className="text-muted-foreground">Líquido:</span> <span className="font-mono font-bold">{formatCurrency(Number(f.valor_liquido))}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )},
        ] : undefined}
      />

      {/* Folha Registration Modal */}
      <FormModal open={folhaModalOpen} onClose={() => setFolhaModalOpen(false)} title={`Registrar Folha — ${selected?.nome || ""}`}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Competência (AAAA-MM) *</Label><Input type="month" value={folhaForm.competencia} onChange={e => setFolhaForm({ ...folhaForm, competencia: e.target.value })} required /></div>
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <span className="text-xs text-muted-foreground">Salário Base</span>
            <p className="font-mono font-bold text-lg">{formatCurrency(Number(selected?.salario_base || 0))}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Proventos Extras</Label><Input type="number" step="0.01" min={0} value={folhaForm.proventos || ""} onChange={e => setFolhaForm({ ...folhaForm, proventos: Number(e.target.value) })} placeholder="Horas extras, bônus..." /></div>
            <div className="space-y-2"><Label>Descontos</Label><Input type="number" step="0.01" min={0} value={folhaForm.descontos || ""} onChange={e => setFolhaForm({ ...folhaForm, descontos: Number(e.target.value) })} placeholder="Faltas, adiantamentos..." /></div>
          </div>
          <div className="rounded-lg border bg-primary/5 p-3 text-center">
            <span className="text-xs text-muted-foreground">Valor Líquido</span>
            <p className="font-mono font-bold text-xl text-primary">
              {formatCurrency(Number(selected?.salario_base || 0) + Number(folhaForm.proventos || 0) - Number(folhaForm.descontos || 0))}
            </p>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={folhaForm.observacoes} onChange={e => setFolhaForm({ ...folhaForm, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFolhaModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleFolhaSubmit}>Registrar</Button>
          </div>
        </div>
      </FormModal>
    </AppLayout>
  );
}
