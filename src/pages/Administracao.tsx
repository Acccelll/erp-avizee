import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Calendar, Globe, Image, Info, Loader2, Mail, MapPin, Phone, Receipt, Shield, Upload, Users, Wallet } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { MaskedInput } from '@/components/ui/MaskedInput';
import { useAuth } from '@/contexts/AuthContext';
import { UsuariosTab } from '@/components/usuarios/UsuariosTab';

const defaultConfig = {
  geral: {
    empresa: 'AviZee Equipamentos LTDA',
    nomeFantasia: 'AviZee',
    cnpj: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    site: '',
    email: 'contato@avizee.com.br',
    telefone: '',
    whatsapp: '',
    responsavel: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
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
  { key: 'usuarios', label: 'Usuários e Permissões', icon: Users },
  { key: 'email', label: 'E-mail', icon: Mail },
  { key: 'fiscal', label: 'Parâmetros Fiscais', icon: Receipt },
  { key: 'financeiro', label: 'Parâmetros Financeiros', icon: Wallet },
  { key: 'auditoria', label: 'Auditoria', icon: Shield },
];

export default function Administracao() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'empresa';
  const [config, setConfig] = useState(defaultConfig);
  const [activeSection, setActiveSection] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaConfigId, setEmpresaConfigId] = useState<string | null>(null);
  const [empresaUpdatedAt, setEmpresaUpdatedAt] = useState<string | null>(null);
  const [empresaCreatedAt, setEmpresaCreatedAt] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
            cnpj: empresa?.cnpj || defaultConfig.geral.cnpj,
            inscricaoEstadual: empresa?.inscricao_estadual || defaultConfig.geral.inscricaoEstadual,
            inscricaoMunicipal: (empresa as any)?.inscricao_municipal || defaultConfig.geral.inscricaoMunicipal,
            site: (empresa as any)?.site || defaultConfig.geral.site,
            email: empresa?.email || defaultConfig.geral.email,
            telefone: empresa?.telefone || defaultConfig.geral.telefone,
            whatsapp: (empresa as any)?.whatsapp || defaultConfig.geral.whatsapp,
            responsavel: (empresa as any)?.responsavel || defaultConfig.geral.responsavel,
            cep: empresa?.cep || defaultConfig.geral.cep,
            logradouro: empresa?.logradouro || defaultConfig.geral.logradouro,
            numero: (empresa as any)?.numero || defaultConfig.geral.numero,
            complemento: (empresa as any)?.complemento || defaultConfig.geral.complemento,
            bairro: empresa?.bairro || defaultConfig.geral.bairro,
            cidade: empresa?.cidade || defaultConfig.geral.cidade,
            uf: empresa?.uf || defaultConfig.geral.uf,
            logoUrl: empresa?.logo_url || (appConfig.geral as any)?.logoUrl || defaultConfig.geral.logoUrl,
            corPrimaria: (appConfig.geral as any)?.corPrimaria || defaultConfig.geral.corPrimaria,
            corSecundaria: (appConfig.geral as any)?.corSecundaria || defaultConfig.geral.corSecundaria,
          },
          usuarios: { ...defaultConfig.usuarios, ...((appConfig.usuarios as any) || {}) },
          email: { ...defaultConfig.email, ...((appConfig.email as any) || {}) },
          fiscal: { ...defaultConfig.fiscal, ...((appConfig.fiscal as any) || {}) },
          financeiro: { ...defaultConfig.financeiro, ...((appConfig.financeiro as any) || {}) },
        };
        if (mounted) {
          setEmpresaConfigId(empresa?.id || null);
          setEmpresaUpdatedAt(empresa?.updated_at || null);
          setEmpresaCreatedAt(empresa?.created_at || null);
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato de imagem não suportado. Use PNG, JPEG, SVG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. O tamanho máximo é 2 MB.');
      return;
    }
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `logos/logo-empresa.${ext}`;
      const { error: uploadError } = await supabase.storage.from('dbavizee').upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('dbavizee').getPublicUrl(path);
      updateSection('geral', { logoUrl: urlData.publicUrl });
      toast.success('Logo enviada com sucesso.');
    } catch (err) {
      console.error('[admin] Erro ao enviar logo:', err);
      toast.error('Erro ao enviar a logo. Verifique sua conexão e tente novamente.');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const empresaPayload = {
        razao_social: config.geral.empresa,
        nome_fantasia: config.geral.nomeFantasia,
        cnpj: config.geral.cnpj || null,
        inscricao_estadual: config.geral.inscricaoEstadual || null,
        inscricao_municipal: config.geral.inscricaoMunicipal || null,
        site: config.geral.site || null,
        email: config.geral.email || null,
        telefone: config.geral.telefone || null,
        whatsapp: config.geral.whatsapp || null,
        responsavel: config.geral.responsavel || null,
        cep: config.geral.cep || null,
        logradouro: config.geral.logradouro || null,
        numero: config.geral.numero || null,
        complemento: config.geral.complemento || null,
        bairro: config.geral.bairro || null,
        cidade: config.geral.cidade || null,
        uf: config.geral.uf || null,
        logo_url: config.geral.logoUrl || null,
        updated_at: now,
        updated_by: user?.id ?? null,
      };
      if (empresaConfigId) {
        await supabase.from('empresa_config').update(empresaPayload as any).eq('id', empresaConfigId);
      } else {
        const { data: insertedEmpresa } = await supabase.from('empresa_config').insert(empresaPayload as any).select('id').single();
        if (insertedEmpresa?.id) setEmpresaConfigId(insertedEmpresa.id);
      }
      setEmpresaUpdatedAt(now);
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

  const renderEmpresa = () => {
    const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

    const ColorField = ({ label, field, description }: { label: string; field: 'corPrimaria' | 'corSecundaria'; description: string }) => {
      const value = config.geral[field];
      const valid = isValidHex(value);
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10 shrink-0 rounded-md border overflow-hidden cursor-pointer" style={{ backgroundColor: valid ? value : '#e5e7eb' }}>
              <input
                type="color"
                value={valid ? value : '#000000'}
                onChange={(e) => updateSection('geral', { [field]: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                title={label}
              />
            </div>
            <Input
              value={value}
              onChange={(e) => updateSection('geral', { [field]: e.target.value })}
              className={cn('font-mono', !valid && value ? 'border-destructive focus-visible:ring-destructive' : '')}
              maxLength={7}
              placeholder="#000000"
            />
          </div>
          {!valid && value && <p className="text-[11px] text-destructive">Formato inválido. Use #RRGGBB</p>}
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Bloco 1 — Dados institucionais */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <CardTitle>Dados institucionais</CardTitle>
                <CardDescription>Informações legais e cadastrais da empresa. Utilizadas em documentos oficiais, notas fiscais e cabeçalho do sistema.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Razão social <span className="text-destructive">*</span></Label>
              <Input value={config.geral.empresa} onChange={(e) => updateSection('geral', { empresa: e.target.value })} placeholder="EMPRESA LTDA" />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" />Utilizada em documentos oficiais e notas fiscais.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nome fantasia</Label>
              <Input value={config.geral.nomeFantasia} onChange={(e) => updateSection('geral', { nomeFantasia: e.target.value })} placeholder="Empresa" />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" />Exibição comercial no sistema e documentos.</p>
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <MaskedInput mask="cnpj" value={config.geral.cnpj} onChange={(v) => updateSection('geral', { cnpj: v })} showValidation placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Inscrição estadual</Label>
              <Input value={config.geral.inscricaoEstadual} onChange={(e) => updateSection('geral', { inscricaoEstadual: e.target.value })} placeholder="000.000.000.000" />
            </div>
            <div className="space-y-1.5">
              <Label>Inscrição municipal</Label>
              <Input value={config.geral.inscricaoMunicipal} onChange={(e) => updateSection('geral', { inscricaoMunicipal: e.target.value })} placeholder="000000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={config.geral.site} onChange={(e) => updateSection('geral', { site: e.target.value })} className="pl-9" placeholder="https://www.empresa.com.br" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 2 — Contato principal */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <CardTitle>Contato principal</CardTitle>
                <CardDescription>Canais de comunicação institucionais utilizados em e-mails, documentos e comunicações do sistema.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>E-mail institucional</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={config.geral.email} onChange={(e) => updateSection('geral', { email: e.target.value })} className="pl-9" placeholder="contato@empresa.com.br" type="email" />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" />Exibido em documentos e comunicações oficiais.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <MaskedInput mask="telefone" value={config.geral.telefone} onChange={(v) => updateSection('geral', { telefone: v })} placeholder="(00) 0000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp / Celular</Label>
              <MaskedInput mask="celular" value={config.geral.whatsapp} onChange={(v) => updateSection('geral', { whatsapp: v })} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável principal</Label>
              <Input value={config.geral.responsavel} onChange={(e) => updateSection('geral', { responsavel: e.target.value })} placeholder="Nome do responsável" />
            </div>
          </CardContent>
        </Card>

        {/* Bloco 3 — Endereço */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>Endereço da sede da empresa. Utilizado em documentos fiscais e comunicações.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <MaskedInput mask="cep" value={config.geral.cep} onChange={(v) => updateSection('geral', { cep: v })} placeholder="00000-000" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Logradouro</Label>
              <Input value={config.geral.logradouro} onChange={(e) => updateSection('geral', { logradouro: e.target.value })} placeholder="Rua, Avenida, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input value={config.geral.numero} onChange={(e) => updateSection('geral', { numero: e.target.value })} placeholder="000" />
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input value={config.geral.complemento} onChange={(e) => updateSection('geral', { complemento: e.target.value })} placeholder="Sala, andar, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input value={config.geral.bairro} onChange={(e) => updateSection('geral', { bairro: e.target.value })} placeholder="Bairro" />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={config.geral.cidade} onChange={(e) => updateSection('geral', { cidade: e.target.value })} placeholder="Cidade" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado (UF)</Label>
              <Select value={config.geral.uf} onValueChange={(v) => updateSection('geral', { uf: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bloco 4 — Identidade visual */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Image className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <CardTitle>Identidade visual</CardTitle>
                <CardDescription>Logo e cores aplicadas no cabeçalho do sistema, PDFs e documentos comerciais.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="space-y-3">
              <Label>Logo da empresa</Label>
              {config.geral.logoUrl && (
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-2">
                    <img
                      src={config.geral.logoUrl}
                      alt="Logo da empresa"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <p className="mt-2 truncate max-w-xs text-xs text-muted-foreground font-mono">{config.geral.logoUrl}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {config.geral.logoUrl ? 'Substituir logo' : 'Enviar logo'}
                </Button>
                {config.geral.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => updateSection('geral', { logoUrl: '' })}
                  >
                    Remover logo
                  </Button>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />Formatos: PNG, JPEG, SVG, WebP. Tamanho máximo: 2 MB. Usada no cabeçalho e nos PDFs.
              </p>
            </div>

            <Separator />

            {/* Cores */}
            <div className="grid gap-6 md:grid-cols-2">
              <ColorField
                label="Cor primária"
                field="corPrimaria"
                description="Cor principal aplicada em botões, destaques e identidade do sistema."
              />
              <ColorField
                label="Cor secundária"
                field="corSecundaria"
                description="Cor complementar usada em gradientes e elementos visuais secundários."
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloco 5 — Governança */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <CardTitle>Governança</CardTitle>
                <CardDescription>Rastreabilidade das alterações neste cadastro. Dados institucionais impactam cabeçalhos, documentos, PDFs e comunicações.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3 space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Última atualização</p>
                <p className="text-sm font-medium">
                  {empresaUpdatedAt
                    ? new Date(empresaUpdatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 space-y-0.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cadastro criado em</p>
                <p className="text-sm font-medium">
                  {empresaCreatedAt
                    ? new Date(empresaCreatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Alterações neste cadastro refletem imediatamente no cabeçalho do sistema, nos documentos comerciais, PDFs gerados e comunicações institucionais. Mantenha as informações sempre atualizadas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'empresa':
        return renderEmpresa();

      case 'usuarios':
        return <UsuariosTab />;

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
