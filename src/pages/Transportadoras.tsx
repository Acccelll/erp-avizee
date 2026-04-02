import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Search, Building2, MapPin, Package, Truck, Star, AlertTriangle } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const [remessasVinculadas, setRemessasVinculadas] = useState<any[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (selected && drawerOpen) {
      supabase.from("cliente_transportadoras")
        .select("*, clientes(nome_razao_social, cpf_cnpj)")
        .eq("transportadora_id", selected.id)
        .then(({ data }) => setClientesVinculados(data || []));
      supabase.from("remessas")
        .select("id, codigo_rastreio, status_transporte, data_postagem, previsao_entrega, servico, clientes(nome_razao_social)")
        .eq("transportadora_id", selected.id)
        .order("created_at", { ascending: false })
        .limit(30)
        .then(({ data }) => setRemessasVinculadas(data || []));
    } else {
      setClientesVinculados([]);
      setRemessasVinculadas([]);
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

  const remessaStatusMap: Record<string, { label: string; classes: string }> = {
    pendente:    { label: "Pendente",    classes: "bg-warning/10 text-warning border-warning/20" },
    postado:     { label: "Postado",     classes: "bg-info/10 text-info border-info/20" },
    em_transito: { label: "Em Trânsito", classes: "bg-info/10 text-info border-info/20" },
    entregue:    { label: "Entregue",    classes: "bg-success/10 text-success border-success/20" },
    devolvido:   { label: "Devolvido",   classes: "bg-destructive/10 text-destructive border-destructive/20" },
  };

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
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmOpen(true)}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
        summary={selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {selected.nome_fantasia && selected.nome_fantasia !== selected.nome_razao_social && (
                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{selected.nome_fantasia}</span>
              )}
              {selected.cpf_cnpj && (
                <span className="font-mono">{selected.cpf_cnpj}</span>
              )}
              {selected.cidade && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.cidade}{selected.uf ? `/${selected.uf}` : ""}</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Modalidade</p>
                <p className="font-semibold text-sm text-foreground leading-tight">{modalidadeLabel[selected.modalidade] || "—"}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prazo Médio</p>
                <p className="font-mono font-bold text-sm text-foreground leading-tight">{selected.prazo_medio || "—"}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Clientes</p>
                <p className="font-mono font-bold text-sm text-foreground">{clientesVinculados.length}</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Remessas</p>
                <p className="font-mono font-bold text-sm text-foreground">{remessasVinculadas.length}</p>
              </div>
            </div>
          </div>
        ) : undefined}
        tabs={[
          {
            value: "resumo",
            label: "Resumo",
            content: selected ? (
              <div className="space-y-4">
                <ViewSection title="Identificação">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ViewField label="Razão Social"><span className="font-medium">{selected.nome_razao_social}</span></ViewField>
                    <ViewField label="Nome Fantasia">{selected.nome_fantasia || "—"}</ViewField>
                    <ViewField label="CNPJ"><span className="font-mono">{selected.cpf_cnpj || "—"}</span></ViewField>
                    <ViewField label="Status"><StatusBadge status={selected.ativo ? "Ativo" : "Inativo"} /></ViewField>
                  </div>
                </ViewSection>
                <ViewSection title="Contato">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ViewField label="Responsável">{selected.contato || "—"}</ViewField>
                    <ViewField label="Telefone">{selected.telefone || "—"}</ViewField>
                    <ViewField label="E-mail" className="col-span-2">{selected.email || "—"}</ViewField>
                  </div>
                </ViewSection>
                <ViewSection title="Localização">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ViewField label="Cidade/UF">{selected.cidade ? `${selected.cidade}${selected.uf ? `/${selected.uf}` : ""}` : "—"}</ViewField>
                  </div>
                </ViewSection>
                <ViewSection title="Operação">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ViewField label="Modalidade">{modalidadeLabel[selected.modalidade] || "—"}</ViewField>
                    <ViewField label="Prazo Médio"><span className="font-mono">{selected.prazo_medio || "—"}</span></ViewField>
                  </div>
                  {selected.observacoes && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                      <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
                    </div>
                  )}
                </ViewSection>
              </div>
            ) : null,
          },
          {
            value: "clientes",
            label: `Clientes (${clientesVinculados.length})`,
            content: (
              <div className="space-y-2">
                {clientesVinculados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente vinculado</p>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {[...clientesVinculados]
                      .sort((a, b) => (a.prioridade ?? 99) - (b.prioridade ?? 99))
                      .map((ct, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 border-b last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {ct.prioridade === 1 && (
                              <Star className="h-3 w-3 text-amber-500 shrink-0" />
                            )}
                            <RelationalLink to="/clientes">{ct.clientes?.nome_razao_social || "—"}</RelationalLink>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{ct.clientes?.cpf_cnpj || ""}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0 ml-2">
                          {ct.modalidade && <p>{ct.modalidade}</p>}
                          {ct.prazo_medio && <p className="font-mono">{ct.prazo_medio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            value: "remessas",
            label: `Remessas (${remessasVinculadas.length})`,
            content: (
              <div className="space-y-3">
                {remessasVinculadas.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(() => {
                      const emTransito = remessasVinculadas.filter(r => r.status_transporte === "em_transito").length;
                      const entregues = remessasVinculadas.filter(r => r.status_transporte === "entregue").length;
                      const pendentes = remessasVinculadas.filter(r => r.status_transporte === "pendente" || r.status_transporte === "postado").length;
                      const devolvidas = remessasVinculadas.filter(r => r.status_transporte === "devolvido").length;
                      return (
                        <>
                          {emTransito > 0 && <Badge variant="outline" className="bg-info/10 text-info border-info/20 gap-1"><Truck className="h-3 w-3" />{emTransito} em trânsito</Badge>}
                          {pendentes > 0 && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1"><Package className="h-3 w-3" />{pendentes} pendente{pendentes > 1 ? "s" : ""}</Badge>}
                          {entregues > 0 && <Badge variant="outline" className="bg-success/10 text-success border-success/20">{entregues} entregue{entregues > 1 ? "s" : ""}</Badge>}
                          {devolvidas > 0 && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><AlertTriangle className="h-3 w-3" />{devolvidas} devolvida{devolvidas > 1 ? "s" : ""}</Badge>}
                        </>
                      );
                    })()}
                  </div>
                )}
                {remessasVinculadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma remessa vinculada</p>
                ) : (
                  <div className="space-y-1 max-h-[380px] overflow-y-auto">
                    {remessasVinculadas.map((r, idx) => {
                      const statusInfo = remessaStatusMap[r.status_transporte] || { label: r.status_transporte, classes: "bg-muted text-muted-foreground border-muted" };
                      return (
                        <div key={idx} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/30 border-b last:border-b-0 gap-2">
                          <div className="min-w-0 flex-1">
                            <RelationalLink type="remessa" id={r.id}>
                              {r.codigo_rastreio ? <span className="font-mono text-xs">{r.codigo_rastreio}</span> : <span className="text-xs text-muted-foreground italic">sem rastreio</span>}
                            </RelationalLink>
                            {r.clientes?.nome_razao_social && (
                              <p className="text-xs text-muted-foreground truncate">{r.clientes.nome_razao_social}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusInfo.classes}`}>{statusInfo.label}</Badge>
                            {r.previsao_entrega && (
                              <p className="text-[10px] text-muted-foreground">{new Date(r.previsao_entrega).toLocaleDateString("pt-BR")}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ),
          },
          {
            value: "logistica",
            label: "Logística",
            content: selected ? (
              <div className="space-y-4">
                <ViewSection title="Perfil Operacional">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ViewField label="Modalidade">
                      <span className="font-semibold">{modalidadeLabel[selected.modalidade] || "—"}</span>
                    </ViewField>
                    <ViewField label="Prazo Médio">
                      {selected.prazo_medio
                        ? <span className="font-mono font-bold">{selected.prazo_medio}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </ViewField>
                  </div>
                </ViewSection>
                {remessasVinculadas.length > 0 && (() => {
                  const servicos = [...new Set(remessasVinculadas.map(r => r.servico).filter(Boolean))];
                  return servicos.length > 0 ? (
                    <ViewSection title="Serviços Utilizados">
                      <div className="flex flex-wrap gap-1.5">
                        {servicos.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </ViewSection>
                  ) : null;
                })()}
                <ViewSection title="Observações Logísticas">
                  {selected.observacoes
                    ? <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
                    : <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada.</p>}
                </ViewSection>
              </div>
            ) : null,
          },
        ]}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => { if (selected) { setDrawerOpen(false); remove(selected.id); } setDeleteConfirmOpen(false); }}
        title="Excluir transportadora"
        description={`Tem certeza que deseja excluir "${selected?.nome_razao_social || ""}"? Esta ação não pode ser desfeita.`}
      >
        {(clientesVinculados.length > 0 || remessasVinculadas.length > 0) && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm space-y-1">
            <p className="font-medium text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Atenção: esta transportadora possui vínculos ativos
            </p>
            {clientesVinculados.length > 0 && (
              <p className="text-muted-foreground">{clientesVinculados.length} cliente{clientesVinculados.length > 1 ? "s" : ""} vinculado{clientesVinculados.length > 1 ? "s" : ""}</p>
            )}
            {remessasVinculadas.length > 0 && (
              <p className="text-muted-foreground">{remessasVinculadas.length} remessa{remessasVinculadas.length > 1 ? "s" : ""} relacionada{remessasVinculadas.length > 1 ? "s" : ""}</p>
            )}
            <p className="text-muted-foreground text-xs pt-1">Considere inativar a transportadora em vez de excluí-la.</p>
          </div>
        )}
      </ConfirmDialog>
    </AppLayout>
  );
}
