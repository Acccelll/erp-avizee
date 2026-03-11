import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Produtos from "./pages/Produtos.tsx";
import Clientes from "./pages/Clientes.tsx";
import Fornecedores from "./pages/Fornecedores.tsx";
import Compras from "./pages/Compras.tsx";
import Orcamentos from "./pages/Orcamentos.tsx";
import Estoque from "./pages/Estoque.tsx";
import Fiscal from "./pages/Fiscal.tsx";
import Financeiro from "./pages/Financeiro.tsx";
import Caixa from "./pages/Caixa.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/fiscal" element={<Fiscal />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/caixa" element={<Caixa />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
