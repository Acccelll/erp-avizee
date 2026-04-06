import { supabase } from '@/integrations/supabase/client';
import { getSocialProvider, type SocialPlatform } from './socialProviders';

export const socialPermissions = [
  'social.visualizar',
  'social.configurar',
  'social.sincronizar',
  'social.exportar_relatorios',
  'social.gerenciar_alertas',
] as const;

export type SocialConta = {
  id: string;
  plataforma: SocialPlatform;
  nome_conta: string;
  identificador_externo: string;
  status_conexao: string;
  ultima_sincronizacao: string | null;
  url_conta: string | null;
  ativo: boolean;
  data_cadastro: string;
};

export async function listarContasSocial() {
  const { data, error } = await (supabase.from as any)('social_contas')
    .select('*')
    .eq('ativo', true)
    .order('data_cadastro', { ascending: false });
  if (error) throw error;
  return (data || []) as SocialConta[];
}

export async function criarContaSocial(payload: Partial<SocialConta> & { plataforma: SocialPlatform; nome_conta: string; identificador_externo: string }) {
  const { data, error } = await (supabase.from as any)('social_contas')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as SocialConta;
}

export async function atualizarContaSocial(id: string, payload: Partial<SocialConta>) {
  const { data, error } = await (supabase.from as any)('social_contas')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as SocialConta;
}

export async function removerContaSocial(id: string) {
  const { error } = await (supabase.from as any)('social_contas')
    .update({ ativo: false })
    .eq('id', id);
  if (error) throw error;
}

export async function sincronizarSocial(contaId?: string) {
  if (contaId) {
    const { data: conta } = await (supabase.from as any)('social_contas').select('plataforma').eq('id', contaId).single();
    const provider = getSocialProvider((conta?.plataforma || 'instagram_business') as SocialPlatform);
    await provider.syncInsights({ contaId });
  }

  const { data, error } = await (supabase.rpc as any)('social_sincronizar_manual', { _conta_id: contaId ?? null });
  if (error) throw error;
  return data;
}

export async function carregarDashboardSocial(dataInicio: string, dataFim: string) {
  const { data, error } = await (supabase.rpc as any)('social_dashboard_consolidado', {
    _data_inicio: dataInicio,
    _data_fim: dataFim,
  });
  if (error) throw error;
  return data;
}

export async function listarSnapshotsPeriodo(contaId: string, dataInicio: string, dataFim: string) {
  const { data, error } = await (supabase.rpc as any)('social_metricas_periodo', {
    _conta_id: contaId,
    _data_inicio: dataInicio,
    _data_fim: dataFim,
  });
  if (error) throw error;
  return data || [];
}

export async function listarPostsFiltrados(filtros: { plataforma?: string; dataInicio: string; dataFim: string; tipoPost?: string; campanhaId?: string }) {
  const { data, error } = await (supabase.rpc as any)('social_posts_filtrados', {
    _plataforma: filtros.plataforma ?? null,
    _data_inicio: filtros.dataInicio,
    _data_fim: filtros.dataFim,
    _tipo_post: filtros.tipoPost ?? null,
    _campanha_id: filtros.campanhaId ?? null,
  });
  if (error) throw error;
  return data || [];
}

export async function listarAlertas(resolvido?: boolean) {
  const { data, error } = await (supabase.rpc as any)('social_alertas_periodo', { _resolvido: resolvido ?? null });
  if (error) throw error;
  return data || [];
}
