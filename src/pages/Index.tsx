import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import {
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { mes: "Jan", vendas: 45000, compras: 32000 },
  { mes: "Fev", vendas: 52000, compras: 28000 },
  { mes: "Mar", vendas: 48000, compras: 35000 },
  { mes: "Abr", vendas: 61000, compras: 30000 },
  { mes: "Mai", vendas: 55000, compras: 42000 },
  { mes: "Jun", vendas: 67000, compras: 38000 },
];

const stockByGroup = [
  { name: "Eletrônicos", value: 340, color: "hsl(200, 65%, 28%)" },
  { name: "Acessórios", value: 210, color: "hsl(38, 92%, 55%)" },
  { name: "Peças", value: 180, color: "hsl(152, 60%, 40%)" },
  { name: "Outros", value: 95, color: "hsl(215, 15%, 60%)" },
];

const recentActivities = [
  { action: "NF entrada #1042 confirmada", time: "Há 15 min", icon: ArrowDownRight, type: "entrada" },
  { action: "Pedido #2085 gerado", time: "Há 32 min", icon: FileText, type: "pedido" },
  { action: "NF saída #3021 emitida", time: "Há 1h", icon: ArrowUpRight, type: "saida" },
  { action: "Estoque baixo: Cabo HDMI 2.1", time: "Há 2h", icon: AlertTriangle, type: "alerta" },
  { action: "Pagamento recebido - Cliente XYZ", time: "Há 3h", icon: DollarSign, type: "financeiro" },
];

const Dashboard = () => {
  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do sistema ERP AviZee</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Vendas do Mês"
          value="R$ 67.450"
          change="+12.5% vs mês anterior"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Compras do Mês"
          value="R$ 38.200"
          change="-8.3% vs mês anterior"
          changeType="positive"
          icon={ShoppingCart}
        />
        <StatCard
          title="Produtos Ativos"
          value="825"
          change="14 novos este mês"
          changeType="neutral"
          icon={Package}
        />
        <StatCard
          title="Contas a Receber"
          value="R$ 24.800"
          change="3 vencidas"
          changeType="negative"
          icon={DollarSign}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-5">
          <h3 className="font-semibold text-foreground mb-4">Vendas vs Compras</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(215, 10%, 50%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(215, 10%, 50%)" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(214, 20%, 90%)",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="vendas" fill="hsl(200, 65%, 28%)" radius={[4, 4, 0, 0]} name="Vendas" />
              <Bar dataKey="compras" fill="hsl(38, 92%, 55%)" radius={[4, 4, 0, 0]} name="Compras" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock by Group */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-semibold text-foreground mb-4">Estoque por Grupo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stockByGroup}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {stockByGroup.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {stockByGroup.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border p-5">
        <h3 className="font-semibold text-foreground mb-4">Atividade Recente</h3>
        <div className="space-y-3">
          {recentActivities.map((activity, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 border-b last:border-b-0">
              <div className="p-2 rounded-lg bg-muted">
                <activity.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.action}</p>
              </div>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
