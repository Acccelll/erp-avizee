#!/usr/bin/env node
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIRMATION_WORD = 'CONFIRMAR';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const isProduction = process.env.NODE_ENV === 'production';
const hasAllowFlag = process.env.ALLOW_SEED === 'true';
const hasSeedEnabled = process.env.SEED_ENABLED === 'true';

const defaultSafeLocal = SUPABASE_URL.includes('localhost:54321');
const allowedHosts = (process.env.SEED_ALLOWED_HOSTS || '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

let exactAllowed = false;
try {
  const host = new URL(SUPABASE_URL).host;
  exactAllowed = allowedHosts.includes(host);
} catch {
  exactAllowed = false;
}

const isSafeUrl = defaultSafeLocal || exactAllowed;

if (isProduction || !isSafeUrl || !hasAllowFlag || !hasSeedEnabled) {
  console.error('\x1b[31m%s\x1b[0m', '❌ SEED BLOQUEADO:');
  if (isProduction) console.error('   - NODE_ENV=production');
  if (!isSafeUrl) console.error('   - VITE_SUPABASE_URL não é segura para seed');
  if (!hasAllowFlag) console.error('   - ALLOW_SEED=true não definido');
  if (!hasSeedEnabled) console.error('   - SEED_ENABLED=true não definido');
  console.error('\n   Configure .env.seed conforme .env.seed.example');
  process.exit(1);
}

const args = process.argv.slice(2);
const resetOnly = args.includes('--reset-only');
const seedOnly = args.includes('--seed-only');

if (resetOnly && seedOnly) {
  console.error('\n❌  Não é possível usar --reset-only e --seed-only ao mesmo tempo.\n');
  process.exit(1);
}

const askConfirmation = () => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\x1b[33m%s\x1b[0m', '⚠️  ATENÇÃO: Este script irá APAGAR todos os dados do banco!');
  console.log(`   Digite "${CONFIRMATION_WORD}" para continuar ou pressione Ctrl+C para cancelar.\n`);
  rl.question('Confirmação: ', (answer) => {
    rl.close();
    resolve(answer === CONFIRMATION_WORD);
  });
});

if (!args.includes('--confirm')) {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log('❌ Seed cancelado pelo usuário');
    process.exit(0);
  }
}

const runReset = !seedOnly;
const runSeed = !resetOnly;

function runSql(label, filePath) {
  console.log(`\n▶  ${label}`);
  console.log(`   Arquivo: ${filePath}`);
  try {
    execSync(`supabase db execute --file "${filePath}"`, { cwd: ROOT, stdio: 'inherit' });
    console.log(`✓  ${label} concluído.`);
  } catch {
    console.error(`\n❌  Falha ao executar ${label}.`);
    process.exit(1);
  }
}

if (runReset) runSql('Reset de dados (reset.sql)', join(ROOT, 'supabase', 'seeds', 'reset.sql'));
if (runSeed) runSql('Carga de dados de exemplo (seed.sql)', join(ROOT, 'supabase', 'seeds', 'seed.sql'));

console.log('\n✅  Operação concluída com sucesso.\n');
