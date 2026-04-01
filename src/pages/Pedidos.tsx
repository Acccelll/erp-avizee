import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { SummaryCard } from '@/components/SummaryCard';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ClipboardList, PackageCheck, ShoppingBag, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatNumber } from '@/lib/format';

interface PedidoRow {
  id: string; numero: string; cliente: string; origem: string;
  valor: string; etapa: string; status: string; statusLabel: string; path: string;
}

export default function Pedidos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PedidoRow[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: cotacoes }, { data: ovs }] = await Promise.all([
          supabase.from('orcamentos')
            .select('id, numero, valor_total, status, clientes(nome_razao_social)')
            .eq('ativo', true).in('status', ['confirmado', 'aprovado']).order('created_at', { ascending: false }),
          supabase.from('ordens_venda')
            .select('id, numero, valor_total, status, status_faturamento, clientes(nome_razao_social)')
            .eq('ativo', true).in('status', ['pendente', 'aprovada', 'em_separacao']).order('created_at', { ascending: false }),
        ]);

        const cotacaoRows: PedidoRow[] = (cotacoes || []).map((item: any) => ({
          id: `cot-${item.id}`, numero: item.numero,
          cliente: item.clientes?.nome_razao_social || '—', origem: 'Cotação',
          valor: formatCurrency(Number(item.valor_total || 0)),
          etapa: item.status === 'aprovado' ? 'Aguardando geração de OV' : 'Negociação comercial',
          status: item.status,
          statusLabel: item.status === 'aprovado' ? 'Aprovado' : 'Confirmado',
          path: `/cotacoes/${item.id}`,
        }));

        const ovRows: PedidoRow[] = (ovs || []).map((item: any) => {
          let etapa = 'Em carteira';
          let status = item.status;
          let statusLabel = item.status;
          if (item.status === 'pendente') { etapa = 'Pendente de aprovação'; statusLabel = 'Pendente'; }
          if (item.status === 'aprovada') {
            etapa = item.status_faturamento === 'parcial' ? 'Faturamento parcial' : 'Aguardando faturamento';
            statusLabel = item.status_faturamento === 'parcial' ? 'Parcial' : 'Aprovada';
            status = item.status_faturamento === 'parcial' ? 'parcial' : 'aprovada';
          }
          if (item.status === 'em_separacao') { etapa = 'Separação e expedição'; statusLabel = 'Em Separação'; }
          return {
            id: `ov-${item.id}`, numero: item.numero,
            cliente: item.clientes?.nome_razao_social || '—', origem: 'Ordem de Venda',
            valor: formatCurrency(Number(item.valor_total || 0)),
            etapa, status, statusLabel, path: '/ordens-venda',
          };
        });

        if (mounted) setRows([...cotacaoRows, ...ovRows]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    aguardandoOV: rows.filter((item) => item.origem === 'Cotação' && item.status === 'aprovado').length,
    emSeparacao: rows.filter((item) => item.status === 'em_separacao').length,
    convertidos: rows.filter((item) => item.origem === 'Ordem de Venda').length,
  }), [rows]);

  const columns = [
    { key: 'numero', label: 'Pedido' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'origem', label: 'Origem' },
    { key: 'valor', label: 'Valor' },
    { key: 'etapa', label: 'Etapa Atual' },
    { key: 'status', label: 'Status', render: (item: PedidoRow) => <StatusBadge status={item.status} label={item.statusLabel} /> },
  ];

  return (
    <AppLayout>
      <ModulePage
        title="Pedidos"
        subtitle="Painel comercial consolidado entre cotações confirmadas, aprovações e ordens de venda em andamento."
        count={rows.length}
      >
        <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Em Acompanhamento" value={formatNumber(stats.total)} icon={ClipboardList} variationType="neutral" variation="pedidos ativos" />
          <SummaryCard title="Aguardando OV" value={formatNumber(stats.aguardandoOV)} icon={Timer} variationType={stats.aguardandoOV > 0 ? "negative" : "positive"} variant={stats.aguardandoOV > 0 ? "warning" : undefined} variation="cotações aprovadas" />
          <SummaryCard title="Em Separação" value={formatNumber(stats.emSeparacao)} icon={PackageCheck} variationType="neutral" variation="expedição" />
          <SummaryCard title="Convertidos em OV" value={formatNumber(stats.convertidos)} icon={ShoppingBag} variationType="positive" variation="ordens ativas" />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Fila de pedidos comerciais</h2>
            <p className="text-sm text-muted-foreground">Visão consolidada do fluxo comercial.</p>
          </div>
          <DataTable columns={columns} data={rows} loading={loading} onRowClick={(item) => navigate(item.path)} />
        </div>
      </ModulePage>
    </AppLayout>
  );
}
