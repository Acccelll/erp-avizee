import { useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Fornecedor {
  id: string; tipo_pessoa: string; nome_razao_social: string; nome_fantasia: string;
  cpf_cnpj: string; inscricao_estadual: string; email: string; telefone: string; celular: string;
  contato: string; prazo_padrao: number; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; uf: string; cep: string; pais: string;
  observacoes: string; ativo: boolean; created_at: string;
}

const emptyForm: Record<string, any> = {
  tipo_pessoa: "J", nome_razao_social: "", nome_fantasia: "", cpf_cnpj: "",
  inscricao_estadual: "", email: "", telefone: "", celular: "", contato: "",
  prazo_padrao: 30, logradouro: "", numero: "", complemento: "",
  bairro: "", cidade: "", uf: "", cep: "", pais: "Brasil", observacoes: "",
};

const Fornecedores = () => {
  const { data, loading, create, update, remove, duplicate } = useSupabaseCrud<Fornecedor>({ table: "fornecedores" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [comprasHist, setComprasHist] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"todos" | "F" | "J">("todos");

  const openCreate = () => { setMode("create"); setForm({...emptyForm}); setSelected(null); setModalOpen(true); };
  const openEdit = (f: Fornecedor) => {
    setMode("edit"); setSelected(f);
    setForm({
      tipo_pessoa: f.tipo_pessoa || "J", nome_razao_social: f.nome_razao_social, nome_fantasia: f.nome_fantasia || "",
      cpf_cnpj: f.cpf_cnpj || "", inscricao_estadual: f.inscricao_estadual || "",
      email: f.email || "", telefone: f.telefone || "", celular: f.celular || "", contato: f.contato || "",
      prazo_padrao: f.prazo_padrao || 30, logradouro: f.logradouro || "", numero: f.numero || "",
      complemento: f.complemento || "", bairro: f.bairro || "", cidade: f.cidade || "",
      uf: f.uf || "", cep: f.cep || "", pais: f.pais || "Brasil", observacoes: f.observacoes || "",
    });
    setModalOpen(true);
  };

  const openView = async (f: Fornecedor) => {
    setSelected(f); setDrawerOpen(true);
    const { data: compras } = await (supabase as any).from("compras")
      .select("numero, data_compra, valor_total, status, data_entrega_prevista, data_entrega_real")
      .eq("fornecedor_id", f.id).eq("ativo", true).order("data_compra", { ascending: false }).limit(20);
    setComprasHist(compras || []);
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

  // Compute delivery stats from history
  const deliveryStats = (() => {
    const delivered = comprasHist.filter((c: any) => c.data_entrega_real && c.data_entrega_prevista);
    if (delivered.length === 0) return { prazoMedio: 0, atrasoMedio: 0 };
    let totalDias = 0, totalAtraso = 0;
    delivered.forEach((c: any) => {
      const prev = new Date(c.data_entrega_prevista).getTime();
      const real = new Date(c.data_entrega_real).getTime();
      const compra = new Date(c.data_compra).getTime();
      totalDias += (real - compra) / (1000 * 60 * 60 * 24);
      totalAtraso += Math.max(0, (real - prev) / (1000 * 60 * 60 * 24));
    });
    return { prazoMedio: Math.round(totalDias / delivered.length), atrasoMedio: Math.round(totalAtraso / delivered.length) };
  })();

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return data.filter((fornecedor) => {
      if (tipoFilter !== "todos" && fornecedor.tipo_pessoa !== tipoFilter) return false;
      if (!query) return true;

      const haystack = [fornecedor.nome_razao_social, fornecedor.nome_fantasia, fornecedor.cpf_cnpj, fornecedor.email, fornecedor.cidade, fornecedor.uf, fornecedor.telefone, fornecedor.contato]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [data, searchTerm, tipoFilter]);

  const columns = [
    { key: "nome_razao_social", label: "Razão Social" },
    { key: "cpf_cnpj", label: "CNPJ", render: (f: Fornecedor) => <span className="font-mono text-xs">{f.cpf_cnpj || "—"}</span> },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "cidade", label: "Cidade", render: (f: Fornecedor) => f.cidade ? `${f.cidade}/${f.uf}` : "—" },
    { key: "ativo", label: "Status", render: (f: Fornecedor) => <StatusBadge status={f.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Fornecedores" subtitle="Cadastro e gestão de fornecedores" addLabel="Novo Fornecedor" onAdd={openCreate} count={filteredData.length}
        searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por razão social, CNPJ ou cidade..."
        filters={<Select value={tipoFilter} onValueChange={(v: any) => setTipoFilter(v)}><SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="J">Pessoa jurídica</SelectItem><SelectItem value="F">Pessoa física</SelectItem></SelectContent></Select>}
      >
        <DataTable columns={columns} data={filteredData} loading={loading}
          onView={openView} onEdit={openEdit} onDelete={(f) => remove(f.id)} onDuplicate={(f) => duplicate(f)} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Novo Fornecedor" : "Editar Fornecedor"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2"><Label>Razão Social *</Label><Input value={form.nome_razao_social} onChange={(e) => setForm({ ...form, nome_razao_social: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
            <div className="space-y-2"><Label>CNPJ</Label>
              <MaskedInput mask="cnpj" value={form.cpf_cnpj} onChange={(v) => setForm({ ...form, cpf_cnpj: v })} />
            </div>
            <div className="space-y-2"><Label>I.E.</Label><Input value={form.inscricao_estadual} onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label>
              <MaskedInput mask="telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
            </div>
            <div className="space-y-2"><Label>Celular</Label>
              <MaskedInput mask="celular" value={form.celular} onChange={(v) => setForm({ ...form, celular: v })} />
            </div>
            <div className="space-y-2"><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
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
          <div className="space-y-4">
            <div><span className="text-xs text-muted-foreground">Razão Social</span><p className="font-medium">{selected.nome_razao_social}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">CNPJ</span><p className="font-mono text-sm">{selected.cpf_cnpj || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">I.E.</span><p>{selected.inscricao_estadual || "—"}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Telefone</span><p>{selected.telefone || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">E-mail</span><p>{selected.email || "—"}</p></div>
            </div>

            {/* Delivery Stats */}
            {comprasHist.length > 0 && (
              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Prazo Médio Entrega</p>
                  <p className="text-lg font-bold font-mono">{deliveryStats.prazoMedio} dias</p>
                </div>
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Atraso Médio</p>
                  <p className={`text-lg font-bold font-mono ${deliveryStats.atrasoMedio > 0 ? "text-destructive" : "text-success"}`}>{deliveryStats.atrasoMedio} dias</p>
                </div>
              </div>
            )}

            {/* Histórico Compras */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Histórico de Compras ({comprasHist.length})</h4>
              {comprasHist.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma compra registrada</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {comprasHist.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0 text-sm">
                      <div>
                        <span className="font-mono text-xs text-primary font-medium">{c.numero}</span>
                        <span className="text-xs text-muted-foreground ml-2">{new Date(c.data_compra).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold">R$ {Number(c.valor_total || 0).toFixed(2)}</span>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Fornecedores;
