import { corsHeaders } from "../_shared/cors.ts";

const CORREIOS_API = "https://api.correios.com.br";
const CORREIOS_CWS = "https://cws.correios.com.br";

interface TokenResponse {
  token: string;
  expiraEm: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const usuario = Deno.env.get("CORREIOS_USUARIO");
  const senha = Deno.env.get("CORREIOS_SENHA");
  const cartaoPostagem = Deno.env.get("CORREIOS_CARTAO_POSTAGEM");

  if (!usuario || !senha) {
    throw new Error("Credenciais dos Correios não configuradas");
  }

  const basicAuth = btoa(`${usuario}:${senha}`);
  console.log(`[correios] Autenticando com usuario=${usuario}, cartao=${cartaoPostagem?.substring(0,4)}...`);

  // Try cartaopostagem endpoint first, fallback to simple auth
  const endpoints = cartaoPostagem
    ? [
        { url: `${CORREIOS_API}/token/v1/autentica/cartaopostagem`, body: JSON.stringify({ numero: cartaoPostagem }) },
        { url: `${CORREIOS_API}/token/v1/autentica`, body: JSON.stringify({}) },
      ]
    : [{ url: `${CORREIOS_API}/token/v1/autentica`, body: JSON.stringify({}) }];

  let lastError = "";
  for (const ep of endpoints) {
    console.log(`[correios] Tentando: ${ep.url}`);
    const res = await fetch(ep.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: ep.body,
    });

    if (res.ok) {
      const data: TokenResponse = await res.json();
      cachedToken = {
        token: data.token,
        expiresAt: Date.now() + 50 * 60 * 1000,
      };
      console.log("[correios] Autenticado com sucesso");
      return data.token;
    }

    lastError = await res.text();
    console.log(`[correios] Falha ${res.status}: ${lastError}`);
  }

  throw new Error(`Erro ao autenticar nos Correios: ${lastError}`);
}

async function rastrear(codigoObjeto: string): Promise<any> {
  const token = await getToken();

  // Try multiple known endpoint paths
  const endpoints = [
    `${CORREIOS_API}/rastro/v1/objetos/${codigoObjeto}`,
    `${CORREIOS_API}/srorastro/v1/objetos/${codigoObjeto}?resultado=T`,
  ];

  for (const url of endpoints) {
    console.log(`[correios] Rastreando: ${url}`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (res.ok) {
      return res.json();
    }

    const errBody = await res.text();
    console.log(`[correios] Rastreio falhou ${res.status}: ${errBody}`);

    // If 401, token may have expired
    if (res.status === 401) {
      cachedToken = null;
      continue;
    }
    // If not a 404/400 path issue, don't try next
    if (res.status !== 400 && res.status !== 404) {
      throw new Error(`Erro rastreio: ${res.status} - ${errBody}`);
    }
  }

  throw new Error(`Nenhum endpoint de rastreio respondeu para ${codigoObjeto}`);
}

async function calcularPreco(params: {
  cepOrigem: string;
  cepDestino: string;
  peso: number;
  comprimento: number;
  altura: number;
  largura: number;
  codigoServico: string;
}): Promise<any> {
  const token = await getToken();
  const qs = new URLSearchParams({
    cepOrigem: params.cepOrigem,
    cepDestino: params.cepDestino,
    psObjeto: String(params.peso),
    tpObjeto: "2",
    comprimento: String(params.comprimento),
    altura: String(params.altura),
    largura: String(params.largura),
  });

  const res = await fetch(
    `${CORREIOS_API}/preco/v1/nacional/${params.codigoServico}?${qs}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }
  );
  if (!res.ok) throw new Error(`Erro cotação: ${res.status}`);
  return res.json();
}

async function calcularPrazo(params: {
  cepOrigem: string;
  cepDestino: string;
  codigoServico: string;
}): Promise<any> {
  const token = await getToken();
  const qs = new URLSearchParams({
    cepOrigem: params.cepOrigem,
    cepDestino: params.cepDestino,
  });

  const res = await fetch(
    `${CORREIOS_API}/prazo/v1/nacional/${params.codigoServico}?${qs}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }
  );
  if (!res.ok) throw new Error(`Erro prazo: ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Parâmetro 'action' obrigatório (rastrear, cotacao, prazo)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any;

    switch (action) {
      case "rastrear": {
        const codigo = url.searchParams.get("codigo");
        if (!codigo) throw new Error("Parâmetro 'codigo' obrigatório");
        result = await rastrear(codigo);
        break;
      }
      case "cotacao": {
        const body = await req.json();
        result = await calcularPreco(body);
        break;
      }
      case "prazo": {
        const body = await req.json();
        result = await calcularPrazo(body);
        break;
      }
      case "token": {
        const token = await getToken();
        result = { success: true, tokenPreview: token.substring(0, 20) + "..." };
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Ação '${action}' não reconhecida` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[correios-api]", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
