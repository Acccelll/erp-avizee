import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { AdvancedFilterBar } from "@/components/AdvancedFilterBar";
import type { FilterChip } from "@/components/AdvancedFilterBar";
import { StatCard } from "@/components/StatCard";
import { ContaContabilDrawer } from "@/components/financeiro/ContaContabilDrawer";
import { ContaContabilEditModal } from "@/components/financeiro/ContaContabilEditModal";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/MultiSelect";
import {
  FolderTree,
  FileText,
  GitBranch,
  BookOpen,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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

const NATUREZA_STYLES: Record<string, string> = {
  devedora: "border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30",
  credora:  "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30",
  mista:    "border-violet-500/40 text-violet-700 dark:text-violet-400 bg-violet-50/60 dark:bg-violet-950/30",
};

const ContasContabeis = () => {
  const { data, loading, create, update, remove } = useSupabaseCrud<ContaContabil>({ table: "contas_contabeis" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<ContaContabil | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  const [lancamentoFilters, setLancamentoFilters] = useState<string[]>([]);

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

  // Build depth map (memoised for performance)
  const depthMap = useMemo(() => {
    const map = new Map<string, number>();
    const calcDepth = (id: string, visited = new Set<string>()): number => {
      if (map.has(id)) return map.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);
      const conta = data.find(c => c.id === id);
      if (!conta || !conta.conta_pai_id) { map.set(id, 0); return 0; }
      const d = 1 + calcDepth(conta.conta_pai_id, visited);
      map.set(id, d);
      return d;
    };
    data.forEach(c => calcDepth(c.id));
    return map;
  }, [data]);

  const getDepth = (conta: ContaContabil) => depthMap.get(conta.id) ?? 0;

  // Build tree structure
  const treeData = useMemo(() => {
    if (viewMode !== "tree") return [...data].sort((a, b) => a.codigo.localeCompare(b.codigo));

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
    const flatten = (items: ContaContabil[]) => {
      items.forEach(item => {
        result.push(item);
        const children = childMap.get(item.id);
        if (children) flatten(children);
      });
    };
    flatten(roots);
    return result;
  }, [data, viewMode]);

  // Apply search + filters
  const filteredData = useMemo(() => {
    return treeData.filter(c => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!c.codigo.toLowerCase().includes(term) && !c.descricao.toLowerCase().includes(term)) return false;
      }
      if (statusFilters.length > 0) {
        const s = c.ativo ? "ativo" : "inativo";
        if (!statusFilters.includes(s)) return false;
      }
      if (tipoFilters.length > 0) {
        const t = c.aceita_lancamento ? "analitica" : "sintetica";
        if (!tipoFilters.includes(t)) return false;
      }
      if (lancamentoFilters.length > 0) {
        const l = c.aceita_lancamento ? "sim" : "nao";
        if (!lancamentoFilters.includes(l)) return false;
      }
      return true;
    });
  }, [treeData, searchTerm, statusFilters, tipoFilters, lancamentoFilters]);

  // Summary stats
  const totalContas = data.length;
  const totalAnaliticas = useMemo(() => data.filter(c => c.aceita_lancamento).length, [data]);
  const totalSinteticas = useMemo(() => data.filter(c => !c.aceita_lancamento).length, [data]);
  const totalAtivas = useMemo(() => data.filter(c => c.ativo).length, [data]);

  // Filter options
  const statusOptions: MultiSelectOption[] = [
    { label: "Ativa", value: "ativo" },
    { label: "Inativa", value: "inativo" },
  ];
  const tipoOptions: MultiSelectOption[] = [
    { label: "Analítica", value: "analitica" },
    { label: "Sintética", value: "sintetica" },
  ];
  const lancamentoOptions: MultiSelectOption[] = [
    { label: "Aceita", value: "sim" },
    { label: "Não aceita", value: "nao" },
  ];

  // Active filter chips
  const activeFilters = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];
    statusFilters.forEach(f => chips.push({ key: "status", label: "Status", value: [f], displayValue: f === "ativo" ? "Ativa" : "Inativa" }));
    tipoFilters.forEach(f => chips.push({ key: "tipo", label: "Tipo", value: [f], displayValue: f === "analitica" ? "Analítica" : "Sintética" }));
    lancamentoFilters.forEach(f => chips.push({ key: "lancamento", label: "Lançamento", value: [f], displayValue: f === "sim" ? "Aceita" : "Não aceita" }));
    return chips;
  }, [statusFilters, tipoFilters, lancamentoFilters]);

  const handleRemoveFilter = (key: string, value?: string) => {
    if (key === "status") setStatusFilters(prev => prev.filter(v => v !== value));
    if (key === "tipo") setTipoFilters(prev => prev.filter(v => v !== value));
    if (key === "lancamento") setLancamentoFilters(prev => prev.filter(v => v !== value));
  };

  const columns = [
    {
      key: "codigo",
      label: "Código",
      sortable: true,
      render: (c: ContaContabil) => {
        const depth = viewMode === "tree" ? getDepth(c) : 0;
        const isSintetica = !c.aceita_lancamento;
        return (
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 18}px` }}>
            {isSintetica
              ? <FolderTree className="w-3.5 h-3.5 shrink-0 text-primary" />
              : <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
            <span className={`font-mono font-semibold text-sm ${isSintetica ? "text-primary" : "text-foreground"}`}>
              {c.codigo}
            </span>
          </div>
        );
      },
    },
    {
      key: "descricao",
      label: "Descrição",
      sortable: true,
      render: (c: ContaContabil) => (
        <span className={!c.aceita_lancamento ? "font-semibold" : ""}>{c.descricao}</span>
      ),
    },
    {
      key: "natureza",
      label: "Natureza",
      render: (c: ContaContabil) => {
        const style = NATUREZA_STYLES[c.natureza?.toLowerCase()] ?? "border-border text-muted-foreground";
        return (
          <Badge variant="outline" className={`text-xs capitalize ${style}`}>
            {c.natureza}
          </Badge>
        );
      },
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (c: ContaContabil) => (
        <Badge
          variant={c.aceita_lancamento ? "default" : "secondary"}
          className={`text-xs ${c.aceita_lancamento ? "" : "bg-muted text-muted-foreground"}`}
        >
          {c.aceita_lancamento ? "Analítica" : "Sintética"}
        </Badge>
      ),
    },
    {
      key: "aceita_lancamento",
      label: "Lançamento",
      render: (c: ContaContabil) =>
        c.aceita_lancamento ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aceita
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <XCircle className="w-3.5 h-3.5" /> Não aceita
          </span>
        ),
    },
    {
      key: "conta_pai",
      label: "Conta Pai",
      hidden: true,
      render: (c: ContaContabil) => {
        if (!c.conta_pai_id) return <span className="text-xs text-muted-foreground">—</span>;
        const pai = data.find(d => d.id === c.conta_pai_id);
        return pai ? (
          <span className="font-mono text-xs text-muted-foreground">{pai.codigo} · {pai.descricao}</span>
        ) : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      key: "nivel",
      label: "Nível",
      hidden: true,
      render: (c: ContaContabil) => {
        const d = getDepth(c);
        return <span className="font-mono text-xs text-muted-foreground">{d + 1}</span>;
      },
    },
    {
      key: "filhas",
      label: "Subcontas",
      render: (c: ContaContabil) => {
        const count = data.filter(d => d.conta_pai_id === c.id).length;
        return count > 0
          ? <span className="text-xs font-medium tabular-nums">{count}</span>
          : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      key: "ativo",
      label: "Status",
      render: (c: ContaContabil) => <StatusBadge status={c.ativo ? "Ativo" : "Inativo"} />,
    },
  ];

  return (
    <AppLayout>
      <ModulePage
        title="Plano de Contas"
        subtitle="Central de consulta e estrutura hierárquica de contas contábeis"
        addLabel="Nova Conta"
        onAdd={openCreate}
        summaryCards={
          <>
            <StatCard title="Total de Contas" value={String(totalContas)} icon={BookOpen} />
            <StatCard title="Analíticas" value={String(totalAnaliticas)} icon={FileText} iconColor="text-foreground" />
            <StatCard title="Sintéticas" value={String(totalSinteticas)} icon={FolderTree} iconColor="text-primary" />
            <StatCard title="Ativas" value={String(totalAtivas)} icon={GitBranch} iconColor="text-success" />
          </>
        }
      >
        <AdvancedFilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por código ou descrição..."
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={() => { setStatusFilters([]); setTipoFilters([]); setLancamentoFilters([]); }}
          count={filteredData.length}
          extra={
            <div className="flex gap-1">
              <Button size="sm" variant={viewMode === "tree" ? "default" : "outline"} onClick={() => setViewMode("tree")} className="gap-1">
                <FolderTree className="w-3.5 h-3.5" /> Árvore
              </Button>
              <Button size="sm" variant={viewMode === "flat" ? "default" : "outline"} onClick={() => setViewMode("flat")} className="gap-1">
                <FileText className="w-3.5 h-3.5" /> Lista
              </Button>
            </div>
          }
        >
          <MultiSelect
            options={statusOptions}
            selected={statusFilters}
            onChange={setStatusFilters}
            placeholder="Status"
            className="w-[130px]"
          />
          <MultiSelect
            options={tipoOptions}
            selected={tipoFilters}
            onChange={setTipoFilters}
            placeholder="Tipo"
            className="w-[140px]"
          />
          <MultiSelect
            options={lancamentoOptions}
            selected={lancamentoFilters}
            onChange={setLancamentoFilters}
            placeholder="Lançamento"
            className="w-[150px]"
          />
        </AdvancedFilterBar>

        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          moduleKey="contas-contabeis"
          showColumnToggle={true}
          onView={(c) => { setSelected(c); setDrawerOpen(true); }}
          onEdit={openEdit}
          onDelete={(c) => remove(c.id)}
          emptyTitle="Nenhuma conta encontrada"
          emptyDescription="Tente ajustar os filtros ou cadastre uma nova conta contábil."
        />
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
