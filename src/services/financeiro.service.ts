import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BaixaLoteParams {
  selectedIds: string[];
  selectedLancamentos: Array<{ id: string; valor: number; saldo_restante: number | null }>;
  tipoBaixa: "total" | "parcial";
  valorPagoBaixa: number;
  totalBaixa: number;
  baixaDate: string;
  formaPagamento: string;
  contaBancariaId: string;
}

export async function processarBaixaLote(params: BaixaLoteParams): Promise<boolean> {
  const { selectedIds, selectedLancamentos, tipoBaixa, valorPagoBaixa, totalBaixa, baixaDate, formaPagamento, contaBancariaId } = params;

  try {
    if (tipoBaixa === "total") {
      for (const id of selectedIds) {
        const l = selectedLancamentos.find(x => x.id === id);
        const valor = l ? Number(l.saldo_restante != null ? l.saldo_restante : l.valor) : 0;
        await supabase.from("financeiro_lancamentos").update({
          status: "pago", data_pagamento: baixaDate,
          valor_pago: valor, tipo_baixa: "total",
          forma_pagamento: formaPagamento,
          conta_bancaria_id: contaBancariaId,
          saldo_restante: 0,
        } as any).eq("id", id);
        await supabase.from("financeiro_baixas" as any).insert({
          lancamento_id: id, valor_pago: valor,
          data_baixa: baixaDate, forma_pagamento: formaPagamento,
          conta_bancaria_id: contaBancariaId,
        });
      }
      toast.success(`${selectedIds.length} lançamento(s) baixado(s) integralmente!`);
    } else {
      const ratio = valorPagoBaixa / totalBaixa;
      for (const id of selectedIds) {
        const l = selectedLancamentos.find(x => x.id === id);
        const saldo = l ? Number(l.saldo_restante != null ? l.saldo_restante : l.valor) : 0;
        const pagoParcial = Math.round(saldo * ratio * 100) / 100;
        const novoSaldo = Math.max(0, saldo - pagoParcial);
        const novoStatus = novoSaldo <= 0.01 ? "pago" : "parcial";
        await supabase.from("financeiro_lancamentos").update({
          status: novoStatus,
          data_pagamento: novoStatus === "pago" ? baixaDate : null,
          valor_pago: pagoParcial, tipo_baixa: "parcial",
          forma_pagamento: formaPagamento,
          conta_bancaria_id: contaBancariaId,
          saldo_restante: novoSaldo,
        } as any).eq("id", id);
        await supabase.from("financeiro_baixas" as any).insert({
          lancamento_id: id, valor_pago: pagoParcial,
          data_baixa: baixaDate, forma_pagamento: formaPagamento,
          conta_bancaria_id: contaBancariaId,
        });
      }
      toast.success(`Baixa parcial registrada para ${selectedIds.length} lançamento(s)!`);
    }
    return true;
  } catch {
    toast.error("Erro ao processar baixa em lote");
    return false;
  }
}

export async function processarEstorno(lancamentoId: string): Promise<boolean> {
  try {
    await supabase.from("financeiro_lancamentos").update({
      status: "aberto", data_pagamento: null,
      valor_pago: null, tipo_baixa: null,
      saldo_restante: null,
    } as any).eq("id", lancamentoId);
    await supabase.from("financeiro_baixas").delete().eq("lancamento_id", lancamentoId);
    await supabase.from("financeiro_lancamentos").update({ ativo: false } as any).eq("documento_pai_id", lancamentoId);
    toast.success("Estorno realizado com sucesso!");
    return true;
  } catch {
    toast.error("Erro ao estornar");
    return false;
  }
}

export function getEffectiveStatus(status: string, dataVencimento: string, hoje: Date): string {
  const s = (status || "").toLowerCase();
  if (s === "aberto" && dataVencimento) {
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    if (vencimento < hoje) return "vencido";
  }
  return s || "aberto";
}
