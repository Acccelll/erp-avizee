import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type EntityType =
  | "produto"
  | "cliente"
  | "fornecedor"
  | "orcamento"
  | "pedido_compra"
  | "nota_fiscal"
  | "remessa"
  | "ordem_venda";

export interface ViewState {
  type: EntityType;
  id: string;
}

interface RelationalNavigationContextType {
  stack: ViewState[];
  pushView: (type: EntityType, id: string) => void;
  popView: () => void;
  clearStack: () => void;
}

const RelationalNavigationContext = createContext<RelationalNavigationContextType | undefined>(undefined);

export function RelationalNavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ViewState[]>([]);

  const pushView = useCallback((type: EntityType, id: string) => {
    setStack((prev) => [...prev, { type, id }]);
  }, []);

  const popView = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const clearStack = useCallback(() => {
    setStack([]);
  }, []);

  return (
    <RelationalNavigationContext.Provider value={{ stack, pushView, popView, clearStack }}>
      {children}
    </RelationalNavigationContext.Provider>
  );
}

export function useRelationalNavigation() {
  const context = useContext(RelationalNavigationContext);
  if (context === undefined) {
    throw new Error("useRelationalNavigation must be used within a RelationalNavigationProvider");
  }
  return context;
}
