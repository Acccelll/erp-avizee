import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const contasReceber = [
  { id: "CR-001", cliente: "Tech Solutions LTDA", origem: "NF-S 3021", vencimento: "10/04/2026", valor: "R$ 8.500,00", status: "Aberto" },
  { id: "CR-002", cliente: "Maria Silva Santos", origem: "NF-S 3020", vencimento: "09/04/2026", valor: "R$ 1.250,00", status: "Pago" },
  { id: "CR-003", cliente: "Distribuidora Nacional SA", origem: "NF-S 3019", vencimento: "01/03/2026", valor: "R$ 15.200,00", status: "Vencido" },
];

const contasPagar = [
  { id: "CP-001", fornecedor: "Import Tech China LTDA", origem: "NF-E 1042", vencimento: "10/04/2026", valor: "R$ 12.500,00", status: "Aberto" },
  { id: "CP-002", fornecedor: "Distribuidora Mega Cabos", origem: "NF-E 1041", vencimento: "22/04/2026", valor: "R$ 4.200,00", status: "Aberto" },
  { id: "CP-003", fornecedor: "Eletrônicos Premium SA", origem: "NF-E 1039", vencimento: "05/03/2026", valor: "R$ 9.800,00", status: "Pago" },
];

const crCols = [
  { key: "id", label: "Nº", render: (c: any) => <span className="mono text-xs font-medium text-primary">{c.id}</span> },
  { key: "cliente", label: "Cliente" },
  { key: "origem", label: "Origem", render: (c: any) => <span className="mono text-xs">{c.origem}</span> },
  { key: "vencimento", label: "Vencimento" },
  { key: "valor", label: "Valor", render: (c: any) => <span className="font-semibold">{c.valor}</span> },
  { key: "status", label: "Status", render: (c: any) => <StatusBadge status={c.status} /> },
];

const cpCols = [
  { key: "id", label: "Nº", render: (c: any) => <span className="mono text-xs font-medium text-primary">{c.id}</span> },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "origem", label: "Origem", render: (c: any) => <span className="mono text-xs">{c.origem}</span> },
  { key: "vencimento", label: "Vencimento" },
  { key: "valor", label: "Valor", render: (c: any) => <span className="font-semibold">{c.valor}</span> },
  { key: "status", label: "Status", render: (c: any) => <StatusBadge status={c.status} /> },
];

const Financeiro = () => (
  <AppLayout>
    <div className="mb-6">
      <h1 className="page-title">Financeiro</h1>
      <p className="text-muted-foreground text-sm mt-1">Contas a pagar e receber</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard title="A Receber" value="R$ 24.950" icon={TrendingUp} change="2 títulos abertos" changeType="neutral" />
      <StatCard title="A Pagar" value="R$ 16.700" icon={TrendingDown} change="2 títulos abertos" changeType="neutral" />
      <StatCard title="Recebido (mês)" value="R$ 1.250" icon={DollarSign} changeType="positive" change="+R$ 1.250" />
      <StatCard title="Vencidos" value="1" icon={AlertTriangle} change="R$ 15.200 total" changeType="negative" />
    </div>

    <Tabs defaultValue="receber">
      <TabsList>
        <TabsTrigger value="receber">A Receber ({contasReceber.length})</TabsTrigger>
        <TabsTrigger value="pagar">A Pagar ({contasPagar.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="receber" className="mt-4">
        <ModulePage title="" addLabel="Novo Recebível" count={contasReceber.length}>
          <DataTable columns={crCols} data={contasReceber} />
        </ModulePage>
      </TabsContent>
      <TabsContent value="pagar" className="mt-4">
        <ModulePage title="" addLabel="Nova Conta a Pagar" count={contasPagar.length}>
          <DataTable columns={cpCols} data={contasPagar} />
        </ModulePage>
      </TabsContent>
    </Tabs>
  </AppLayout>
);

export default Financeiro;
