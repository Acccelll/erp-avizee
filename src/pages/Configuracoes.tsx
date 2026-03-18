import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'erp-avizee-configuracoes';

const defaultConfig = {
  geral: {
    empresa: 'AviZee Equipamentos LTDA',
    nomeFantasia: 'AviZee',
    email: 'contato@avizee.com.br',
    telefone: '(19) 99999-0000',
    logoUrl: '/images/logoavizee.png',
    corPrimaria: '#690500',
    corSecundaria: '#b2592c',
  },
  usuarios: {
    permitirCadastro: false,
    exigir2fa: false,
    perfilPadrao: 'operador',
  },
  email: {
    remetenteNome: 'ERP AviZee',
    remetenteEmail: 'contato@avizee.com.br',
    responderPara: 'comercial@avizee.com.br',
    assinatura: 'Equipe AviZee',
  },
  fiscal: {
    cfopPadraoVenda: '5102',
    cfopPadraoCompra: '1102',
    cstPadrao: '000',
    ncmPadrao: '00000000',
    gerarFinanceiroPadrao: true,
  },
  financeiro: {
    condicaoPadrao: '30 dias',
    formaPagamentoPadrao: 'boleto',
    bancoPadrao: 'Inter',
    permitirBaixaParcial: true,
  },
  aparencia: {
    densidade: 'confortavel',
    menuCompacto: false,
    tema: 'system',
  },
};

const perfis = [
  { nome: 'Administrador', descricao: 'Acesso total ao sistema', permissao: 'full_access' },
  { nome: 'Operador', descricao: 'Cadastro, pedidos e consultas', permissao: 'operacional' },
  { nome: 'Visualizador', descricao: 'Somente leitura', permissao: 'read_only' },
];

const tabLabels: Record<string, string> = {
  geral: 'Empresa',
  usuarios: 'Usuários',
  email: 'E-mail',
  fiscal: 'Fiscal',
  financeiro: 'Financeiro',
  aparencia: 'Aparência',
};

