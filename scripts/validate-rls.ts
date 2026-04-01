#!/usr/bin/env node
/**
 * ERP AviZee — Validação de RLS (Row Level Security)
 *
 * Conecta ao Supabase (via service_role) e lista todas as políticas RLS
 * existentes. Alerta quando:
 *   - Uma tabela crítica não tem RLS habilitado.
 *   - Uma tabela crítica não tem nenhuma política definida.
 *
 * Uso:
 *   npx ts-node --esm scripts/validate-rls.ts
 *   # ou com tsx:
 *   npx tsx scripts/validate-rls.ts
 *
 * Variáveis de ambiente necessárias (arquivo .env ou environment):
 *   VITE_SUPABASE_URL  ou  SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

// ── Configuração ─────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌  Variáveis de ambiente ausentes.\n' +
      '    Defina VITE_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

// ── Tabelas críticas ──────────────────────────────────────────────────────────
// Tabelas que OBRIGATORIAMENTE devem ter RLS habilitado e ao menos uma política.
// Atualize esta lista ao criar novas tabelas sensíveis.

const CRITICAL_TABLES: string[] = [
  // Identidade / controle de acesso
  'profiles',
  'user_roles',
  'auditoria_logs',

  // Configurações da empresa
  'empresa_config',
  'app_configuracoes',

  // Cadastros principais
  'clientes',
  'fornecedores',
  'produtos',
  'produtos_fornecedores',
  'transportadoras',
  'grupos_economicos',

  // Comercial
  'orcamentos',
  'orcamentos_itens',
  'ordens_venda',
  'ordens_venda_itens',
  'precos_especiais',

  // Fiscal
  'notas_fiscais',
  'notas_fiscais_itens',

  // Financeiro
  'financeiro_lancamentos',
  'financeiro_baixas',
  'caixa_movimentos',
  'contas_bancarias',
  'bancos',

  // Compras / Cotações
  'compras',
  'compras_itens',
  'cotacoes_compra',
  'cotacoes_compra_itens',
  'cotacoes_compra_propostas',
  'pedidos_compra',
  'pedidos_compra_itens',

  // Estoque
  'estoque_movimentos',

  // Remessas bancárias
  'remessas',
  'remessa_eventos',

  // RH / Folha
  'funcionarios',
  'folha_pagamento',
  'fopag_verbas',
  'fopag_itens',

  // Importação
  'importacao_lotes',
  'importacao_logs',
];

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface RlsTableStatus {
  tablename: string;
  rowsecurity: boolean;
}

interface RlsPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}
function red(s: string): string {
  return `\x1b[31m${s}\x1b[0m`;
}
function green(s: string): string {
  return `\x1b[32m${s}\x1b[0m`;
}
function yellow(s: string): string {
  return `\x1b[33m${s}\x1b[0m`;
}

// ── Principal ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log(bold('\n🔒  ERP AviZee — Validação de RLS\n'));
  console.log(`    URL: ${SUPABASE_URL}\n`);

  // 1. Buscar status de RLS por tabela no schema public
  const { data: tables, error: tablesError } = await supabase.rpc(
    'validate_rls_status',
  );

  let tableStatusMap: Map<string, boolean>;

  if (tablesError || !tables) {
    // Fallback: query direta via SQL (requer permissão de superusuário)
    console.warn(
      yellow(
        '⚠️   Função validate_rls_status não encontrada, usando pg_tables diretamente.\n',
      ),
    );
    const { data: rawTables, error: rawError } = await supabase
      .from('pg_tables')
      .select('tablename,rowsecurity')
      .eq('schemaname', 'public');

    if (rawError || !rawTables) {
      console.error(
        red(
          `❌  Não foi possível consultar pg_tables: ${rawError?.message ?? 'sem dados'}`,
        ),
      );
      process.exit(1);
    }

    tableStatusMap = new Map(
      (rawTables as RlsTableStatus[]).map((r) => [r.tablename, r.rowsecurity]),
    );
  } else {
    tableStatusMap = new Map(
      (tables as RlsTableStatus[]).map((r: RlsTableStatus) => [
        r.tablename,
        r.rowsecurity,
      ]),
    );
  }

  // 2. Buscar todas as políticas RLS
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check')
    .eq('schemaname', 'public')
    .order('tablename')
    .order('policyname');

  if (policiesError || !policies) {
    console.error(
      red(
        `❌  Não foi possível consultar pg_policies: ${policiesError?.message ?? 'sem dados'}`,
      ),
    );
    process.exit(1);
  }

  const policiesByTable = new Map<string, RlsPolicy[]>();
  for (const p of policies as RlsPolicy[]) {
    const existing = policiesByTable.get(p.tablename) ?? [];
    existing.push(p);
    policiesByTable.set(p.tablename, existing);
  }

  // 3. Verificar tabelas críticas
  console.log(bold('── Tabelas críticas ─────────────────────────────────────\n'));

  let hasIssues = false;
  const issueLines: string[] = [];

  for (const table of CRITICAL_TABLES) {
    const rlsEnabled = tableStatusMap.get(table);
    const tablePolicies = policiesByTable.get(table) ?? [];

    const exists = rlsEnabled !== undefined;
    const rlsOn = rlsEnabled === true;
    const hasPolicies = tablePolicies.length > 0;

    const issues: string[] = [];
    if (!exists) issues.push('tabela não encontrada');
    else if (!rlsOn) issues.push('RLS DESABILITADO');
    if (exists && !hasPolicies) issues.push('SEM POLÍTICAS');

    if (issues.length > 0) {
      hasIssues = true;
      const line = `  ${red('✗')} ${bold(table)} — ${red(issues.join(', '))}`;
      console.log(line);
      issueLines.push(`${table}: ${issues.join(', ')}`);
    } else {
      const count = tablePolicies.length;
      console.log(
        `  ${green('✓')} ${table.padEnd(40)} ${green(`${count} política${count !== 1 ? 's' : ''}`)}`,
      );
    }
  }

  // 4. Listar políticas existentes por tabela
  console.log(
    bold('\n── Políticas existentes (todas as tabelas públicas) ─────\n'),
  );

  const allTables = [...new Set((policies as RlsPolicy[]).map((p) => p.tablename))].sort();

  for (const table of allTables) {
    const tablePolicies = policiesByTable.get(table) ?? [];
    console.log(`  ${bold(table)} (${tablePolicies.length})`);
    for (const p of tablePolicies) {
      const roles = Array.isArray(p.roles) ? p.roles.join(', ') : p.roles;
      console.log(
        `    • [${p.cmd.padEnd(6)}] ${p.policyname}  ${yellow(`(${roles})`)}`,
      );
    }
  }

  // 5. Tabelas sem nenhuma política (não críticas também)
  const tablesWithoutPolicies: string[] = [];
  for (const [table, rlsOn] of tableStatusMap.entries()) {
    if (rlsOn && !policiesByTable.has(table)) {
      tablesWithoutPolicies.push(table);
    }
  }

  if (tablesWithoutPolicies.length > 0) {
    console.log(
      bold('\n── Tabelas com RLS habilitado mas SEM políticas ─────────\n'),
    );
    for (const t of tablesWithoutPolicies.sort()) {
      const isCritical = CRITICAL_TABLES.includes(t);
      const marker = isCritical ? red('✗ CRÍTICA') : yellow('⚠ não-crítica');
      console.log(`  ${marker}  ${t}`);
    }
  }

  // 6. Sumário final
  console.log(bold('\n── Sumário ──────────────────────────────────────────────\n'));
  console.log(`  Tabelas críticas verificadas : ${CRITICAL_TABLES.length}`);
  console.log(`  Tabelas com políticas (total): ${allTables.length}`);
  console.log(
    `  Tabelas sem políticas (RLS on): ${tablesWithoutPolicies.length}`,
  );
  console.log(
    `  Total de políticas definidas : ${(policies as RlsPolicy[]).length}`,
  );

  if (hasIssues) {
    console.log(
      red(
        `\n❌  Problemas encontrados em tabelas críticas:\n${issueLines.map((l) => `     - ${l}`).join('\n')}\n`,
      ),
    );
    process.exit(1);
  } else {
    console.log(green('\n✅  Todas as tabelas críticas têm RLS habilitado e políticas definidas.\n'));
  }
}

main().catch((err: unknown) => {
  console.error(red(`\n❌  Erro inesperado: ${String(err)}\n`));
  process.exit(1);
});
