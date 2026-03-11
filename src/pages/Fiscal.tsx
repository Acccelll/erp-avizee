import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const nfEntrada = [
  { numero: "NF-E 1042", fornecedor: "Import Tech China LTDA", data: "11/03/2026", valor: "R$ 12.500,00", movEstoque: "Sim", geraFinanceiro: "Sim", status: "Confirmado" },
  { numero: "NF-E 1041", fornecedor: "Distribuidora Mega Cabos", data: "08/03/2026", valor: "R$ 4.200,00", movEstoque: "Sim", geraFinanceiro: "Sim", status: "Confirmado" },
  { numero: "NF-E 1040", fornecedor: "Eletrônicos Premium SA", data: "05/03/2026", valor: "R$ 28.750,00", movEstoque: "Sim", geraFinanceiro: "Não", status: "Rascunho" },
];

const nfSaida = [
  { numero: "NF-S 3021", cliente: "Tech Solutions LTDA", data: "10/03/2026", valor: "R$ 8.500,00", movEstoque: "Sim", geraFinanceiro: "Sim", status: "Confirmado" },
  { numero: "NF-S 3020", cliente: "Maria Silva Santos", data: "09/03/2026", valor: "R$ 1.250,00", movEstoque: "Sim", geraFinanceiro: "Sim", status: "Confirmado" },
];

const entradaCols = [
  { key: "numero", label: "Nº NF", render: (n: any) => <span className="mono text-xs font-medium text-primary">{n.numero}</span> },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "data", label: "Data" },
  { key: "valor", label: "Valor", render: (n: any) => <span className="font-semibold">{n.valor}</span> },
  { key: "movEstoque", label: "Mov. Estoque" },
  { key: "geraFinanceiro", label: "Gera Financeiro" },
  { key: "status", label: "Status", render: (n: any) => <StatusBadge status={n.status} /> },
];

const saidaCols = [
  { key: "numero", label: "Nº NF", render: (n: any) => <span className="mono text-xs font-medium text-primary">{n.numero}</span> },
  { key: "cliente", label: "Cliente" },
  { key: "data", label: "Data" },
  { key: "valor", label: "Valor", render: (n: any) => <span className="font-semibold">{n.valor}</span> },
  { key: "movEstoque", label: "Mov. Estoque" },
  { key: "geraFinanceiro", label: "Gera Financeiro" },
  { key: "status", label: "Status", render: (n: any) => <StatusBadge status={n.status} /> },
];

const Fiscal = () => (
  <AppLayout>
    <div className="page-header">
      <div>
        <h1 className="page-title">Fiscal</h1>
        <p className="text-muted-foreground text-sm mt-1">Notas fiscais de entrada e saída</p>
      </div>
    </div>
    <Tabs defaultValue="entrada">
      <TabsList>
        <TabsTrigger value="entrada">NF Entrada ({nfEntrada.length})</TabsTrigger>
        <TabsTrigger value="saida">NF Saída ({nfSaida.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="entrada" className="mt-4">
        <ModulePage title="" addLabel="Nova NF Entrada" count={nfEntrada.length}>
          <DataTable columns={entradaCols} data={nfEntrada} />
        </ModulePage>
      </TabsContent>
      <TabsContent value="saida" className="mt-4">
        <ModulePage title="" addLabel="Nova NF Saída" count={nfSaida.length}>
          <DataTable columns={saidaCols} data={nfSaida} />
        </ModulePage>
      </TabsContent>
    </Tabs>
  </AppLayout>
);

export default Fiscal;
