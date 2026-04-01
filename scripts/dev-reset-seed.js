#!/usr/bin/env node
/**
 * ERP AviZee — Dev Reset + Seed
 *
 * Executa limpeza e/ou carga de dados de exemplo no banco de
 * desenvolvimento local.
 *
 * ⚠️  ATENÇÃO: Este script é DESTRUTIVO.
 *              Apaga todos os dados operacionais e recria o conjunto
 *              de demonstração. Use APENAS em ambiente de desenvolvimento.
 *
 * Uso:
 *   node scripts/dev-reset-seed.js [--reset-only] [--seed-only] --confirm
 *
 * Flags:
 *   --confirm      Obrigatório. Confirma a execução destrutiva.
 *   --reset-only   Executa apenas a limpeza (reset.sql).
 *   --seed-only    Executa apenas a carga de dados (seed.sql).
 *                  (sem flags de filtro: executa reset + seed)
 *
 * Pré-requisito: Supabase CLI instalado e projeto vinculado localmente.
 *   supabase start   (para ambiente local)
 *   supabase link    (para ambiente remoto autorizado)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Verificação de ambiente ───────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';

function isProductionUrl(url) {
  if (!url) return false;
  // URLs de produção costumam ser do tipo *.supabase.co mas sem localhost nem 127.0.0.1
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0');
  const isSupabaseCloud = url.includes('.supabase.co') || url.includes('.supabase.com');
  return isSupabaseCloud && !isLocal;
}

if (process.env.NODE_ENV === 'production') {
  console.error('\n❌  NODE_ENV=production detectado. Este script não pode ser executado em produção.\n');
  process.exit(1);
}

if (isProductionUrl(SUPABASE_URL)) {
  console.error(
    '\n❌  A variável VITE_SUPABASE_URL aponta para um banco remoto/produção:\n' +
    `    ${SUPABASE_URL}\n\n` +
    '    Este script deve ser usado apenas com o banco de desenvolvimento local.\n' +
    '    Use "supabase start" para iniciar o ambiente local.\n'
  );
  process.exit(1);
}

// ── Flags de linha de comando ─────────────────────────────────────────────────

const args = process.argv.slice(2);

if (!args.includes('--confirm')) {
  console.error(
    '\n⚠️   ATENÇÃO: Este script apaga TODOS os dados operacionais do banco.\n\n' +
    '    Para confirmar a execução, adicione o flag --confirm:\n\n' +
    '      node scripts/dev-reset-seed.js --confirm\n\n' +
    '    Flags adicionais:\n' +
    '      --reset-only   Executa apenas a limpeza\n' +
    '      --seed-only    Executa apenas a inserção de dados\n'
  );
  process.exit(1);
}

const resetOnly = args.includes('--reset-only');
const seedOnly  = args.includes('--seed-only');

if (resetOnly && seedOnly) {
  console.error('\n❌  Não é possível usar --reset-only e --seed-only ao mesmo tempo.\n');
  process.exit(1);
}

const runReset = !seedOnly;
const runSeed  = !resetOnly;

// ── Execução ──────────────────────────────────────────────────────────────────

function runSql(label, filePath) {
  console.log(`\n▶  ${label}`);
  console.log(`   Arquivo: ${filePath}`);
  try {
    execSync(`supabase db execute --file "${filePath}"`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log(`✓  ${label} concluído.`);
  } catch (err) {
    console.error(`\n❌  Falha ao executar ${label}.`);
    console.error('    Verifique se o Supabase CLI está instalado e o banco local está rodando:');
    console.error('      supabase start\n');
    process.exit(1);
  }
}

console.log('\n════════════════════════════════════════════════════════');
console.log('  ERP AviZee — Dev Reset + Seed');
console.log('════════════════════════════════════════════════════════');

if (SUPABASE_URL) {
  console.log(`\n  URL do banco: ${SUPABASE_URL}`);
}
if (resetOnly) console.log('  Modo: somente limpeza (--reset-only)');
else if (seedOnly) console.log('  Modo: somente seed (--seed-only)');
else console.log('  Modo: reset completo + seed');

console.log('\n  ⚠️  Os dados operacionais existentes serão apagados.');

if (runReset) {
  runSql('Reset de dados (reset.sql)', join(ROOT, 'supabase', 'seeds', 'reset.sql'));
}

if (runSeed) {
  runSql('Carga de dados de exemplo (seed.sql)', join(ROOT, 'supabase', 'seeds', 'seed.sql'));
}

console.log('\n✅  Operação concluída com sucesso.\n');
