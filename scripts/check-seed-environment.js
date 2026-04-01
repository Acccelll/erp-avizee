#!/usr/bin/env node
// scripts/check-seed-environment.js
// Uso: node scripts/check-seed-environment.js
//
// Verifica se o ambiente é seguro para executar scripts de seed.
// Falha se VITE_SUPABASE_URL não apontar para localhost ou 127.0.0.1.

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const isLocalSupabase = !!supabaseUrl &&
                        (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1'));

if (!isLocalSupabase) {
  console.error('\x1b[31m%s\x1b[0m', '⚠️  ATENÇÃO: VITE_SUPABASE_URL não parece ser local!');
  console.error(`   URL atual: ${supabaseUrl || '(não definida)'}`);
  console.error('   Seed só deve ser executado em ambiente de desenvolvimento local.\n');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', '✅ Ambiente verificado: Supabase local detectado');
process.exit(0);
