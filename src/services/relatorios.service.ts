import { supabase } from "@/integrations/supabase/client";
import { downloadTextFile } from "@/lib/utils";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Tables } from "@/integrations/supabase/types";

export type TipoRelatorio = "estoque" | "movimentos_estoque" | "financeiro" | "fluxo_caixa" | "vendas" | "compras" | "aging" | "dre" | "curva_abc" | "margem_produtos" | "estoque_minimo" | "vendas_cliente" | "compras_fornecedor" | "divergencias" | "faturamento";

export interface FiltroRelatorio {
  dataInicio?: string;
  dataFim?: string;
  clienteId?: string;
  fornecedorId?: string;
  grupoProdutoId?: string;
  tipoFinanceiro?: string;
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
      let query = supabase
        .from("produtos")
        .select("codigo_interno, nome, unidade_medida, estoque_atual, estoque_minimo, preco_custo, preco_venda")
        .eq("ativo", true)
        .order("nome");
      if (filtros.grupoProdutoId) query = query.eq('grupo_id', filtros.grupoProdutoId);
      const { data, error } = await query;

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
      if (filtros.grupoProdutoId) query = query.eq('grupo_id', filtros.grupoProdutoId);
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
      if (filtros.tipoFinanceiro) query = query.eq('tipo', filtros.tipoFinanceiro);
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
      if (filtros.clienteId) query = query.eq('cliente_id', filtros.clienteId);
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

