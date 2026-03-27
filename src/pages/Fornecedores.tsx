import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { AdvancedFilterBar, type FilterChip } from "@/components/AdvancedFilterBar";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Copy, Trash2 } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useViaCep } from "@/hooks/useViaCep";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Truck, Clock, AlertTriangle, ShoppingCart, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

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
  const { buscarCep, loading: cepLoading } = useViaCep();
  const { buscarCnpj, loading: cnpjLoading } = useCnpjLookup();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [comprasHist, setComprasHist] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "F" | "J">("todos");
  const [produtosForn, setProdutosForn] = useState<any[]>([]);
  const [titulosForn, setTitulosForn] = useState<any[]>([]);

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

  const openView = async (f: Fornecedor) => {
    setSelected(f);setDrawerOpen(true);
    const [comprasRes, prodsRes, titRes] = await Promise.all([
    supabase.from("compras").
    select("numero, data_compra, valor_total, status, data_entrega_prevista, data_entrega_real").
    eq("fornecedor_id", f.id).eq("ativo", true).order("data_compra", { ascending: false }).limit(20),
    supabase.from("produtos_fornecedores").
    select("preco_compra, lead_time_dias, referencia_fornecedor, produtos:produto_id(nome, sku)").
    eq("fornecedor_id", f.id),
    supabase.from("financeiro_lancamentos").
    select("descricao, data_vencimento, data_pagamento, valor, status").
    eq("fornecedor_id", f.id).eq("tipo", "pagar").eq("ativo", true).
    order("data_vencimento", { ascending: false }).limit(20)]
    );
    setComprasHist(comprasRes.data || []);
    setProdutosForn(prodsRes.data || []);
    setTitulosForn(titRes.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) {toast.error("Razão Social é obrigatória");return;}
    setSaving(true);
    try {
      if (mode === "create") await create(form);else
      if (selected) await update(selected.id, form);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  // Stats
  const deliveryStats = (() => {
    const delivered = comprasHist.filter((c: any) => c.data_entrega_real && c.data_entrega_prevista);
    if (delivered.length === 0) return { prazoMedio: 0, atrasoMedio: 0 };
    let totalDias = 0,totalAtraso = 0;
    delivered.forEach((c: any) => {
      const prev = new Date(c.data_entrega_prevista).getTime();
      const real = new Date(c.data_entrega_real).getTime();
      const compra = new Date(c.data_compra).getTime();
      totalDias += (real - compra) / (1000 * 60 * 60 * 24);
      totalAtraso += Math.max(0, (real - prev) / (1000 * 60 * 60 * 24));
    });
    return { prazoMedio: Math.round(totalDias / delivered.length), atrasoMedio: Math.round(totalAtraso / delivered.length) };
  })();

  const volumeComprado = comprasHist.reduce((s: number, c: any) => s + Number(c.valor_total || 0), 0);

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((fornecedor) => {
      if (tipoFilter !== "todos" && fornecedor.tipo_pessoa !== tipoFilter) return false;
      if (!query) return true;
      return [fornecedor.nome_razao_social, fornecedor.nome_fantasia, fornecedor.cpf_cnpj, fornecedor.email, fornecedor.cidade, fornecedor.uf, fornecedor.telefone, fornecedor.contato].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [data, searchTerm, tipoFilter]);

  const columns = [
  { key: "nome_razao_social", label: "Razão Social" },
  { key: "cpf_cnpj", label: "CNPJ", render: (f: Fornecedor) => <span className="font-mono text-xs">{f.cpf_cnpj || "—"}</span> },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "cidade", label: "Cidade", render: (f: Fornecedor) => f.cidade ? `${f.cidade}/${f.uf}` : "—" },
  { key: "ativo", label: "Status", render: (f: Fornecedor) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> }];


  return (
    <AppLayout>
      <ModulePage title="Fornecedores" subtitle="Cadastro e gestão de fornecedores" addLabel="Novo Fornecedor" onAdd={openCreate} count={filteredData.length}
      searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por razão social, CNPJ ou cidade..."
      filters={<Select value={tipoFilter} onValueChange={(v: any) => setTipoFilter(v)}><SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="J">Pessoa jurídica</SelectItem><SelectItem value="F">Pessoa física</SelectItem></SelectContent></Select>}>
        
        <DataTable columns={columns} data={filteredData} loading={loading}
        onView={openView} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Fornecedor" : "Editar Fornecedor"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2"><Label>Razão Social *</Label><Input value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label><MaskedInput mask="cnpj" value={form.cpf_cnpj} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} onBlur={async () => {
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
            }} /></div>
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

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes do Fornecedor"
      actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setDrawerOpen(false);openEdit(selected);}}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setDrawerOpen(false);duplicate(selected);}}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Duplicar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {setDrawerOpen(false);remove(selected.id);}}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}>
        
        {selected &&
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
                {selected.nome_fantasia &&
              <p className="text-sm text-muted-foreground truncate">{selected.nome_fantasia}</p>
              }
                {selected.cpf_cnpj &&
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.cpf_cnpj}</p>
              }
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prazo Médio</p>
                <p className="font-mono font-bold text-base text-foreground">{deliveryStats.prazoMedio}<span className="text-xs font-normal text-muted-foreground ml-0.5">d</span></p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="font-medium text-muted-foreground uppercase tracking-wider text-xs">Atraso</p>
                <p className={`font-mono font-bold text-base ${deliveryStats.atrasoMedio > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{deliveryStats.atrasoMedio}<span className="text-xs font-normal text-muted-foreground ml-0.5">d</span></p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Volume</p>
                <p className="font-mono font-bold text-foreground truncate text-xs" title={formatCurrency(volumeComprado)}>{formatCurrency(volumeComprado)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Últ. Compra</p>
                <p className="font-mono font-bold text-sm text-foreground truncate">{comprasHist.length > 0 ? formatDate(comprasHist[0].data_compra) : "—"}</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="cadastro" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="cadastro" className="text-xs">Cadastro</TabsTrigger>
                <TabsTrigger value="financeiro" className="text-xs">Financeiro</TabsTrigger>
                <TabsTrigger value="compras" className="text-xs">Compras</TabsTrigger>
                <TabsTrigger value="produtos" className="text-xs">Produtos</TabsTrigger>
              </TabsList>

              <TabsContent value="cadastro" className="mt-3 space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                { label: "CNPJ/CPF", value: selected.cpf_cnpj, mono: true },
                { label: "I.E.", value: selected.inscricao_estadual },
                { label: "Telefone", value: selected.telefone },
                { label: "E-mail", value: selected.email },
                { label: "Contato", value: selected.contato },
                { label: "Celular", value: selected.celular }].
                map((field, i) =>
                <div key={i}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{field.label}</p>
                      <p className={`text-sm ${field.mono ? "font-mono" : ""}`}>{field.value || "—"}</p>
                    </div>
                )}
                </div>
                {selected.logradouro &&
              <div className="border-t pt-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Endereço</p>
                    <p className="text-sm">{selected.logradouro}, {selected.numero}{selected.complemento ? ` - ${selected.complemento}` : ""} — {selected.bairro} - {selected.cidade}/{selected.uf} - CEP {selected.cep}</p>
                  </div>
              }
                {selected.observacoes &&
              <div className="border-t pt-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Observações</p>
                    <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
                  </div>
              }
              </TabsContent>

              <TabsContent value="financeiro" className="mt-3">
                {titulosForn.length === 0 ?
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum título registrado</p> :

              <div className="space-y-1 max-h-[350px] overflow-y-auto">
                    {titulosForn.map((t: any, idx: number) =>
                <div key={idx} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{t.descricao}</p>
                          <p className="text-[10px] text-muted-foreground">Venc: {formatDate(t.data_vencimento)}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3 space-y-0.5">
                          <p className="font-mono text-sm font-semibold">{formatCurrency(t.valor)}</p>
                          <StatusBadge status={t.status === "pago" ? "Pago" : t.status === "vencido" ? "Vencido" : "Aberto"} />
                        </div>
                      </div>
                )}
                  </div>
              }
              </TabsContent>

              <TabsContent value="compras" className="mt-3">
                {comprasHist.length === 0 ?
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma compra registrada</p> :

              <div className="space-y-1 max-h-[350px] overflow-y-auto">
                    {comprasHist.map((c: any, idx: number) =>
                <div key={idx} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-primary font-semibold">{c.numero}</span>
                          <span className="text-xs text-muted-foreground ml-2">{formatDate(c.data_compra)}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3 flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{formatCurrency(Number(c.valor_total || 0))}</span>
                          <StatusBadge status={c.status} />
                        </div>
                      </div>
                )}
                  </div>
              }
              </TabsContent>

              <TabsContent value="produtos" className="mt-3">
                {produtosForn.length === 0 ?
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum produto vinculado</p> :

              <div className="space-y-1 max-h-[350px] overflow-y-auto">
                    {produtosForn.map((pf: any, idx: number) =>
                <div key={idx} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 transition-colors border-b last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{pf.produtos?.nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {pf.produtos?.sku && <span className="font-mono">{pf.produtos.sku}</span>}
                            {pf.referencia_fornecedor && <span>Ref: {pf.referencia_fornecedor}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3 space-y-0.5">
                          {pf.preco_compra && <p className="font-mono text-sm font-semibold">{formatCurrency(pf.preco_compra)}</p>}
                          {pf.lead_time_dias && <p className="text-xs text-muted-foreground">{pf.lead_time_dias} dias</p>}
                        </div>
                      </div>
                )}
                  </div>
              }
              </TabsContent>
            </Tabs>
          </div>
        }
      </ViewDrawer>
    </AppLayout>);

};

export default Fornecedores;