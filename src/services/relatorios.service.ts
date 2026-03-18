import { supabase } from "@/integrations/supabase/client";
import { downloadTextFile } from "@/lib/utils";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export type TipoRelatorio = "estoque" | "financeiro" | "fluxo_caixa" | "vendas" | "compras";

export interface FiltroRelatorio {
  dataInicio?: string;
  dataFim?: string;
}

export interface RelatorioResultado<T = Record<string, unknown>> {
  title: string;
  subtitle: string;
  rows: T[];
  chartData?: Array<{ name: string; value: number }>;
}

function withDateRange(query: any, column: string, filtros: FiltroRelatorio) {
  let next = query;

  if (filtros.dataInicio) {
    next = next.gte(column, filtros.dataInicio);
  }

  if (filtros.dataFim) {
    next = next.lte(column, filtros.dataFim);
  }

  return next;
}

export async function carregarRelatorio(tipo: TipoRelatorio, filtros: FiltroRelatorio = {}): Promise<RelatorioResultado> {
  switch (tipo) {
    case "estoque": {
      const { data, error } = await (supabase as any)
        .from("produtos")
        .select("codigo_interno, nome, unidade_medida, estoque_atual, estoque_minimo, preco_custo, preco_venda")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;

      const rows = (data || []).map((item: any) => ({
        codigo: item.codigo_interno || "-",
        produto: item.nome,
        unidade: item.unidade_medida || "UN",
        estoqueAtual: Number(item.estoque_atual || 0),
        estoqueMinimo: Number(item.estoque_minimo || 0),
        custo: Number(item.preco_custo || 0),
        venda: Number(item.preco_venda || 0),
        situacao: Number(item.estoque_atual || 0) <= Number(item.estoque_minimo || 0) ? "Abaixo do mínimo" : "OK",
      }));

      return {
        title: "Posição de estoque",
        subtitle: "Saldo atual, custo, venda e alerta de mínimo.",
        rows,
        chartData: [
          { name: "Abaixo do mínimo", value: rows.filter((row) => row.situacao !== "OK").length },
          { name: "Estoque OK", value: rows.filter((row) => row.situacao === "OK").length },
        ],
      };
    }

    case "financeiro": {
      let query = (supabase as any)
        .from("financeiro_lancamentos")
        .select("tipo, descricao, valor, status, data_vencimento, data_pagamento, banco, forma_pagamento")
        .eq("ativo", true)
        .order("data_vencimento", { ascending: true });

      query = withDateRange(query, "data_vencimento", filtros);
      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((item: any) => ({
        tipo: item.tipo,
        descricao: item.descricao || "-",
        valor: Number(item.valor || 0),
        status: item.status || "-",
        vencimento: item.data_vencimento,
        pagamento: item.data_pagamento,
        banco: item.banco || "-",
        formaPagamento: item.forma_pagamento || "-",
      }));

      return {
        title: "Contas a pagar e receber",
        subtitle: "Títulos financeiros por tipo, status e vencimento.",
        rows,
        chartData: [
          { name: "Receber", value: rows.filter((row) => row.tipo === "receber").reduce((sum, row) => sum + row.valor, 0) },
          { name: "Pagar", value: rows.filter((row) => row.tipo === "pagar").reduce((sum, row) => sum + row.valor, 0) },
        ],
      };
    }

    case "fluxo_caixa": {
      let query = (supabase as any)
        .from("financeiro_lancamentos")
        .select("tipo, descricao, valor, status, data_vencimento, data_pagamento")
        .eq("ativo", true)
        .order("data_vencimento", { ascending: true });

      query = withDateRange(query, "data_vencimento", filtros);
      const { data, error } = await query;
      if (error) throw error;

      let saldo = 0;
      const rows = (data || []).map((item: any) => {
        const valor = Number(item.valor || 0);
        saldo += item.tipo === "receber" ? valor : -valor;

        return {
          data: item.data_pagamento || item.data_vencimento,
          descricao: item.descricao || "-",
          tipo: item.tipo,
          status: item.status || "-",
          entrada: item.tipo === "receber" ? valor : 0,
          saida: item.tipo === "pagar" ? valor : 0,
          saldo,
        };
      });

      return {
        title: "Fluxo de caixa",
        subtitle: "Entradas, saídas e saldo acumulado por período.",
        rows,
        chartData: rows.slice(0, 12).map((row: any) => ({
          name: row.data ? formatDate(row.data) : "-",
          value: row.saldo,
        })),
      };
    }

    case "vendas": {
      let query = (supabase as any)
        .from("ordens_venda")
        .select("numero, data_emissao, valor_total, status, status_faturamento, clientes(nome_razao_social)")
        .eq("ativo", true)
        .order("data_emissao", { ascending: false });

      query = withDateRange(query, "data_emissao", filtros);
      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((item: any) => ({
        numero: item.numero,
        cliente: item.clientes?.nome_razao_social || "-",
        emissao: item.data_emissao,
        valor: Number(item.valor_total || 0),
        status: item.status || "-",
        faturamento: item.status_faturamento || "-",
      }));

      return {
        title: "Vendas por período",
        subtitle: "Ordens de venda emitidas com status comercial e faturamento.",
        rows,
        chartData: [
          { name: "Aguardando", value: rows.filter((row) => row.faturamento === "aguardando").reduce((sum, row) => sum + row.valor, 0) },
          { name: "Parcial", value: rows.filter((row) => row.faturamento === "parcial").reduce((sum, row) => sum + row.valor, 0) },
          { name: "Total", value: rows.filter((row) => row.faturamento === "total").reduce((sum, row) => sum + row.valor, 0) },
        ],
      };
    }

    case "compras":
    default: {
      let query = (supabase as any)
        .from("compras")
        .select("numero, data_compra, data_entrega_prevista, data_entrega_real, valor_total, status, fornecedores(nome_razao_social)")
        .eq("ativo", true)
        .order("data_compra", { ascending: false });

      query = withDateRange(query, "data_compra", filtros);
      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((item: any) => ({
        numero: item.numero,
        fornecedor: item.fornecedores?.nome_razao_social || "-",
        compra: item.data_compra,
        prevista: item.data_entrega_prevista,
        entrega: item.data_entrega_real,
        valor: Number(item.valor_total || 0),
        status: item.status || "-",
      }));

      return {
        title: "Compras por fornecedor",
        subtitle: "Pedidos de compra emitidos, entregas e valor total.",
        rows,
        chartData: rows.slice(0, 8).map((row: any) => ({
          name: row.fornecedor,
          value: row.valor,
        })),
      };
    }
  }
}

export function exportarCsv(title: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    downloadTextFile(`${title}.csv`, "Sem dados para exportação");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => formatCsvValue(row[header])).join(";")),
  ].join("\n");

  downloadTextFile(`${title}.csv`, csv, "text/csv;charset=utf-8");
}

function formatCsvValue(value: unknown) {
  if (typeof value === "number") return value.toString().replace(".", ",");
  if (value == null) return "";
  return `"${String(value).split('"').join('""')}"`;
}

export function formatCellValue(value: unknown, key: string) {
  if (typeof value === "number") {
    if (["valor", "custo", "venda", "saldo", "entrada", "saida"].some((field) => key.toLowerCase().includes(field))) {
      return formatCurrency(value);
    }

    return formatNumber(value);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return formatDate(value);
  }

  return value ?? "-";
}
