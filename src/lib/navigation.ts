import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  LucideIcon,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Truck,
  User,
  Users,
  Wallet,
  Warehouse,
  FileSearch,
} from 'lucide-react';

export interface NavLeafItem {
  title: string;
  path: string;
  keywords?: string[];
}

export interface NavSubgroup {
  title: string;
  items: NavLeafItem[];
}

export interface NavSection {
  key: string;
  title: string;
  icon: LucideIcon;
  items: NavSubgroup[];
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  path: string;
  shortcut?: string;
}

export interface MobileBottomTab {
  key: string;
  title: string;
  icon: LucideIcon;
  path?: string;
}

export const dashboardItem: NavLeafItem = {
  title: 'Dashboard',
  path: '/',
  keywords: ['inicio', 'painel', 'visao geral'],
};

export const quickActions: QuickAction[] = [
  { id: 'nova-cotacao', title: 'Nova Cotação', description: 'Criar proposta comercial', path: '/cotacoes/novo', shortcut: '⌘N' },
  { id: 'novo-cliente', title: 'Novo Cliente', description: 'Cadastrar cliente rapidamente', path: '/clientes' },
  { id: 'novo-produto', title: 'Novo Produto', description: 'Abrir cadastro de produto', path: '/produtos' },
  { id: 'abrir-financeiro', title: 'Contas a Receber', description: 'Ir para o financeiro filtrado', path: '/financeiro?tipo=receber' },
];

export const navSections: NavSection[] = [
  {
    key: 'cadastros',
    title: 'Cadastros',
    icon: Users,
    items: [
      {
        title: 'Base cadastral',
        items: [
          { title: 'Produtos', path: '/produtos', keywords: ['sku', 'catalogo'] },
          { title: 'Clientes', path: '/clientes' },
          { title: 'Fornecedores', path: '/fornecedores' },
          { title: 'Transportadoras', path: '/transportadoras', keywords: ['frete', 'logistica'] },
          { title: 'Formas de Pagamento', path: '/formas-pagamento', keywords: ['prazo', 'parcelamento'] },
          { title: 'Grupos Econômicos', path: '/grupos-economicos', keywords: ['matriz', 'filiais'] },
        ],
      },
    ],
  },
  {
    key: 'comercial',
    title: 'Comercial',
    icon: FileText,
    items: [
      {
        title: 'Pipeline de vendas',
        items: [
          { title: 'Cotações', path: '/cotacoes', keywords: ['orcamentos', 'propostas'] },
          { title: 'Pedidos', path: '/pedidos', keywords: ['pipeline', 'pedidos comerciais'] },
          { title: 'Ordens de Venda', path: '/ordens-venda', keywords: ['ov', 'backlog'] },
        ],
      },
    ],
  },
  {
    key: 'compras',
    title: 'Compras',
    icon: ShoppingCart,
    items: [
      {
        title: 'Gestão de compras',
        items: [
          { title: 'Cotações de Compra', path: '/cotacoes-compra', keywords: ['comparacao', 'fornecedores'] },
          { title: 'Pedidos de Compra', path: '/compras', keywords: ['compras', 'fornecedores'] },
        ],
      },
    ],
  },
  {
    key: 'estoque',
    title: 'Estoque',
    icon: Warehouse,
    items: [
      {
        title: 'Controle de estoque',
        items: [
          { title: 'Posição Atual', path: '/estoque', keywords: ['saldo', 'inventario'] },
          { title: 'Movimentações', path: '/estoque?view=movimentacoes', keywords: ['entradas', 'saidas'] },
        ],
      },
    ],
  },
  {
    key: 'financeiro',
    title: 'Financeiro',
    icon: DollarSign,
    items: [
      {
        title: 'Execução financeira',
        items: [
          { title: 'Contas a Pagar', path: '/financeiro?tipo=pagar', keywords: ['cp', 'despesas'] },
          { title: 'Contas a Receber', path: '/financeiro?tipo=receber', keywords: ['cr', 'recebimentos'] },
          { title: 'Caixa', path: '/caixa' },
          { title: 'Fluxo de Caixa', path: '/fluxo-caixa' },
          { title: 'Contas Bancárias', path: '/contas-bancarias', keywords: ['bancos'] },
          { title: 'Plano de Contas', path: '/contas-contabeis-plano', keywords: ['contabil'] },
        ],
      },
    ],
  },
  {
    key: 'fiscal',
    title: 'Fiscal',
    icon: Receipt,
    items: [
      {
        title: 'Documentos fiscais',
        items: [
          { title: 'Notas de Entrada', path: '/fiscal?tipo=entrada' },
          { title: 'Notas de Saída', path: '/fiscal?tipo=saida' },
          { title: 'Consultar NF-e', path: '/fiscal?view=consulta', keywords: ['sefaz', 'chave', 'nfe'] },
        ],
      },
    ],
  },
  {
    key: 'relatorios',
    title: 'Relatórios',
    icon: BarChart3,
    items: [
      {
        title: 'Análises',
        items: [
          { title: 'Vendas', path: '/relatorios?tipo=vendas' },
          { title: 'Estoque', path: '/relatorios?tipo=estoque' },
          { title: 'Financeiro', path: '/relatorios?tipo=financeiro' },
          { title: 'Compras por Fornecedor', path: '/relatorios?tipo=compras' },
          { title: 'Fluxo de Caixa', path: '/relatorios?tipo=fluxo_caixa' },
        ],
      },
    ],
  },
  {
    key: 'administracao',
    title: 'Administração',
    icon: Settings,
    items: [
      {
        title: 'Gestão do sistema',
        items: [
          { title: 'Empresa', path: '/configuracoes?tab=geral' },
          { title: 'Usuários', path: '/configuracoes?tab=usuarios' },
          { title: 'E-mails', path: '/configuracoes?tab=email' },
          { title: 'Parâmetros Fiscais', path: '/configuracoes?tab=fiscal' },
          { title: 'Parâmetros Financeiros', path: '/configuracoes?tab=financeiro' },
          { title: 'Aparência', path: '/configuracoes?tab=aparencia' },
          { title: 'Auditoria', path: '/auditoria', keywords: ['logs', 'historico', 'rastreabilidade'] },
        ],
      },
    ],
  },
];

