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

      const [{ count: vencidos }, { data: estMin }] = await Promise.all([
        supabase
          .from('financeiro_lancamentos')
          .select('*', { count: 'exact', head: true })
          .eq('ativo', true)
          .in('status', ['aberto', 'vencido'])
          .lt('data_vencimento', today),
        supabase
          .from('produtos')
          .select('estoque_atual, estoque_minimo')
          .eq('ativo', true)
          .not('estoque_minimo', 'is', null)
          .limit(500),
      ]);

      const baixo = (estMin || []).filter(
        (p: any) => p.estoque_minimo > 0 && (p.estoque_atual ?? 0) <= p.estoque_minimo,
      ).length;

      setAlerts({ financeiroVencidos: vencidos || 0, estoqueBaixo: baixo });
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  return alerts;
}
