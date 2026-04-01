import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2 } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Building2, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

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

const emptyForm: Record<string, any> = { nome: "", observacoes: "" };

const GruposEconomicos = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<GrupoEconomico>({ table: "grupos_economicos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<GrupoEconomico | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<ClienteDoGrupo[]>([]);
  const [saldoConsolidado, setSaldoConsolidado] = useState(0);
  const [titulosVencidos, setTitulosVencidos] = useState(0);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setSelected(null); setModalOpen(true); };
  const openEdit = (g: GrupoEconomico) => {
    setMode("edit"); setSelected(g);
    setForm({ nome: g.nome, observacoes: g.observacoes || "" });
    setModalOpen(true);
  };

  const openView = async (g: GrupoEconomico) => {
    setSelected(g); setDrawerOpen(true);
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nome_razao_social, nome_fantasia, cpf_cnpj, tipo_relacao_grupo, cidade, uf")
      .eq("grupo_economico_id", g.id).eq("ativo", true);
    setEmpresas(clientes || []);

    // Consolidate financials across all group clients
    const clienteIds = (clientes || []).map((c: any) => c.id);
    if (clienteIds.length > 0) {
      const { data: titulos } = await supabase
        .from("financeiro_lancamentos")
        .select("valor, status")
        .in("cliente_id", clienteIds)
        .eq("tipo", "receber").eq("ativo", true)
        .in("status", ["aberto", "vencido"]);
      const tots = titulos || [];
      setSaldoConsolidado(tots.reduce((s: number, t: any) => s + Number(t.valor || 0), 0));
      setTitulosVencidos(tots.filter((t: any) => t.status === "vencido").length);
    } else {
      setSaldoConsolidado(0);
      setTitulosVencidos(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return;
    setSaving(true);
    try {
      if (mode === "create") await create(form);
      else if (selected) await update(selected.id, form);
      setModalOpen(false);
    } catch (err) {
      console.error('[grupos-economicos] erro ao salvar:', err);
      toast.error("Erro ao salvar grupo econômico");
    }
    setSaving(false);
  };

  const relacaoLabel: Record<string, string> = { matriz: "Matriz", filial: "Filial", coligada: "Coligada", independente: "Independente" };

  const columns = [
    { key: "nome", label: "Nome do Grupo" },
    { key: "ativo", label: "Status", render: (g: GrupoEconomico) => <StatusBadge status={g.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Grupos Econômicos" subtitle="Gestão de grupos (matriz, filial, coligada)" addLabel="Novo Grupo" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={openView} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Grupo Econômico" : "Editar Grupo Econômico"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Nome do Grupo *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Grupo Econômico"
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
      >
        {selected && (
          <div className="space-y-5">
            {/* Header with identity */}
            <div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">{selected.nome}</h3>
                  <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
                </div>
                {selected.observacoes && (
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.observacoes}</p>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Empresas</p>
                <p className="font-bold text-2xl text-foreground">{empresas.length}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Saldo Aberto</p>
                <p className={`font-mono font-bold text-sm ${saldoConsolidado > 0 ? "text-warning" : "text-foreground"}`}>{formatCurrency(saldoConsolidado)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Vencidos</p>
                <p className={`font-bold text-2xl ${titulosVencidos > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{titulosVencidos}</p>
              </div>
            </div>

            {titulosVencidos > 0 && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
                <AlertTriangle className="w-3 h-3" /> Grupo possui {titulosVencidos} título(s) vencido(s) — risco consolidado
              </div>
            )}

            {/* Empresas */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4" /> Empresas do Grupo ({empresas.length})
              </h4>
              {empresas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma empresa vinculada a este grupo.</p>
              ) : (
                <div className="space-y-1">
                  {empresas.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{emp.nome_razao_social}</p>
                        {emp.nome_fantasia && <p className="text-xs text-muted-foreground truncate">{emp.nome_fantasia}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{emp.cpf_cnpj || "—"} • {emp.cidade ? `${emp.cidade}/${emp.uf}` : "—"}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                        {relacaoLabel[emp.tipo_relacao_grupo || "independente"] || emp.tipo_relacao_grupo}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default GruposEconomicos;
