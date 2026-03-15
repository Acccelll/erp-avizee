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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Building2, Users } from "lucide-react";

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

const emptyForm: Record<string, any> = {
  nome: "",
  observacoes: "",
};

const GruposEconomicos = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<GrupoEconomico>({ table: "grupos_economicos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<GrupoEconomico | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<ClienteDoGrupo[]>([]);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setSelected(null); setModalOpen(true); };
  const openEdit = (g: GrupoEconomico) => {
    setMode("edit"); setSelected(g);
    setForm({ nome: g.nome, observacoes: g.observacoes || "" });
    setModalOpen(true);
  };

  const openView = async (g: GrupoEconomico) => {
    setSelected(g); setDrawerOpen(true);
    const { data: clientes } = await (supabase as any)
      .from("clientes")
      .select("id, nome_razao_social, nome_fantasia, cpf_cnpj, tipo_relacao_grupo, cidade, uf")
      .eq("grupo_economico_id", g.id)
      .eq("ativo", true);
    setEmpresas(clientes || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) return;
    setSaving(true);
    try {
      if (mode === "create") await create(form);
      else if (selected) await update(selected.id, form);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const relacaoLabel: Record<string, string> = {
    matriz: "Matriz",
    filial: "Filial",
    coligada: "Coligada",
    independente: "Independente",
  };

  const columns = [
    { key: "nome", label: "Nome do Grupo" },
    {
      key: "empresas",
      label: "Empresas",
      render: (g: GrupoEconomico) => {
        // We'll show count from a simple approach
        return <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    { key: "ativo", label: "Status", render: (g: GrupoEconomico) => <StatusBadge status={g.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Grupos Econômicos" subtitle="Gestão de grupos (matriz, filial, coligada)" addLabel="Novo Grupo" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={openView} onEdit={openEdit} onDelete={(g) => remove(g.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Grupo Econômico" : "Editar Grupo Econômico"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Grupo *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
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

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Grupo Econômico">
        {selected && (
          <div className="space-y-4">
            <div>
              <span className="text-xs text-muted-foreground">Nome</span>
              <p className="font-medium text-lg">{selected.nome}</p>
            </div>
            {selected.observacoes && (
              <div>
                <span className="text-xs text-muted-foreground">Observações</span>
                <p className="text-sm">{selected.observacoes}</p>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4" /> Empresas do Grupo ({empresas.length})
              </h4>
              {empresas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma empresa vinculada a este grupo.</p>
              ) : (
                <div className="space-y-2">
                  {empresas.map((emp) => (
                    <div key={emp.id} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{emp.nome_razao_social}</p>
                        {emp.nome_fantasia && <p className="text-xs text-muted-foreground">{emp.nome_fantasia}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {emp.cpf_cnpj || "—"} • {emp.cidade ? `${emp.cidade}/${emp.uf}` : "—"}
                        </p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
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
