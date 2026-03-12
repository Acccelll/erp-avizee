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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Movimento {
  id: string; produto_id: string; tipo: string; quantidade: number;
  saldo_anterior: number; saldo_atual: number; motivo: string;
  documento_tipo: string; created_at: string;
  produtos?: { nome: string; sku: string };
}

const Estoque = () => {
  const { data, loading, create } = useSupabaseCrud<Movimento>({ table: "estoque_movimentos", select: "*, produtos(nome, sku)", hasAtivo: false });
  const produtosCrud = useSupabaseCrud<any>({ table: "produtos" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Movimento | null>(null);
  const [form, setForm] = useState({ produto_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.produto_id || !form.quantidade) { toast.error("Produto e quantidade são obrigatórios"); return; }
    setSaving(true);
    try {
      const produto = produtosCrud.data.find((p: any) => p.id === form.produto_id);
      const saldo_anterior = Number(produto?.estoque_atual || 0);
      const qty = form.tipo === "saida" ? -form.quantidade : form.quantidade;
      const saldo_atual = saldo_anterior + qty;

      await create({ ...form, saldo_anterior, saldo_atual, documento_tipo: "manual" });
      await (supabase as any).from("produtos").update({ estoque_atual: saldo_atual }).eq("id", form.produto_id);
      produtosCrud.fetchData();
      setModalOpen(false);
      setForm({ produto_id: "", tipo: "entrada", quantidade: 0, motivo: "" });
    } catch {}
    setSaving(false);
  };

  const columns = [
    { key: "produto", label: "Produto", render: (m: Movimento) => (m as any).produtos?.nome || "—" },
    { key: "tipo", label: "Tipo", render: (m: Movimento) => <StatusBadge status={m.tipo === "entrada" ? "Confirmado" : m.tipo === "saida" ? "Cancelado" : "Pendente"} /> },
    { key: "quantidade", label: "Qtd", render: (m: Movimento) => <span className={m.tipo === "saida" ? "text-destructive" : "text-success"}>{m.tipo === "saida" ? "-" : "+"}{m.quantidade}</span> },
    { key: "saldo_anterior", label: "Saldo Ant." },
    { key: "saldo_atual", label: "Saldo Atual", render: (m: Movimento) => <span className="font-semibold">{m.saldo_atual}</span> },
    { key: "motivo", label: "Motivo", render: (m: Movimento) => m.motivo || "—" },
    { key: "created_at", label: "Data", render: (m: Movimento) => new Date(m.created_at).toLocaleDateString("pt-BR") },
  ];

  return (
    <AppLayout>
      <ModulePage title="Estoque" subtitle="Movimentações e rastreabilidade" addLabel="Nova Movimentação" onAdd={() => setModalOpen(true)} count={data.length}>
        <DataTable columns={columns} data={data} loading={loading}
          onView={(m) => { setSelected(m); setDrawerOpen(true); }} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Movimentação" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Produto *</Label>
            <Select value={form.produto_id} onValueChange={(v) => setForm({ ...form, produto_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{produtosCrud.data.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome} (Estoque: {p.estoque_atual})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem><SelectItem value="ajuste">Ajuste</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" step="0.01" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} required /></div>
          </div>
          <div className="space-y-2"><Label>Motivo</Label><Textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Movimentação">
        {selected && (
          <div className="space-y-3">
            <div><span className="text-xs text-muted-foreground">Produto</span><p className="font-medium">{(selected as any).produtos?.nome}</p></div>
            <div><span className="text-xs text-muted-foreground">Tipo</span><p className="capitalize">{selected.tipo}</p></div>
            <div><span className="text-xs text-muted-foreground">Quantidade</span><p>{selected.quantidade}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Saldo Anterior</span><p>{selected.saldo_anterior}</p></div>
              <div><span className="text-xs text-muted-foreground">Saldo Atual</span><p className="font-semibold">{selected.saldo_atual}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Motivo</span><p>{selected.motivo || "—"}</p></div>
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default Estoque;
