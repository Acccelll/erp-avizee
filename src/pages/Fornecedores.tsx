import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Search, User2, Phone, ShoppingCart, MapPin, FileText,
  Info, Loader2, Calendar, Mail,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { clienteFornecedorSchema, validateForm } from "@/lib/validationSchemas";

const MAX_OBSERVACOES_LENGTH = 2000;
const MAX_PRAZO_DAYS = 365;

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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const editId = (location.state as any)?.editId;
    if (!editId) return;
    navigate(location.pathname, { replace: true, state: {} });
    supabase.from("fornecedores").select("*").eq("id", editId).maybeSingle().then(({ data: f }) => {
      if (f) openEdit(f as Fornecedor);
    });
  // openEdit is stable; navigate/pathname are stable refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const { data, loading, create, update, remove } = useSupabaseCrud<Fornecedor>({
    table: "fornecedores",
    searchTerm: debouncedSearch,
    searchColumns: ["nome_razao_social", "nome_fantasia", "cpf_cnpj", "email", "cidade"],
  });
  const { pushView } = useRelationalNavigation();
  const { buscarCep, loading: cepLoading } = useViaCep();
  const { buscarCnpj, loading: cnpjLoading } = useCnpjLookup();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);

  const updateForm = (patch: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const openCreate = () => {setMode("create");setForm({ ...emptyForm });setSelected(null);setIsDirty(false);setModalOpen(true);};
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
    setIsDirty(false);
    setModalOpen(true);
  };

  const openView = (f: Fornecedor) => {
    pushView("fornecedor", f.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm(clienteFornecedorSchema, form);
    if (!validation.success) {
      setFormErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Corrija os erros do formulário");
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      if (mode === "create") await create(form);else
      if (selected) await update(selected.id, form);
      setIsDirty(false);
      setModalOpen(false);
    } catch (err) {
      console.error('[fornecedores] erro ao salvar:', err);
    }
    setSaving(false);
  };

  const filteredData = useMemo(() => {
    // Text search is now server-side; only apply local dropdown filters
    return data.filter((fornecedor) => {
      if (tipoFilters.length > 0 && !tipoFilters.includes(fornecedor.tipo_pessoa)) return false;
      return true;
    });
  }, [data, tipoFilters]);

  const columns = [
  { key: "nome_razao_social", label: "Razão Social", sortable: true },
  { key: "cpf_cnpj", label: "CNPJ", render: (f: Fornecedor) => <span className="font-mono text-xs">{f.cpf_cnpj || "—"}</span> },
  { key: "email", label: "E-mail", sortable: true },
  { key: "telefone", label: "Telefone" },
  { key: "cidade", label: "Cidade", sortable: true, render: (f: Fornecedor) => f.cidade ? `${f.cidade}/${f.uf}` : "—" },
  { key: "ativo", label: "Status", render: (f: Fornecedor) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> }];


  const fornActiveFilters = useMemo(() => {
    const chips: FilterChip[] = [];
    tipoFilters.forEach(f => {
      chips.push({
        key: "tipo",
        label: "Tipo",
        value: [f],
        displayValue: f === "J" ? "Pessoa Jurídica" : "Pessoa Física"
      });
    });
    return chips;
  }, [tipoFilters]);

  const handleRemoveFornFilter = (key: string, value?: string) => {
    if (key === "tipo") setTipoFilters(prev => prev.filter(v => v !== value));
  };

  const tipoOptions: MultiSelectOption[] = [
    { label: "Pessoa Jurídica", value: "J" },
    { label: "Pessoa Física", value: "F" },
  ];

  return (
    <AppLayout>
      <ModulePage title="Fornecedores" subtitle="Cadastro e gestão de fornecedores" addLabel="Novo Fornecedor" onAdd={openCreate}>
        
        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por razão social, CNPJ ou cidade..."
          activeFilters={fornActiveFilters}
          onRemoveFilter={handleRemoveFornFilter}
          onClearAll={() => setTipoFilters([])}
          count={filteredData.length}
        >
          <MultiSelect
            options={tipoOptions}
            selected={tipoFilters}
            onChange={setTipoFilters}
            placeholder="Tipos"
            className="w-[150px]"
          />
        </AdvancedFilterBar>

        <DataTable columns={columns} data={filteredData} loading={loading}
        onView={openView} onEdit={openEdit} onDelete={(f) => remove(f.id)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => {
        if (isDirty && !window.confirm("Existem alterações não salvas. Deseja descartar as alterações?")) return;
        setModalOpen(false);
      }} title={mode === "create" ? "Novo Fornecedor" : "Editar Fornecedor"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-0">

          {/* Edit-mode context bar */}
          {mode === "edit" && selected && (
            <div className="flex flex-wrap items-center gap-3 bg-muted/40 rounded-lg px-3 py-2 mb-4 text-xs text-muted-foreground border">
              <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
              {selected.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Cadastrado em {formatDate(selected.created_at)}
                </span>
              )}
              {form.prazo_padrao ? (
                <span className="flex items-center gap-1">
                  <ShoppingCart className="h-3 w-3" />
                  Prazo padrão: {form.prazo_padrao} dias
                </span>
              ) : null}
              {isDirty && (
                <span className="flex items-center gap-1 text-amber-600 ml-auto font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                  Alterações não salvas
                </span>
              )}
            </div>
          )}

          {/* ── BLOCO 1: IDENTIFICAÇÃO ─────────────────────────── */}
          <div className="flex items-center gap-2 pt-1 pb-3 border-b mb-4">
            <User2 className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Identificação</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1.5">
              <Label>Tipo de Pessoa</Label>
              <Select value={form.tipo_pessoa} onValueChange={(v) => updateForm({ tipo_pessoa: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="J">Pessoa Jurídica</SelectItem>
                  <SelectItem value="F">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label>CPF/CNPJ</Label>
                {form.tipo_pessoa === "J" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px] text-xs">
                      Informe o CNPJ e clique em <strong>Consultar</strong> para preencher automaticamente Razão Social, Nome Fantasia, e-mail, telefone e endereço.
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex gap-1">
                <MaskedInput mask="cpf_cnpj" value={form.cpf_cnpj} onChange={(v) => updateForm({ cpf_cnpj: v })} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      disabled={cnpjLoading || form.tipo_pessoa !== "J"}
                      onClick={async () => {
                        const result = await buscarCnpj(form.cpf_cnpj);
                        if (result) {
                          setForm(prev => ({
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
                          setIsDirty(true);
                        }
                      }}
                    >
                      {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {form.tipo_pessoa !== "J" ? "Disponível apenas para Pessoa Jurídica" : "Consultar CNPJ e preencher automaticamente"}
                  </TooltipContent>
                </Tooltip>
              </div>
              {formErrors.cpf_cnpj && <p className="text-xs text-destructive">{formErrors.cpf_cnpj}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label>Inscrição Estadual</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-xs">
                    Inscrição Estadual para emissão e recebimento de notas fiscais. Informe "ISENTO" quando aplicável.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input value={form.inscricao_estadual} onChange={(e) => updateForm({ inscricao_estadual: e.target.value })} placeholder="Ex: 123.456.789.000 ou ISENTO" />
            </div>
            <div className="col-span-2 md:col-span-3 space-y-1.5">
              <Label>Nome / Razão Social <span className="text-destructive">*</span></Label>
              <Input
                value={form.nome_razao_social}
                onChange={(e) => updateForm({ nome_razao_social: e.target.value })}
                required
                placeholder={form.tipo_pessoa === "J" ? "Razão social conforme CNPJ" : "Nome completo"}
                className={formErrors.nome_razao_social ? "border-destructive" : ""}
              />
              {formErrors.nome_razao_social && <p className="text-xs text-destructive">{formErrors.nome_razao_social}</p>}
            </div>
            <div className="col-span-2 md:col-span-3 space-y-1.5">
              <div className="flex items-center gap-1">
                <Label>Nome Fantasia</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-xs">
                    Nome comercial pelo qual o fornecedor é conhecido. Aparece nas listagens, pedidos e relatórios.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input value={form.nome_fantasia} onChange={(e) => updateForm({ nome_fantasia: e.target.value })} placeholder="Nome comercial (opcional)" />
            </div>
          </div>

          {/* ── BLOCO 2: CONTATO ──────────────────────────────── */}
          <div className="flex items-center gap-2 pt-4 pb-3 border-t border-b mb-4">
            <Phone className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Contato</h3>
          </div>
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Referência de atendimento</p>
              <div className="space-y-1.5">
                <Label>Pessoa de Contato</Label>
                <Input
                  value={form.contato}
                  onChange={(e) => updateForm({ contato: e.target.value })}
                  placeholder="Nome do responsável pelo atendimento comercial"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Canais de comunicação</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2 md:col-span-3 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label>E-mail</Label>
                  </div>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    placeholder="email@fornecedor.com.br"
                    className={formErrors.email ? "border-destructive" : ""}
                  />
                  {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <MaskedInput mask="telefone" value={form.telefone} onChange={(v) => updateForm({ telefone: v })} />
                  {formErrors.telefone && <p className="text-xs text-destructive">{formErrors.telefone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Celular / WhatsApp</Label>
                  <MaskedInput mask="celular" value={form.celular} onChange={(v) => updateForm({ celular: v })} />
                  {formErrors.celular && <p className="text-xs text-destructive">{formErrors.celular}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ── BLOCO 3: CONDIÇÕES DE COMPRA ──────────────────── */}
          <div className="flex items-center gap-2 pt-4 pb-1 border-t">
            <ShoppingCart className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Condições de Compra</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Condições comerciais padrão deste fornecedor. Aplicadas automaticamente em cotações e pedidos de compra. Podem ser sobrescritas por operação.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="col-span-2 md:col-span-2 space-y-1.5">
              <div className="flex items-center gap-1">
                <Label>Prazo Padrão (dias)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px] text-xs">
                    Prazo padrão de pagamento em dias, contados a partir da emissão do pedido ou recebimento da NF. Impacta diretamente o fluxo de caixa do financeiro.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                type="number"
                min={0}
                max={MAX_PRAZO_DAYS}
                value={form.prazo_padrao}
                onChange={(e) => updateForm({ prazo_padrao: Number(e.target.value) })}
                placeholder="Ex: 30"
                className={formErrors.prazo_padrao ? "border-destructive" : ""}
              />
              {formErrors.prazo_padrao && <p className="text-xs text-destructive">{formErrors.prazo_padrao}</p>}
            </div>
          </div>

          {/* ── BLOCO 4: ENDEREÇO ─────────────────────────────── */}
          <div className="flex items-center gap-2 pt-4 pb-1 border-t">
            <MapPin className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Endereço</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Informe o CEP para preenchimento automático do logradouro, bairro, cidade e UF.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <div className="relative">
                <MaskedInput
                  mask="cep"
                  value={form.cep}
                  onChange={(v) => updateForm({ cep: v })}
                  onBlur={async () => {
                    const result = await buscarCep(form.cep);
                    if (result) {
                      setForm(prev => ({ ...prev, logradouro: result.logradouro, bairro: result.bairro, cidade: result.localidade, uf: result.uf }));
                      setIsDirty(true);
                    }
                  }}
                  className={cepLoading ? "pr-8" : ""}
                />
                {cepLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
              {formErrors.cep && <p className="text-xs text-destructive">{formErrors.cep}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Logradouro</Label>
              <Input value={form.logradouro} onChange={(e) => updateForm({ logradouro: e.target.value })} placeholder="Rua, Av., Travessa..." />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={form.numero} onChange={(e) => updateForm({ numero: e.target.value })} placeholder="Nº ou S/N" />
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input value={form.complemento} onChange={(e) => updateForm({ complemento: e.target.value })} placeholder="Sala, bloco, galpão..." />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={(e) => updateForm({ bairro: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => updateForm({ cidade: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input
                maxLength={2}
                placeholder="SP"
                value={form.uf}
                onChange={(e) => updateForm({ uf: e.target.value.toUpperCase() })}
                className={formErrors.uf ? "border-destructive" : ""}
              />
              {formErrors.uf && <p className="text-xs text-destructive">{formErrors.uf}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={form.pais} onChange={(e) => updateForm({ pais: e.target.value })} />
            </div>
          </div>

          {/* ── BLOCO 5: OBSERVAÇÕES ──────────────────────────── */}
          <div className="flex items-center gap-2 pt-4 pb-1 border-t">
            <FileText className="w-4 h-4 text-primary/70" />
            <h3 className="font-semibold text-sm">Observações</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Notas internas, comerciais e operacionais sobre o fornecedor. Visível apenas internamente.
          </p>
          <div className="mb-6">
            <Textarea
              rows={5}
              maxLength={MAX_OBSERVACOES_LENGTH}
              value={form.observacoes}
              onChange={(e) => updateForm({ observacoes: e.target.value })}
              placeholder="Informações relevantes: condições especiais negociadas, restrições de fornecimento, preferências logísticas, histórico de relacionamento..."
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{(form.observacoes || "").length}/{MAX_OBSERVACOES_LENGTH}</p>
          </div>

          {/* ── RODAPÉ ────────────────────────────────────────── */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isDirty && !window.confirm("Existem alterações não salvas. Deseja descartar as alterações?")) return;
                setModalOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[100px]">
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : "Salvar"}
            </Button>
          </div>
        </form>
      </FormModal>

    </AppLayout>);

};

export default Fornecedores;
