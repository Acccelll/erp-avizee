import { Fragment, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getRouteLabel } from '@/lib/navigation';

const configTabs: Record<string, string> = {
  geral: 'Empresa',
  usuarios: 'Usuários',
  email: 'E-mails',
  fiscal: 'Fiscal',
  financeiro: 'Financeiro',
  aparencia: 'Aparência',
};

const reportTabs: Record<string, string> = {
  estoque: 'Relatório de Estoque',
  financeiro: 'Relatório Financeiro',
  fluxo_caixa: 'Fluxo de Caixa',
  vendas: 'Relatório de Vendas',
  compras: 'Compras por Fornecedor',
};

export function resolvePageTitle(pathname: string, searchParams: URLSearchParams) {
  if (pathname === '/configuracoes') {
    const tab = searchParams.get('tab');
    if (tab && configTabs[tab]) return configTabs[tab];
  }

  if (pathname === '/relatorios') {
    const tipo = searchParams.get('tipo');
    if (tipo && reportTabs[tipo]) return reportTabs[tipo];
  }

  if (pathname === '/financeiro') {
    const tipo = searchParams.get('tipo');
    if (tipo === 'pagar') return 'Contas a Pagar';
    if (tipo === 'receber') return 'Contas a Receber';
  }

  if (pathname === '/fiscal') {
    const tipo = searchParams.get('tipo');
    const view = searchParams.get('view');
    if (tipo === 'entrada') return 'Notas de Entrada';
    if (tipo === 'saida') return 'Notas de Saída';
    if (view === 'consulta') return 'Consultar NF-e';
  }

  if (pathname === '/compras') {
    return searchParams.get('view') === 'cotacoes' ? 'Cotações de Compra' : 'Pedidos de Compra';
  }

  if (pathname === '/estoque') {
    const labels: Record<string, string> = {
      movimentacoes: 'Movimentações',
      posicao: 'Posição por Data',
      fechamento: 'Fechamento Mensal',
    };
    return labels[searchParams.get('view') || 'movimentacoes'] || 'Estoque';
  }

  return getRouteLabel(pathname);
}

export function AppBreadcrumbs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const items = useMemo(() => {
    const pathname = location.pathname;
    const base = [{ label: 'Dashboard', path: '/' }];

    if (pathname === '/') return base;

    const segments = pathname.split('/').filter(Boolean);
    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      base.push({ label: getRouteLabel(currentPath), path: currentPath });
    }

    const contextualLabel = resolvePageTitle(pathname, searchParams);
    const lastItem = base[base.length - 1];
    if (!lastItem || lastItem.label !== contextualLabel) {
      base.push({ label: contextualLabel, path: location.pathname + location.search });
    }

    return base;
  }, [location.pathname, location.search, searchParams]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.path}-${index}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.path}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
