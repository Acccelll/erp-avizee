import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawerV2 } from "@/components/ViewDrawerV2";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Plus, MapPin, Package as PackageIcon, Truck, Search } from "lucide-react";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";


interface Remessa {
  id: string;
  ordem_venda_id: string | null;
  cliente_id: string | null;
  transportadora_id: string | null;
  servico: string | null;
  codigo_rastreio: string | null;
  data_postagem: string | null;
  previsao_entrega: string | null;
  status_transporte: string;
  peso: number | null;
  volumes: number | null;
  valor_frete: number | null;
  observacoes: string | null;
  usuario_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface RemessaEvento {
  id: string;
  remessa_id: string;
  data_hora: string;
  descricao: string;
  local: string | null;
  created_at: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "Pendente" },
  postado: { label: "Postado", color: "Enviado" },
  em_transito: { label: "Em Trânsito", color: "Enviado" },
  entregue: { label: "Entregue", color: "Ativo" },
  devolvido: { label: "Devolvido", color: "Cancelado" },
};

const emptyForm: Record<string, any> = {
  cliente_id: "", transportadora_id: "", servico: "", codigo_rastreio: "",
  data_postagem: "", previsao_entrega: "", status_transporte: "pendente",
  peso: "", volumes: "1", valor_frete: "", observacoes: "", ordem_venda_id: "",
};

