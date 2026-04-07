import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { ContaContabilDrawer } from "@/components/financeiro/ContaContabilDrawer";
import { ContaContabilEditModal } from "@/components/financeiro/ContaContabilEditModal";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderTree, FileText } from "lucide-react";

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

const ContasContabeis = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<ContaContabil>({ table: "contas_contabeis" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ContaContabil | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");

  const openCreate = () => { setSelected(null); setEditModalOpen(true); };
  const openEdit = (c: ContaContabil) => { setSelected(c); setEditModalOpen(true); };

  const handleSave = async (payload: Partial<ContaContabil>) => {
    try {
      if (selected) {
        await update(selected.id, payload);
      } else {
        await create(payload);
      }
    } catch (err) {
      console.error('[contas-contabeis] erro ao salvar:', err);
      throw err;
    }
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

      <ContaContabilEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        conta={selected}
        allContas={data}
        onSave={handleSave}
      />

      <ContaContabilDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selected={selected}
        allContas={data}
        onEdit={(c) => { setDrawerOpen(false); openEdit(c); }}
        onDelete={(c) => remove(c.id)}
      />
    </AppLayout>
  );
};

export default ContasContabeis;
