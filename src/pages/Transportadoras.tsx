import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2 } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { toast } from "sonner";

interface Transportadora {
  id: string;
  nome_razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  modalidade: string;
  prazo_medio: string;
  observacoes: string;
  ativo: boolean;
  created_at: string;
}

const emptyForm: Record<string, any> = {
  nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "", contato: "",
  telefone: "", email: "", cidade: "", uf: "", modalidade: "rodoviario",
  prazo_medio: "", observacoes: "",
};

export default function Transportadoras() {
  const { data, loading, create, update, remove } = useSupabaseCrud<Transportadora>({ table: "transportadoras" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Transportadora | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const openCreate = () => { setMode("create"); setForm({...emptyForm}); setSelected(null); setModalOpen(true); };
  const openEdit = (t: Transportadora) => {
    setMode("edit"); setSelected(t);
    setForm({
      nome_razao_social: t.nome_razao_social, nome_fantasia: t.nome_fantasia || "",
      cpf_cnpj: t.cpf_cnpj || "", contato: t.contato || "",
      telefone: t.telefone || "", email: t.email || "",
      cidade: t.cidade || "", uf: t.uf || "",
      modalidade: t.modalidade || "rodoviario",
      prazo_medio: t.prazo_medio || "", observacoes: t.observacoes || "",
    });
    setModalOpen(true);
  };
  const openView = (t: Transportadora) => { setSelected(t); setDrawerOpen(true); };

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

  const modalidadeLabel: Record<string, string> = { rodoviario: "Rodoviário", aereo: "Aéreo", maritimo: "Marítimo", ferroviario: "Ferroviário", multimodal: "Multimodal" };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return data;
    return data.filter(t => [t.nome_razao_social, t.cpf_cnpj, t.cidade, t.uf].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [data, searchTerm]);

  const columns = [
    { key: "nome_razao_social", label: "Razão Social" },
    { key: "cpf_cnpj", label: "CNPJ", render: (t: Transportadora) => <span className="font-mono text-xs">{t.cpf_cnpj || "—"}</span> },
    { key: "telefone", label: "Telefone" },
    { key: "cidade", label: "Cidade", render: (t: Transportadora) => t.cidade ? `${t.cidade}/${t.uf}` : "—" },
    { key: "modalidade", label: "Modalidade", render: (t: Transportadora) => modalidadeLabel[t.modalidade] || t.modalidade },
    { key: "ativo", label: "Status", render: (t: Transportadora) => <StatusBadge status={t.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Transportadoras" subtitle="Cadastro de transportadoras e logística" addLabel="Nova Transportadora" onAdd={openCreate} count={filteredData.length}
        searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por nome ou CNPJ...">
        <DataTable columns={columns} data={filteredData} loading={loading} onView={openView} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Transportadora" : "Editar Transportadora"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2"><Label>Razão Social *</Label><Input value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label><MaskedInput mask="cnpj" value={form.cpf_cnpj} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} /></div>
            <div className="space-y-2"><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><MaskedInput mask="telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
            <div className="space-y-2"><Label>Modalidade</Label>
              <Select value={form.modalidade} onValueChange={(v) => setForm({ ...form, modalidade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rodoviario">Rodoviário</SelectItem>
                  <SelectItem value="aereo">Aéreo</SelectItem>
                  <SelectItem value="maritimo">Marítimo</SelectItem>
                  <SelectItem value="ferroviario">Ferroviário</SelectItem>
                  <SelectItem value="multimodal">Multimodal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Prazo Médio</Label><Input value={form.prazo_medio} onChange={(e) => setForm({ ...form, prazo_medio: e.target.value })} placeholder="Ex: 3-5 dias úteis" /></div>
          </div>
          <div className="space-y-2"><Label>Observações Logísticas</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Restrições, particularidades..." /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Transportadora"
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg truncate">{selected.nome_razao_social}</h3>
                <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
              </div>
              {selected.nome_fantasia && <p className="text-sm text-muted-foreground truncate">{selected.nome_fantasia}</p>}
              {selected.cpf_cnpj && <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.cpf_cnpj}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Modalidade</p>
                <p className="font-semibold text-sm text-foreground">{modalidadeLabel[selected.modalidade] || "—"}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prazo Médio</p>
                <p className="font-mono font-bold text-sm text-foreground">{selected.prazo_medio || "—"}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cidade/UF</p>
                <p className="font-semibold text-sm text-foreground">{selected.cidade ? `${selected.cidade}/${selected.uf}` : "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { label: "CNPJ", value: selected.cpf_cnpj, mono: true },
                { label: "Contato", value: selected.contato },
                { label: "Telefone", value: selected.telefone },
                { label: "E-mail", value: selected.email },
              ].map((field, i) => (
                <div key={i}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{field.label}</p>
                  <p className={`text-sm ${field.mono ? "font-mono" : ""}`}>{field.value || "—"}</p>
                </div>
              ))}
            </div>
            {selected.observacoes && (
              <div className="border-t pt-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Observações</p>
                <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
}
