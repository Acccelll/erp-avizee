import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SidebarAlerts {
  financeiroVencidos: number;
  estoqueBaixo: number;
}

export function useSidebarAlerts() {
  const [alerts, setAlerts] = useState<SidebarAlerts>({ financeiroVencidos: 0, estoqueBaixo: 0 });

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [{ count: vencidos }, { data: baixoData }] = await Promise.all([
        supabase
          .from('financeiro_lancamentos')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true)
          .in('status', ['aberto', 'vencido'])
          .lt('data_vencimento', today),
        supabase
          .from('produtos')
          .select('id, estoque_atual, estoque_minimo')
          .eq('ativo', true)
          .gt('estoque_minimo', 0),
      ]);

      const baixoCount = (baixoData || []).filter((p: any) => (p.estoque_atual || 0) <= p.estoque_minimo).length;

      setAlerts({
        financeiroVencidos: vencidos || 0,
        estoqueBaixo: baixoCount,
      });
    };

    load();

    // Realtime listener para financeiro_lancamentos
    const channel = supabase
      .channel('sidebar-alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financeiro_lancamentos' },
        () => { load(); }
      )
      .subscribe();

    // Polling de fallback a cada 5 min
    const interval = setInterval(load, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return alerts;
}
