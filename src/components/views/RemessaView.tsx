import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { StatusBadge } from "@/components/DataTable";
import { formatCurrency, formatDate } from "@/lib/format";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { useRelationalNavigation } from "@/contexts/RelationalNavigationContext";
import { MapPin, Calendar, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Props {
  id: string;
}

export function RemessaView({ id }: Props) {
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<any[]>([]);
  const { pushView } = useRelationalNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: r } = await supabase
        .from("remessas")
        .select("*, transportadoras(id, nome_razao_social), clientes(id, nome_razao_social), pedidos_compra(id, numero), notas_fiscais(id, numero)")
        .eq("id", id)
        .single();

      if (!r) return;
      setSelected(r);

      const { data: evs } = await supabase
        .from("remessa_eventos")
        .select("*")
        .eq("remessa_id", r.id)
        .order("data_hora", { ascending: false });

      setEventos(evs || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando remessa...</div>;
  if (!selected) return <div className="p-8 text-center text-destructive">Remessa não encontrada</div>;

  return (
    <div className="space-y-5">
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg font-mono text-primary">{selected.codigo_rastreio || "Sem código"}</h3>
            <p className="text-xs text-muted-foreground">{selected.transportadoras?.nome_razao_social}</p>
          </div>
          <StatusBadge status={selected.status_transporte} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <p className="text-muted-foreground uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Postagem</p>
          <p>{selected.data_postagem ? format(new Date(selected.data_postagem + "T00:00:00"), "dd/MM/yyyy") : "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Previsão</p>
          <p>{selected.previsao_entrega ? format(new Date(selected.previsao_entrega + "T00:00:00"), "dd/MM/yyyy") : "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground uppercase font-semibold">Cliente</p>
          <RelationalLink onClick={() => pushView("cliente", selected.clientes?.id)}>{selected.clientes?.nome_razao_social || "—"}</RelationalLink>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground uppercase font-semibold">Vínculos</p>
          <div className="flex flex-col gap-1">
            {selected.pedidos_compra && <RelationalLink onClick={() => pushView("pedido_compra", selected.pedidos_compra.id)} mono>PC {selected.pedidos_compra.numero}</RelationalLink>}
            {selected.notas_fiscais && <RelationalLink onClick={() => pushView("nota_fiscal", selected.notas_fiscais.id)} mono>NF {selected.notas_fiscais.numero}</RelationalLink>}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 border-b pb-1">
          <Package className="w-3 h-3" /> Histórico de Eventos
        </p>
        <div className="space-y-4">
          {eventos.map((ev, i) => (
            <div key={ev.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-2.5 w-2.5 rounded-full border ${i === 0 ? "bg-primary border-primary" : "bg-muted border-muted-foreground/30"}`} />
                {i < eventos.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
              </div>
              <div className="flex-1 -mt-1">
                <p className="text-xs font-medium">{ev.descricao}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{format(new Date(ev.data_hora), "dd/MM/yyyy HH:mm")}</span>
                  {ev.local && <><MapPin className="h-2.5 w-2.5" /><span>{ev.local}</span></>}
                </div>
              </div>
            </div>
          ))}
          {eventos.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum evento registrado.</p>}
        </div>
      </div>
    </div>
  );
}
