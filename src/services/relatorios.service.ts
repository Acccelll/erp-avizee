import { supabase } from "@/integrations/supabase/client";
import { downloadTextFile } from "@/lib/utils";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export type TipoRelatorio = "estoque" | "movimentos_estoque" | "financeiro" | "fluxo_caixa" | "vendas" | "compras" | "aging" | "dre";

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
  _isDreReport?: boolean;
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
      const { data, error } = await supabase
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
      let query = supabase
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
      let query = supabase
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
      let query = supabase
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

      const totalEntradas = rows.reduce((s, r) => s + r.entrada, 0);
      const totalSaidas = rows.reduce((s, r) => s + r.saida, 0);
      const saldoFinal = rows.length > 0 ? rows[rows.length - 1].saldo : 0;

      return {
        title: "Fluxo de caixa",
        subtitle: "Entradas, saídas e saldo acumulado por período.",
        rows,
        chartData: rows.slice(0, 12).map((row: any) => ({
          name: row.data ? formatDate(row.data) : "-",
          value: row.saldo,
        })),
        totals: {
          totalEntradas,
          totalSaidas,
          saldoFinal,
        },
      };
    }

    case "vendas": {
      let query = supabase
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

    case "compras": {
      let query = supabase
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

    case "dre": {
      let receitaQuery = supabase
        .from("financeiro_lancamentos")
        .select("valor")
        .eq("ativo", true)
        .eq("tipo", "receber")
        .eq("status", "pago");
      receitaQuery = withDateRange(receitaQuery, "data_pagamento", filtros);

      let pagosQuery = supabase
        .from("financeiro_lancamentos")
        .select("valor, descricao, nota_fiscal_id")
        .eq("ativo", true)
        .eq("tipo", "pagar")
        .eq("status", "pago");
      pagosQuery = withDateRange(pagosQuery, "data_pagamento", filtros);

      let nfSaidaQuery = supabase
        .from("notas_fiscais")
        .select("icms_valor, pis_valor, cofins_valor, ipi_valor")
        .eq("ativo", true)
        .eq("tipo", "saida");
      nfSaidaQuery = withDateRange(nfSaidaQuery, "data_emissao", filtros);

      const [{ data: receitas }, { data: pagos }, { data: nfSaida }] = await Promise.all([
        receitaQuery, pagosQuery, nfSaidaQuery,
      ]);

      if (!receitas && !pagos && !nfSaida) throw new Error("Erro ao carregar dados do DRE");

      const receitaBruta = (receitas || []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);

      const deducoes = (nfSaida || []).reduce((s: number, nf: any) => {
        return s + Number(nf.icms_valor || 0) + Number(nf.pis_valor || 0) + Number(nf.cofins_valor || 0) + Number(nf.ipi_valor || 0);
      }, 0);

      const receitaLiquida = receitaBruta - deducoes;

      const cmv = (pagos || []).filter((p: any) =>
        p.nota_fiscal_id || (p.descricao || "").toLowerCase().includes("compra")
      ).reduce((s: number, p: any) => s + Number(p.valor || 0), 0);

      const despesasOp = (pagos || []).filter((p: any) =>
        !p.nota_fiscal_id && !(p.descricao || "").toLowerCase().includes("compra")
      ).reduce((s: number, p: any) => s + Number(p.valor || 0), 0);

      const resultado = receitaLiquida - cmv - despesasOp;

      const rows = [
        { linha: "Receita Bruta", valor: receitaBruta, tipo: "header" },
        { linha: "(–) Deduções s/ Receita", valor: deducoes, tipo: "deducao" },
        { linha: "= Receita Líquida", valor: receitaLiquida, tipo: "subtotal" },
        { linha: "(–) CMV / CPV", valor: cmv, tipo: "deducao" },
        { linha: "= Lucro Bruto", valor: receitaLiquida - cmv, tipo: "subtotal" },
        { linha: "(–) Despesas Operacionais", valor: despesasOp, tipo: "deducao" },
        { linha: "= Resultado do Exercício", valor: resultado, tipo: "resultado" },
      ];

      return {
        title: "DRE — Demonstrativo de Resultado",
        subtitle: "Receitas, deduções, custos e resultado do exercício.",
        rows,
        chartData: [
          { name: "Receita Bruta", value: receitaBruta },
          { name: "Deduções", value: deducoes },
          { name: "CMV", value: cmv },
          { name: "Despesas", value: despesasOp },
          { name: "Resultado", value: Math.max(0, resultado) },
        ],
        totals: {
          receitaBruta,
          receitaLiquida,
          resultado,
        },
        _isDreReport: true,
      };
    }

    case "aging":
    default: {
      const { data, error } = await supabase
        .from("financeiro_lancamentos")
        .select("tipo, descricao, valor, status, data_vencimento, data_pagamento, clientes(nome_razao_social), fornecedores(nome_razao_social)")
        .eq("ativo", true)
        .in("status", ["aberto", "vencido"])
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const rows = (data || []).map((item: any) => {
        const venc = new Date(item.data_vencimento);
        const diffDays = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
        let faixa = "A vencer";
        if (diffDays > 0 && diffDays <= 30) faixa = "1-30 dias";
        else if (diffDays > 30 && diffDays <= 60) faixa = "31-60 dias";
        else if (diffDays > 60 && diffDays <= 90) faixa = "61-90 dias";
        else if (diffDays > 90) faixa = "90+ dias";

        return {
          tipo: item.tipo === "receber" ? "Receber" : "Pagar",
          descricao: item.descricao || "-",
          parceiro: item.tipo === "receber"
            ? item.clientes?.nome_razao_social || "-"
            : item.fornecedores?.nome_razao_social || "-",
          valor: Number(item.valor || 0),
          vencimento: item.data_vencimento,
          diasVencido: diffDays > 0 ? diffDays : 0,
          faixa,
        };
      });

      const faixas = ["A vencer", "1-30 dias", "31-60 dias", "61-90 dias", "90+ dias"];
      const chartData = faixas.map((f) => ({
        name: f,
        value: rows.filter((r) => r.faixa === f).reduce((s, r) => s + r.valor, 0),
      }));

      return {
        title: "Aging — Vencidos por faixa",
        subtitle: "Títulos a pagar e receber agrupados por faixa de vencimento.",
        rows,
        chartData,
        totals: {
          totalTitulos: rows.length,
          totalValor: rows.reduce((s, r) => s + r.valor, 0),
        },
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

export async function exportarXlsx(title: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${title}.xlsx`);
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
