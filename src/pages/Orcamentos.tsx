import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const orcamentos = [
  { numero: "ORC-001", cliente: "Tech Solutions LTDA", data: "11/03/2026", validade: "21/03/2026", total: "R$ 8.500,00", itens: 4, status: "Pendente" },
  { numero: "ORC-002", cliente: "Maria Silva Santos", data: "09/03/2026", validade: "19/03/2026", total: "R$ 1.250,00", itens: 2, status: "Confirmado" },
  { numero: "ORC-003", cliente: "Distribuidora Nacional SA", data: "07/03/2026", validade: "17/03/2026", total: "R$ 32.000,00", itens: 12, status: "Pendente" },
];

const pedidos = [
  { numero: "PED-001", cliente: "Tech Solutions LTDA", data: "11/03/2026", total: "R$ 8.500,00", origem: "ORC-001", status: "Confirmado" },
  { numero: "PED-002", cliente: "Maria Silva Santos", data: "09/03/2026", total: "R$ 1.250,00", origem: "ORC-002", status: "Confirmado" },
];

const orcCols = [
  { key: "numero", label: "Nº", render: (o: any) => <span className="mono text-xs font-medium text-primary">{o.numero}</span> },
  { key: "cliente", label: "Cliente" },
  { key: "data", label: "Data" },
  { key: "validade", label: "Validade" },
  { key: "itens", label: "Itens" },
  { key: "total", label: "Total", render: (o: any) => <span className="font-semibold">{o.total}</span> },
  { key: "status", label: "Status", render: (o: any) => <StatusBadge status={o.status} /> },
];

const pedCols = [
  { key: "numero", label: "Nº", render: (p: any) => <span className="mono text-xs font-medium text-primary">{p.numero}</span> },
  { key: "cliente", label: "Cliente" },
  { key: "data", label: "Data" },
  { key: "origem", label: "Origem", render: (p: any) => <span className="mono text-xs">{p.origem}</span> },
  { key: "total", label: "Total", render: (p: any) => <span className="font-semibold">{p.total}</span> },
  { key: "status", label: "Status", render: (p: any) => <StatusBadge status={p.status} /> },
];

const Orcamentos = () => (
  <AppLayout>
    <div className="page-header">
      <div>
        <h1 className="page-title">Orçamentos & Pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestão comercial de orçamentos e pedidos</p>
      </div>
    </div>
    <Tabs defaultValue="orcamentos">
      <TabsList>
        <TabsTrigger value="orcamentos">Orçamentos ({orcamentos.length})</TabsTrigger>
        <TabsTrigger value="pedidos">Pedidos ({pedidos.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="orcamentos" className="mt-4">
        <ModulePage title="" addLabel="Novo Orçamento" count={orcamentos.length}>
          <DataTable columns={orcCols} data={orcamentos} />
        </ModulePage>
      </TabsContent>
      <TabsContent value="pedidos" className="mt-4">
        <ModulePage title="" addLabel="Novo Pedido" count={pedidos.length}>
          <DataTable columns={pedCols} data={pedidos} />
        </ModulePage>
      </TabsContent>
    </Tabs>
  </AppLayout>
);

export default Orcamentos;
