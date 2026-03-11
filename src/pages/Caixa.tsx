import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { DollarSign, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";

const lancamentos = [
  { id: 1, data: "11/03/2026", descricao: "Recebimento - NF-S 3020", tipo: "Entrada", valor: "R$ 1.250,00", saldo: "R$ 18.750,00" },
  { id: 2, data: "10/03/2026", descricao: "Pagamento fornecedor - NF-E 1039", tipo: "Saída", valor: "R$ 9.800,00", saldo: "R$ 17.500,00" },
  { id: 3, data: "09/03/2026", descricao: "Recebimento - NF-S 3018", tipo: "Entrada", valor: "R$ 5.600,00", saldo: "R$ 27.300,00" },
  { id: 4, data: "08/03/2026", descricao: "Despesa operacional", tipo: "Saída", valor: "R$ 2.100,00", saldo: "R$ 21.700,00" },
  { id: 5, data: "07/03/2026", descricao: "Recebimento - NF-S 3017", tipo: "Entrada", valor: "R$ 12.000,00", saldo: "R$ 23.800,00" },
];

const columns = [
  { key: "data", label: "Data" },
  { key: "descricao", label: "Descrição" },
  { key: "tipo", label: "Tipo", render: (l: any) => (
    <div className="flex items-center gap-1.5">
      {l.tipo === "Entrada" ? (
        <ArrowUpRight className="w-3.5 h-3.5 text-success" />
      ) : (
        <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
      )}
      <span className={l.tipo === "Entrada" ? "text-success" : "text-destructive"}>{l.tipo}</span>
    </div>
  )},
  { key: "valor", label: "Valor", render: (l: any) => (
    <span className={`font-semibold ${l.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
      {l.tipo === "Saída" ? "- " : "+ "}{l.valor}
    </span>
  )},
  { key: "saldo", label: "Saldo", render: (l: any) => <span className="font-semibold">{l.saldo}</span> },
];

const Caixa = () => (
  <AppLayout>
    <div className="mb-6">
      <h1 className="page-title">Caixa</h1>
      <p className="text-muted-foreground text-sm mt-1">Fluxo de caixa e lançamentos</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard title="Saldo Atual" value="R$ 18.750" icon={Wallet} changeType="positive" change="Atualizado agora" />
      <StatCard title="Entradas (mês)" value="R$ 18.850" icon={ArrowUpRight} changeType="positive" change="+15% vs anterior" />
      <StatCard title="Saídas (mês)" value="R$ 11.900" icon={ArrowDownRight} changeType="negative" change="+8% vs anterior" />
      <StatCard title="Resultado" value="R$ 6.950" icon={DollarSign} changeType="positive" change="Positivo" />
    </div>

    <ModulePage title="Lançamentos" addLabel="Novo Lançamento" count={lancamentos.length}>
      <DataTable columns={columns} data={lancamentos} />
    </ModulePage>
  </AppLayout>
);

export default Caixa;
