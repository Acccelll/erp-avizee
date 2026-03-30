import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ImportacaoResumoCards } from "@/components/importacao/ImportacaoResumoCards";
import { ImportacaoTipoCard } from "@/components/importacao/ImportacaoTipoCard";
import { ImportacaoLotesTable, ImportacaoLote } from "@/components/importacao/ImportacaoLotesTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, RefreshCw, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Mock data for initial structure
const MOCK_LOTES: ImportacaoLote[] = [
  {
    id: "1",
    tipo_importacao: "produtos",
    status: "concluido",
    arquivo_nome: "lista_produtos_2024.xlsx",
    total_lidos: 150,
    total_validos: 148,
    total_erros: 2,
    total_importados: 148,
    criado_em: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "2",
    tipo_importacao: "estoque_inicial",
    status: "validado",
    arquivo_nome: "inventario_geral.csv",
    total_lidos: 850,
    total_validos: 850,
    total_erros: 0,
    total_importados: 0,
    criado_em: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    tipo_importacao: "clientes",
    status: "processando",
    arquivo_nome: "base_clientes_v3.xlsx",
    total_lidos: 2500,
    total_validos: 1200,
    total_erros: 5,
    total_importados: 0,
    criado_em: new Date().toISOString(),
  }
];

const IMPORT_TYPES = [
  {
    id: "cadastros",
    title: "Cadastros",
    description: "Importação de Produtos, Clientes e Fornecedores via Excel/CSV.",
    summary: { lastDate: "20/03/2024", lastStatus: "Concluído", totalBatches: 12 }
  },
  {
    id: "estoque_inicial",
    title: "Estoque Inicial",
    description: "Carga de saldos iniciais de inventário por depósito.",
    summary: { lastDate: "21/03/2024", lastStatus: "Validado", totalBatches: 3 }
  },
  {
    id: "compras_xml",
    title: "Compras por XML",
    description: "Processamento em lote de arquivos XML de notas de compra.",
    summary: { lastDate: "15/03/2024", lastStatus: "Concluído", totalBatches: 45 }
  },
  {
    id: "faturamento",
    title: "Faturamento Histórico",
    description: "Importação de histórico de vendas de sistemas legados.",
    summary: { lastDate: "05/01/2024", lastStatus: "Concluído", totalBatches: 1 }
  },
  {
    id: "financeiro",
    title: "Financeiro em Aberto",
    description: "Carga de contas a pagar e receber pendentes.",
    summary: { lastDate: "N/A", lastStatus: "Sem dados", totalBatches: 0 }
  }
];

export default function MigracaoDados() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [activeTab, setActiveTab] = useState("overview");

  const filteredLotes = MOCK_LOTES.filter(lote => {
    const matchesSearch = lote.arquivo_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "todos" || lote.tipo_importacao === typeFilter;
    const matchesStatus = statusFilter === "todos" || lote.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleRefresh = () => {
    toast.info("Atualizando dados...");
  };

  const handleImport = (type: string) => {
    toast.success(`Iniciando importação de ${type}...`);
  };

  const handleViewBatches = (type: string) => {
    setTypeFilter(type);
    setActiveTab("lotes");
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Migração de Dados</h1>
              <p className="text-sm text-muted-foreground">
                Central de importação, saneamento e carga de dados legados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <ImportacaoResumoCards
          totalBatches={MOCK_LOTES.length}
          totalProcessed={1}
          totalErrors={1}
          totalPending={1}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="overview">Tipos de Importação</TabsTrigger>
            <TabsTrigger value="lotes">Lotes de Importação</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {IMPORT_TYPES.map((type) => (
                <ImportacaoTipoCard
                  key={type.id}
                  type={type.id}
                  title={type.title}
                  description={type.description}
                  summary={type.summary}
                  onImport={handleImport}
                  onViewBatches={handleViewBatches}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="lotes" className="mt-0 space-y-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row items-center gap-3 bg-card p-4 rounded-md border">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do arquivo..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="produtos">Cadastros</SelectItem>
                    <SelectItem value="estoque_inicial">Estoque Inicial</SelectItem>
                    <SelectItem value="compras_xml">Compras por XML</SelectItem>
                    <SelectItem value="faturamento">Faturamento</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos status</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="validado">Validado</SelectItem>
                    <SelectItem value="processando">Processando</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" title="Mais filtros">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ImportacaoLotesTable
              lotes={filteredLotes}
              onView={(id) => toast.info(`Abrindo lote ${id}...`)}
              onDelete={(id) => toast.error(`Lote ${id} excluído (mock)`)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
