import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { ModulePage } from "@/components/ModulePage";
import { FormModal } from "@/components/FormModal";
import { AdvancedFilterBar } from "@/components/AdvancedFilterBar";
import type { FilterChip } from "@/components/AdvancedFilterBar";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { useViaCep } from "@/hooks/useViaCep";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
import { Textarea } from "@/components/ui/textarea";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Search } from "lucide-react";
import { clienteFornecedorSchema, validateForm } from "@/lib/validationSchemas";

interface Cliente {
  id: string;tipo_pessoa: string;nome_razao_social: string;nome_fantasia: string;
  cpf_cnpj: string;inscricao_estadual: string;email: string;telefone: string;celular: string;
  contato: string;prazo_padrao: number;limite_credito: number;
  logradouro: string;numero: string;complemento: string;bairro: string;cidade: string;
  uf: string;cep: string;pais: string;observacoes: string;ativo: boolean;created_at: string;
  grupo_economico_id: string | null;tipo_relacao_grupo: string | null;caixa_postal: string | null;
}

interface GrupoEconomico {id: string;nome: string;}

const emptyCliente: Record<string, any> = {
  tipo_pessoa: "J", nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "",
  inscricao_estadual: "", email: "", telefone: "", celular: "", contato: "",
  prazo_padrao: 30, limite_credito: 0, forma_pagamento_padrao: "", prazo_preferencial: 0,
  logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", pais: "Brasil",
  observacoes: "", grupo_economico_id: "", tipo_relacao_grupo: "independente", caixa_postal: ""
};

const relacaoOptions = [
{ value: "independente", label: "Independente" },
{ value: "matriz", label: "Matriz" },
{ value: "filial", label: "Filial" },
{ value: "coligada", label: "Coligada" }];


