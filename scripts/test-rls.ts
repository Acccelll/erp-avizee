import { createClient } from "@supabase/supabase-js";

const url = process.env.RLS_SUPABASE_URL;
const anon = process.env.RLS_ANON_KEY;
const service = process.env.RLS_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.warn("[test-rls] Variáveis ausentes. Pulando testes RLS.");
  process.exit(0);
}

async function run() {
  const anonClient = createClient(url, anon);
  const serviceClient = createClient(url, service);

  const anonSelect = await anonClient.from("clientes").select("id").limit(1);
  if (anonSelect.error) {
    console.log("✅ anon bloqueado para clientes (esperado)");
  } else {
    console.warn("⚠️ anon conseguiu ler clientes; revisar política");
  }

  const svcSelect = await serviceClient.from("clientes").select("id").limit(1);
  if (svcSelect.error) {
    throw new Error(`service role falhou: ${svcSelect.error.message}`);
  }
  console.log("✅ service role consegue ler clientes");
}

run().catch((err) => {
  console.error("[test-rls] falhou", err);
  process.exit(1);
});
