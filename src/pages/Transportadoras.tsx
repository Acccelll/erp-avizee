import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Search } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";
import { supabase } from "@/integrations/supabase/client";
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

const emptyForm: Record<string, string> = {
  nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "", contato: "",
  telefone: "", email: "", cidade: "", uf: "", modalidade: "rodoviario",
  prazo_medio: "", observacoes: "",
};

export default function Transportadoras() {
  const { data, loading, create, update, remove } = useSupabaseCrud<Transportadora>({ table: "transportadoras" });
  const { pushView } = useRelationalNavigation();
  const { buscarCnpj, loading: cnpjLoading } = useCnpjLookup();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Transportadora | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientesVinculados, setClientesVinculados] = useState<any[]>([]);

  useEffect(() => {
    if (selected && drawerOpen) {
      supabase.from("clientes_transportadoras")
        .select("*, clientes(nome_razao_social, cpf_cnpj)")
        .eq("transportadora_id", selected.id)
        .then(({ data }) => setClientesVinculados(data || []));
    }
  }, [selected, drawerOpen]);

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
  const openView = (t: Transportadora) => {
    setSelected(t);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) { toast.error("Razão Social é obrigatória"); return; }
    setSaving(true);
    try {
      if (mode === "create") await create(form);
      else if (selected) await update(selected.id, form);
      setModalOpen(false);
    } catch (err: unknown) {
      console.error("[transportadoras] handleSubmit:", err);
    }
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
        <DataTable columns={columns} data={filteredData} loading={loading} onView={openView} onEdit={openEdit} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Transportadora" : "Editar Transportadora"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2"><Label>Razão Social *</Label><Input value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label><div className="flex gap-1"><MaskedInput mask="cnpj" value={form.cpf_cnpj} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} /><Button type="button" variant="outline" size="icon" className="shrink-0" disabled={cnpjLoading} onClick={async () => {
              const result = await buscarCnpj(form.cpf_cnpj);
              if (result) setForm(prev => ({
                ...prev,
                nome_razao_social: result.razao_social || prev.nome_razao_social,
                nome_fantasia: result.nome_fantasia || prev.nome_fantasia,
                email: result.email || prev.email,
                telefone: result.telefone || prev.telefone,
                cidade: result.municipio || prev.cidade,
                uf: result.uf || prev.uf,
              }));
            }}><Search className="h-4 w-4" /></Button></div></div>
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

      <ViewDrawerV2
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.nome_razao_social || "Detalhes da Transportadora"}
        badge={selected ? <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} /> : undefined}
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
        summary={selected ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3 text-center space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Modalidade</p>
              <p className="font-semibold text-sm text-foreground">{modalidadeLabel[selected.modalidade] || "—"}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prazo Médio</p>
              <p className="font-mono font-bold text-sm text-foreground">{selected.prazo_medio || "—"}</p>
            </div>
            <div className="rounded-lg border bg-card p-3 text-center space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Clientes</p>
              <p className="font-mono font-bold text-sm text-foreground">{clientesVinculados.length}</p>
            </div>
          </div>
        ) : undefined}
        tabs={[
          { value: "dados", label: "Dados", content: selected ? (
            <div className="space-y-4">
              <ViewSection title="Contato">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <ViewField label="CNPJ"><span className="font-mono">{selected.cpf_cnpj || "—"}</span></ViewField>
                  <ViewField label="Contato">{selected.contato || "—"}</ViewField>
                  <ViewField label="Telefone">{selected.telefone || "—"}</ViewField>
                  <ViewField label="E-mail">{selected.email || "—"}</ViewField>
                  <ViewField label="Cidade/UF">{selected.cidade ? `${selected.cidade}/${selected.uf}` : "—"}</ViewField>
                </div>
              </ViewSection>
              {selected.observacoes && (
                <ViewSection title="Observações">
                  <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
                </ViewSection>
              )}
            </div>
          ) : null },
          { value: "clientes", label: `Clientes (${clientesVinculados.length})`, content: (
            <div className="space-y-2">
              {clientesVinculados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente vinculado</p>
              ) : (
                <div className="space-y-1 max-h-[350px] overflow-y-auto">
                  {clientesVinculados.map((ct, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 border-b last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <RelationalLink to="/clientes">
                          {ct.clientes?.nome_razao_social || "—"}
                        </RelationalLink>
                        <p className="text-xs text-muted-foreground font-mono">{ct.clientes?.cpf_cnpj || ""}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {ct.modalidade && <span className="mr-2">{ct.modalidade}</span>}
                        {ct.prazo_medio && <span>{ct.prazo_medio}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )},
        ]}
      />
    </AppLayout>
  );
}
