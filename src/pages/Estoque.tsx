import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable, StatusBadge } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { Package, AlertTriangle, TrendingDown, ArrowDownUp } from "lucide-react";

const movimentacoes = [
  { id: 1, data: "11/03/2026", produto: "Cabo HDMI 2.1 Premium", tipo: "Entrada", quantidade: 50, origem: "NF-E #1042", saldo: 142 },
  { id: 2, data: "10/03/2026", produto: "Adaptador USB-C Hub", tipo: "Saída", quantidade: 10, origem: "NF-S #3021", saldo: 85 },
  { id: 3, data: "09/03/2026", produto: "Mousepad Gamer RGB", tipo: "Saída", quantidade: 15, origem: "NF-S #3020", saldo: 3 },
  { id: 4, data: "08/03/2026", produto: "Suporte Monitor Articulado", tipo: "Entrada", quantidade: 20, origem: "NF-E #1041", saldo: 28 },
  { id: 5, data: "07/03/2026", produto: "Webcam Full HD", tipo: "Ajuste", quantidade: -5, origem: "Ajuste manual - avaria", saldo: 0 },
];

const columns = [
  { key: "data", label: "Data" },
  { key: "produto", label: "Produto" },
  { key: "tipo", label: "Tipo", render: (m: any) => (
    <StatusBadge status={m.tipo === "Entrada" ? "Confirmado" : m.tipo === "Saída" ? "Pendente" : "Rascunho"} />
  )},
  { key: "quantidade", label: "Qtd", render: (m: any) => (
    <span className={`font-semibold ${m.quantidade > 0 ? "text-success" : "text-destructive"}`}>
      {m.quantidade > 0 ? "+" : ""}{m.quantidade}
    </span>
  )},
  { key: "origem", label: "Origem", render: (m: any) => <span className="mono text-xs">{m.origem}</span> },
  { key: "saldo", label: "Saldo", render: (m: any) => <span className="font-semibold">{m.saldo}</span> },
];

const Estoque = () => (
  <AppLayout>
    <div className="mb-6">
      <h1 className="page-title">Estoque</h1>
      <p className="text-muted-foreground text-sm mt-1">Controle de estoque e movimentações</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard title="Total em Estoque" value="825" icon={Package} change="14 produtos" changeType="neutral" />
      <StatCard title="Estoque Baixo" value="3" icon={AlertTriangle} change="Abaixo do mínimo" changeType="negative" />
      <StatCard title="Entradas (mês)" value="152" icon={TrendingDown} change="+22% vs anterior" changeType="positive" />
      <StatCard title="Saídas (mês)" value="98" icon={ArrowDownUp} change="-5% vs anterior" changeType="positive" />
    </div>

    <ModulePage title="Movimentações" addLabel="Ajuste Manual" count={movimentacoes.length}>
      <DataTable columns={columns} data={movimentacoes} />
    </ModulePage>
  </AppLayout>
);

export default Estoque;
