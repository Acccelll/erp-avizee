import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { ModulePage } from '@/components/ModulePage';
import { SummaryCard } from '@/components/SummaryCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { AlertTriangle, BarChart3, RefreshCcw, Users, FileText, Bell, Download } from 'lucide-react';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, CartesianGrid, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { formatDate, formatNumber } from '@/lib/format';
import {
  carregarDashboardSocial,
  criarContaSocial,
  listarAlertas,
  listarContasSocial,
  listarPostsFiltrados,
  removerContaSocial,
  sincronizarSocial,
  socialPermissions,
  type SocialConta,
} from '@/services/social.service';

const now = new Date();
const defaultInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString().slice(0, 10);
const defaultFim = now.toISOString().slice(0, 10);

export default function Social() {
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState<SocialConta[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [dataInicio, setDataInicio] = useState(defaultInicio);
  const [dataFim, setDataFim] = useState(defaultFim);
  const [filtroRede, setFiltroRede] = useState<string>('todos');
  const [filtroTipoPost, setFiltroTipoPost] = useState<string>('todos');

  const loadData = async () => {
    setLoading(true);
    try {
      const [contasData, dashboardData, postsData, alertasData] = await Promise.all([
        listarContasSocial(),
        carregarDashboardSocial(dataInicio, dataFim),
        listarPostsFiltrados({
          plataforma: filtroRede === 'todos' ? undefined : filtroRede,
          dataInicio,
          dataFim,
          tipoPost: filtroTipoPost === 'todos' ? undefined : filtroTipoPost,
        }),
        listarAlertas(false),
      ]);
      setContas(contasData);
      setDashboard(dashboardData);
      setPosts(postsData);
      setAlertas(alertasData);
    } catch (error) {
      console.error('[social] erro ao carregar', error);
      toast.error('Não foi possível carregar o módulo Social.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim, filtroRede, filtroTipoPost]);

  const historicoComparativo = useMemo(() => {
    const byPlataforma = dashboard?.comparativo || [];
    return byPlataforma.map((item: any) => ({
      plataforma: item.plataforma === 'instagram_business' ? 'Instagram' : 'LinkedIn',
      seguidores_novos: item.seguidores_novos || 0,
      taxa_engajamento_media: Number(item.taxa_engajamento_media || 0),
      alcance: item.alcance || 0,
    }));
  }, [dashboard]);

  const melhoresPosts = useMemo(
    () => [...posts].sort((a, b) => (b.engajamento_total || 0) - (a.engajamento_total || 0)).slice(0, 5),
    [posts],
  );

  const handleSync = async (contaId?: string) => {
    try {
      await sincronizarSocial(contaId);
      toast.success('Sincronização social executada com sucesso.');
      await loadData();
    } catch (error) {
      console.error('[social] sync', error);
      toast.error('Falha na sincronização social.');
    }
  };

  const handleNovaConta = async () => {
    try {
      await criarContaSocial({
        plataforma: 'linkedin_page',
        nome_conta: 'AviZee LinkedIn',
        identificador_externo: `linkedin-${Date.now()}`,
        status_conexao: 'conectado',
      } as any);
      toast.success('Conta social criada (MVP).');
      await loadData();
    } catch (error) {
      toast.error('Não foi possível criar conta social.');
      console.error(error);
    }
  };

  const totalSeguidoresNovos = dashboard?.totais?.seguidores_novos ?? 0;
  const taxaMedia = historicoComparativo.length
    ? historicoComparativo.reduce((acc: number, curr: any) => acc + curr.taxa_engajamento_media, 0) / historicoComparativo.length
    : 0;

  return (
    <AppLayout>
      <ModulePage
        title="Social"
        subtitle="Gestão de Instagram Business e LinkedIn com histórico de métricas e alertas operacionais"
        addLabel="Conectar conta"
        onAdd={handleNovaConta}
        summaryCards={
          <>
            <SummaryCard title="Seguidores novos" value={formatNumber(totalSeguidoresNovos)} icon={Users} />
            <SummaryCard title="Taxa média de engajamento" value={`${taxaMedia.toFixed(2)}%`} icon={BarChart3} />
            <SummaryCard title="Posts no período" value={formatNumber(posts.length)} icon={FileText} />
            <SummaryCard title="Alertas abertos" value={formatNumber(alertas.length)} icon={AlertTriangle} />
          </>
        }
        filters={
          <>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-[160px]" />
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-[160px]" />
            <Select value={filtroRede} onValueChange={setFiltroRede}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Rede" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as redes</SelectItem>
                <SelectItem value="instagram_business">Instagram</SelectItem>
                <SelectItem value="linkedin_page">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroTipoPost} onValueChange={setFiltroTipoPost}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="feed">Feed</SelectItem>
                <SelectItem value="reels">Reels</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="artigo">Artigo</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        toolbarExtra={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSync()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Sincronizar
            </Button>
            <Button variant="outline" onClick={() => toast.success('Exportação de relatório social simulada (MVP).')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      >
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contas">Contas conectadas</TabsTrigger>
            <TabsTrigger value="metricas">Métricas gerais</TabsTrigger>
            <TabsTrigger value="posts">Postagens</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard social</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="contas">
            <DataTable
              data={contas}
              columns={[
                { key: 'plataforma', label: 'Plataforma', render: (item: SocialConta) => item.plataforma === 'instagram_business' ? 'Instagram' : 'LinkedIn' },
                { key: 'nome_conta', label: 'Conta' },
                { key: 'status_conexao', label: 'Status', render: (item: SocialConta) => <Badge variant={item.status_conexao === 'conectado' ? 'default' : 'destructive'}>{item.status_conexao}</Badge> },
                { key: 'ultima_sincronizacao', label: 'Última sincronização', render: (item: SocialConta) => item.ultima_sincronizacao ? formatDate(item.ultima_sincronizacao) : '—' },
                {
                  key: 'acoes',
                  label: 'Ações',
                  render: (item: SocialConta) => (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSync(item.id)}>Sincronizar</Button>
                      <Button size="sm" variant="ghost" onClick={() => removerContaSocial(item.id).then(loadData)}>Desativar</Button>
                    </div>
                  ),
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="metricas">
            <Card>
              <CardHeader>
                <CardTitle>Evolução de seguidores e engajamento</CardTitle>
                <CardDescription>Comparativo Instagram x LinkedIn no período selecionado.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicoComparativo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="plataforma" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="seguidores_novos" fill="hsl(var(--primary))" name="Seguidores novos" />
                    <Bar dataKey="alcance" fill="hsl(var(--secondary))" name="Alcance" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <DataTable
              data={posts}
              columns={[
                { key: 'plataforma', label: 'Rede', render: (item: any) => item.plataforma === 'instagram_business' ? 'Instagram' : 'LinkedIn' },
                { key: 'data_publicacao', label: 'Publicação', render: (item: any) => formatDate(item.data_publicacao) },
                { key: 'titulo_legenda', label: 'Título/Legenda' },
                { key: 'tipo_post', label: 'Tipo' },
                { key: 'engajamento_total', label: 'Engajamento', render: (item: any) => formatNumber(item.engajamento_total || 0) },
                { key: 'taxa_engajamento', label: 'Taxa', render: (item: any) => `${Number(item.taxa_engajamento || 0).toFixed(2)}%` },
              ]}
            />
          </TabsContent>

          <TabsContent value="dashboard">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Crescimento de seguidores por rede</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicoComparativo}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="plataforma" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="seguidores_novos" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Melhores posts (top 5)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {melhoresPosts.map((post) => (
                      <div key={post.id} className="flex items-center justify-between rounded border p-3">
                        <div>
                          <p className="font-medium text-sm">{post.titulo_legenda || 'Sem título'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(post.data_publicacao)} · {post.tipo_post}</p>
                        </div>
                        <Badge>{formatNumber(post.engajamento_total || 0)} eng.</Badge>
                      </div>
                    ))}
                    {!melhoresPosts.length && <p className="text-sm text-muted-foreground">Sem postagens no período.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="relatorios">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios sociais</CardTitle>
                <CardDescription>Exporte comparativos entre redes, posts e alertas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">MVP com exportação simulada e estrutura pronta para PDF/XLSX.</p>
                <Button onClick={() => toast.success('Relatório social exportado (mock).')}>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar relatório consolidado
                </Button>
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium mb-2">Permissões previstas</p>
                  <div className="flex gap-2 flex-wrap">
                    {socialPermissions.map((perm) => <Badge key={perm} variant="outline">{perm}</Badge>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alertas">
            <Card>
              <CardHeader>
                <CardTitle>Alertas operacionais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertas.map((alerta: any) => (
                    <div key={alerta.id} className="rounded border p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> {alerta.titulo}</p>
                        <p className="text-xs text-muted-foreground">{alerta.descricao || 'Sem descrição'} · {formatDate(alerta.data_cadastro)}</p>
                      </div>
                      <Badge variant={alerta.severidade === 'critica' ? 'destructive' : 'secondary'}>{alerta.severidade}</Badge>
                    </div>
                  ))}
                  {!alertas.length && <p className="text-sm text-muted-foreground">Nenhum alerta pendente.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading && <p className="text-sm text-muted-foreground mt-4">Atualizando dados sociais...</p>}
      </ModulePage>
    </AppLayout>
  );
}
