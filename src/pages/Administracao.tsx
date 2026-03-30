import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Loader2, Mail, Receipt, Shield, Users, Wallet } from 'lucide-react';
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
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
const ALL_ROLES: AppRole[] = ['admin', 'vendedor', 'financeiro', 'estoquista'];

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  financeiro: 'Financeiro',
  estoquista: 'Estoquista',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/30',
  vendedor: 'bg-primary/10 text-primary border-primary/30',
  financeiro: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
  estoquista: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
};

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

// ── User management types ──
interface UserWithRoles {
  id: string;
  nome: string;
  email: string | null;
  cargo: string | null;
  ativo: boolean;
  created_at: string;
  roles: AppRole[];
}

export default function Administracao() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'empresa';
  const [config, setConfig] = useState(defaultConfig);
  const [activeSection, setActiveSection] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaConfigId, setEmpresaConfigId] = useState<string | null>(null);

  // ── Users state ──
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeSection) setActiveSection(tab);
  }, [searchParams]);

  // ── Load config ──
  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      setLoading(true);
      try {
        const [{ data: empresaRows }, { data: appRows }] = await Promise.all([
          supabase.from('empresa_config').select('*').limit(1),
          supabase.from('app_configuracoes').select('chave, valor'),
        ]);
        const empresa = empresaRows?.[0];
        const appConfig = Object.fromEntries((appRows || []).map((row: { chave: string; valor: unknown }) => [row.chave, row.valor || {}]));
        const merged = {
          ...defaultConfig,
          geral: {
            ...defaultConfig.geral,
            empresa: empresa?.razao_social || defaultConfig.geral.empresa,
            nomeFantasia: empresa?.nome_fantasia || defaultConfig.geral.nomeFantasia,
            email: empresa?.email || defaultConfig.geral.email,
            telefone: empresa?.telefone || defaultConfig.geral.telefone,
            logoUrl: empresa?.logo_url || (appConfig.geral as any)?.logoUrl || defaultConfig.geral.logoUrl,
            corPrimaria: (appConfig.geral as any)?.corPrimaria || defaultConfig.geral.corPrimaria,
            corSecundaria: (appConfig.geral as any)?.corSecundaria || defaultConfig.geral.corSecundaria,
          },
          usuarios: { ...defaultConfig.usuarios, ...(appConfig.usuarios || {}) },
          email: { ...defaultConfig.email, ...(appConfig.email || {}) },
          fiscal: { ...defaultConfig.fiscal, ...(appConfig.fiscal || {}) },
          financeiro: { ...defaultConfig.financeiro, ...(appConfig.financeiro || {}) },
        };
        if (mounted) {
          setEmpresaConfigId(empresa?.id || null);
          setConfig(merged);
        }
      } catch {
        console.error('[admin] Erro ao carregar configurações do Supabase');
        if (mounted) setConfig(defaultConfig);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, []);

  // ── Load users when tab = usuarios ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('id, nome, email, cargo, ativo, created_at'),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      const roleMap = new Map<string, AppRole[]>();
      (roles || []).forEach((r: { user_id: string; role: string }) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        roleMap.set(r.user_id, existing);
      });
      const merged: UserWithRoles[] = (profiles || []).map((p: { id: string; nome: string; email: string | null; cargo: string | null; ativo: boolean; created_at: string }) => ({
        ...p,
        roles: roleMap.get(p.id) || [],
      }));
      merged.sort((a, b) => a.nome.localeCompare(b.nome));
      setUsers(merged);
    } catch (err) {
      console.error('[admin] Erro ao carregar usuários:', err);
      toast.error('Erro ao carregar lista de usuários.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'usuarios') loadUsers();
  }, [activeSection, loadUsers]);

  // ── Toggle role ──
  const toggleRole = async (userId: string, role: AppRole, currentlyHas: boolean) => {
    setRoleUpdating(`${userId}-${role}`);
    try {
      if (currentlyHas) {
        await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
      } else {
        await supabase.from('user_roles').insert({ user_id: userId, role });
      }
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          return {
            ...u,
            roles: currentlyHas ? u.roles.filter((r) => r !== role) : [...u.roles, role],
          };
        })
      );
      toast.success(`Perfil "${ROLE_LABELS[role]}" ${currentlyHas ? 'removido' : 'atribuído'} com sucesso.`);
    } catch (err) {
      console.error('[admin] Erro ao alterar role:', err);
      toast.error('Erro ao alterar perfil do usuário.');
    } finally {
      setRoleUpdating(null);
    }
  };

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
        await supabase.from('empresa_config').update(empresaPayload).eq('id', empresaConfigId);
      } else {
        const { data: insertedEmpresa } = await supabase.from('empresa_config').insert(empresaPayload as any).select('id').single();
        if (insertedEmpresa?.id) setEmpresaConfigId(insertedEmpresa.id);
      }
      const appRows = [
        { chave: 'geral', valor: { logoUrl: config.geral.logoUrl, corPrimaria: config.geral.corPrimaria, corSecundaria: config.geral.corSecundaria } as any, descricao: 'Configurações gerais' },
        { chave: 'usuarios', valor: config.usuarios as any, descricao: 'Parâmetros de usuários' },
        { chave: 'email', valor: config.email as any, descricao: 'Remetente e assinatura' },
        { chave: 'fiscal', valor: config.fiscal as any, descricao: 'Parâmetros fiscais' },
        { chave: 'financeiro', valor: config.financeiro as any, descricao: 'Parâmetros financeiros' },
      ];
      await supabase.from('app_configuracoes').upsert(appRows, { onConflict: 'chave' });
      toast.success('Configurações salvas com sucesso.');
    } catch (error: unknown) {
      console.error('[admin] Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações. Verifique sua conexão e tente novamente.');
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

  const renderUsuarios = () => {
    if (usersLoading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando usuários...
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados ({users.length})</CardTitle>
          <CardDescription>Gerencie perfis de acesso de cada usuário. Clique nos badges para adicionar ou remover roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{user.nome}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  {user.cargo && <p className="text-xs text-muted-foreground">Cargo: {user.cargo}</p>}
                  <p className="text-xs text-muted-foreground">
                    Status: {user.ativo ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map((role) => {
                    const has = user.roles.includes(role);
                    const isUpdating = roleUpdating === `${user.id}-${role}`;
                    return (
                      <button
                        key={role}
                        type="button"
                        disabled={isUpdating}
                        onClick={() => toggleRole(user.id, role, has)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                          has ? ROLE_COLORS[role] : 'bg-muted/50 text-muted-foreground border-border opacity-60 hover:opacity-100',
                          isUpdating && 'opacity-50 cursor-wait',
                        )}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        {ROLE_LABELS[role]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum usuário encontrado.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
        return renderUsuarios();

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
                <div><p className="font-medium">Gerar financeiro por padrão</p><p className="text-sm text-muted-foreground">Flag padrão em notas fiscais.</p></div>
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
                Acesse o módulo completo de auditoria para visualizar logs de alterações.
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

  const showSaveButton = activeSection !== 'auditoria' && activeSection !== 'usuarios';

  return (
    <AppLayout>
      <ModulePage title="Administração" subtitle="Governança, parâmetros globais e gestão do sistema.">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
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
          <div className="space-y-4">
            {renderContent()}
            {showSaveButton && (
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
