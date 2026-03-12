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
import { toast } from "sonner";

interface Fornecedor {
  id: string; tipo_pessoa: string; nome_razao_social: string; nome_fantasia: string;
  cpf_cnpj: string; email: string; telefone: string; celular: string; prazo_padrao: number;
  logradouro: string; numero: string; bairro: string; cidade: string; uf: string; cep: string;
  observacoes: string; ativo: boolean; created_at: string;
}

const emptyForm = {
  tipo_pessoa: "J", nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "",
  email: "", telefone: "", celular: "", prazo_padrao: 30,
  logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", observacoes: "",
};

const Fornecedores = () => {
  const { data, loading, create, update, remove, duplicate } = useSupabaseCrud<Fornecedor>({ table: "fornecedores" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setMode("create"); setForm(emptyForm); setSelected(null); setModalOpen(true); };
  const openEdit = (f: Fornecedor) => {
    setMode("edit"); setSelected(f);
    setForm({ tipo_pessoa: f.tipo_pessoa || "J", nome_razao_social: f.nome_razao_social, nome_fantasia: f.nome_fantasia || "",
      cpf_cnpj: f.cpf_cnpj || "", email: f.email || "", telefone: f.telefone || "", celular: f.celular || "",
      prazo_padrao: f.prazo_padrao || 30, logradouro: f.logradouro || "", numero: f.numero || "",
      bairro: f.bairro || "", cidade: f.cidade || "", uf: f.uf || "", cep: f.cep || "", observacoes: f.observacoes || "" });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) { toast.error("Razão Social é obrigatória"); return; }
    setSaving(true);
    try {
      if (mode === "create") await create(form);
      else if (selected) await update(selected.id, form);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const columns = [
    { key: "nome_razao_social", label: "Razão Social" },
    { key: "cpf_cnpj", label: "CNPJ", render: (f: Fornecedor) => <span className="mono text-xs">{f.cpf_cnpj || "—"}</span> },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "prazo_padrao", label: "Prazo", render: (f: Fornecedor) => `${f.prazo_padrao || 30} dias` },
    { key: "ativo", label: "Status", render: (f: Fornecedor) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Fornecedores" subtitle="Cadastro e gestão de fornecedores" addLabel="Novo Fornecedor" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={(f) => { setSelected(f); setDrawerOpen(true); }}
          onEdit={openEdit} onDelete={(f) => remove(f.id)} onDuplicate={(f) => duplicate(f)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Fornecedor" : "Editar Fornecedor"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2"><Label>Razão Social *</Label><Input value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Celular</Label><Input value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} /></div>
            <div className="space-y-2"><Label>Prazo (dias)</Label><Input type="number" value={form.prazo_padrao} onChange={(e) => setForm({ ...form, prazo_padrao: Number(e.target.value) })} /></div>
          </div>
          <h3 className="font-semibold text-sm pt-2">Endereço</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2"><Label>Logradouro</Label><Input value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} /></div>
            <div className="space-y-2"><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
            <div className="space-y-2"><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-2"><Label>CEP</Label><Input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Fornecedor">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Razão Social</span><p className="font-medium">{selected.nome_razao_social}</p></div>
            <div><span className="text-xs text-muted-foreground">CNPJ</span><p className="mono text-sm">{selected.cpf_cnpj || "—"}</p></div>
            <div><span className="text-xs text-muted-foreground">E-mail</span><p>{selected.email || "—"}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Telefone</span><p>{selected.telefone || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Prazo</span><p>{selected.prazo_padrao} dias</p></div>
            </div>
            {selected.logradouro && (
              <div><span className="text-xs text-muted-foreground">Endereço</span><p>{selected.logradouro}, {selected.numero} - {selected.bairro}, {selected.cidade}/{selected.uf}</p></div>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Fornecedores;
