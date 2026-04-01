import { corsHeaders } from "../_shared/cors.ts";

const CORREIOS_API = "https://api.correios.com.br";
const MOCK_TRACK = { eventos: [{ descricao: "Dados mockados (fallback)", data: new Date().toISOString() }] };

type ApiErrorPayload = { success: false; error: string; code?: string };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const errorResponse = (error: unknown, code?: string, status = 500) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: "error", function: "correios-api", code, message }));
  return json({ success: false, error: message, code } satisfies ApiErrorPayload, status);
};

const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

async function getToken(): Promise<string> {
  const usuario = Deno.env.get("CORREIOS_USUARIO");
  const senha = Deno.env.get("CORREIOS_SENHA");
  if (!usuario || !senha) throw new Error("CORREIOS_CREDENTIALS_MISSING");

  const basicAuth = btoa(`${usuario}:${senha}`);
  const res = await fetchWithTimeout(`${CORREIOS_API}/token/v1/autentica`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${basicAuth}` },
    body: "{}",
  });
  if (!res.ok) throw new Error(`CORREIOS_AUTH_FAILED:${res.status}`);
  const data = await res.json() as { token: string };
  return data.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    if (!action) return json({ success: false, error: "Parâmetro action obrigatório", code: "MISSING_ACTION" }, 400);

    if (action === "rastrear") {
      const codigo = url.searchParams.get("codigo")?.trim();
      if (!codigo) return json({ success: false, error: "Parâmetro codigo obrigatório", code: "MISSING_CODE" }, 400);

      try {
        const token = await getToken();
        const res = await fetchWithTimeout(`${CORREIOS_API}/srorastro/v1/objetos/${encodeURIComponent(codigo)}?resultado=T`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`CORREIOS_RASTREIO_FAILED:${res.status}`);
        return json(await res.json());
      } catch (error) {
        console.warn("[correios-api] fallback mock ativado", error);
        return json({ success: true, warning: "fallback_mock", data: MOCK_TRACK });
      }
    }

    if (action === "cotacao_multi") {
      const token = await getToken();
      const body = await req.json() as { cepOrigem: string; cepDestino: string; peso: number; comprimento?: number; altura?: number; largura?: number };
      const servicos = ["04014", "04510"];
      const results = await Promise.all(servicos.map(async (codigo) => {
        const qs = new URLSearchParams({
          cepOrigem: body.cepOrigem,
          cepDestino: body.cepDestino,
          psObjeto: String(body.peso),
          tpObjeto: "2",
          comprimento: String(body.comprimento ?? 30),
          altura: String(body.altura ?? 15),
          largura: String(body.largura ?? 10),
        });
        const [precoRes, prazoRes] = await Promise.all([
          fetchWithTimeout(`${CORREIOS_API}/preco/v1/nacional/${codigo}?${qs}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetchWithTimeout(`${CORREIOS_API}/prazo/v1/nacional/${codigo}?cepOrigem=${body.cepOrigem}&cepDestino=${body.cepDestino}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        return {
          codigo,
          precoStatus: precoRes.status,
          prazoStatus: prazoRes.status,
          preco: precoRes.ok ? await precoRes.json() : null,
          prazo: prazoRes.ok ? await prazoRes.json() : null,
        };
      }));
      return json({ success: true, data: results });
    }

    return json({ success: false, error: `Ação '${action}' não reconhecida`, code: "INVALID_ACTION" }, 400);
  } catch (error) {
    return errorResponse(error, "UNHANDLED");
  }
});
