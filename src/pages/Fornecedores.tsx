import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { ModulePage } from "@/components/ModulePage";
import { FormModal } from "@/components/FormModal";
import { AdvancedFilterBar, type FilterChip } from "@/components/AdvancedFilterBar";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { useViaCep } from "@/hooks/useViaCep";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface Fornecedor {
  id: string;tipo_pessoa: string;nome_razao_social: string;nome_fantasia: string;
  cpf_cnpj: string;inscricao_estadual: string;email: string;telefone: string;celular: string;
  contato: string;prazo_padrao: number;logradouro: string;numero: string;complemento: string;
  bairro: string;cidade: string;uf: string;cep: string;pais: string;
  observacoes: string;ativo: boolean;created_at: string;
}

const emptyForm: Record<string, any> = {
  tipo_pessoa: "J", nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "",
  inscricao_estadual: "", email: "", telefone: "", celular: "", contato: "",
  prazo_padrao: 30, logradouro: "", numero: "", complemento: "",
  bairro: "", cidade: "", uf: "", cep: "", pais: "Brasil", observacoes: ""
};

const Fornecedores = () => {
  const { data, loading, create, update, remove, duplicate } = useSupabaseCrud<Fornecedor>({ table: "fornecedores" });
  const { pushView } = useRelationalNavigation();
  const { buscarCep, loading: cepLoading } = useViaCep();
  const { buscarCnpj, loading: cnpjLoading } = useCnpjLookup();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "F" | "J">("todos");

  const openCreate = () => {setMode("create");setForm({ ...emptyForm });setSelected(null);setModalOpen(true);};
  const openEdit = (f: Fornecedor) => {
    setMode("edit");setSelected(f);
    setForm({
      tipo_pessoa: f.tipo_pessoa || "J", nome_razao_social: f.nome_razao_social, nome_fantasia: f.nome_fantasia || "",
      cpf_cnpj: f.cpf_cnpj || "", inscricao_estadual: f.inscricao_estadual || "",
      email: f.email || "", telefone: f.telefone || "", celular: f.celular || "", contato: f.contato || "",
      prazo_padrao: f.prazo_padrao || 30, logradouro: f.logradouro || "", numero: f.numero || "",
      complemento: f.complemento || "", bairro: f.bairro || "", cidade: f.cidade || "",
      uf: f.uf || "", cep: f.cep || "", pais: f.pais || "Brasil", observacoes: f.observacoes || ""
    });
    setModalOpen(true);
  };

  const openView = (f: Fornecedor) => {
    pushView("fornecedor", f.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) {toast.error("Razão Social é obrigatória");return;}
    setSaving(true);
    try {
      if (mode === "create") await create(form);else
      if (selected) await update(selected.id, form);
      setModalOpen(false);
    } catch (err) {
      console.error('[fornecedores] erro ao salvar:', err);
    }
    setSaving(false);
  };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((fornecedor) => {
      if (tipoFilter !== "todos" && fornecedor.tipo_pessoa !== tipoFilter) return false;
      if (!query) return true;
      return [fornecedor.nome_razao_social, fornecedor.nome_fantasia, fornecedor.cpf_cnpj, fornecedor.email, fornecedor.cidade, fornecedor.uf, fornecedor.telefone, fornecedor.contato].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, searchTerm, tipoFilter]);

  const columns = [
  { key: "nome_razao_social", label: "Razão Social", sortable: true },
  { key: "cpf_cnpj", label: "CNPJ", render: (f: Fornecedor) => <span className="font-mono text-xs">{f.cpf_cnpj || "—"}</span> },
  { key: "email", label: "E-mail", sortable: true },
  { key: "telefone", label: "Telefone" },
  { key: "cidade", label: "Cidade", sortable: true, render: (f: Fornecedor) => f.cidade ? `${f.cidade}/${f.uf}` : "—" },
  { key: "ativo", label: "Status", render: (f: Fornecedor) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> }];


  const fornActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    if (tipoFilter !== "todos") chips.push({ key: "tipo", label: "Tipo", value: tipoFilter, displayValue: tipoFilter === "J" ? "Pessoa Jurídica" : "Pessoa Física" });
    return chips;
  }, [tipoFilter]);

  return (
    <AppLayout>
      <ModulePage title="Fornecedores" subtitle="Cadastro e gestão de fornecedores" addLabel="Novo Fornecedor" onAdd={openCreate}>
        
        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por razão social, CNPJ ou cidade..."
          activeFilters={fornActiveFilters}
          onRemoveFilter={() => setTipoFilter("todos")}
          count={filteredData.length}
        >
          <Select value={tipoFilter} onValueChange={(v: any) => setTipoFilter(v)}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="J">Pessoa jurídica</SelectItem>
              <SelectItem value="F">Pessoa física</SelectItem>
            </SelectContent>
          </Select>
        </AdvancedFilterBar>

        <DataTable columns={columns} data={filteredData} loading={loading}
        onView={openView} onEdit={openEdit} onDelete={(f) => remove(f.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Fornecedor" : "Editar Fornecedor"} size="lg">
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
                logradouro: result.logradouro || prev.logradouro,
                numero: result.numero || prev.numero,
                complemento: result.complemento || prev.complemento,
                bairro: result.bairro || prev.bairro,
                cidade: result.municipio || prev.cidade,
                uf: result.uf || prev.uf,
                cep: result.cep || prev.cep,
              }));
            }}><Search className="h-4 w-4" /></Button></div></div>
            <div className="space-y-2"><Label>I.E.</Label><Input value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><MaskedInput mask="telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} /></div>
            <div className="space-y-2"><Label>Celular</Label><MaskedInput mask="celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} /></div>
            <div className="space-y-2"><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
          </div>
          <h3 className="font-semibold text-sm pt-2 border-t">Endereço</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CEP</Label><MaskedInput mask="cep" value={form.cep} onChange={(v) => setForm({ ...form, cep: v })} onBlur={async () => {
              const result = await buscarCep(form.cep);
              if (result) setForm(prev => ({ ...prev, logradouro: result.logradouro, bairro: result.bairro, cidade: result.localidade, uf: result.uf }));
            }} /></div>
            <div className="col-span-2 space-y-2"><Label>Logradouro</Label><Input value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} /></div>
            <div className="space-y-2"><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
            <div className="space-y-2"><Label>Complemento</Label><Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Bairro</Label><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

    </AppLayout>);

};

export default Fornecedores;
