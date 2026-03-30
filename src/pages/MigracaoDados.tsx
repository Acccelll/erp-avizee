import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ImportacaoResumoCards } from "@/components/importacao/ImportacaoResumoCards";
import { ImportacaoTipoCard } from "@/components/importacao/ImportacaoTipoCard";
import { ImportacaoLotesTable, ImportacaoLote } from "@/components/importacao/ImportacaoLotesTable";
import { UploadPlanilhaCard } from "@/components/importacao/UploadPlanilhaCard";
import { MapeamentoColunasForm } from "@/components/importacao/MapeamentoColunasForm";
import { PreviewImportacaoTable } from "@/components/importacao/PreviewImportacaoTable";
import { ErrosImportacaoPanel } from "@/components/importacao/ErrosImportacaoPanel";
import { PreviewXmlTable } from "@/components/importacao/PreviewXmlTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, RefreshCw, Database, ArrowRight, ArrowLeft, CheckCircle2, ChevronRight, FileUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useImportacaoCadastros, ImportType } from "@/hooks/importacao/useImportacaoCadastros";
import { useImportacaoEstoque } from "@/hooks/importacao/useImportacaoEstoque";
import { useImportacaoXml } from "@/hooks/importacao/useImportacaoXml";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useSupabaseCrud } from "@/hooks/useSupabaseCrud";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export default function MigracaoDados() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [activeTab, setActiveTab] = useState("overview");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [currentLoteId, setCurrentLoteId] = useState<string | null>(null);

  const { data: lotes, loading: loadingLotes, fetchData: refreshLotes } = useSupabaseCrud<ImportacaoLote>({
    table: "importacao_lotes",
    hasAtivo: false,
    orderBy: "criado_em"
  });

  const [activeImportSource, setActiveImportSource] = useState<"cadastros" | "estoque" | "xml">("cadastros");

  const hookCadastros = useImportacaoCadastros();
  const hookEstoque = useImportacaoEstoque();
  const hookXml = useImportacaoXml();

  const activeHook = activeImportSource === "cadastros" ? hookCadastros : activeImportSource === "estoque" ? hookEstoque : hookXml;

  const {
    file,
    sheets,
    currentSheet,
    headers,
    mapping,
    importType,
    previewData,
    isProcessing,
    onFileChange,
    onSheetChange,
    setMapping,
    setImportType,
    generatePreview,
    processImport,
    finalizeImport
  } = activeHook as any;

  const filteredLotes = lotes.filter(lote => {
    const matchesSearch = lote.arquivo_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "todos" || lote.tipo_importacao === typeFilter;
    const matchesStatus = statusFilter === "todos" || lote.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleRefresh = () => {
    refreshLotes();
    toast.info("Dados atualizados.");
  };

  const handleOpenImport = (type: string) => {
    if (type === "estoque_inicial") {
      setActiveImportSource("estoque");
    } else if (type === "compras_xml") {
      setActiveImportSource("xml");
    } else {
      setActiveImportSource("cadastros");
      setImportType(type as ImportType);
    }
    setStep(1);
    setIsImportModalOpen(true);
  };

  const handleNextStep = async () => {
    if (activeImportSource !== 'xml' && step === 1 && !file) {
      toast.error("Selecione um arquivo primeiro.");
      return;
    }

    if (activeImportSource === 'xml' && step === 1 && hookXml.files.length === 0) {
      toast.error("Selecione os arquivos XML primeiro.");
      return;
    }

    if (step === 1 && activeImportSource === 'xml') {
      // Pula mapeamento para XML
      setStep(3);
      return;
    }

    if (step === 2) {
      if (activeImportSource === 'estoque') {
        await hookEstoque.generatePreview();
      } else {
        hookCadastros.generatePreview();
      }
    }

    if (step === 3) {
      const loteId = await processImport();
      if (!loteId) return;
      setCurrentLoteId(loteId);
    }

    setStep(s => s + 1);
  };

  const handleFinalize = async () => {
    const success = await finalizeImport(currentLoteId || undefined);
    if (success) {
      setIsImportModalOpen(false);
      refreshLotes();
      setActiveTab("lotes");
    }
  };

  const resetModal = () => {
    setIsImportModalOpen(false);
    setStep(1);
    setCurrentLoteId(null);
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
              <RefreshCw className={`h-4 w-4 ${loadingLotes ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <ImportacaoResumoCards
          totalBatches={lotes.length}
          totalProcessed={lotes.filter(l => l.status === 'concluido').length}
          totalErrors={lotes.reduce((acc, curr) => acc + (curr.total_erros || 0), 0)}
          totalPending={lotes.filter(l => ['validado', 'parcial', 'processando'].includes(l.status)).length}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="overview">Tipos de Importação</TabsTrigger>
            <TabsTrigger value="lotes">Lotes de Importação</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <ImportacaoTipoCard
                type="produtos"
                title="Produtos"
                description="Importação de SKUs, descrições, preços e NCM via Excel."
                onImport={() => handleOpenImport("produtos")}
                onViewBatches={() => { setTypeFilter("produtos"); setActiveTab("lotes"); }}
              />
              <ImportacaoTipoCard
                type="clientes"
                title="Clientes"
                description="Carga de base de clientes com CPF/CNPJ e contatos."
                onImport={() => handleOpenImport("clientes")}
                onViewBatches={() => { setTypeFilter("clientes"); setActiveTab("lotes"); }}
              />
              <ImportacaoTipoCard
                type="fornecedores"
                title="Fornecedores"
                description="Cadastro de fornecedores legados para compras e fiscal."
                onImport={() => handleOpenImport("fornecedores")}
                onViewBatches={() => { setTypeFilter("fornecedores"); setActiveTab("lotes"); }}
              />
              <ImportacaoTipoCard
                type="estoque_inicial"
                title="Estoque Inicial"
                description="Carga de saldos iniciais de inventário por depósito."
                onImport={() => handleOpenImport("estoque_inicial")}
                onViewBatches={() => { setTypeFilter("estoque_inicial"); setActiveTab("lotes"); }}
              />
              <ImportacaoTipoCard
                type="compras_xml"
                title="Compras por XML"
                description="Processamento em lote de arquivos XML de notas de compra."
                onImport={() => handleOpenImport("compras_xml")}
                onViewBatches={() => { setTypeFilter("compras_xml"); setActiveTab("lotes"); }}
              />
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
                    <SelectItem value="produtos">Produtos</SelectItem>
                    <SelectItem value="clientes">Clientes</SelectItem>
                    <SelectItem value="fornecedores">Fornecedores</SelectItem>
                    <SelectItem value="estoque_inicial">Estoque Inicial</SelectItem>
                    <SelectItem value="compras_xml">Compras por XML</SelectItem>
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
                    <SelectItem value="parcial">Parcial</SelectItem>
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
              isLoading={loadingLotes}
              onView={(id) => toast.info(`Visualizar lote ${id}`)}
              onImport={(id) => {
                 setCurrentLoteId(id);
                 setStep(4);
                 setIsImportModalOpen(true);
              }}
              onDelete={(id) => toast.error("Exclusão não implementada")}
            />
          </TabsContent>
        </Tabs>

        {/* Modal de Importação */}
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                Importar {activeImportSource === 'xml' ? 'Compras por XML' : importType?.charAt(0).toUpperCase() + importType?.slice(1)}
              </DialogTitle>
              <DialogDescription>
                Siga os passos abaixo para realizar a carga de dados.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between px-8 py-4 bg-muted/30 rounded-lg">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-full border-2 font-bold text-sm transition-colors",
                    step === s ? "bg-primary text-primary-foreground border-primary" :
                    step > s ? "bg-emerald-500 text-white border-emerald-500" : "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                  </div>
                  {s < 4 && <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/30" />}
                </div>
              ))}
            </div>

            <div className="flex-grow overflow-auto py-4">
              {step === 1 && (
                <div className="space-y-4">
                  <UploadPlanilhaCard
                    onFileChange={activeImportSource === 'xml' ? hookXml.onFilesChange : onFileChange}
                    fileName={activeImportSource === 'xml' ? (hookXml.files.length > 0 ? `${hookXml.files.length} arquivo(s) selecionado(s)` : undefined) : file?.name}
                    isProcessing={isProcessing}
                  />
                  {activeImportSource !== 'xml' && sheets.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selecione a aba da planilha:</Label>
                      <Select value={currentSheet} onValueChange={(val) => onSheetChange(val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a aba" />
                        </SelectTrigger>
                        <SelectContent>
                          {sheets.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm text-amber-800">
                    Mapeie as colunas da sua planilha para os campos correspondentes no sistema.
                  </div>
                  <MapeamentoColunasForm
                    headers={headers}
                    importType={importType}
                    mapping={mapping}
                    onMappingChange={(f, c) => setMapping(prev => ({ ...prev, [f]: c }))}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  {activeImportSource === 'xml' ? (
                    <PreviewXmlTable data={hookXml.xmlData} />
                  ) : (
                    <>
                      <ErrosImportacaoPanel data={previewData} importType={importType} />
                      <PreviewImportacaoTable data={previewData} importType={importType} />
                    </>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="p-4 bg-emerald-100 rounded-full">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Tudo pronto!</h3>
                    <p className="text-muted-foreground max-w-md">
                      Os dados foram validados e estão no ambiente de staging.
                      Clique em <strong>Confirmar Carga</strong> para inserir definitivamente no sistema.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-2 mb-4">
                <Progress value={undefined} className="h-2" />
                <p className="text-[10px] text-center text-muted-foreground animate-pulse">Processando dados, por favor aguarde...</p>
              </div>
            )}

            <DialogFooter className="border-t pt-4">
              <Button variant="ghost" onClick={resetModal} disabled={isProcessing}>Cancelar</Button>
              <div className="flex-grow" />
              {step > 1 && step < 4 && (
                <Button variant="outline" onClick={() => {
                  if (activeImportSource === 'xml' && step === 3) setStep(1);
                  else setStep(s => s - 1);
                }} disabled={isProcessing}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
              )}
              {step < 4 ? (
                <Button onClick={handleNextStep} disabled={isProcessing || (activeImportSource === 'xml' ? hookXml.files.length === 0 : !file)}>
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinalize} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700">
                  Confirmar Carga Final
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