export const mobileBottomTabs: MobileBottomTab[] = [
  { key: 'inicio', title: 'Início', icon: LayoutDashboard, path: '/' },
  { key: 'comercial', title: 'Comercial', icon: FileText, path: '/cotacoes' },
  { key: 'cadastros', title: 'Cadastros', icon: Users, path: '/clientes' },
  { key: 'financeiro', title: 'Financeiro', icon: DollarSign, path: '/financeiro?tipo=receber' },
];

export const mobileMenuSections = navSections.filter((section) =>
  ['compras', 'estoque', 'fiscal', 'relatorios', 'administracao'].includes(section.key),
);

export const headerIcons: Record<string, LucideIcon> = {
  '/': LayoutDashboard,
  '/cotacoes': FileText,
  '/orcamentos': FileText,
  '/pedidos': ClipboardList,
  '/ordens-venda': ShoppingCart,
  '/compras': ShoppingCart,
  '/cotacoes-compra': ShoppingCart,
  '/produtos': Package,
  '/estoque': Warehouse,
  '/clientes': Users,
  '/fornecedores': Truck,
  '/transportadoras': Truck,
  '/formas-pagamento': CreditCard,
  '/grupos-economicos': Building2,
  '/financeiro': Wallet,
  '/contas-bancarias': DollarSign,
  '/fluxo-caixa': DollarSign,
  '/caixa': DollarSign,
  '/contas-contabeis-plano': FileSearch,
  '/fiscal': Receipt,
  '/relatorios': BarChart3,
  '/configuracoes': Settings,
  '/auditoria': Shield,
  '/perfil': User,
};

const baseRouteLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/cotacoes': 'Cotações',
  '/orcamentos': 'Cotações',
  '/pedidos': 'Pedidos',
  '/ordens-venda': 'Ordens de Venda',
  '/compras': 'Pedidos de Compra',
  '/cotacoes-compra': 'Cotações de Compra',
  '/produtos': 'Produtos',
  '/estoque': 'Estoque',
  '/clientes': 'Clientes',
  '/fornecedores': 'Fornecedores',
  '/transportadoras': 'Transportadoras',
  '/formas-pagamento': 'Formas de Pagamento',
  '/grupos-economicos': 'Grupos Econômicos',
  '/financeiro': 'Financeiro',
  '/contas-bancarias': 'Contas Bancárias',
  '/fluxo-caixa': 'Fluxo de Caixa',
  '/caixa': 'Caixa',
  '/contas-contabeis-plano': 'Plano de Contas',
  '/fiscal': 'Fiscal',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
  '/auditoria': 'Auditoria',
  '/perfil': 'Meu Perfil',
};

export type FlatNavItem = NavLeafItem & { section: string; subgroup: string };

export const flatNavItems: FlatNavItem[] = [
  { ...dashboardItem, section: '', subgroup: '' },
  ...navSections.flatMap((section) =>
    section.items.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        section: section.title,
        subgroup: group.title,
      })),
    ),
  ),
];

export function isPathActive(currentPath: string, targetPath: string) {
  const cleanTarget = targetPath.split('?')[0];
  if (cleanTarget === '/') return currentPath === '/';
  return currentPath === cleanTarget || currentPath.startsWith(`${cleanTarget}/`);
}

export function getRouteLabel(pathname: string) {
  if (baseRouteLabels[pathname]) return baseRouteLabels[pathname];
  const exactMatch = flatNavItems.find((item) => item.path === pathname);
  if (exactMatch) return exactMatch.title;
  const match = flatNavItems.find((item) => item.path.split('?')[0] === pathname);
  if (match) return match.title;
  if (pathname.startsWith('/orcamentos/')) return 'Cotação';
  if (pathname.startsWith('/cotacoes/')) return 'Cotação';
  if (pathname.startsWith('/clientes/')) return 'Cliente';
  if (pathname.startsWith('/produtos/')) return 'Produto';
  if (pathname.startsWith('/fiscal')) return 'Fiscal';
  return 'ERP AviZee';
}

export function getNavSectionKey(currentRoute: string) {
  if (currentRoute === '/' || currentRoute.startsWith('/?')) return 'inicio';
  const pathname = currentRoute.split('?')[0];
  const section = navSections.find((entry) =>
    entry.items.some((group) =>
      group.items.some((item) => pathname === item.path.split('?')[0] || pathname.startsWith(`${item.path.split('?')[0]}/`)),
    ),
  );
  return section?.key ?? 'menu';
}