export default function Remessas() {
  const { data, loading, create, update, remove } = useSupabaseCrud<Remessa>({ table: "remessas" as any });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Remessa | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [clientes, setClientes] = useState<any[]>([]);
  const [transportadoras, setTransportadoras] = useState<any[]>([]);
  const [eventos, setEventos] = useState<RemessaEvento[]>([]);
  const [eventoForm, setEventoForm] = useState({ descricao: "", local: "" });
  const [savingEvento, setSavingEvento] = useState(false);

  useEffect(() => {
    supabase.from("clientes").select("id,nome_razao_social").eq("ativo", true).then(({ data }) => setClientes(data || []));
    supabase.from("transportadoras").select("id,nome_razao_social").eq("ativo", true).then(({ data }) => setTransportadoras(data || []));
  }, []);

  useEffect(() => {
    if (selected && drawerOpen) {
      supabase.from("remessa_eventos" as any).select("*").eq("remessa_id", selected.id).order("data_hora", { ascending: false })
        .then(({ data }) => setEventos((data as any) || []));
    }
  }, [selected, drawerOpen]);

  const clienteMap = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c.nome_razao_social])), [clientes]);
  const transportadoraMap = useMemo(() => Object.fromEntries(transportadoras.map(t => [t.id, t.nome_razao_social])), [transportadoras]);

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setSelected(null); setModalOpen(true); };
  const openEdit = (r: Remessa) => {
    setMode("edit"); setSelected(r);
    setForm({
      cliente_id: r.cliente_id || "", transportadora_id: r.transportadora_id || "",
      servico: r.servico || "", codigo_rastreio: r.codigo_rastreio || "",
      data_postagem: r.data_postagem || "", previsao_entrega: r.previsao_entrega || "",
      status_transporte: r.status_transporte, peso: r.peso?.toString() || "",
      volumes: r.volumes?.toString() || "1", valor_frete: r.valor_frete?.toString() || "",
      observacoes: r.observacoes || "", ordem_venda_id: r.ordem_venda_id || "",
    });
    setModalOpen(true);
  };
  const openView = (r: Remessa) => { setSelected(r); setDrawerOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.transportadora_id) { toast.error("Transportadora é obrigatória"); return; }
    setSaving(true);
    const payload: any = {
      ...form,
      peso: form.peso ? Number(form.peso) : null,
      volumes: form.volumes ? Number(form.volumes) : 1,
      valor_frete: form.valor_frete ? Number(form.valor_frete) : null,
      cliente_id: form.cliente_id || null,
      transportadora_id: form.transportadora_id || null,
      ordem_venda_id: form.ordem_venda_id || null,
      data_postagem: form.data_postagem || null,
      previsao_entrega: form.previsao_entrega || null,
    };
    try {
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  const handleAddEvento = async () => {
    if (!selected || !eventoForm.descricao.trim()) { toast.error("Descrição obrigatória"); return; }
    setSavingEvento(true);
    const { error } = await supabase.from("remessa_eventos" as any).insert({
      remessa_id: selected.id, descricao: eventoForm.descricao, local: eventoForm.local || null,
    } as any);
    if (error) { toast.error("Erro ao salvar evento"); }
    else {
      toast.success("Evento adicionado");
      setEventoForm({ descricao: "", local: "" });
      const { data } = await supabase.from("remessa_eventos" as any).select("*").eq("remessa_id", selected.id).order("data_hora", { ascending: false });
      setEventos((data as any) || []);
    }
    setSavingEvento(false);
  };

  const handleStatusChange = async (remessa: Remessa, newStatus: string) => {
    await update(remessa.id, { status_transporte: newStatus } as any);
    if (selected?.id === remessa.id) setSelected({ ...remessa, status_transporte: newStatus });
    toast.success(`Status atualizado para ${statusMap[newStatus]?.label || newStatus}`);
  };

  const handleRastrear = async (remessa: Remessa) => {
    if (!remessa.codigo_rastreio) { toast.error("Sem código de rastreio"); return; }
    try {
      toast.info("Consultando rastreio...");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/correios-api?action=rastrear&codigo=${encodeURIComponent(remessa.codigo_rastreio)}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""}`,
        },
      });
      const tracking = await res.json();
      if (tracking.error) { toast.error(tracking.error); return; }

      // Save events from tracking response
      const eventos = tracking.objetos?.[0]?.eventos || [];
      for (const ev of eventos) {
        const descricao = ev.descricao || ev.tipo || "Evento";
        const local = ev.unidade?.endereco?.cidade || ev.unidade?.nome || "";
        const dataHora = ev.dtHrCriado || new Date().toISOString();
        await supabase.from("remessa_eventos" as any).upsert({
          remessa_id: remessa.id,
          descricao,
          local: local || null,
          data_hora: dataHora,
        } as any, { onConflict: "remessa_id,data_hora,descricao" }).select();
      }

      toast.success(`${eventos.length} evento(s) atualizado(s)`);
      // Refresh events
      const { data: updatedEvents } = await supabase.from("remessa_eventos" as any).select("*").eq("remessa_id", remessa.id).order("data_hora", { ascending: false });
      setEventos((updatedEvents as any) || []);
    } catch (err: any) {
      console.error("[rastrear]", err);
      toast.error("Erro ao consultar rastreio. Verifique as credenciais dos Correios.");
    }
  };

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter(r =>
      [r.codigo_rastreio, clienteMap[r.cliente_id || ""], transportadoraMap[r.transportadora_id || ""]].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [data, searchTerm, clienteMap, transportadoraMap]);

  const columns = [
    { key: "codigo_rastreio", label: "Rastreio", render: (r: Remessa) => <span className="font-mono text-xs">{r.codigo_rastreio || "—"}</span> },
    { key: "cliente_id", label: "Cliente", render: (r: Remessa) => clienteMap[r.cliente_id || ""] || "—" },
    { key: "transportadora_id", label: "Transportadora", render: (r: Remessa) => transportadoraMap[r.transportadora_id || ""] || "—" },
    { key: "data_postagem", label: "Postagem", render: (r: Remessa) => r.data_postagem ? format(new Date(r.data_postagem + "T00:00:00"), "dd/MM/yyyy") : "—" },
    { key: "status_transporte", label: "Status", render: (r: Remessa) => <StatusBadge status={statusMap[r.status_transporte]?.color || r.status_transporte} /> },
  ];

  const summaryItems = selected ? [
    { label: "Status", value: statusMap[selected.status_transporte]?.label || selected.status_transporte },
    { label: "Volumes", value: String(selected.volumes || 1) },
    { label: "Peso", value: selected.peso ? `${selected.peso} kg` : "—" },
    { label: "Frete", value: selected.valor_frete ? `R$ ${Number(selected.valor_frete).toFixed(2)}` : "—" },
  ] : [];

  return (
    <AppLayout>
      <ModulePage title="Remessas" subtitle="Gestão de remessas e rastreamento logístico" addLabel="Nova Remessa" onAdd={openCreate} count={filteredData.length}
        searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Buscar por rastreio, cliente ou transportadora...">
        <DataTable columns={columns} data={filteredData} loading={loading} onView={openView} />
      </ModulePage>

      {/* Form Modal */}
      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Remessa" : "Editar Remessa"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Transportadora *</Label>
              <Select value={form.transportadora_id} onValueChange={v => setForm({ ...form, transportadora_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {transportadoras.map(t => <SelectItem key={t.id} value={t.id}>{t.nome_razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Serviço</Label><Input value={form.servico} onChange={e => setForm({ ...form, servico: e.target.value })} placeholder="Ex: SEDEX, PAC..." /></div>
            <div className="space-y-2"><Label>Código de Rastreio</Label><Input value={form.codigo_rastreio} onChange={e => setForm({ ...form, codigo_rastreio: e.target.value.toUpperCase() })} placeholder="Ex: BR123456789BR" /></div>
            <div className="space-y-2"><Label>Data de Postagem</Label><Input type="date" value={form.data_postagem} onChange={e => setForm({ ...form, data_postagem: e.target.value })} /></div>
            <div className="space-y-2"><Label>Previsão de Entrega</Label><Input type="date" value={form.previsao_entrega} onChange={e => setForm({ ...form, previsao_entrega: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status_transporte} onValueChange={v => setForm({ ...form, status_transporte: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" step="0.01" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} /></div>
            <div className="space-y-2"><Label>Volumes</Label><Input type="number" min="1" value={form.volumes} onChange={e => setForm({ ...form, volumes: e.target.value })} /></div>
            <div className="space-y-2"><Label>Valor do Frete (R$)</Label><Input type="number" step="0.01" value={form.valor_frete} onChange={e => setForm({ ...form, valor_frete: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      {/* Detail Drawer */}
      <ViewDrawerV2
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.codigo_rastreio ? `Remessa ${selected.codigo_rastreio}` : "Detalhes da Remessa"}
        actions={selected ? <>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDrawerOpen(false); openEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDrawerOpen(false); remove(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </> : undefined}
        summary={selected ? (
          <div className="grid grid-cols-4 gap-3">
            {summaryItems.map((s, i) => (
              <div key={i} className="rounded-lg border bg-card p-3 text-center space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="font-semibold text-sm">{s.value}</p>
              </div>
            ))}
          </div>
        ) : undefined}
        tabs={[
          {
            value: "dados", label: "Dados",
            content: selected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    { label: "Transportadora", value: transportadoraMap[selected.transportadora_id || ""] },
                    { label: "Cliente", value: clienteMap[selected.cliente_id || ""] },
                    { label: "Serviço", value: selected.servico },
                    { label: "Código de Rastreio", value: selected.codigo_rastreio, mono: true },
                    { label: "Data Postagem", value: selected.data_postagem ? format(new Date(selected.data_postagem + "T00:00:00"), "dd/MM/yyyy") : null },
                    { label: "Previsão Entrega", value: selected.previsao_entrega ? format(new Date(selected.previsao_entrega + "T00:00:00"), "dd/MM/yyyy") : null },
                    { label: "Peso", value: selected.peso ? `${selected.peso} kg` : null },
                    { label: "Volumes", value: selected.volumes?.toString() },
                    { label: "Valor Frete", value: selected.valor_frete ? `R$ ${Number(selected.valor_frete).toFixed(2)}` : null },
                  ].map((f, i) => (
                    <div key={i}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{f.label}</p>
                      <p className={`text-sm ${f.mono ? "font-mono" : ""}`}>{f.value || "—"}</p>
                    </div>
                  ))}
                </div>
                {selected.observacoes && (
                  <div className="border-t pt-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Observações</p>
                    <p className="text-sm text-muted-foreground">{selected.observacoes}</p>
                  </div>
                )}
              </div>
            ) : null,
          },
          {
            value: "eventos", label: "Eventos",
            content: selected ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Novo Evento</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Descrição do evento *" value={eventoForm.descricao} onChange={e => setEventoForm({ ...eventoForm, descricao: e.target.value })} />
                    <Input placeholder="Local (opcional)" value={eventoForm.local} onChange={e => setEventoForm({ ...eventoForm, local: e.target.value })} />
                  </div>
                  <Button size="sm" onClick={handleAddEvento} disabled={savingEvento}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{savingEvento ? "Salvando..." : "Adicionar"}
                  </Button>
                </div>
                {eventos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento registrado</p>
                ) : (
                  <div className="space-y-0">
                    {eventos.map((ev, i) => (
                      <div key={ev.id} className="flex gap-3 pb-4">
                        <div className="flex flex-col items-center">
                          <div className={`h-3 w-3 rounded-full border-2 ${i === 0 ? "border-primary bg-primary" : "border-muted-foreground/40 bg-background"}`} />
                          {i < eventos.length - 1 && <div className="flex-1 w-px bg-border" />}
                        </div>
                        <div className="flex-1 -mt-0.5">
                          <p className="text-sm font-medium">{ev.descricao}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{format(new Date(ev.data_hora), "dd/MM/yyyy HH:mm")}</span>
                            {ev.local && <><MapPin className="h-3 w-3" /><span>{ev.local}</span></>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null,
          },
        ]}
        footer={selected ? (
          <div className="flex gap-2 flex-wrap">
            {selected.codigo_rastreio && (
              <Button size="sm" variant="outline" onClick={() => handleRastrear(selected)}>
                <Search className="h-4 w-4 mr-1" /> Rastrear Correios
              </Button>
            )}
            {selected.status_transporte !== "entregue" && (
              <>
                {selected.status_transporte === "pendente" && (
                  <Button size="sm" onClick={() => handleStatusChange(selected, "postado")}><Truck className="h-4 w-4 mr-1" /> Marcar como Postado</Button>
                )}
                {selected.status_transporte === "postado" && (
                  <Button size="sm" onClick={() => handleStatusChange(selected, "em_transito")}><Truck className="h-4 w-4 mr-1" /> Em Trânsito</Button>
                )}
                {(selected.status_transporte === "em_transito" || selected.status_transporte === "postado") && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(selected, "entregue")}><PackageIcon className="h-4 w-4 mr-1" /> Entregue</Button>
                )}
                {selected.status_transporte !== "devolvido" && (
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange(selected, "devolvido")}>Devolvido</Button>
                )}
              </>
            )}
          </div>
        ) : undefined}
      />
    </AppLayout>
  );
}
