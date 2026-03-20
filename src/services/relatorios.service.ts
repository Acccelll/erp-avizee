import { supabase } from "@/integrations/supabase/client";
import { downloadTextFile } from "@/lib/utils";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export type TipoRelatorio = "estoque" | "movimentos_estoque" | "financeiro" | "fluxo_caixa" | "vendas" | "compras";

export interface FiltroRelatorio {
  dataInicio?: string;
  dataFim?: string;
}

export interface RelatorioResultado<T = Record<string, unknown>> {
  title: string;
  subtitle: string;
  rows: T[];
  chartData?: Array<{ name: string; value: number }>;
  totals?: Record<string, number>;
  _isQuantityReport?: boolean;
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

      const rows = (data || []).map((item: any) => {
        const qty = Number(item.estoque_atual || 0);
        const custo = Number(item.preco_custo || 0);
        const venda = Number(item.preco_venda || 0);
        return {
          codigo: item.codigo_interno || "-",
          produto: item.nome,
          unidade: item.unidade_medida || "UN",
          estoqueAtual: qty,
          estoqueMinimo: Number(item.estoque_minimo || 0),
          custoUnit: custo,
          vendaUnit: venda,
          totalCusto: qty * custo,
          totalVenda: qty * venda,
          situacao: qty <= Number(item.estoque_minimo || 0) ? "Abaixo do mínimo" : "OK",
        };
      });

      const totalQtd = rows.reduce((s, r) => s + r.estoqueAtual, 0);
      const totalCusto = rows.reduce((s, r) => s + r.totalCusto, 0);
      const totalVenda = rows.reduce((s, r) => s + r.totalVenda, 0);

      return {
        title: "Posição de estoque",
        subtitle: "Saldo atual, custo unitário, preço de venda e totalizadores.",
        rows,
        chartData: [
          { name: "Abaixo do mínimo", value: rows.filter((row) => row.situacao !== "OK").length },
          { name: "Estoque OK", value: rows.filter((row) => row.situacao === "OK").length },
        ],
        totals: {
          totalQtd,
          totalCusto,
          totalVenda,
        },
      };
    }

    case "movimentos_estoque": {
      let query = (supabase as any)
        .from("estoque_movimentos")
        .select("tipo, quantidade, saldo_anterior, saldo_atual, documento_tipo, motivo, created_at, produtos(nome, codigo_interno)")
        .order("created_at", { ascending: false });

      query = withDateRange(query, "created_at", filtros);
      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((item: any) => ({
        data: item.created_at,
        produto: item.produtos?.nome || "-",
        codigo: item.produtos?.codigo_interno || "-",
        tipo: item.tipo,
        quantidade: Number(item.quantidade || 0),
        saldoAnterior: Number(item.saldo_anterior || 0),
        saldoAtual: Number(item.saldo_atual || 0),
        documento: item.documento_tipo || "-",
        motivo: item.motivo || "-",
      }));

      const entradas = rows.filter((r) => r.tipo === "entrada").reduce((s, r) => s + r.quantidade, 0);
      const saidas = rows.filter((r) => r.tipo === "saida").reduce((s, r) => s + r.quantidade, 0);
      const ajustes = rows.filter((r) => r.tipo === "ajuste").reduce((s, r) => s + r.quantidade, 0);
      const saldoFinal = rows.length > 0 ? rows[0].saldoAtual : 0;

      return {
        title: "Movimentos de estoque",
        subtitle: "Entradas, saídas e ajustes de estoque no período.",
        rows,
        chartData: [
          { name: "Entradas", value: entradas },
          { name: "Saídas", value: Math.abs(saidas) },
          { name: "Ajustes", value: Math.abs(ajustes) },
        ],
        totals: {
          totalEntradas: entradas,
          totalSaidas: Math.abs(saidas),
          totalAjustes: Math.abs(ajustes),
          saldoAtual: saldoFinal,
        },
        _isQuantityReport: true,
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

export function formatCellValue(value: unknown, key: string, isQuantityReport = false) {
  if (typeof value === "number") {
    if (isQuantityReport) {
      return formatNumber(value);
    }
    if (["valor", "custo", "venda", "entrada", "saida"].some((field) => key.toLowerCase().includes(field))) {
      return formatCurrency(value);
    }

    return formatNumber(value);
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return formatDate(value);
  }

  return value ?? "-";
}
