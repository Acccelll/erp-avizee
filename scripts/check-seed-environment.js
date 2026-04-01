#!/usr/bin/env node
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const hasSeedEnabled = process.env.SEED_ENABLED === 'true';
const safeLocal = supabaseUrl.includes('localhost:54321');
const allowedHosts = (process.env.SEED_ALLOWED_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean);
let safeByList = false;
try {
  safeByList = allowedHosts.includes(new URL(supabaseUrl).host);
} catch {
  safeByList = false;
}

if (process.env.NODE_ENV === 'production' || !hasSeedEnabled || !(safeLocal || safeByList)) {
  console.error('\x1b[31m%s\x1b[0m', '⚠️  ATENÇÃO: ambiente bloqueado para seed');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', '✅ Ambiente seguro para seed');
process.exit(0);
