import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";

const compras = [
  { numero: "CMP-001", fornecedor: "Import Tech China LTDA", data: "10/03/2026", total: "R$ 12.500,00", itens: 5, status: "Confirmado" },
  { numero: "CMP-002", fornecedor: "Distribuidora Mega Cabos", data: "08/03/2026", total: "R$ 4.200,00", itens: 3, status: "Rascunho" },
  { numero: "CMP-003", fornecedor: "Eletrônicos Premium SA", data: "05/03/2026", total: "R$ 28.750,00", itens: 8, status: "Confirmado" },
  { numero: "CMP-004", fornecedor: "Import Tech China LTDA", data: "01/03/2026", total: "R$ 6.800,00", itens: 2, status: "Cancelado" },
];

const columns = [
  { key: "numero", label: "Nº", render: (c: any) => <span className="mono text-xs font-medium text-primary">{c.numero}</span> },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "data", label: "Data" },
  { key: "itens", label: "Itens" },
  { key: "total", label: "Total", render: (c: any) => <span className="font-semibold">{c.total}</span> },
  { key: "status", label: "Status", render: (c: any) => <StatusBadge status={c.status} /> },
];

const Compras = () => (
  <AppLayout>
    <ModulePage title="Compras" subtitle="Registro e controle de compras" addLabel="Nova Compra" count={compras.length}>
      <DataTable columns={columns} data={compras} />
    </ModulePage>
  </AppLayout>
);

export default Compras;