const Clientes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Debounce search for server-side filtering
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, loading, create, update, remove, duplicate } = useSupabaseCrud<Cliente>({
    table: "clientes",
    searchTerm: debouncedSearch,
    searchColumns: ["nome_razao_social", "nome_fantasia", "cpf_cnpj", "email", "cidade"],
  });
  const { pushView } = useRelationalNavigation();
  const { buscarCep, loading: cepLoading } = useViaCep();
  const { buscarCnpj, loading: cnpjLoading } = useCnpjLookup();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyCliente);
  const [saving, setSaving] = useState(false);
  const [grupos, setGrupos] = useState<GrupoEconomico[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  const [grupoFilters, setGrupoFilters] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("grupos_economicos").select("id, nome").eq("ativo", true).order("nome").then(({ data: g }: any) => setGrupos(g || []));
  }, []);

  const openCreate = () => {setMode("create");setForm({ ...emptyCliente });setSelected(null);setModalOpen(true);};
  const openEdit = (c: Cliente) => {
    setMode("edit");setSelected(c);
    setForm({
      tipo_pessoa: c.tipo_pessoa || "J", nome_razao_social: c.nome_razao_social, nome_fantasia: c.nome_fantasia || "",
      cpf_cnpj: c.cpf_cnpj || "", inscricao_estadual: c.inscricao_estadual || "",
      email: c.email || "", telefone: c.telefone || "", celular: c.celular || "", contato: c.contato || "",
      prazo_padrao: c.prazo_padrao || 30, limite_credito: c.limite_credito || 0,
      forma_pagamento_padrao: (c as any).forma_pagamento_padrao || "",
      prazo_preferencial: (c as any).prazo_preferencial || 0,
      logradouro: c.logradouro || "", numero: c.numero || "", complemento: c.complemento || "",
      bairro: c.bairro || "", cidade: c.cidade || "", uf: c.uf || "", cep: c.cep || "",
      pais: c.pais || "Brasil", observacoes: c.observacoes || "",
      grupo_economico_id: c.grupo_economico_id || "", tipo_relacao_grupo: c.tipo_relacao_grupo || "independente",
      caixa_postal: c.caixa_postal || ""
    });
    setModalOpen(true);
  };

  const openView = (c: Cliente) => {
    pushView("cliente", c.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) {toast.error("Nome/Razão Social é obrigatório");return;}
    setSaving(true);
    const payload = { ...form, grupo_economico_id: form.grupo_economico_id || null, caixa_postal: form.caixa_postal || null };
    try {
      if (mode === "create") await create(payload);else
      if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch (err) {
      console.error('[clientes] erro ao salvar:', err);
    }
    setSaving(false);
  };

  const grupoNome = (id: string | null) => !id ? "—" : grupos.find((g) => g.id === id)?.nome || "—";
  const relacaoLabel: Record<string, string> = { matriz: "Matriz", filial: "Filial", coligada: "Coligada", independente: "Independente" };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((cliente) => {
      if (tipoFilters.length > 0 && !tipoFilters.includes(cliente.tipo_pessoa)) return false;

      if (grupoFilters.length > 0) {
        const hasGroup = !!cliente.grupo_economico_id;
        const groupId = cliente.grupo_economico_id || "sem_grupo";

        // Se o filtro contém ids específicos de grupo OU "sem_grupo"
        if (!grupoFilters.includes(groupId)) {
          // Caso especial: se selecionou "com_grupo" (lógica antiga adaptada ou nova?)
          // Vamos usar IDs específicos + "sem_grupo"
          return false;
        }
      }

      if (!query) return true;
      return [cliente.nome_razao_social, cliente.nome_fantasia, cliente.cpf_cnpj, cliente.email, cliente.cidade, cliente.uf, cliente.telefone, cliente.contato].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, grupoFilters, searchTerm, tipoFilters]);

  const columns = [
  { key: "nome_razao_social", label: "Nome / Razão Social", sortable: true },
  { key: "tipo_pessoa", label: "Tipo", render: (c: Cliente) => c.tipo_pessoa === "F" ? "PF" : "PJ" },
  { key: "cpf_cnpj", label: "CPF/CNPJ", render: (c: Cliente) => <span className="font-mono text-xs">{c.cpf_cnpj || "—"}</span> },
  { key: "email", label: "E-mail", sortable: true },
  { key: "telefone", label: "Telefone" },
  { key: "cidade", label: "Cidade", sortable: true, render: (c: Cliente) => c.cidade ? `${c.cidade}/${c.uf}` : "—" },
  { key: "grupo", label: "Grupo Econômico", render: (c: Cliente) => grupoNome(c.grupo_economico_id) },
  { key: "ativo", label: "Status", render: (c: Cliente) => <StatusBadge status={c.ativo ? "Ativo" : "Inativo"} /> }];


  const cliActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];

    tipoFilters.forEach(f => {
      chips.push({
        key: "tipo",
        label: "Tipo",
        value: [f],
        displayValue: f === "J" ? "Pessoa Jurídica" : "Pessoa Física"
      });
    });

    grupoFilters.forEach(f => {
      const g = grupos.find(x => x.id === f);
      chips.push({
        key: "grupo",
        label: "Grupo",
        value: [f],
        displayValue: g?.nome || "Sem grupo"
      });
    });

    return chips;
  }, [tipoFilters, grupoFilters, grupos]);

  const handleRemoveCliFilter = (key: string, value?: string) => {
    if (key === "tipo") setTipoFilters(prev => prev.filter(v => v !== value));
    if (key === "grupo") setGrupoFilters(prev => prev.filter(v => v !== value));
  };

  const tipoOptions: MultiSelectOption[] = [
    { label: "Pessoa Jurídica", value: "J" },
    { label: "Pessoa Física", value: "F" },
  ];

  const grupoOptions: MultiSelectOption[] = [
    ...grupos.map(g => ({ label: g.nome, value: g.id })),
    { label: "Sem grupo", value: "sem_grupo" }
  ];

  return (
    <AppLayout>
      <ModulePage title="Clientes" subtitle="Cadastro e gestão de clientes" addLabel="Novo Cliente" onAdd={openCreate}>
        
        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por nome, CNPJ, e-mail ou cidade..."
          activeFilters={cliActiveFilters}
          onRemoveFilter={handleRemoveCliFilter}
          onClearAll={() => { setTipoFilters([]); setGrupoFilters([]); }}
          count={filteredData.length}
        >
          <MultiSelect
            options={tipoOptions}
            selected={tipoFilters}
            onChange={setTipoFilters}
            placeholder="Tipos"
            className="w-[150px]"
          />
          <MultiSelect
            options={grupoOptions}
            selected={grupoFilters}
            onChange={setGrupoFilters}
            placeholder="Grupos"
            className="w-[200px]"
          />
        </AdvancedFilterBar>

        <DataTable columns={columns} data={filteredData} loading={loading}
        onView={openView} onEdit={openEdit} onDelete={(c) => remove(c.id)} />
      </ModulePage>

      {/* Form Modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Cliente" : "Editar Cliente"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Tipo Pessoa</Label>
              <Select value={form.tipo_pessoa} onValueChange={(v) => setForm({ ...form, tipo_pessoa: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="F">Pessoa Física</SelectItem><SelectItem value="J">Pessoa Jurídica</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>CPF/CNPJ</Label><div className="flex gap-1"><MaskedInput mask="cpf_cnpj" value={form.cpf_cnpj} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} /><Button type="button" variant="outline" size="icon" className="shrink-0" disabled={cnpjLoading || form.tipo_pessoa !== "J"} onClick={async () => {
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
            <div className="col-span-2 md:col-span-3 space-y-2"><Label>Nome / Razão Social *</Label><Input value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} required /></div>
            <div className="col-span-2 md:col-span-3 space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><MaskedInput mask="telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} /></div>
            <div className="space-y-2"><Label>Celular</Label><MaskedInput mask="celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} /></div>
            <div className="space-y-2"><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
            <div className="space-y-2"><Label>Prazo (dias)</Label><Input type="number" value={form.prazo_padrao} onChange={(e) => setForm({ ...form, prazo_padrao: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Limite Crédito</Label><Input type="number" step="0.01" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: Number(e.target.value) })} /></div>
          </div>
          <h3 className="font-semibold text-sm pt-2 border-t flex items-center gap-2"><Building2 className="w-4 h-4" /> Grupo Econômico</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Grupo</Label>
              <Select value={form.grupo_economico_id || "nenhum"} onValueChange={(v) => setForm({ ...form, grupo_economico_id: v === "nenhum" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent><SelectItem value="nenhum">Nenhum</SelectItem>{grupos.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tipo de Relação</Label>
              <Select value={form.tipo_relacao_grupo} onValueChange={(v) => setForm({ ...form, tipo_relacao_grupo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{relacaoOptions.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2"><Label>País</Label><Input value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} /></div>
            <div className="space-y-2"><Label>Caixa Postal</Label><Input value={form.caixa_postal} onChange={(e) => setForm({ ...form, caixa_postal: e.target.value })} placeholder="Ex: CP 1234" /></div>
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

export default Clientes;
