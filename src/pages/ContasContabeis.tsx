import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { ViewDrawer } from "@/components/ViewDrawer";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ChevronRight, FolderTree, FileText } from "lucide-react";

interface ContaContabil {
  id: string;
  codigo: string;
  descricao: string;
  natureza: string;
  aceita_lancamento: boolean;
  conta_pai_id: string | null;
  ativo: boolean;
  created_at: string;
}

const emptyForm: Record<string, any> = {
  codigo: "", descricao: "", natureza: "devedora", aceita_lancamento: true, conta_pai_id: null,
};

const ContasContabeis = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<ContaContabil>({ table: "contas_contabeis" });
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ContaContabil | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");

  const openCreate = () => { setMode("create"); setForm({ ...emptyForm }); setSelected(null); setModalOpen(true); };
  const openEdit = (c: ContaContabil) => {
    setMode("edit"); setSelected(c);
    setForm({ codigo: c.codigo, descricao: c.descricao, natureza: c.natureza, aceita_lancamento: c.aceita_lancamento, conta_pai_id: c.conta_pai_id || null });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo || !form.descricao) { toast.error("Código e descrição são obrigatórios"); return; }
    setSaving(true);
    try {
      const payload = { ...form, conta_pai_id: form.conta_pai_id || null };
      if (mode === "create") await create(payload);
      else if (selected) await update(selected.id, payload);
      setModalOpen(false);
    } catch {}
    setSaving(false);
  };

  // Build tree structure
  const treeData = useMemo(() => {
    if (viewMode !== "tree") return data;

    const sorted = [...data].sort((a, b) => a.codigo.localeCompare(b.codigo));
    const roots = sorted.filter(c => !c.conta_pai_id);
    const childMap = new Map<string, ContaContabil[]>();
    sorted.forEach(c => {
      if (c.conta_pai_id) {
        if (!childMap.has(c.conta_pai_id)) childMap.set(c.conta_pai_id, []);
        childMap.get(c.conta_pai_id)!.push(c);
      }
    });

    const result: ContaContabil[] = [];
    const flatten = (items: ContaContabil[], depth: number) => {
      items.forEach(item => {
        result.push(item);
        const children = childMap.get(item.id);
        if (children) flatten(children, depth + 1);
      });
    };
    flatten(roots, 0);
    return result;
  }, [data, viewMode]);

  // Get depth for indentation
  const getDepth = (conta: ContaContabil): number => {
    if (!conta.conta_pai_id) return 0;
    const parent = data.find(c => c.id === conta.conta_pai_id);
    return parent ? 1 + getDepth(parent) : 0;
  };

  const columns = [
    { key: "codigo", label: "Código", render: (c: ContaContabil) => {
      const depth = viewMode === "tree" ? getDepth(c) : 0;
      const isLeaf = c.aceita_lancamento;
      return (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
          {isLeaf ? <FileText className="w-3.5 h-3.5 text-muted-foreground" /> : <FolderTree className="w-3.5 h-3.5 text-primary" />}
          <span className={`font-mono font-semibold ${isLeaf ? "text-foreground" : "text-primary"}`}>{c.codigo}</span>
        </div>
      );
    }},
    { key: "descricao", label: "Descrição", render: (c: ContaContabil) => (
      <span className={c.aceita_lancamento ? "" : "font-semibold"}>{c.descricao}</span>
    )},
    { key: "natureza", label: "Natureza", render: (c: ContaContabil) => (
      <Badge variant="outline" className="text-xs capitalize">{c.natureza}</Badge>
    )},
    { key: "tipo", label: "Tipo", render: (c: ContaContabil) => (
      <Badge variant={c.aceita_lancamento ? "default" : "secondary"} className="text-xs">
        {c.aceita_lancamento ? "Analítica" : "Sintética"}
      </Badge>
    )},
    { key: "filhas", label: "Subcontas", render: (c: ContaContabil) => {
      const count = data.filter(d => d.conta_pai_id === c.id).length;
      return count > 0 ? <span className="text-xs text-muted-foreground">{count}</span> : <span className="text-xs text-muted-foreground">—</span>;
    }},
    { key: "ativo", label: "Status", render: (c: ContaContabil) => <StatusBadge status={c.ativo ? "Ativo" : "Inativo"} /> },
  ];

  return (
    <AppLayout>
      <ModulePage title="Plano de Contas" subtitle="Estrutura hierárquica de contas contábeis" addLabel="Nova Conta" onAdd={openCreate} count={data.length}
        filters={
          <div className="flex gap-1">
            <Button size="sm" variant={viewMode === "tree" ? "default" : "outline"} onClick={() => setViewMode("tree")} className="gap-1">
              <FolderTree className="w-3.5 h-3.5" /> Árvore
            </Button>
            <Button size="sm" variant={viewMode === "flat" ? "default" : "outline"} onClick={() => setViewMode("flat")} className="gap-1">
              <FileText className="w-3.5 h-3.5" /> Lista
            </Button>
          </div>
        }>
        <DataTable columns={columns} data={treeData} loading={loading}
          onView={(c) => { setSelected(c); setDrawerOpen(true); }} />
      </ModulePage>

      <FormModal open={modalOpen} onClose={() => setModalOpen(false)} title={mode === "create" ? "Nova Conta Contábil" : "Editar Conta Contábil"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código *</Label>
              <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="1.1.01" className="font-mono" required />
            </div>
            <div className="space-y-2">
              <Label>Natureza</Label>
              <Select value={form.natureza} onValueChange={v => setForm({ ...form, natureza: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="devedora">Devedora</SelectItem>
                  <SelectItem value="credora">Credora</SelectItem>
                  <SelectItem value="mista">Mista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Conta Pai (opcional)</Label>
            <Select value={form.conta_pai_id || "none"} onValueChange={v => setForm({ ...form, conta_pai_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                {data.filter(c => !selected || c.id !== selected.id).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="aceita" checked={form.aceita_lancamento} onCheckedChange={v => setForm({ ...form, aceita_lancamento: !!v })} />
            <Label htmlFor="aceita" className="cursor-pointer">Aceita lançamento (conta analítica)</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      <ViewDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Detalhes da Conta">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Código</span><p className="font-mono font-semibold text-primary">{selected.codigo}</p></div>
              <div><span className="text-xs text-muted-foreground">Natureza</span><p className="capitalize">{selected.natureza}</p></div>
            </div>
            <div><span className="text-xs text-muted-foreground">Descrição</span><p className="font-medium">{selected.descricao}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Tipo</span>
                <Badge variant={selected.aceita_lancamento ? "default" : "secondary"}>{selected.aceita_lancamento ? "Analítica" : "Sintética"}</Badge>
              </div>
              <div><span className="text-xs text-muted-foreground">Conta Pai</span><p className="font-mono">{selected.conta_pai_id ? data.find(c => c.id === selected.conta_pai_id)?.codigo || "—" : "Raiz"}</p></div>
            </div>
            {/* Sub-accounts */}
            {(() => {
              const filhas = data.filter(c => c.conta_pai_id === selected.id);
              if (filhas.length === 0) return null;
              return (
                <div className="border-t pt-3">
                  <h4 className="font-semibold text-sm mb-2">Subcontas ({filhas.length})</h4>
                  <div className="space-y-1">
                    {filhas.map(f => (
                      <div key={f.id} className="flex justify-between items-center text-sm py-2 px-3 bg-accent/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          {f.aceita_lancamento ? <FileText className="w-3.5 h-3.5 text-muted-foreground" /> : <FolderTree className="w-3.5 h-3.5 text-primary" />}
                          <span className="font-mono text-primary">{f.codigo}</span>
                        </div>
                        <span>{f.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
};

export default ContasContabeis;
