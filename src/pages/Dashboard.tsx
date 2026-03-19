import React from 'react';
import { ModulePage } from 'some-module'; // Import ModulePage pattern
import GlobalPeriodFilter from 'components/GlobalPeriodFilter';
import KPICards from 'components/KPICards';
import OperationalInsights from 'components/OperationalInsights';

const Dashboard = () => {
    return (
        <ModulePage>
            <GlobalPeriodFilter />
            <KPICards />
            <OperationalInsights title="Pendências do Dia" />
        </ModulePage>
    );
};

export default Dashboard;