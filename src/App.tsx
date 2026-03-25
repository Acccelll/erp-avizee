import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import GruposEconomicos from "./pages/GruposEconomicos";
import Fornecedores from "./pages/Fornecedores";
import Compras from "./pages/Compras";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoForm from "./pages/OrcamentoForm";
import OrdensVenda from "./pages/OrdensVenda";
import Estoque from "./pages/Estoque";
import Fiscal from "./pages/Fiscal";
import Financeiro from "./pages/Financeiro";
import Caixa from "./pages/Caixa";
import ContasBancarias from "./pages/ContasBancarias";
import FluxoCaixa from "./pages/FluxoCaixa";
import ContasContabeis from "./pages/ContasContabeis";
import Login from "./pages/Login";
import Pedidos from "./pages/Pedidos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Administracao from "./pages/Administracao";
import Auditoria from "./pages/Auditoria";
import Perfil from "./pages/Perfil";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Transportadoras from "./pages/Transportadoras";
import FormasPagamento from "./pages/FormasPagamento";
import CotacoesCompra from "./pages/CotacoesCompra";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <ErrorBoundary>
          <Routes>
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
            <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
            <Route path="/cotacoes-compra" element={<ProtectedRoute><CotacoesCompra /></ProtectedRoute>} />
            <Route path="/cotacoes" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
            <Route path="/cotacoes/novo" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
            <Route path="/cotacoes/:id" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
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
            <Route path="/auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/contas-contabeis-plano" element={<ProtectedRoute><ContasContabeis /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
