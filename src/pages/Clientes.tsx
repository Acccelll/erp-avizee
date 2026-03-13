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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { TimelineList } from "@/components/ui/TimelineList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Plus } from "lucide-react";

interface Cliente {
  id: string; tipo_pessoa: string; nome_razao_social: string; nome_fantasia: string;
  cpf_cnpj: string; inscricao_estadual: string; email: string; telefone: string; celular: string;
  contato: string; prazo_padrao: number; limite_credito: number;
  logradouro: string; numero: string; complemento: string; bairro: string; cidade: string;
  uf: string; cep: string; pais: string; observacoes: string; ativo: boolean; created_at: string;
}

const emptyCliente: Record<string, any> = {
  tipo_pessoa: "J", nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "",
  inscricao_estadual: "", email: "", telefone: "", celular: "", contato: "",
  prazo_padrao: 30, limite_credito: 0,
  logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "", pais: "Brasil",
  observacoes: "",
};

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
    });
    setModalOpen(true);
  };

  const openView = async (c: Cliente) => {
    setSelected(c); setDrawerOpen(true);
    const { data: records } = await (supabase as any).from("cliente_registros_comunicacao")
      .select("*").eq("cliente_id", c.id).order("data_hora", { ascending: false });
    setComRecords(records || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_razao_social) { toast.error("Nome/Razão Social é obrigatório"); return; }
    setSaving(true);
    try {
      if (mode === "create") await create(form);
      else if (selected) await update(selected.id, form);
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

  const columns = [
    { key: "nome_razao_social", label: "Nome / Razão Social" },
    { key: "tipo_pessoa", label: "Tipo", render: (c: Cliente) => c.tipo_pessoa === "F" ? "PF" : "PJ" },
    { key: "cpf_cnpj", label: "CPF/CNPJ", render: (c: Cliente) => <span className="font-mono text-xs">{c.cpf_cnpj || "—"}</span> },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "cidade", label: "Cidade", render: (c: Cliente) => c.cidade ? `${c.cidade}/${c.uf}` : "—" },
    { key: "ativo", label: "Status", render: (c: Cliente) => <StatusBadge status={c.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Clientes" subtitle="Cadastro e gestão de clientes" addLabel="Novo Cliente" onAdd={openCreate} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
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