    case "faturamento": {
      let query = supabase
        .from("notas_fiscais")
        .select(`
          numero, serie, data_emissao, valor_total, modelo_documento,
          frete_valor, icms_valor, ipi_valor, pis_valor, cofins_valor,
          icms_st_valor, desconto_valor, outras_despesas,
          forma_pagamento, status,
          clientes(nome_razao_social),
          ordens_venda(numero)
        `)
        .eq("ativo", true)
        .eq("tipo", "saida")
        .eq("status", "confirmada")
        .order("data_emissao", { ascending: false });

      query = withDateRange(query, "data_emissao", filtros);
      if (filtros.clienteId) query = query.eq('cliente_id', filtros.clienteId);
      const { data, error } = await query;
      if (error) throw error;

      const modeloLabels: Record<string, string> = { '55': 'NF-e', '65': 'NFC-e', '57': 'CT-e', 'nfse': 'NFS-e' };

      const rows = (data || []).map((nf) => {
        const totalImpostos = Number(nf.icms_valor || 0) + Number(nf.ipi_valor || 0) +
          Number(nf.pis_valor || 0) + Number(nf.cofins_valor || 0) + Number(nf.icms_st_valor || 0);
        const valorTotal = Number(nf.valor_total || 0);
        const cliente = nf.clientes as { nome_razao_social: string } | null;
        const ov = nf.ordens_venda as { numero: string } | null;

        return {
          data: nf.data_emissao,
          nf: `${nf.numero}/${nf.serie || '1'}`,
          modelo: modeloLabels[nf.modelo_documento || '55'] || nf.modelo_documento || 'NF-e',
          cliente: cliente?.nome_razao_social || '—',
          ov: ov?.numero || '—',
          frete: Number(nf.frete_valor || 0),
          desconto: Number(nf.desconto_valor || 0),
          impostos: totalImpostos,
          valorTotal,
          receitaLiquida: valorTotal - totalImpostos,
        };
      });

      const totalBruto = rows.reduce((s, r) => s + r.valorTotal, 0);
      const totalImpostos = rows.reduce((s, r) => s + r.impostos, 0);
      const totalLiquido = rows.reduce((s, r) => s + r.receitaLiquida, 0);

      const byMonth = new Map<string, number>();
      rows.forEach(r => {
        const m = r.data.slice(0, 7);
        byMonth.set(m, (byMonth.get(m) || 0) + r.valorTotal);
      });

      return {
        title: "Faturamento",
        subtitle: "Notas fiscais de saída confirmadas — valor bruto, impostos e receita líquida.",
        rows,
        chartData: Array.from(byMonth.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, value]) => ({
            name: new Date(month + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            value,
          })),
        totals: { totalBruto, totalImpostos, totalLiquido },
      };
    }

    case "compras": {
      let query = supabase
        .from("compras")
        .select("numero, data_compra, data_entrega_prevista, data_entrega_real, valor_total, status, fornecedores(nome_razao_social)")
        .eq("ativo", true)
        .order("data_compra", { ascending: false });

      query = withDateRange(query, "data_compra", filtros);
      if (filtros.fornecedorId) query = query.eq('fornecedor_id', filtros.fornecedorId);
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
      let query = supabase
        .from("financeiro_lancamentos")
        .select("tipo, descricao, valor, status, data_vencimento, data_pagamento, clientes(nome_razao_social), fornecedores(nome_razao_social)")
        .eq("ativo", true)
        .in("status", ["aberto", "vencido"])
        .order("data_vencimento", { ascending: true });
      query = withDateRange(query, "data_vencimento", filtros);
      if (filtros.clienteId) query = query.eq('cliente_id', filtros.clienteId);
      if (filtros.tipoFinanceiro) query = query.eq('tipo', filtros.tipoFinanceiro);
      const { data, error } = await query;

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

    case "curva_abc": {
      let nfQuery = supabase
        .from("notas_fiscais_itens")
        .select(`
          produto_id,
          quantidade,
          valor_unitario,
          produtos(nome, codigo_interno),
          notas_fiscais!inner(ativo, tipo, status, data_emissao)
        `)
        .eq("notas_fiscais.ativo", true)
        .eq("notas_fiscais.tipo", "saida")
        .eq("notas_fiscais.status", "confirmada");

      nfQuery = withDateRange(nfQuery, "notas_fiscais.data_emissao", filtros);
      if (filtros.clienteId) nfQuery = nfQuery.eq('notas_fiscais.cliente_id', filtros.clienteId);

      const { data, error } = await nfQuery;
      if (error) throw error;

      const prodMap = new Map<string, { produto: string; codigo: string; total: number }>();
      for (const item of data || []) {
        const key = item.produto_id || "sem-produto";
        const nome = (item.produtos as any)?.nome || "Produto removido";
        const codigo = (item.produtos as any)?.codigo_interno || "-";
        const existing = prodMap.get(key) || { produto: nome, codigo, total: 0 };
        const itemTotal = Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
        existing.total += itemTotal;
        prodMap.set(key, existing);
      }

      const sorted = Array.from(prodMap.values()).sort((a, b) => b.total - a.total);
      const grandTotal = sorted.reduce((s, r) => s + r.total, 0);

      let acumulado = 0;
      const rows = sorted.map((item, i) => {
        acumulado += item.total;
        const pctAcum = grandTotal > 0 ? (acumulado / grandTotal) * 100 : 0;
        const classe = pctAcum <= 80 ? 'A' : pctAcum <= 95 ? 'B' : 'C';
        return {
          posicao: i + 1,
          codigo: item.codigo,
          produto: item.produto,
          faturamento: item.total,
          percentual: grandTotal > 0 ? ((item.total / grandTotal) * 100) : 0,
          acumulado: pctAcum,
          classe,
        };
      });

      const classA = rows.filter(r => r.classe === 'A');
      const classB = rows.filter(r => r.classe === 'B');
      const classC = rows.filter(r => r.classe === 'C');

      return {
        title: "Curva ABC de Produtos",
        subtitle: "Classificação por faturamento real — notas fiscais de saída confirmadas.",
        rows,
        chartData: [
          { name: `A (${classA.length} itens)`, value: classA.reduce((s, r) => s + r.faturamento, 0) },
          { name: `B (${classB.length} itens)`, value: classB.reduce((s, r) => s + r.faturamento, 0) },
          { name: `C (${classC.length} itens)`, value: classC.reduce((s, r) => s + r.faturamento, 0) },
        ],
        totals: { grandTotal },
      };
    }

    case "margem_produtos": {
      let query = supabase
        .from("produtos")
        .select("codigo_interno, nome, preco_custo, preco_venda, estoque_atual, unidade_medida")
        .eq("ativo", true)
        .order("nome");
      if (filtros.grupoProdutoId) query = query.eq('grupo_id', filtros.grupoProdutoId);
      const { data, error } = await query;

      if (error) throw error;

      const rows = (data || []).map((item: any) => {
        const custo = Number(item.preco_custo || 0);
        const venda = Number(item.preco_venda || 0);
        const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;
        const markup = custo > 0 ? ((venda - custo) / custo) * 100 : 0;
        return {
          codigo: item.codigo_interno || "-",
          produto: item.nome,
          unidade: item.unidade_medida || "UN",
          custUnit: custo,
          vendaUnit: venda,
          lucroUnit: venda - custo,
          margem: Number(margem.toFixed(1)),
          markup: Number(markup.toFixed(1)),
          estoque: Number(item.estoque_atual || 0),
        };
      });

      const sorted = [...rows].sort((a, b) => b.margem - a.margem);

      return {
        title: "Análise de Margem de Produtos",
        subtitle: "Margem e markup por produto ativo.",
        rows: sorted,
        chartData: sorted.slice(0, 8).map(r => ({
          name: r.produto.substring(0, 20),
          value: r.margem,
        })),
        totals: {
          mediaMargemPct: rows.length > 0 ? Number((rows.reduce((s, r) => s + r.margem, 0) / rows.length).toFixed(1)) : 0,
        },
      };
    }

    case "estoque_minimo": {
      const { data, error } = await supabase
        .from("produtos")
        .select("codigo_interno, nome, unidade_medida, estoque_atual, estoque_minimo, preco_custo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;

      const rows = (data || [])
        .filter((p: any) => Number(p.estoque_atual || 0) <= Number(p.estoque_minimo || 0) && Number(p.estoque_minimo || 0) > 0)
        .map((p: any) => ({
          codigo: p.codigo_interno || "-",
          produto: p.nome,
          unidade: p.unidade_medida || "UN",
          estoqueAtual: Number(p.estoque_atual || 0),
          estoqueMinimo: Number(p.estoque_minimo || 0),
          deficit: Number(p.estoque_minimo || 0) - Number(p.estoque_atual || 0),
          custoReposicao: (Number(p.estoque_minimo || 0) - Number(p.estoque_atual || 0)) * Number(p.preco_custo || 0),
        }));

      return {
        title: "Estoque Abaixo do Mínimo",
        subtitle: "Produtos com estoque atual igual ou inferior ao mínimo definido.",
        rows,
        chartData: rows.slice(0, 8).map(r => ({ name: r.produto.substring(0, 20), value: r.deficit })),
        totals: { totalItens: rows.length, custoTotal: rows.reduce((s, r) => s + r.custoReposicao, 0) },
        _isQuantityReport: true,
      };
    }

    case "vendas_cliente": {
      let query = supabase
        .from("ordens_venda")
        .select("valor_total, clientes(nome_razao_social, cpf_cnpj)")
        .eq("ativo", true);
      query = withDateRange(query, "data_emissao", filtros);
      if (filtros.clienteId) query = query.eq('cliente_id', filtros.clienteId);
      const { data, error } = await query;
      if (error) throw error;

      const map = new Map<string, { cliente: string; cnpj: string; total: number; qtd: number }>();
      for (const ov of data || []) {
        const c = ov.clientes as { nome_razao_social: string; cpf_cnpj: string | null } | null;
        const nome = c?.nome_razao_social || "Sem cliente";
        const key = nome;
        const existing = map.get(key) || { cliente: nome, cnpj: c?.cpf_cnpj || "-", total: 0, qtd: 0 };
        existing.total += Number(ov.valor_total || 0);
        existing.qtd += 1;
        map.set(key, existing);
      }

      const rows = Array.from(map.values()).sort((a, b) => b.total - a.total).map((r, i) => ({
        posicao: i + 1, cliente: r.cliente, cnpj: r.cnpj, pedidos: r.qtd, valorTotal: r.total,
        ticketMedio: r.qtd > 0 ? r.total / r.qtd : 0,
      }));

      return {
        title: "Vendas por Cliente",
        subtitle: "Ranking de clientes por volume de vendas.",
        rows,
        chartData: rows.slice(0, 8).map(r => ({ name: r.cliente.substring(0, 20), value: r.valorTotal })),
      };
    }

    case "compras_fornecedor": {
      let query = supabase
        .from("compras")
        .select("valor_total, fornecedores(nome_razao_social, cpf_cnpj)")
        .eq("ativo", true);
      query = withDateRange(query, "data_compra", filtros);
      if (filtros.fornecedorId) query = query.eq('fornecedor_id', filtros.fornecedorId);
      const { data, error } = await query;
      if (error) throw error;

      const map = new Map<string, { fornecedor: string; cnpj: string; total: number; qtd: number }>();
      for (const c of data || []) {
        const f = c.fornecedores as { nome_razao_social: string; cpf_cnpj: string | null } | null;
        const nome = f?.nome_razao_social || "Sem fornecedor";
        const key = nome;
        const existing = map.get(key) || { fornecedor: nome, cnpj: f?.cpf_cnpj || "-", total: 0, qtd: 0 };
        existing.total += Number(c.valor_total || 0);
        existing.qtd += 1;
        map.set(key, existing);
      }

      const rows = Array.from(map.values()).sort((a, b) => b.total - a.total).map((r, i) => ({
        posicao: i + 1, fornecedor: r.fornecedor, cnpj: r.cnpj, pedidos: r.qtd, valorTotal: r.total,
        ticketMedio: r.qtd > 0 ? r.total / r.qtd : 0,
      }));

      return {
        title: "Compras por Fornecedor",
        subtitle: "Ranking de fornecedores por volume de compras.",
        rows,
        chartData: rows.slice(0, 8).map(r => ({ name: r.fornecedor.substring(0, 20), value: r.valorTotal })),
      };
    }

    case "divergencias": {
      // Pedidos de compra sem NF
      const { data: pedidos } = await supabase
        .from("pedidos_compra")
        .select("numero, fornecedor_id, valor_total, status, fornecedores(nome_razao_social)")
        .eq("ativo", true)
        .in("status", ["pendente", "aprovado"]);

      // Notas fiscais sem financeiro
      const { data: nfs } = await supabase
        .from("notas_fiscais")
        .select("id, numero, tipo, valor_total, data_emissao, fornecedor_id, cliente_id")
        .eq("ativo", true)
        .eq("gera_financeiro", true);

      const { data: financeiro } = await supabase
        .from("financeiro_lancamentos")
        .select("documento_fiscal_id, nota_fiscal_id")
        .eq("ativo", true);

      const nfIdsComFinanceiro = new Set(
        (financeiro || []).map((f) => f.documento_fiscal_id || f.nota_fiscal_id).filter(Boolean)
      );

      const nfsSemFinanceiro = (nfs || []).filter((nf) => !nfIdsComFinanceiro.has(nf.id));

      const rows: any[] = [];

      for (const pc of pedidos || []) {
        const fornecedor = pc.fornecedores as { nome_razao_social: string } | null;
        rows.push({
          tipo: "Pedido s/ NF",
          referencia: pc.numero,
          parceiro: fornecedor?.nome_razao_social || "-",
          valor: Number(pc.valor_total || 0),
          status: pc.status,
          observacao: "Pedido de compra sem nota fiscal vinculada",
        });
      }

      for (const nf of nfsSemFinanceiro) {
        rows.push({
          tipo: "NF s/ Financeiro",
          referencia: nf.numero,
          parceiro: "-",
          valor: Number(nf.valor_total || 0),
          status: nf.tipo,
          observacao: "Nota fiscal com flag financeiro mas sem lançamento",
        });
      }

      return {
        title: "Divergências",
        subtitle: "Pedidos sem nota fiscal e notas sem lançamento financeiro.",
        rows,
        chartData: [
          { name: "Pedidos s/ NF", value: (pedidos || []).length },
          { name: "NF s/ Financeiro", value: nfsSemFinanceiro.length },
        ],
        totals: { total: rows.length },
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

  // write-excel-file replaces the vulnerable xlsx package.
  // It has no known CVEs and produces valid .xlsx files via the browser API.
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const keys = Object.keys(rows[0]);

  // Build a 2-D cell array: header row followed by data rows.
  // Cell values are kept in their native JS types so that the library can
  // render numbers as numbers and booleans as booleans in Excel.
  type CellValue = string | number | boolean | null;
  type WriteCell = { value: CellValue; fontWeight?: "bold" };

  const headerRow: WriteCell[] = keys.map((key) => ({ value: key, fontWeight: "bold" }));

  const dataRows: WriteCell[][] = rows.map((row) =>
    keys.map((key) => {
      const v = row[key];
      if (v == null) return { value: null };
      if (typeof v === "number" || typeof v === "boolean") return { value: v };
      return { value: String(v) };
    })
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeXlsxFile([headerRow, ...dataRows] as any, { fileName: `${title}.xlsx` });
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
