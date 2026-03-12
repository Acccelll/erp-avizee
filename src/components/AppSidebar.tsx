import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  FileText,
  Warehouse,
  Receipt,
  DollarSign,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Package, label: "Produtos", path: "/produtos" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Truck, label: "Fornecedores", path: "/fornecedores" },
  { icon: ShoppingCart, label: "Compras", path: "/compras" },
  { icon: FileText, label: "Orçamentos", path: "/orcamentos" },
  { icon: Warehouse, label: "Estoque", path: "/estoque" },
  { icon: Receipt, label: "Fiscal", path: "/fiscal" },
  { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
  { icon: Landmark, label: "Caixa", path: "/caixa" },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-300 z-50 ${
        collapsed ? "w-[68px]" : "w-[250px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg erp-gradient flex items-center justify-center flex-shrink-0">
          <span className="text-sidebar-primary-foreground font-bold text-sm">A</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sidebar-accent-foreground font-bold text-lg leading-tight">AviZee</h1>
            <p className="text-[10px] text-sidebar-muted tracking-widest uppercase">ERP System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? "sidebar-item-active" : "sidebar-item-inactive"}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <Link
          to="/configuracoes"
          className="sidebar-item sidebar-item-inactive"
          title={collapsed ? "Configurações" : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-item sidebar-item-inactive w-full"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
