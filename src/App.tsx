import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Produtos = lazy(() => import("./pages/Produtos"));
const Clientes = lazy(() => import("./pages/Clientes"));
const GruposEconomicos = lazy(() => import("./pages/GruposEconomicos"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Compras = lazy(() => import("./pages/Compras"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const OrcamentoForm = lazy(() => import("./pages/OrcamentoForm"));
const OrdensVenda = lazy(() => import("./pages/OrdensVenda"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Fiscal = lazy(() => import("./pages/Fiscal"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Caixa = lazy(() => import("./pages/Caixa"));
const ContasBancarias = lazy(() => import("./pages/ContasBancarias"));
const FluxoCaixa = lazy(() => import("./pages/FluxoCaixa"));
const ContasContabeis = lazy(() => import("./pages/ContasContabeis"));
const Login = lazy(() => import("./pages/Login"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Administracao = lazy(() => import("./pages/Administracao"));
const MigracaoDados = lazy(() => import("./pages/MigracaoDados"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Transportadoras = lazy(() => import("./pages/Transportadoras"));
const FormasPagamento = lazy(() => import("./pages/FormasPagamento"));
const CotacoesCompra = lazy(() => import("./pages/CotacoesCompra"));
const PedidosCompra = lazy(() => import("./pages/PedidosCompra"));
const Remessas = lazy(() => import("./pages/Remessas"));
const Funcionarios = lazy(() => import("./pages/Funcionarios"));
const OrcamentoPublico = lazy(() => import("./pages/OrcamentoPublico"));

// Redirect component that properly maps :id param
function CotacaoIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/orcamentos/${id}`} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/orcamento-publico" element={<OrcamentoPublico />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
            <Route path="/transportadoras" element={<ProtectedRoute><Transportadoras /></ProtectedRoute>} />
            <Route path="/formas-pagamento" element={<ProtectedRoute><FormasPagamento /></ProtectedRoute>} />
            <Route path="/grupos-economicos" element={<ProtectedRoute><GruposEconomicos /></ProtectedRoute>} />
            <Route path="/funcionarios" element={<ProtectedRoute><Funcionarios /></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
            <Route path="/cotacoes-compra" element={<ProtectedRoute><CotacoesCompra /></ProtectedRoute>} />
            <Route path="/pedidos-compra" element={<ProtectedRoute><PedidosCompra /></ProtectedRoute>} />
            <Route path="/remessas" element={<ProtectedRoute><Remessas /></ProtectedRoute>} />
            <Route path="/cotacoes" element={<Navigate to="/orcamentos" replace />} />
            <Route path="/cotacoes/novo" element={<Navigate to="/orcamentos/novo" replace />} />
            <Route path="/cotacoes/:id" element={<CotacaoIdRedirect />} />
            <Route path="/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
            <Route path="/orcamentos/novo" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
            <Route path="/orcamentos/:id" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
            <Route path="/ordens-venda" element={<ProtectedRoute><OrdensVenda /></ProtectedRoute>} />
            <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
            <Route path="/fiscal" element={<ProtectedRoute><Fiscal /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            <Route path="/contas-bancarias" element={<ProtectedRoute><ContasBancarias /></ProtectedRoute>} />
            <Route path="/fluxo-caixa" element={<ProtectedRoute><FluxoCaixa /></ProtectedRoute>} />
            <Route path="/caixa" element={<ProtectedRoute><Caixa /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/administracao" element={<AdminRoute><Administracao /></AdminRoute>} />
            <Route path="/migracao-dados" element={<AdminRoute><MigracaoDados /></AdminRoute>} />
            <Route path="/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/contas-contabeis-plano" element={<ProtectedRoute><ContasContabeis /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
