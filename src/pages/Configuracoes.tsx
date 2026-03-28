import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Loader2, Lock, Moon, Palette, Save, Settings, Sun, User } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SideNavItem {
  key: string;
  label: string;
  icon: typeof User;
}

const sideNavItems: SideNavItem[] = [
  { key: 'perfil', label: 'Meu Perfil', icon: User },
  { key: 'empresa', label: 'Empresa', icon: Building2 },
  { key: 'aparencia', label: 'Aparência', icon: Palette },
  { key: 'seguranca', label: 'Segurança', icon: Lock },
];

export default function Configuracoes() {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('perfil');

  const [nome, setNome] = useState(profile?.nome || '');
  const [cargo, setCargo] = useState(profile?.cargo || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [menuCompacto, setMenuCompacto] = useState(false);
  const [densidade, setDensidade] = useState('confortavel');

  const { value: cepEmpresa, loading: loadingCep, save: saveCepEmpresa } = useAppConfig<string>('cep_empresa', '');
  const [cepEmpresaLocal, setCepEmpresaLocal] = useState('');
  const [savingCep, setSavingCep] = useState(false);

  // Sync local cep state when loaded
  useState(() => {
    if (cepEmpresa) setCepEmpresaLocal(cepEmpresa);
  });

  const initials = (nome || user?.email || 'U').substring(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ nome, cargo }).eq('id', user.id);
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error('[perfil] save:', err);
      toast.error('Erro ao salvar perfil.');
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha alterada com sucesso!');
      setNewPassword('');
    } catch (err: any) {
      console.error('[perfil] password:', err);
      toast.error('Erro ao alterar senha.');
    }
    setChangingPassword(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'perfil':
        return (
          <div className="space-y-6">
            {/* Profile summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{nome || 'Usuário'}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    {cargo && <Badge variant="secondary" className="mt-1">{cargo}</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit profile */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize seu nome e cargo exibidos no sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Gerente Comercial" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={user?.email || ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado por aqui.</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                    {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'empresa':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Configurações gerais usadas em cotações e integrações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-sm">
                <Label>CEP de Origem (para cotação de frete)</Label>
                <Input
                  value={cepEmpresaLocal || cepEmpresa || ''}
                  onChange={(e) => setCepEmpresaLocal(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Ex: 01001000"
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">Usado como CEP de origem na cotação de frete dos Correios.</p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    setSavingCep(true);
                    const ok = await saveCepEmpresa(cepEmpresaLocal || cepEmpresa || '');
                    if (ok) toast.success('CEP salvo com sucesso!');
                    else toast.error('Erro ao salvar CEP.');
                    setSavingCep(false);
                  }}
                  disabled={savingCep || loadingCep}
                  className="gap-2"
                >
                  {savingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'aparencia':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Personalize a interface do sistema ao seu gosto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select value={theme || 'system'} onValueChange={(value) => setTheme(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <span className="flex items-center gap-2"><Sun className="h-4 w-4" /> Claro</span>
                      </SelectItem>
                      <SelectItem value="dark">
                        <span className="flex items-center gap-2"><Moon className="h-4 w-4" /> Escuro</span>
                      </SelectItem>
                      <SelectItem value="system">
                        <span className="flex items-center gap-2"><Settings className="h-4 w-4" /> Sistema</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Densidade</Label>
                  <Select value={densidade} onValueChange={setDensidade}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confortavel">Confortável</SelectItem>
                      <SelectItem value="compacta">Compacta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Menu compacto</p>
                  <p className="text-sm text-muted-foreground">Sidebar mais enxuta para ganhar espaço na tela.</p>
                </div>
                <Switch checked={menuCompacto} onCheckedChange={setMenuCompacto} />
              </div>
            </CardContent>
          </Card>
        );

      case 'seguranca':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Gerencie sua senha e opções de acesso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-sm">
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="gap-2">
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Alterar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <ModulePage title="Configurações" subtitle="Preferências pessoais da sua conta.">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Side navigation */}
          <nav className="space-y-1">
            {sideNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
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
          <div>{renderContent()}</div>
        </div>
      </ModulePage>
    </AppLayout>
  );
}
