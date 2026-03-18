import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { TimelineList } from "@/components/ui/TimelineList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Plus, Building2, Clock, DollarSign } from "lucide-react";

interface Cliente {
  id: string; tipo_pessoa: string; nome_razao_social: string; nome_fantasia: string;
  cpf_cnpj: string; inscricao_estadual: string; email: string; telefone: string; celular: string;
  contato: string; prazo_padrao: number; limite_credito: number;
  logradouro: string; numero: string; complemento: string; bairro: string; cidade: string;
  uf: string; cep: string; pais: string; observacoes: string; ativo: boolean; created_at: string;
  grupo_economico_id: string | null; tipo_relacao_grupo: string | null; caixa_postal: string | null;
}

interface GrupoEconomico {
  id: string; nome: string;
}

const emptyCliente: Record<string, any> = {
  tipo_pessoa: "J", nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "",
  inscricao_estadual: "", email: "", telefone: "", celular: "", contato: "",
  prazo_padrao: 30, limite_credito: 0,
  logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", pais: "Brasil",
  observacoes: "", grupo_economico_id: "", tipo_relacao_grupo: "independente", caixa_postal: "",
};

const relacaoOptions = [
  { value: "independente", label: "Independente" },
  { value: "matriz", label: "Matriz" },
  { value: "filial", label: "Filial" },
  { value: "coligada", label: "Coligada" },
];

