import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Building2, Loader2, Lock, Moon, Palette, Save, Settings, Sun, User } from 'lucide-react';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUserPreference } from '@/hooks/useUserPreference';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

function hexToHslString(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function Configuracoes() {
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('perfil');

  const [nome, setNome] = useState(profile?.nome || '');
  const [cargo, setCargo] = useState(profile?.cargo || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [densidade, setDensidade] = useState('confortavel');
  const [corPrimaria, setCorPrimaria] = useState('#6b0d0d');
  const [corSecundaria, setCorSecundaria] = useState('#b85b2d');
  const {
    value: menuCompacto,
    save: saveMenuCompacto,
    loading: loadingMenuCompacto,
  } = useUserPreference<boolean>(user?.id, 'sidebar_collapsed', true);
  const { value: densidadePref, save: saveDensidadePref } = useUserPreference<string>(user?.id, 'ui_density', 'confortavel');
  const { value: fontScale, save: saveFontScale } = useUserPreference<number>(user?.id, 'ui_font_scale', 16);
  const { value: reduceMotion, save: saveReduceMotion } = useUserPreference<boolean>(user?.id, 'ui_reduce_motion', false);

  const { value: cepEmpresa, loading: loadingCep, save: saveCepEmpresa } = useAppConfig<string>('cep_empresa', '');
  const [cepEmpresaLocal, setCepEmpresaLocal] = useState('');
  const [savingCep, setSavingCep] = useState(false);

  // Sync local CEP state when the Supabase value loads.
  useEffect(() => {
    if (cepEmpresa) setCepEmpresaLocal(cepEmpresa);
  }, [cepEmpresa]);

  useEffect(() => {
    if (densidadePref) setDensidade(densidadePref);
  }, [densidadePref]);

  useEffect(() => {
    supabase
      .from('app_configuracoes')
      .select('chave, valor')
      .in('chave', ['theme_primary_color', 'theme_secondary_color'])
      .then(({ data }) => {
        const primary = data?.find((d) => d.chave === 'theme_primary_color')?.valor as string | undefined;
        const secondary = data?.find((d) => d.chave === 'theme_secondary_color')?.valor as string | undefined;
        if (primary) setCorPrimaria(primary);
        if (secondary) setCorSecundaria(secondary);
      });
  }, []);

  const initials = (nome || user?.email || 'U').substring(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ nome, cargo }).eq('id', user.id);
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
                  <Select value={densidade} onValueChange={async (value) => {
                    setDensidade(value);
                    await saveDensidadePref(value);
                    document.documentElement.dataset.density = value === 'compacta' ? 'compact' : 'comfortable';
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confortavel">Confortável</SelectItem>
                      <SelectItem value="compacta">Compacta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cor primária corporativa</Label>
                  <Input type="color" value={corPrimaria} onChange={(e) => setCorPrimaria(e.target.value)} className="h-10 p-1" />
                </div>
                <div className="space-y-2">
                  <Label>Cor secundária corporativa</Label>
                  <Input type="color" value={corSecundaria} onChange={(e) => setCorSecundaria(e.target.value)} className="h-10 p-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tamanho base da fonte ({fontScale}px)</Label>
                <Input
                  type="range"
                  min={16}
                  max={22}
                  step={1}
                  value={fontScale}
                  onChange={async (e) => {
                    const value = Number(e.target.value);
                    await saveFontScale(value);
                    document.documentElement.style.setProperty('--base-font-size', `${value}px`);
                  }}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Menu compacto</p>
                  <p className="text-sm text-muted-foreground">Sidebar mais enxuta para ganhar espaço na tela.</p>
                </div>
                <Switch
                  checked={menuCompacto}
                  disabled={loadingMenuCompacto}
                  onCheckedChange={async (checked) => {
                    const ok = await saveMenuCompacto(checked);
                    if (!ok) toast.error('Não foi possível salvar a preferência do menu.');
                  }}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Reduzir animações</p>
                  <p className="text-sm text-muted-foreground">Respeita usuários com sensibilidade a movimento.</p>
                </div>
                <Switch
                  checked={reduceMotion}
                  onCheckedChange={async (checked) => {
                    await saveReduceMotion(checked);
                    document.documentElement.classList.toggle('reduce-motion', checked);
                  }}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  className="gap-2"
                  onClick={async () => {
                    await supabase.from('app_configuracoes').upsert(
                      [
                        { chave: 'theme_primary_color', valor: corPrimaria, updated_at: new Date().toISOString() },
                        { chave: 'theme_secondary_color', valor: corSecundaria, updated_at: new Date().toISOString() },
                      ] as any,
                      { onConflict: 'chave' }
                    );
                    const primary = hexToHslString(corPrimaria);
                    const secondary = hexToHslString(corSecundaria);
                    if (primary) document.documentElement.style.setProperty('--primary', primary);
                    if (secondary) document.documentElement.style.setProperty('--secondary', secondary);
                    toast.success('Tema corporativo salvo com sucesso!');
                  }}
                >
                  <Save className="h-4 w-4" />
                  Salvar tema corporativo
                </Button>
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