export default function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTheme } = useTheme();
  const initialTab = searchParams.get('tab') || 'geral';
  const [config, setConfig] = useState(defaultConfig);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaConfigId, setEmpresaConfigId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) setActiveTab(tab);
  }, [activeTab, searchParams]);

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      setLoading(true);
      try {
        const localBackup = localStorage.getItem(STORAGE_KEY);
        const parsedBackup = localBackup ? JSON.parse(localBackup) : defaultConfig;

        const [{ data: empresaRows }, { data: appRows }] = await Promise.all([
          (supabase as any).from('empresa_config').select('*').limit(1),
          (supabase as any).from('app_configuracoes').select('chave, valor'),
        ]);

        const empresa = empresaRows?.[0];
        const appConfig = Object.fromEntries((appRows || []).map((row: any) => [row.chave, row.valor || {}]));

        const merged = {
          ...defaultConfig,
          ...parsedBackup,
          geral: {
            ...defaultConfig.geral,
            ...(parsedBackup.geral || {}),
            empresa: empresa?.razao_social || parsedBackup?.geral?.empresa || defaultConfig.geral.empresa,
            nomeFantasia: empresa?.nome_fantasia || parsedBackup?.geral?.nomeFantasia || defaultConfig.geral.nomeFantasia,
            email: empresa?.email || parsedBackup?.geral?.email || defaultConfig.geral.email,
            telefone: empresa?.telefone || parsedBackup?.geral?.telefone || defaultConfig.geral.telefone,
            logoUrl: empresa?.logo_url || appConfig.geral?.logoUrl || parsedBackup?.geral?.logoUrl || defaultConfig.geral.logoUrl,
            corPrimaria: appConfig.geral?.corPrimaria || parsedBackup?.geral?.corPrimaria || defaultConfig.geral.corPrimaria,
            corSecundaria: appConfig.geral?.corSecundaria || parsedBackup?.geral?.corSecundaria || defaultConfig.geral.corSecundaria,
          },
          usuarios: { ...defaultConfig.usuarios, ...(parsedBackup.usuarios || {}), ...(appConfig.usuarios || {}) },
          email: { ...defaultConfig.email, ...(parsedBackup.email || {}), ...(appConfig.email || {}) },
          fiscal: { ...defaultConfig.fiscal, ...(parsedBackup.fiscal || {}), ...(appConfig.fiscal || {}) },
          financeiro: { ...defaultConfig.financeiro, ...(parsedBackup.financeiro || {}), ...(appConfig.financeiro || {}) },
          aparencia: { ...defaultConfig.aparencia, ...(parsedBackup.aparencia || {}), ...(appConfig.aparencia || {}) },
        };

        if (mounted) {
          setEmpresaConfigId(empresa?.id || null);
          setConfig(merged);
          if (merged.aparencia.tema) {
            setTheme(merged.aparencia.tema);
          }
        }
      } catch {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && mounted) setConfig({ ...defaultConfig, ...JSON.parse(saved) });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadConfig();
    return () => {
      mounted = false;
    };
  }, [setTheme]);

  const pendingSummary = useMemo(
    () => [
      `Empresa: ${config.geral.nomeFantasia}`,
      `Perfil padrão: ${config.usuarios.perfilPadrao}`,
      `Banco padrão: ${config.financeiro.bancoPadrao}`,
      `CFOP venda: ${config.fiscal.cfopPadraoVenda}`,
      `Tema atual: ${config.aparencia.tema === 'dark' ? 'Escuro' : config.aparencia.tema === 'light' ? 'Claro' : 'Sistema'}`,
    ],
    [config],
  );

  const updateSection = <T extends keyof typeof defaultConfig>(section: T, values: Partial<(typeof defaultConfig)[T]>) => {
    setConfig((current) => ({
      ...current,
      [section]: { ...current[section], ...values },
    }));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', value);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const empresaPayload = {
        razao_social: config.geral.empresa,
        nome_fantasia: config.geral.nomeFantasia,
        email: config.geral.email,
        telefone: config.geral.telefone,
        logo_url: config.geral.logoUrl,
      };

      if (empresaConfigId) {
        await (supabase as any).from('empresa_config').update(empresaPayload).eq('id', empresaConfigId);
      } else {
        const { data: insertedEmpresa } = await (supabase as any).from('empresa_config').insert(empresaPayload).select('id').single();
        if (insertedEmpresa?.id) setEmpresaConfigId(insertedEmpresa.id);
      }

      const appRows = [
        {
          chave: 'geral',
          valor: {
            logoUrl: config.geral.logoUrl,
            corPrimaria: config.geral.corPrimaria,
            corSecundaria: config.geral.corSecundaria,
          },
          descricao: 'Configurações gerais da interface e branding',
        },
        { chave: 'usuarios', valor: config.usuarios, descricao: 'Parâmetros de usuários e permissões' },
        { chave: 'email', valor: config.email, descricao: 'Remetente e assinatura de e-mails' },
        { chave: 'fiscal', valor: config.fiscal, descricao: 'Parâmetros fiscais padrão' },
        { chave: 'financeiro', valor: config.financeiro, descricao: 'Parâmetros financeiros padrão' },
        { chave: 'aparencia', valor: config.aparencia, descricao: 'Preferências visuais e de interface' },
      ];

      await (supabase as any).from('app_configuracoes').upsert(appRows, { onConflict: 'chave' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setTheme(config.aparencia.tema as string);
      toast.success(`Configurações de ${tabLabels[activeTab] || 'configuração'} salvas com sucesso.`);
    } catch (error: any) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      toast.error(`Não foi possível salvar no banco: ${error.message}. Backup mantido no navegador.`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <ModulePage title="Configurações" subtitle="Carregando parâmetros do sistema...">
          <div className="flex items-center justify-center rounded-xl border border-dashed py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configurações...
          </div>
        </ModulePage>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ModulePage title="Configurações" subtitle="Parâmetros centralizados da empresa, operação, financeiro, fiscal e interface.">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
              <TabsTrigger value="email">E-mail</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="aparencia">Aparência</TabsTrigger>
            </TabsList>

            <TabsContent value="geral">
              <Card>
                <CardHeader>
                  <CardTitle>Identidade da empresa</CardTitle>
                  <CardDescription>Dados exibidos em documentos e no cabeçalho do sistema.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Razão social</Label><Input value={config.geral.empresa} onChange={(e) => updateSection('geral', { empresa: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Nome fantasia</Label><Input value={config.geral.nomeFantasia} onChange={(e) => updateSection('geral', { nomeFantasia: e.target.value })} /></div>
                  <div className="space-y-2"><Label>E-mail institucional</Label><Input value={config.geral.email} onChange={(e) => updateSection('geral', { email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={config.geral.telefone} onChange={(e) => updateSection('geral', { telefone: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Logo URL</Label><Input value={config.geral.logoUrl} onChange={(e) => updateSection('geral', { logoUrl: e.target.value })} /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Cor primária</Label><Input value={config.geral.corPrimaria} onChange={(e) => updateSection('geral', { corPrimaria: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Cor secundária</Label><Input value={config.geral.corSecundaria} onChange={(e) => updateSection('geral', { corSecundaria: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usuarios">
              <Card>
                <CardHeader>
                  <CardTitle>Perfis e permissões</CardTitle>
                  <CardDescription>Defina políticas de acesso e padrões de onboarding.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Permitir novos cadastros</p>
                        <p className="text-sm text-muted-foreground">Usuários podem criar registros operacionais sem intervenção admin.</p>
                      </div>
                      <Switch checked={config.usuarios.permitirCadastro} onCheckedChange={(checked) => updateSection('usuarios', { permitirCadastro: checked })} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Exigir autenticação em dois fatores</p>
                        <p className="text-sm text-muted-foreground">Aumenta a segurança para perfis críticos.</p>
                      </div>
                      <Switch checked={config.usuarios.exigir2fa} onCheckedChange={(checked) => updateSection('usuarios', { exigir2fa: checked })} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Perfil padrão de novos usuários</Label>
                    <Select value={config.usuarios.perfilPadrao} onValueChange={(value) => updateSection('usuarios', { perfilPadrao: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrador">Administrador</SelectItem>
                        <SelectItem value="operador">Operador</SelectItem>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3">
                    {perfis.map((perfil) => (
                      <div key={perfil.nome} className="flex items-start justify-between rounded-lg border p-4">
                        <div>
                          <p className="font-medium">{perfil.nome}</p>
                          <p className="text-sm text-muted-foreground">{perfil.descricao}</p>
                        </div>
                        <Badge variant="outline">{perfil.permissao}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração de remetente</CardTitle>
                  <CardDescription>Base para e-mails comerciais e notificações automáticas.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Nome do remetente</Label><Input value={config.email.remetenteNome} onChange={(e) => updateSection('email', { remetenteNome: e.target.value })} /></div>
                  <div className="space-y-2"><Label>E-mail do remetente</Label><Input value={config.email.remetenteEmail} onChange={(e) => updateSection('email', { remetenteEmail: e.target.value })} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Responder para</Label><Input value={config.email.responderPara} onChange={(e) => updateSection('email', { responderPara: e.target.value })} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Assinatura padrão</Label><Textarea value={config.email.assinatura} onChange={(e) => updateSection('email', { assinatura: e.target.value })} rows={4} /></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fiscal">
              <Card>
                <CardHeader>
                  <CardTitle>Parâmetros fiscais</CardTitle>
                  <CardDescription>Valores padrão para documentos de compra e venda.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>CFOP padrão venda</Label><Input value={config.fiscal.cfopPadraoVenda} onChange={(e) => updateSection('fiscal', { cfopPadraoVenda: e.target.value })} /></div>
                  <div className="space-y-2"><Label>CFOP padrão compra</Label><Input value={config.fiscal.cfopPadraoCompra} onChange={(e) => updateSection('fiscal', { cfopPadraoCompra: e.target.value })} /></div>
                  <div className="space-y-2"><Label>CST padrão</Label><Input value={config.fiscal.cstPadrao} onChange={(e) => updateSection('fiscal', { cstPadrao: e.target.value })} /></div>
                  <div className="space-y-2"><Label>NCM padrão</Label><Input value={config.fiscal.ncmPadrao} onChange={(e) => updateSection('fiscal', { ncmPadrao: e.target.value })} /></div>
                  <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Gerar financeiro por padrão</p>
                      <p className="text-sm text-muted-foreground">Aplica a flag padrão em notas fiscais emitidas ou recebidas.</p>
                    </div>
                    <Switch checked={config.fiscal.gerarFinanceiroPadrao} onCheckedChange={(checked) => updateSection('fiscal', { gerarFinanceiroPadrao: checked })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financeiro">
              <Card>
                <CardHeader>
                  <CardTitle>Padrões financeiros</CardTitle>
                  <CardDescription>Condições padrão para títulos e baixas.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Condição padrão</Label><Input value={config.financeiro.condicaoPadrao} onChange={(e) => updateSection('financeiro', { condicaoPadrao: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Forma de pagamento padrão</Label><Input value={config.financeiro.formaPagamentoPadrao} onChange={(e) => updateSection('financeiro', { formaPagamentoPadrao: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Banco padrão</Label><Input value={config.financeiro.bancoPadrao} onChange={(e) => updateSection('financeiro', { bancoPadrao: e.target.value })} /></div>
                  <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                    <div>
                      <p className="font-medium">Permitir baixa parcial</p>
                      <p className="text-sm text-muted-foreground">Autoriza baixas financeiras parciais em contas a pagar ou receber.</p>
                    </div>
                    <Switch checked={config.financeiro.permitirBaixaParcial} onCheckedChange={(checked) => updateSection('financeiro', { permitirBaixaParcial: checked })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aparencia">
              <Card>
                <CardHeader>
                  <CardTitle>Aparência e navegação</CardTitle>
                  <CardDescription>Preferências visuais salvas como configuração central do ERP.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Densidade</Label>
                    <Select value={config.aparencia.densidade} onValueChange={(value) => updateSection('aparencia', { densidade: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confortavel">Confortável</SelectItem>
                        <SelectItem value="compacta">Compacta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Select value={config.aparencia.tema} onValueChange={(value) => updateSection('aparencia', { tema: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Menu compacto</p>
                      <p className="text-sm text-muted-foreground">Preferência visual para navegação lateral mais enxuta.</p>
                    </div>
                    <Switch checked={config.aparencia.menuCompacto} onCheckedChange={(checked) => updateSection('aparencia', { menuCompacto: checked })} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>Fonte principal agora prioriza Supabase, com backup local no navegador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingSummary.map((item) => (
                <div key={item} className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                  {item}
                </div>
              ))}
              <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar alterações
              </Button>
            </CardContent>
          </Card>
        </div>
      </ModulePage>
    </AppLayout>
  );
}
