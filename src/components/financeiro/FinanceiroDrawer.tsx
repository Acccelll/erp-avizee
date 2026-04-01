import { ViewDrawerV2, ViewField, ViewSection } from "@/components/ViewDrawerV2";
import { StatusBadge } from "@/components/StatusBadge";
import { RelationalLink } from "@/components/ui/RelationalLink";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CreditCard, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Lancamento {
  id: string; tipo: string; descricao: string; valor: number;
  data_vencimento: string; data_pagamento: string; status: string;
  forma_pagamento: string; banco: string; cartao: string;
  cliente_id: string; fornecedor_id: string; nota_fiscal_id: string;
  conta_bancaria_id: string; conta_contabil_id: string;
  parcela_numero: number; parcela_total: number;
  documento_pai_id: string; saldo_restante: number | null;
  observacoes: string; ativo: boolean;
  clientes?: { nome_razao_social: string };
  fornecedores?: { nome_razao_social: string };
  contas_bancarias?: { descricao: string; bancos?: { nome: string } };
  contas_contabeis?: { codigo: string; descricao: string };
}

interface FinanceiroDrawerProps {
  open: boolean;
  onClose: () => void;
  selected: Lancamento | null;
  effectiveStatus: string;
  onBaixa: (l: Lancamento) => void;
  onEstorno: (l: Lancamento) => void;
  onEdit: (l: Lancamento) => void;
  onDelete: (id: string) => void;
}

export function FinanceiroDrawer({ open, onClose, selected, effectiveStatus, onBaixa, onEstorno, onEdit, onDelete }: FinanceiroDrawerProps) {
  if (!selected) return <ViewDrawerV2 open={open} onClose={onClose} title="" />;

  const canBaixa = effectiveStatus !== "pago" && effectiveStatus !== "cancelado";
  const canEstorno = effectiveStatus === "pago" || effectiveStatus === "parcial";

  return (
    <ViewDrawerV2
      open={open}
      onClose={onClose}
      title="Detalhes do Lançamento"
      actions={
        <>
          {canBaixa && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => onBaixa(selected)}><CreditCard className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Registrar Baixa</TooltipContent></Tooltip>
          )}
          {canEstorno && (
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-warning hover:text-warning" onClick={() => { onClose(); onEstorno(selected); }}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Estornar Baixa</TooltipContent></Tooltip>
          )}
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { onClose(); onEdit(selected); }}><Edit className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Editar</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { onClose(); onDelete(selected.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Excluir</TooltipContent></Tooltip>
        </>
      }
      badge={<StatusBadge status={effectiveStatus} />}
      tabs={[
        { value: "dados", label: "Dados", content: (
          <div className="space-y-4">
            <ViewSection title="Informações gerais">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Tipo">
                  <Badge variant="outline" className={selected.tipo === "receber" ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}>
                    {selected.tipo === "receber" ? "A Receber" : "A Pagar"}
                  </Badge>
                </ViewField>
                <ViewField label="Status"><StatusBadge status={effectiveStatus} /></ViewField>
              </div>
              <ViewField label="Descrição">{selected.descricao}</ViewField>
            </ViewSection>
            <ViewSection title="Valores e datas">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Valor"><span className="font-semibold mono">{formatCurrency(Number(selected.valor))}</span></ViewField>
                <ViewField label="Saldo Restante">
                  <span className="font-semibold mono">
                    {formatCurrency(selected.saldo_restante != null ? Number(selected.saldo_restante) : Number(selected.valor))}
                  </span>
                </ViewField>
                <ViewField label="Vencimento">{new Date(selected.data_vencimento).toLocaleDateString("pt-BR")}</ViewField>
              </div>
              {selected.data_pagamento && (
                <ViewField label="Data Pagamento">{new Date(selected.data_pagamento).toLocaleDateString("pt-BR")}</ViewField>
              )}
            </ViewSection>
          </div>
        )},
        { value: "detalhes", label: "Detalhes", content: (
          <div className="space-y-4">
            <ViewSection title="Pagamento">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Forma">{selected.forma_pagamento || "—"}</ViewField>
                <ViewField label="Banco/Conta">
                  {selected.contas_bancarias ? (
                    <RelationalLink to="/contas-bancarias">{selected.contas_bancarias.bancos?.nome} - {selected.contas_bancarias.descricao}</RelationalLink>
                  ) : "—"}
                </ViewField>
              </div>
              {selected.parcela_numero && (
                <ViewField label="Parcela"><span className="mono">{selected.parcela_numero}/{selected.parcela_total}</span></ViewField>
              )}
            </ViewSection>
            <ViewSection title="Vínculos">
              <div className="grid grid-cols-2 gap-4">
                <ViewField label="Parceiro">
                  {selected.tipo === "receber" && selected.clientes?.nome_razao_social ? (
                    <RelationalLink type="cliente" id={selected.cliente_id}>{selected.clientes.nome_razao_social}</RelationalLink>
                  ) : selected.tipo === "pagar" && selected.fornecedores?.nome_razao_social ? (
                    <RelationalLink type="fornecedor" id={selected.fornecedor_id}>{selected.fornecedores.nome_razao_social}</RelationalLink>
                  ) : "—"}
                </ViewField>
                {selected.nota_fiscal_id && (
                  <ViewField label="Origem"><RelationalLink type="nota_fiscal" id={selected.nota_fiscal_id}>NF vinculada</RelationalLink></ViewField>
                )}
              </div>
              {selected.contas_contabeis && (
                <ViewField label="Conta Contábil">
                  <RelationalLink to="/contas-contabeis">{selected.contas_contabeis.codigo} - {selected.contas_contabeis.descricao}</RelationalLink>
                </ViewField>
              )}
            </ViewSection>
            {selected.observacoes && (
              <ViewSection title="Observações">
                <p className="text-sm">{selected.observacoes}</p>
              </ViewSection>
            )}
          </div>
        )},
      ]}
    />
  );
}
