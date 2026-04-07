import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ModulePage } from "@/components/ModulePage";
import { DataTable } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatNumber } from "@/lib/format";
import { EntregaDrawer } from "@/components/logistica/EntregaDrawer";
import { Eye } from "lucide-react";

type Entrega = {
  id: string;
  numero_pedido: string;
  cliente: string;
  cidade_uf: string;
  transportadora: string;
  volumes: number;
  peso_total: number;
  previsao_envio: string | null;
  previsao_entrega: string | null;
  data_expedicao: string | null;
  status_logistico: string;
  responsavel: string;
  codigo_rastreio: string | null;
};

type Recebimento = {
  id: string;
  numero_compra: string;
  fornecedor: string;
  previsao_entrega: string | null;
  data_recebimento: string | null;
  quantidade_pedida: number;
  quantidade_recebida: number;
  pendencia: number;
  status_logistico: string;
  nf_vinculada: string | null;
  responsavel: string;
};

const entregaStatusOptions = [
  "aguardando_separacao",
  "em_separacao",
  "separado",
  "aguardando_expedicao",
  "em_transporte",
  "entregue",
  "entrega_parcial",
  "ocorrencia",
  "cancelado",
] as const;

const recebimentoStatusOptions = [
  "pedido_emitido",
  "aguardando_envio_fornecedor",
  "em_transito",
  "recebimento_parcial",
  "recebido",
  "recebido_com_divergencia",
  "atrasado",
  "cancelado",
] as const;

const statusLabel = (status: string) => status.replaceAll("_", " ");