const Clientes = () => {
  const { data, loading, create, update, remove, duplicate } = useSupabaseCrud<Cliente>({ table: "clientes" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyCliente);
  const [saving, setSaving] = useState(false);
  const [comRecords, setComRecords] = useState<any[]>([]);
  const [comOpen, setComOpen] = useState(false);
  const [comForm, setComForm] = useState({ canal: "", assunto: "", descricao: "" });
  const [grupos, setGrupos] = useState<GrupoEconomico[]>([]);
  const [empresasGrupo, setEmpresasGrupo] = useState<any[]>([]);
  const [pmv, setPmv] = useState<number | null>(null);
  const [pmvTitulos, setPmvTitulos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "F" | "J">("todos");
  const [grupoFilter, setGrupoFilter] = useState<"todos" | "com_grupo" | "sem_grupo">("todos");

  useEffect(() => {
    (supabase as any).from("grupos_economicos").select("id, nome").eq("ativo", true).order("nome").then(({ data: g }: any) => setGrupos(g || []));
  }, []);

  const openCreate = () => { setMode("create"); setForm({...emptyCliente}); setSelected(null); setModalOpen(true); };
  const openEdit = (c: Cliente) => {
    setMode("edit"); setSelected(c);
    setForm({
      tipo_pessoa: c.tipo_pessoa || "J", nome_razao_social: c.nome_razao_social, nome_fantasia: c.nome_fantasia || "",
      cpf_cnpj: c.cpf_cnpj || "", inscricao_estadual: c.inscricao_estadual || "",
      email: c.email || "", telefone: c.telefone || "", celular: c.celular || "", contato: c.contato || "",
      prazo_padrao: c.prazo_padrao || 30, limite_credito: c.limite_credito || 0,
      logradouro: c.logradouro || "", numero: c.numero || "", complemento: c.complemento || "",
      bairro: c.bairro || "", cidade: c.cidade || "", uf: c.uf || "", cep: c.cep || "",
      pais: c.pais || "Brasil", observacoes: c.observacoes || "",
      grupo_economico_id: c.grupo_economico_id || "", tipo_relacao_grupo: c.tipo_relacao_grupo || "independente",
      caixa_postal: c.caixa_postal || "",
    });
    setModalOpen(true);
  };

  const openView = async (c: Cliente) => {
    setSelected(c); setDrawerOpen(true);
    // Communication records
    const { data: records } = await (supabase as any).from("cliente_registros_comunicacao")
      .select("*").eq("cliente_id", c.id).order("data_hora", { ascending: false });
    setComRecords(records || []);

    // Related companies from same grupo econômico
    if (c.grupo_economico_id) {
      const { data: emp } = await (supabase as any).from("clientes")
        .select("id, nome_razao_social, nome_fantasia, cpf_cnpj, tipo_relacao_grupo, cidade, uf")
        .eq("grupo_economico_id", c.grupo_economico_id).eq("ativo", true).neq("id", c.id);
      setEmpresasGrupo(emp || []);
    } else {
      setEmpresasGrupo([]);
    }

    // PMV calculation - average days between due date and payment date for paid invoices
    const { data: titulos } = await (supabase as any).from("financeiro_lancamentos")
      .select("id, descricao, data_vencimento, data_pagamento, valor, status")
      .eq("cliente_id", c.id).eq("tipo", "receber").eq("ativo", true)
      .not("data_pagamento", "is", null)
      .order("data_pagamento", { ascending: false }).limit(50);

    setPmvTitulos(titulos || []);
    if (titulos && titulos.length > 0) {
      const totalDias = titulos.reduce((acc: number, t: any) => {
        const venc = new Date(t.data_vencimento);
        const pag = new Date(t.data_pagamento);
        return acc + Math.round((pag.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      setPmv(Math.round(totalDias / titulos.length));
    } else {
      setPmv(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) { toast.error("Nome/Razão Social é obrigatório"); return; }
    setSaving(true);
    const payload = {
      ...form,
      grupo_economico_id: form.grupo_economico_id || null,
      caixa_postal: form.caixa_postal || null,
    };
    try {
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const addComunicacao = async () => {
    if (!selected || !comForm.assunto) { toast.error("Assunto é obrigatório"); return; }
    await (supabase as any).from("cliente_registros_comunicacao").insert({
      cliente_id: selected.id, ...comForm, data_hora: new Date().toISOString(),
    });
    toast.success("Registro adicionado!");
    const { data: records } = await (supabase as any).from("cliente_registros_comunicacao")
      .select("*").eq("cliente_id", selected.id).order("data_hora", { ascending: false });
    setComRecords(records || []);
    setComForm({ canal: "", assunto: "", descricao: "" });
    setComOpen(false);
  };

  const grupoNome = (id: string | null) => {
    if (!id) return "—";
    return grupos.find(g => g.id === id)?.nome || "—";
  };

  const relacaoLabel: Record<string, string> = { matriz: "Matriz", filial: "Filial", coligada: "Coligada", independente: "Independente" };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return data.filter((cliente) => {
      if (tipoFilter !== "todos" && cliente.tipo_pessoa !== tipoFilter) return false;
      if (grupoFilter === "com_grupo" && !cliente.grupo_economico_id) return false;
      if (grupoFilter === "sem_grupo" && cliente.grupo_economico_id) return false;
      if (!query) return true;

      const haystack = [cliente.nome_razao_social, cliente.nome_fantasia, cliente.cpf_cnpj, cliente.email, cliente.cidade, cliente.uf, cliente.telefone, cliente.contato]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [data, grupoFilter, searchTerm, tipoFilter]);

  const columns = [
    { key: "nome_razao_social", label: "Nome / Razão Social" },
    { key: "tipo_pessoa", label: "Tipo", render: (c: Cliente) => c.tipo_pessoa === "F" ? "PF" : "PJ" },
    { key: "cpf_cnpj", label: "CPF/CNPJ", render: (c: Cliente) => <span className="font-mono text-xs">{c.cpf_cnpj || "—"}</span> },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "cidade", label: "Cidade", render: (c: Cliente) => c.cidade ? `${c.cidade}/${c.uf}` : "—" },
    { key: "grupo", label: "Grupo Econômico", render: (c: Cliente) => grupoNome(c.grupo_economico_id) },
    { key: "ativo", label: "Status", render: (c: Cliente) => <StatusBadge status={c.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Clientes" subtitle="Cadastro e gestão de clientes" addLabel="Novo Cliente" onAdd={openCreate} count={filteredData.length}
        searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por nome, CNPJ, e-mail ou cidade..."
        filters={<><Select value={tipoFilter} onValueChange={(v: any) => setTipoFilter(v)}><SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="J">Pessoa jurídica</SelectItem><SelectItem value="F">Pessoa física</SelectItem></SelectContent></Select><Select value={grupoFilter} onValueChange={(v: any) => setGrupoFilter(v)}><SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Grupo econômico" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os grupos</SelectItem><SelectItem value="com_grupo">Com grupo econômico</SelectItem><SelectItem value="sem_grupo">Sem grupo econômico</SelectItem></SelectContent></Select></>}
      >
        <DataTable columns={columns} data={filteredData} loading={loading}
          onView={openView} onEdit={openEdit} onDelete={(c) => remove(c.id)} onDuplicate={(c) => duplicate(c)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Cliente" : "Editar Cliente"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Tipo Pessoa</Label>
              <Select value={form.tipo_pessoa} onValueChange={(v) => setForm({ ...form, tipo_pessoa: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="F">Pessoa Física</SelectItem><SelectItem value="J">Pessoa Jurídica</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>CPF/CNPJ</Label>
              <MaskedInput mask="cpf_cnpj" value={form.cpf_cnpj} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} />
            </div>
            <div className="space-y-2"><Label>I.E.</Label><Input value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} /></div>
            <div className="col-span-2 md:col-span-3 space-y-2"><Label>Nome / Razão Social *</Label><Input value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} required /></div>
            <div className="col-span-2 md:col-span-3 space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label>
              <MaskedInput mask="telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
            </div>
            <div className="space-y-2"><Label>Celular</Label>
              <MaskedInput mask="celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} />
            </div>
            <div className="space-y-2"><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
            <div className="space-y-2"><Label>Prazo (dias)</Label><Input type="number" value={form.prazo_padrao} onChange={(e) => setForm({ ...form, prazo_padrao: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Limite Crédito</Label><Input type="number" step="0.01" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: Number(e.target.value) })} /></div>
          </div>

          {/* Grupo Econômico */}
          <h3 className="font-semibold text-sm pt-2 border-t flex items-center gap-2"><Building2 className="w-4 h-4" /> Grupo Econômico</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Grupo</Label>
              <Select value={form.grupo_economico_id} onValueChange={(v) => setForm({ ...form, grupo_economico_id: v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tipo de Relação</Label>
              <Select value={form.tipo_relacao_grupo} onValueChange={(v) => setForm({ ...form, tipo_relacao_grupo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {relacaoOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <h3 className="font-semibold text-sm pt-2 border-t">Endereço</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CEP</Label>
              <MaskedInput mask="cep" value={form.cep} onChange={(v) => setForm({ ...form, cep: v })} />
            </div>
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

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Cliente">
        {selected && (
          <div className="space-y-4">
            <div><span className="text-xs text-muted-foreground">Nome / Razão Social</span><p className="font-medium">{selected.nome_razao_social}</p></div>
            {selected.nome_fantasia && <div><span className="text-xs text-muted-foreground">Fantasia</span><p>{selected.nome_fantasia}</p></div>}
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Tipo</span><p>{selected.tipo_pessoa === "F" ? "Pessoa Física" : "Pessoa Jurídica"}</p></div>
              <div><span className="text-xs text-muted-foreground">CPF/CNPJ</span><p className="font-mono text-sm">{selected.cpf_cnpj || "—"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">E-mail</span><p>{selected.email || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Contato</span><p>{selected.contato || "—"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Telefone</span><p>{selected.telefone || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Celular</span><p>{selected.celular || "—"}</p></div>
            </div>
            {selected.logradouro && (
              <div><span className="text-xs text-muted-foreground">Endereço</span>
                <p>{selected.logradouro}, {selected.numero}{selected.complemento ? ` - ${selected.complemento}` : ""}<br/>
                {selected.bairro} - {selected.cidade}/{selected.uf} - CEP {selected.cep}</p>
              </div>
            )}
            {selected.caixa_postal && (
              <div><span className="text-xs text-muted-foreground">Caixa Postal</span><p>{selected.caixa_postal}</p></div>
            )}

            {/* Grupo Econômico */}
            {selected.grupo_economico_id && (
              <div className="bg-muted/30 rounded-lg p-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Grupo Econômico</span>
                <p className="font-medium">{grupoNome(selected.grupo_economico_id)}</p>
                <p className="text-xs text-muted-foreground">{relacaoLabel[selected.tipo_relacao_grupo || "independente"]}</p>
              </div>
            )}

            {/* PMV Card */}
            <div className="bg-muted/30 rounded-lg p-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> PMV — Prazo Médio de Vencimento</span>
              {pmv !== null ? (
                <div>
                  <p className="text-2xl font-bold mt-1">
                    {pmv > 0 ? `+${pmv}` : pmv} <span className="text-sm font-normal text-muted-foreground">dias</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Baseado em {pmvTitulos.length} título(s) pago(s)</p>
                  {pmv > 0 && <p className="text-xs text-warning mt-1">Cliente paga em média {pmv} dias após o vencimento</p>}
                  {pmv < 0 && <p className="text-xs text-success mt-1">Cliente paga em média {Math.abs(pmv)} dias antes do vencimento</p>}
                  {pmv === 0 && <p className="text-xs text-success mt-1">Cliente paga no vencimento</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Sem títulos pagos para cálculo</p>
              )}
            </div>

            {/* Empresas Relacionadas */}
            {selected.grupo_economico_id && empresasGrupo.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4" /> Empresas Relacionadas ({empresasGrupo.length})
                </h4>
                <div className="space-y-2">
                  {empresasGrupo.map((emp: any) => (
                    <div key={emp.id} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{emp.nome_razao_social}</p>
                        <p className="text-xs text-muted-foreground">{emp.cpf_cnpj || "—"} • {emp.cidade ? `${emp.cidade}/${emp.uf}` : "—"}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {relacaoLabel[emp.tipo_relacao_grupo || "independente"]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comunicação */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comunicações</h4>
                <Button size="sm" variant="outline" onClick={() => setComOpen(!comOpen)} className="gap-1">
                  <Plus className="w-3 h-3" /> Novo
                </Button>
              </div>
              {comOpen && (
                <div className="bg-accent/30 rounded-lg p-3 mb-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Canal (email, telefone...)" value={comForm.canal} onChange={(e) => setComForm({...comForm, canal: e.target.value})} className="h-8 text-xs" />
                    <Input placeholder="Assunto *" value={comForm.assunto} onChange={(e) => setComForm({...comForm, assunto: e.target.value})} className="h-8 text-xs" />
                  </div>
                  <Textarea placeholder="Descrição..." value={comForm.descricao} onChange={(e) => setComForm({...comForm, descricao: e.target.value})} className="min-h-[60px] text-xs" />
                  <Button size="sm" onClick={addComunicacao}>Salvar</Button>
                </div>
              )}
              <TimelineList
                items={comRecords.map((r: any) => ({
                  id: r.id, title: r.assunto, description: r.descricao, date: r.data_hora, type: r.canal,
                }))}
                emptyMessage="Nenhum registro de comunicação"
              />
            </div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Clientes;
