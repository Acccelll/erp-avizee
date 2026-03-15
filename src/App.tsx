import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
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
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
            <Route path="/cotacoes" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
            <Route path="/cotacoes/novo" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
            <Route path="/cotacoes/:id" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
            <Route path="/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
            <Route path="/orcamentos/novo" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
            <Route path="/orcamentos/:id" element={<ProtectedRoute><OrcamentoForm /></ProtectedRoute>} />
            <Route path="/ordens-venda" element={<ProtectedRoute><OrdensVenda /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
            <Route path="/fiscal" element={<ProtectedRoute><Fiscal /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            <Route path="/contas-bancarias" element={<ProtectedRoute><ContasBancarias /></ProtectedRoute>} />
            <Route path="/fluxo-caixa" element={<ProtectedRoute><FluxoCaixa /></ProtectedRoute>} />
            <Route path="/caixa" element={<ProtectedRoute><Caixa /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
