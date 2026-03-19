import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Building2, FileText, Loader2, Mail, Receipt, Settings, Shield, Users, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'erp-avizee-admin-config';

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
    perfilPadrao: 'vendedor',
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
};

const perfis = [
  { nome: 'Administrador', descricao: 'Acesso total ao sistema', permissao: 'admin' },
  { nome: 'Vendedor', descricao: 'Cotações, pedidos e clientes', permissao: 'vendedor' },
  { nome: 'Financeiro', descricao: 'Contas, notas e caixa', permissao: 'financeiro' },
  { nome: 'Estoquista', descricao: 'Movimentações e inventário', permissao: 'estoquista' },
];

interface SideNavItem {
  key: string;
  label: string;
  icon: typeof Building2;
}

const sideNavItems: SideNavItem[] = [
  { key: 'empresa', label: 'Empresa', icon: Building2 },
  { key: 'usuarios', label: 'Usuários', icon: Users },
  { key: 'email', label: 'E-mail', icon: Mail },
  { key: 'fiscal', label: 'Parâmetros Fiscais', icon: Receipt },
  { key: 'financeiro', label: 'Parâmetros Financeiros', icon: Wallet },
  { key: 'auditoria', label: 'Auditoria', icon: Shield },
];

export default function Administracao() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setTheme } = useTheme();
  const initialTab = searchParams.get('tab') || 'empresa';
  const [config, setConfig] = useState(defaultConfig);
  const [activeSection, setActiveSection] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaConfigId, setEmpresaConfigId] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeSection) setActiveSection(tab);
  }, [searchParams]);

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
            empresa: empresa?.razao_social || defaultConfig.geral.empresa,
            nomeFantasia: empresa?.nome_fantasia || defaultConfig.geral.nomeFantasia,
            email: empresa?.email || defaultConfig.geral.email,
            telefone: empresa?.telefone || defaultConfig.geral.telefone,
            logoUrl: empresa?.logo_url || appConfig.geral?.logoUrl || defaultConfig.geral.logoUrl,
            corPrimaria: appConfig.geral?.corPrimaria || defaultConfig.geral.corPrimaria,
            corSecundaria: appConfig.geral?.corSecundaria || defaultConfig.geral.corSecundaria,
          },
          usuarios: { ...defaultConfig.usuarios, ...(parsedBackup.usuarios || {}), ...(appConfig.usuarios || {}) },
          email: { ...defaultConfig.email, ...(parsedBackup.email || {}), ...(appConfig.email || {}) },
          fiscal: { ...defaultConfig.fiscal, ...(parsedBackup.fiscal || {}), ...(appConfig.fiscal || {}) },
          financeiro: { ...defaultConfig.financeiro, ...(parsedBackup.financeiro || {}), ...(appConfig.financeiro || {}) },
        };

        if (mounted) {
          setEmpresaConfigId(empresa?.id || null);
          setConfig(merged);
        }
      } catch {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && mounted) setConfig({ ...defaultConfig, ...JSON.parse(saved) });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadConfig();
    return () => { mounted = false; };
  }, []);

  const updateSection = <T extends keyof typeof defaultConfig>(section: T, values: Partial<(typeof defaultConfig)[T]>) => {
    setConfig((current) => ({ ...current, [section]: { ...current[section], ...values } }));
  };

  const handleSectionChange = (key: string) => {
    setActiveSection(key);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', key);
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
        { chave: 'geral', valor: { logoUrl: config.geral.logoUrl, corPrimaria: config.geral.corPrimaria, corSecundaria: config.geral.corSecundaria }, descricao: 'Configurações gerais da interface e branding' },
        { chave: 'usuarios', valor: config.usuarios, descricao: 'Parâmetros de usuários e permissões' },
        { chave: 'email', valor: config.email, descricao: 'Remetente e assinatura de e-mails' },
        { chave: 'fiscal', valor: config.fiscal, descricao: 'Parâmetros fiscais padrão' },
        { chave: 'financeiro', valor: config.financeiro, descricao: 'Parâmetros financeiros padrão' },
      ];

      await (supabase as any).from('app_configuracoes').upsert(appRows, { onConflict: 'chave' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      const sectionLabel = sideNavItems.find(i => i.key === activeSection)?.label || 'seção';
      toast.success(`${sectionLabel} salvos com sucesso.`);
    } catch (error: any) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      console.error('[admin] Erro ao salvar:', error);
      toast.error('Não foi possível salvar. Backup mantido no navegador.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <ModulePage title="Administração" subtitle="Carregando parâmetros do sistema...">
          <div className="flex items-center justify-center rounded-xl border border-dashed py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        </ModulePage>
      </AppLayout>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'empresa':
        return (
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
        );

      case 'usuarios':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Perfis e permissões</CardTitle>
              <CardDescription>Defina políticas de acesso e padrões de onboarding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><p className="font-medium">Permitir novos cadastros</p><p className="text-sm text-muted-foreground">Usuários podem criar registros sem intervenção admin.</p></div>
                  <Switch checked={config.usuarios.permitirCadastro} onCheckedChange={(checked) => updateSection('usuarios', { permitirCadastro: checked })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><p className="font-medium">Exigir 2FA</p><p className="text-sm text-muted-foreground">Aumenta a segurança para perfis críticos.</p></div>
                  <Switch checked={config.usuarios.exigir2fa} onCheckedChange={(checked) => updateSection('usuarios', { exigir2fa: checked })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Perfil padrão de novos usuários</Label>
                <Select value={config.usuarios.perfilPadrao} onValueChange={(value) => updateSection('usuarios', { perfilPadrao: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="estoquista">Estoquista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                {perfis.map((perfil) => (
                  <div key={perfil.nome} className="flex items-start justify-between rounded-lg border p-4">
                    <div><p className="font-medium">{perfil.nome}</p><p className="text-sm text-muted-foreground">{perfil.descricao}</p></div>
                    <Badge variant="outline">{perfil.permissao}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'email':
        return (
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
        );

      case 'fiscal':
        return (
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
                <div><p className="font-medium">Gerar financeiro por padrão</p><p className="text-sm text-muted-foreground">Flag padrão em notas fiscais emitidas ou recebidas.</p></div>
                <Switch checked={config.fiscal.gerarFinanceiroPadrao} onCheckedChange={(checked) => updateSection('fiscal', { gerarFinanceiroPadrao: checked })} />
              </div>
            </CardContent>
          </Card>
        );

      case 'financeiro':
        return (
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
                <div><p className="font-medium">Permitir baixa parcial</p><p className="text-sm text-muted-foreground">Autoriza baixas parciais em contas a pagar ou receber.</p></div>
                <Switch checked={config.financeiro.permitirBaixaParcial} onCheckedChange={(checked) => updateSection('financeiro', { permitirBaixaParcial: checked })} />
              </div>
            </CardContent>
          </Card>
        );

      case 'auditoria':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Auditoria</CardTitle>
              <CardDescription>Rastreabilidade de alterações administrativas e operacionais.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Acesse o módulo completo de auditoria para visualizar logs de alterações, filtrar por módulo, usuário e período.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/auditoria'}>
                <Shield className="mr-2 h-4 w-4" /> Abrir Auditoria Completa
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <ModulePage title="Administração" subtitle="Governança, parâmetros globais e gestão do sistema.">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Side navigation */}
          <nav className="space-y-1">
            {sideNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSectionChange(item.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="space-y-4">
            {renderContent()}
            {activeSection !== 'auditoria' && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </div>
            )}
          </div>
        </div>
      </ModulePage>
    </AppLayout>
  );
}
