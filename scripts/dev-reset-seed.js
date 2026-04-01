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
 *   ALLOW_SEED=true node scripts/dev-reset-seed.js [--reset-only] [--seed-only] [--confirm]
 *
 * Flags:
 *   --confirm      Pula a confirmação interativa (usado pelos scripts npm).
 *   --reset-only   Executa apenas a limpeza (reset.sql).
 *   --seed-only    Executa apenas a carga de dados (seed.sql).
 *                  (sem flags de filtro: executa reset + seed)
 *
 * Proteções:
 *   1. NODE_ENV não pode ser "production"
 *   2. VITE_SUPABASE_URL deve apontar para localhost ou 127.0.0.1
 *   3. ALLOW_SEED=true deve estar definido no ambiente
 *
 * Pré-requisito: Supabase CLI instalado e projeto vinculado localmente.
 *   supabase start   (para ambiente local)
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CONFIRMATION_WORD = 'CONFIRMAR';

// ── Verificação de ambiente ───────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const isProduction = process.env.NODE_ENV === 'production';
const isLocalSupabase = !!SUPABASE_URL && (SUPABASE_URL.includes('localhost') || SUPABASE_URL.includes('127.0.0.1'));
const hasAllowFlag = process.env.ALLOW_SEED === 'true';

if (isProduction || !isLocalSupabase || !hasAllowFlag) {
  console.error('\x1b[31m%s\x1b[0m', '❌ SEED BLOQUEADO:');
  if (isProduction) console.error('   - NODE_ENV=production');
  if (!isLocalSupabase) console.error('   - VITE_SUPABASE_URL não aponta para localhost');
  if (!hasAllowFlag) console.error('   - ALLOW_SEED=true não definido no ambiente');
  console.error('\n   Para executar seed localmente:');
  console.error('   ALLOW_SEED=true npm run dev:reset');
  process.exit(1);
}

// ── Flags de linha de comando ─────────────────────────────────────────────────

const args = process.argv.slice(2);
const resetOnly = args.includes('--reset-only');
const seedOnly  = args.includes('--seed-only');

if (resetOnly && seedOnly) {
  console.error('\n❌  Não é possível usar --reset-only e --seed-only ao mesmo tempo.\n');
  process.exit(1);
}

// ── Confirmação interativa ────────────────────────────────────────────────────

const askConfirmation = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\x1b[33m%s\x1b[0m', '⚠️  ATENÇÃO: Este script irá APAGAR todos os dados do banco!');
    console.log(`   Digite "${CONFIRMATION_WORD}" para continuar ou pressione Ctrl+C para cancelar.\n`);

    rl.question('Confirmação: ', (answer) => {
      rl.close();
      resolve(answer === CONFIRMATION_WORD);
    });
  });
};

if (!args.includes('--confirm')) {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('❌ Seed cancelado pelo usuário');
    process.exit(0);
  }
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