export default function Logistica() {
  const { can } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);

  const canEdit = can("logistica", "editar");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ordensRes, remessasRes, clientesRes, transportadorasRes, itensOvRes, comprasRes, itensCompraRes, fornecedoresRes] = await Promise.all([
          supabase.from("ordens_venda").select("id,numero,cliente_id,data_prometida_despacho,usuario_id,created_at,updated_at").eq("ativo", true),
          supabase.from("remessas").select("id,ordem_venda_id,transportadora_id,status_transporte,data_postagem,previsao_entrega,volumes,peso,codigo_rastreio,updated_at").eq("ativo", true),
          supabase.from("clientes").select("id,nome_razao_social,cidade,uf"),
          supabase.from("transportadoras").select("id,nome_razao_social"),
          supabase.from("ordens_venda_itens").select("ordem_venda_id,peso_total,quantidade"),
          supabase.from("pedidos_compra").select("id,numero,fornecedor_id,data_entrega_prevista,data_entrega_real,status,usuario_id,updated_at").eq("ativo", true),
          supabase.from("pedidos_compra_itens").select("pedido_compra_id,quantidade"),
          supabase.from("fornecedores").select("id,nome_razao_social"),
        ]);

        const clienteMap = new Map((clientesRes.data || []).map((c) => [c.id, c]));
        const transportadoraMap = new Map((transportadorasRes.data || []).map((t) => [t.id, t.nome_razao_social]));
        const remessaByPedido = new Map((remessasRes.data || []).map((r) => [r.ordem_venda_id || "", r]));

        const pesoByOrder = new Map<string, { peso: number; qtd: number }>();
        (itensOvRes.data || []).forEach((item) => {
          const current = pesoByOrder.get(item.ordem_venda_id) || { peso: 0, qtd: 0 };
          pesoByOrder.set(item.ordem_venda_id, {
            peso: current.peso + Number(item.peso_total || 0),
            qtd: current.qtd + Number(item.quantidade || 0),
          });
        });

        const entregaRows: Entrega[] = (ordensRes.data || []).map((ov) => {
          const remessa = remessaByPedido.get(ov.id);
          const cliente = clienteMap.get(ov.cliente_id || "");
          const pesoQtd = pesoByOrder.get(ov.id) || { peso: 0, qtd: 0 };
          return {
            id: ov.id,
            numero_pedido: ov.numero,
            cliente: cliente?.nome_razao_social || "—",
            cidade_uf: [cliente?.cidade, cliente?.uf].filter(Boolean).join("/") || "—",
            transportadora: transportadoraMap.get(remessa?.transportadora_id || "") || "—",
            volumes: Number(remessa?.volumes || 0),
            peso_total: Number(remessa?.peso || pesoQtd.peso || 0),
            previsao_envio: ov.data_prometida_despacho,
            previsao_entrega: remessa?.previsao_entrega || null,
            data_expedicao: remessa?.data_postagem || null,
            status_logistico: remessa?.status_transporte || "aguardando_separacao",
            responsavel: ov.usuario_id || "—",
            codigo_rastreio: remessa?.codigo_rastreio || null,
          };
        });

        const fornecedorMap = new Map((fornecedoresRes.data || []).map((f) => [f.id, f.nome_razao_social]));
        const qtyByCompra = new Map<string, number>();
        (itensCompraRes.data || []).forEach((item) => {
          qtyByCompra.set(item.pedido_compra_id, (qtyByCompra.get(item.pedido_compra_id) || 0) + Number(item.quantidade || 0));
        });

        const qtdRecebidaByCompra = new Map<string, number>();
        (remessasRes.data || [])
          .filter((item) => item && item.status_transporte === "entregue")
          .forEach((item) => {
            if (!item.id) return;
          });

        const recebimentoRows: Recebimento[] = (comprasRes.data || []).map((compra) => {
          const qtdPedida = qtyByCompra.get(compra.id) || 0;
          const qtdRecebida = compra.data_entrega_real ? qtdPedida : 0;
          const pendencia = Math.max(0, qtdPedida - qtdRecebida);
          return {
            id: compra.id,
            numero_compra: compra.numero,
            fornecedor: fornecedorMap.get(compra.fornecedor_id || "") || "—",
            previsao_entrega: compra.data_entrega_prevista,
            data_recebimento: compra.data_entrega_real,
            quantidade_pedida: qtdPedida,
            quantidade_recebida: qtdRecebidaByCompra.get(compra.id) || qtdRecebida,
            pendencia,
            status_logistico: compra.data_entrega_real
              ? (pendencia > 0 ? "recebimento_parcial" : "recebido")
              : (compra.status || "pedido_emitido"),
            nf_vinculada: null,
            responsavel: compra.usuario_id || "—",
          };
        });

        setEntregas(entregaRows);
        setRecebimentos(recebimentoRows);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const updateEntregaStatus = async (entrega: Entrega, status: string) => {
    if (!canEdit) return;
    const { data: remessa } = await supabase.from("remessas").select("id").eq("ordem_venda_id", entrega.id).maybeSingle();
    if (!remessa?.id) {
      toast.warning("Nenhuma remessa encontrada para o pedido.");
      return;
    }
    const { error } = await supabase.from("remessas").update({ status_transporte: status }).eq("id", remessa.id);
    if (error) {
      toast.error("Não foi possível atualizar o status da entrega.");
      return;
    }
    setEntregas((prev) => prev.map((item) => item.id === entrega.id ? { ...item, status_logistico: status } : item));
  };

  const updateRecebimentoStatus = async (recebimento: Recebimento, status: string) => {
    if (!canEdit) return;
    const payload: Record<string, unknown> = { status };
    if (status === "recebido") payload.data_entrega_real = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("pedidos_compra").update(payload).eq("id", recebimento.id);
    if (error) {
      toast.error("Não foi possível atualizar o status do recebimento.");
      return;
    }
    setRecebimentos((prev) => prev.map((item) => item.id === recebimento.id ? { ...item, status_logistico: status } : item));
  };

  const entregaColumns = [
    { key: "numero_pedido", label: "Pedido", render: (item: Entrega) => <span className="font-medium">{item.numero_pedido}</span> },
    { key: "cliente", label: "Cliente" },
    { key: "cidade_uf", label: "Cidade/UF" },
    { key: "transportadora", label: "Transportadora" },
    { key: "volumes", label: "Volumes", render: (item: Entrega) => formatNumber(item.volumes || 0) },
    { key: "peso_total", label: "Peso", render: (item: Entrega) => `${formatNumber(item.peso_total || 0)} kg` },
    { key: "previsao_envio", label: "Prev. Envio", render: (item: Entrega) => item.previsao_envio || "—" },
    { key: "previsao_entrega", label: "Prev. Entrega", render: (item: Entrega) => item.previsao_entrega || "—" },
    { key: "status_logistico", label: "Status", render: (item: Entrega) => <StatusBadge status="pendente" label={statusLabel(item.status_logistico)} /> },
    {
      key: "acoes",
      label: "Ações",
      render: (item: Entrega) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setSelectedEntrega(item)}>
            <Eye className="h-3.5 w-3.5" />Ver entrega
          </Button>
          {canEdit ? (
            <Select value={item.status_logistico} onValueChange={(value) => updateEntregaStatus(item, value)}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {entregaStatusOptions.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : <span className="text-xs text-muted-foreground">Somente visualização</span>}
        </div>
      ),
    },
  ];

  const recebimentosColumns = [
    { key: "numero_compra", label: "Compra", render: (item: Recebimento) => <span className="font-medium">{item.numero_compra}</span> },
    { key: "fornecedor", label: "Fornecedor" },
    { key: "previsao_entrega", label: "Prev. Entrega", render: (item: Recebimento) => item.previsao_entrega || "—" },
    { key: "data_recebimento", label: "Recebido em", render: (item: Recebimento) => item.data_recebimento || "—" },
    { key: "quantidade_pedida", label: "Qtd. Pedida", render: (item: Recebimento) => formatNumber(item.quantidade_pedida) },
    { key: "quantidade_recebida", label: "Qtd. Recebida", render: (item: Recebimento) => formatNumber(item.quantidade_recebida) },
    { key: "pendencia", label: "Pendência", render: (item: Recebimento) => formatNumber(item.pendencia) },
    { key: "status_logistico", label: "Status", render: (item: Recebimento) => <StatusBadge status="pendente" label={statusLabel(item.status_logistico)} /> },
    {
      key: "acoes",
      label: "Ações",
      render: (item: Recebimento) => canEdit ? (
        <Select value={item.status_logistico} onValueChange={(value) => updateRecebimentoStatus(item, value)}>
          <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {recebimentoStatusOptions.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : <span className="text-xs text-muted-foreground">Somente visualização</span>,
    },
  ];

  return (
    <AppLayout>
      <ModulePage title="Logística" subtitle="Acompanhamento operacional de entregas e recebimentos." addLabel={canEdit ? "Atualizar painel" : undefined} onAdd={canEdit ? () => window.location.reload() : undefined}>
        {!canEdit && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
            Seu acesso em Logística está em modo de visualização. Solicite ao administrador permissão de edição.
          </div>
        )}
        <Tabs defaultValue="entregas" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="entregas">Entregas</TabsTrigger>
            <TabsTrigger value="recebimentos">Recebimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="entregas">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/pedidos"}>Abrir pedidos</Button>
            </div>
            <DataTable columns={entregaColumns} data={entregas} loading={loading} moduleKey="logistica-entregas" />
          </TabsContent>

          <TabsContent value="recebimentos">
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/pedidos-compra"}>Abrir pedidos de compra</Button>
            </div>
            <DataTable columns={recebimentosColumns} data={recebimentos} loading={loading} moduleKey="logistica-recebimentos" />
          </TabsContent>
        </Tabs>
      </ModulePage>

      <EntregaDrawer
        open={!!selectedEntrega}
        onClose={() => setSelectedEntrega(null)}
        entrega={selectedEntrega}
      />
    </AppLayout>
  );
}
