import React from 'react';
import ModulePage from '../components/ModulePage';
import PeriodFilter from '../components/PeriodFilter';
import KPICards from '../components/KPICards';
import AlertCard from '../components/AlertCard';
import PieChart from '../components/PieChart';

const Dashboard = () => {
  return (
    <ModulePage>
      <PeriodFilter />
      <KPICards />
      <div className="alerts">
        <AlertCard title="Aguardando Faturamento" />
        <AlertCard title="Compras Aguardando" />
        <AlertCard title="Estoque Mínimo" />
      </div>
      <section className="ultimos-orcamentos">
        <h2>Últimos Orçamentos</h2>
      </section>
      <section className="resumo-geral">
        <h2>Resumo Geral</h2>
        <PieChart />
      </section>
      <section className="ultimas-compras">
        <h2>Últimas Compras</h2>
      </section>
    </ModulePage>
  );
};

export default Dashboard;