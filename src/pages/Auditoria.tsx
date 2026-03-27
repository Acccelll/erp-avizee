import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { ViewDrawer, ViewField, ViewSection } from "@/components/ViewDrawer";
import { SummaryCard } from "@/components/SummaryCard";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Shield, Database, Edit, Trash2, Plus, Eye } from "lucide-react";

interface AuditLog {
  id: string;
  tabela: string;
  acao: string;
  registro_id: string | null;
  usuario_id: string | null;
  dados_anteriores: any;
  dados_novos: any;
  ip_address: string | null;
  created_at: string;
}

const acaoLabels: Record<string, { label: string; color: string; icon: typeof Plus }> = {
  INSERT: { label: "Criação", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: Plus },
  UPDATE: { label: "Edição", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Edit },
  DELETE: { label: "Exclusão", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: Trash2 },
};

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabelaFilter, setTabelaFilter] = useState("todas");
  const [acaoFilter, setAcaoFilter] = useState("todas");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("auditoria_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error) setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const tabelas = useMemo(() => {
    const set = new Set(logs.map(l => l.tabela));
    return Array.from(set).sort();
  }, [logs]);

  const kpis = useMemo(() => {
    const total = logs.length;
    const inserts = logs.filter(l => l.acao === "INSERT").length;
    const updates = logs.filter(l => l.acao === "UPDATE").length;
    const deletes = logs.filter(l => l.acao === "DELETE").length;
    return { total, inserts, updates, deletes };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return logs.filter(l => {
      if (tabelaFilter !== "todas" && l.tabela !== tabelaFilter) return false;
      if (acaoFilter !== "todas" && l.acao !== acaoFilter) return false;
      if (!query) return true;
      return [l.tabela, l.acao, l.registro_id, l.ip_address].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [logs, searchTerm, tabelaFilter, acaoFilter]);

  const columns = [
    { key: "created_at", label: "Data/Hora", render: (l: AuditLog) => (
      <span className="text-xs font-mono">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
    )},
    { key: "tabela", label: "Tabela", render: (l: AuditLog) => (
      <Badge variant="outline" className="font-mono text-xs">{l.tabela}</Badge>
    )},
    { key: "acao", label: "Ação", render: (l: AuditLog) => {
      const info = acaoLabels[l.acao] || { label: l.acao, color: "bg-muted text-muted-foreground" };
      return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${info.color}`}>{info.label}</span>;
    }},
    { key: "registro_id", label: "Registro", render: (l: AuditLog) => (
      <span className="font-mono text-xs text-muted-foreground">{l.registro_id ? l.registro_id.substring(0, 8) + "…" : "—"}</span>
    )},
    { key: "ip_address", label: "IP", render: (l: AuditLog) => (
      <span className="font-mono text-xs">{l.ip_address || "—"}</span>
    )},
  ];

  const renderJsonDiff = (label: string, data: any) => {
    if (!data) return null;
    return (
      <ViewSection title={label}>
        <pre className="rounded-lg bg-muted/50 border p-3 text-xs font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </ViewSection>
    );
  };

  return (
    <AppLayout>
      <ModulePage
        title="Auditoria"
        subtitle="Registro de todas as operações realizadas no sistema"
        count={filteredLogs.length}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por tabela, ação ou ID..."
        filters={
          <div className="flex gap-2">
            <Select value={tabelaFilter} onValueChange={setTabelaFilter}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Tabela" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as tabelas</SelectItem>
                {tabelas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={acaoFilter} onValueChange={setAcaoFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Ação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as ações</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Edição</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Total de Logs" value={String(kpis.total)} icon={Shield} variationType="neutral" variation="registros" />
          <SummaryCard title="Criações" value={String(kpis.inserts)} icon={Plus} variationType="positive" variation="INSERT" />
          <SummaryCard title="Edições" value={String(kpis.updates)} icon={Edit} variationType="neutral" variation="UPDATE" />
          <SummaryCard title="Exclusões" value={String(kpis.deletes)} icon={Trash2} variationType="negative" variation="DELETE" />
        </div>

        <DataTable
          columns={columns}
          data={filteredLogs}
          loading={loading}
          onView={(l) => { setSelected(l); setDrawerOpen(true); }}
        />
      </ModulePage>

      <ViewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Detalhes do Log"
        badge={selected ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${(acaoLabels[selected.acao] || {}).color || ""}`}>
            {(acaoLabels[selected.acao] || {}).label || selected.acao}
          </span>
        ) : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <ViewSection title="Informações">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Data/Hora">{new Date(selected.created_at).toLocaleString("pt-BR")}</ViewField>
                <ViewField label="Tabela"><Badge variant="outline" className="font-mono">{selected.tabela}</Badge></ViewField>
                <ViewField label="ID do Registro"><span className="font-mono text-xs break-all">{selected.registro_id || "—"}</span></ViewField>
                <ViewField label="IP"><span className="font-mono">{selected.ip_address || "—"}</span></ViewField>
                <ViewField label="Usuário"><span className="font-mono text-xs break-all">{selected.usuario_id || "—"}</span></ViewField>
              </div>
            </ViewSection>

            {renderJsonDiff("Dados Anteriores", selected.dados_anteriores)}
            {renderJsonDiff("Dados Novos", selected.dados_novos)}
          </div>
        )}
      </ViewDrawer>
    </AppLayout>
  );
}
