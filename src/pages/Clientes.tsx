import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Copy, Trash2 } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { TimelineList } from "@/components/ui/TimelineList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Plus, Building2, Clock, DollarSign, CreditCard, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

interface Cliente {
  id: string; tipo_pessoa: string; nome_razao_social: string; nome_fantasia: string;
  cpf_cnpj: string; inscricao_estadual: string; email: string; telefone: string; celular: string;
  contato: string; prazo_padrao: number; limite_credito: number;
  logradouro: string; numero: string; complemento: string; bairro: string; cidade: string;
  uf: string; cep: string; pais: string; observacoes: string; ativo: boolean; created_at: string;
  grupo_economico_id: string | null; tipo_relacao_grupo: string | null; caixa_postal: string | null;
}

interface GrupoEconomico { id: string; nome: string; }

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
  const [saldoAberto, setSaldoAberto] = useState(0);
  const [titulosVencidos, setTitulosVencidos] = useState(0);
  const [ultimaCompra, setUltimaCompra] = useState<string | null>(null);

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
    const [comRes, empRes, titulosRes, orcRes] = await Promise.all([
      (supabase as any).from("cliente_registros_comunicacao").select("*").eq("cliente_id", c.id).order("data_hora", { ascending: false }),
      c.grupo_economico_id ? (supabase as any).from("clientes")
        .select("id, nome_razao_social, nome_fantasia, cpf_cnpj, tipo_relacao_grupo, cidade, uf")
        .eq("grupo_economico_id", c.grupo_economico_id).eq("ativo", true).neq("id", c.id) : Promise.resolve({ data: [] }),
      (supabase as any).from("financeiro_lancamentos")
        .select("id, descricao, data_vencimento, data_pagamento, valor, status")
        .eq("cliente_id", c.id).eq("tipo", "receber").eq("ativo", true)
        .order("data_vencimento", { ascending: false }).limit(50),
      (supabase as any).from("orcamentos")
        .select("data_orcamento").eq("cliente_id", c.id).eq("ativo", true)
        .order("data_orcamento", { ascending: false }).limit(1),
    ]);
    setComRecords(comRes.data || []);
    setEmpresasGrupo(empRes.data || []);

    const titulos = titulosRes.data || [];
    setPmvTitulos(titulos);

    // Saldo em aberto
    const aberto = titulos.filter((t: any) => t.status === "aberto" || t.status === "vencido");
    setSaldoAberto(aberto.reduce((s: number, t: any) => s + Number(t.valor || 0), 0));
    setTitulosVencidos(aberto.filter((t: any) => t.status === "vencido").length);

    // PMV
    const pagos = titulos.filter((t: any) => t.data_pagamento);
    if (pagos.length > 0) {
      const totalDias = pagos.reduce((acc: number, t: any) => {
        const venc = new Date(t.data_vencimento);
        const pag = new Date(t.data_pagamento);
        return acc + Math.round((pag.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      setPmv(Math.round(totalDias / pagos.length));
    } else { setPmv(null); }

    // Última compra/cotação
    setUltimaCompra(orcRes.data?.[0]?.data_orcamento || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) { toast.error("Nome/Razão Social é obrigatório"); return; }
    setSaving(true);
    const payload = { ...form, grupo_economico_id: form.grupo_economico_id || null, caixa_postal: form.caixa_postal || null };
    try {
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const addComunicacao = async () => {
    if (!selected || !comForm.assunto) { toast.error("Assunto é obrigatório"); return; }
    await (supabase as any).from("cliente_registros_comunicacao").insert({ cliente_id: selected.id, ...comForm, data_hora: new Date().toISOString() });
    toast.success("Registro adicionado!");
    const { data: records } = await (supabase as any).from("cliente_registros_comunicacao").select("*").eq("cliente_id", selected.id).order("data_hora", { ascending: false });
    setComRecords(records || []);
    setComForm({ canal: "", assunto: "", descricao: "" });
    setComOpen(false);
  };

  const grupoNome = (id: string | null) => !id ? "—" : grupos.find(g => g.id === id)?.nome || "—";
  const relacaoLabel: Record<string, string> = { matriz: "Matriz", filial: "Filial", coligada: "Coligada", independente: "Independente" };

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((cliente) => {
      if (tipoFilter !== "todos" && cliente.tipo_pessoa !== tipoFilter) return false;
      if (grupoFilter === "com_grupo" && !cliente.grupo_economico_id) return false;
      if (grupoFilter === "sem_grupo" && cliente.grupo_economico_id) return false;
      if (!query) return true;
      return [cliente.nome_razao_social, cliente.nome_fantasia, cliente.cpf_cnpj, cliente.email, cliente.cidade, cliente.uf, cliente.telefone, cliente.contato].filter(Boolean).join(" ").toLowerCase().includes(query);
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
          onView={openView} />
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
            <div className="space-y-2"><Label>CPF/CNPJ</Label><MaskedInput mask="cpf_cnpj" value={form.cpf_cnpj} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} /></div>
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
                <SelectContent><SelectItem value="nenhum">Nenhum</SelectItem>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tipo de Relação</Label>
              <Select value={form.tipo_relacao_grupo} onValueChange={(v) => setForm({ ...form, tipo_relacao_grupo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{relacaoOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <h3 className="font-semibold text-sm pt-2 border-t">Endereço</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>CEP</Label><MaskedInput mask="cep" value={form.cep} onChange={(v) => setForm({ ...form, cep: v })} /></div>
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

      {/* View Drawer with Tabs */}
      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Cliente"
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); duplicate(selected); }}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Duplicar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
      >
        {selected && (
          <div className="space-y-5">
            {/* Header with identity */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {(selected.nome_fantasia || selected.nome_razao_social).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">{selected.nome_razao_social}</h3>
                  <StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} />
                </div>
                {selected.nome_fantasia && (
                  <p className="text-sm text-muted-foreground truncate">{selected.nome_fantasia}</p>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {selected.tipo_pessoa === "F" ? "PF" : "PJ"} • {selected.cpf_cnpj || "—"}
                </p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Limite</p>
                <p className="font-mono font-bold text-sm text-foreground truncate" title={formatCurrency(selected.limite_credito || 0)}>{formatCurrency(selected.limite_credito || 0)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Saldo Aberto</p>
                <p className={`font-mono font-bold text-sm truncate ${saldoAberto > 0 ? "text-warning" : "text-foreground"}`} title={formatCurrency(saldoAberto)}>{formatCurrency(saldoAberto)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">PMV</p>
                <p className={`font-mono font-bold text-base ${pmv !== null && pmv > 0 ? "text-warning" : pmv !== null && pmv < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                  {pmv !== null ? `${pmv > 0 ? "+" : ""}${pmv}` : "—"}<span className="text-xs font-normal text-muted-foreground ml-0.5">{pmv !== null ? "d" : ""}</span>
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Últ. Compra</p>
                <p className="font-mono font-bold text-sm text-foreground truncate">{ultimaCompra ? formatDate(ultimaCompra) : "—"}</p>
              </div>
            </div>

            {titulosVencidos > 0 && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
                <AlertTriangle className="w-3 h-3" /> {titulosVencidos} título(s) vencido(s)
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="cadastro" className="w-full">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="cadastro" className="text-xs">Cadastro</TabsTrigger>
                <TabsTrigger value="financeiro" className="text-xs">Financeiro</TabsTrigger>
                <TabsTrigger value="endereco" className="text-xs">Endereço</TabsTrigger>
                <TabsTrigger value="grupo" className="text-xs">Grupo</TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="cadastro" className="mt-3 space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    { label: "E-mail", value: selected.email },
                    { label: "Contato", value: selected.contato },
                    { label: "Telefone", value: selected.telefone },
                    { label: "Celular", value: selected.celular },
                    { label: "Prazo Padrão", value: `${selected.prazo_padrao || 30} dias` },
                    { label: "I.E.", value: selected.inscricao_estadual, mono: true },
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
              </TabsContent>

              <TabsContent value="financeiro" className="mt-3 space-y-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> PMV — Prazo Médio de Vencimento</p>
                  {pmv !== null ? (
                    <div>
                      <p className="text-2xl font-bold mt-1">{pmv > 0 ? `+${pmv}` : pmv} <span className="text-sm font-normal text-muted-foreground">dias</span></p>
                      <p className="text-xs text-muted-foreground">Baseado em {pmvTitulos.filter((t: any) => t.data_pagamento).length} título(s)</p>
                      {pmv > 0 && <p className="text-xs text-warning mt-1">Paga em média {pmv} dias após vencimento</p>}
                      {pmv < 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Paga em média {Math.abs(pmv)} dias antes</p>}
                      {pmv === 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Paga no vencimento</p>}
                    </div>
                  ) : <p className="text-sm text-muted-foreground mt-1">Sem títulos pagos para cálculo</p>}
                </div>
                {pmvTitulos.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Últimos Títulos</h4>
                    <div className="space-y-1 max-h-[250px] overflow-y-auto">
                      {pmvTitulos.slice(0, 15).map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{t.descricao}</p>
                            <p className="text-[10px] text-muted-foreground">Venc: {formatDate(t.data_vencimento)}</p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3 space-y-0.5">
                            <p className="font-mono text-sm font-semibold">{formatCurrency(t.valor)}</p>
                            <StatusBadge status={t.status === "pago" ? "Pago" : t.status === "vencido" ? "Vencido" : "Aberto"} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="endereco" className="mt-3 space-y-3">
                {selected.logradouro ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="col-span-2">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Logradouro</p>
                      <p className="text-sm">{selected.logradouro}, {selected.numero}{selected.complemento ? ` - ${selected.complemento}` : ""}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Bairro</p>
                      <p className="text-sm">{selected.bairro || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Cidade/UF</p>
                      <p className="text-sm">{selected.cidade}/{selected.uf}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">CEP</p>
                      <p className="text-sm font-mono">{selected.cep}</p>
                    </div>
                    {selected.pais && selected.pais !== "Brasil" && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">País</p>
                        <p className="text-sm">{selected.pais}</p>
                      </div>
                    )}
                    {selected.caixa_postal && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Caixa Postal</p>
                        <p className="text-sm">{selected.caixa_postal}</p>
                      </div>
                    )}
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-6">Nenhum endereço cadastrado</p>}
              </TabsContent>

              <TabsContent value="grupo" className="mt-3 space-y-3">
                {selected.grupo_economico_id ? (
                  <>
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Building2 className="w-3 h-3" /> Grupo Econômico</p>
                      <p className="font-medium mt-1">{grupoNome(selected.grupo_economico_id)}</p>
                      <p className="text-xs text-muted-foreground">{relacaoLabel[selected.tipo_relacao_grupo || "independente"]}</p>
                    </div>
                    {empresasGrupo.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-3"><Building2 className="w-4 h-4" /> Empresas Relacionadas ({empresasGrupo.length})</h4>
                        <div className="space-y-1">
                          {empresasGrupo.map((emp: any) => (
                            <div key={emp.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{emp.nome_razao_social}</p>
                                <p className="text-xs text-muted-foreground">{emp.cpf_cnpj || "—"} • {emp.cidade ? `${emp.cidade}/${emp.uf}` : "—"}</p>
                              </div>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{relacaoLabel[emp.tipo_relacao_grupo || "independente"]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : <p className="text-sm text-muted-foreground text-center py-6">Não pertence a nenhum grupo econômico</p>}
              </TabsContent>

              <TabsContent value="historico" className="mt-3 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comunicações</h4>
                  <Button size="sm" variant="outline" onClick={() => setComOpen(!comOpen)} className="gap-1"><Plus className="w-3 h-3" /> Novo</Button>
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
                  items={comRecords.map((r: any) => ({ id: r.id, title: r.assunto, description: r.descricao, date: r.data_hora, type: r.canal }))}
                  emptyMessage="Nenhum registro de comunicação"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Clientes;
