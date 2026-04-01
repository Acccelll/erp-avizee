import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

/** Maximum number of drawers that can be open simultaneously. */
export const MAX_DRAWER_DEPTH = 5;

export type EntityType =
  | "produto"
  | "cliente"
  | "fornecedor"
  | "orcamento"
  | "pedido_compra"
  | "nota_fiscal"
  | "remessa"
  | "ordem_venda";

const VALID_ENTITY_TYPES: ReadonlyArray<EntityType> = [
  "produto",
  "cliente",
  "fornecedor",
  "orcamento",
  "pedido_compra",
  "nota_fiscal",
  "remessa",
  "ordem_venda",
];

export interface ViewState {
  type: EntityType;
  id: string;
}

interface RelationalNavigationContextType {
  stack: ViewState[];
  /** True when a new drawer can be pushed without dropping the oldest entry. */
  canPush: boolean;
  pushView: (type: EntityType, id: string) => void;
  popView: () => void;
  clearStack: () => void;
}

// ── URL encoding helpers ──────────────────────────────────────────────────────

/** Encodes a ViewState to the `drawer` query param value. Format: `type:id` */
function encodeDrawerParam(view: ViewState): string {
  return `${view.type}:${view.id}`;
}

/** Decodes a `drawer` query param value back to a ViewState. Returns null if invalid. */
function decodeDrawerParam(value: string): ViewState | null {
  const colonIndex = value.indexOf(":");
  if (colonIndex === -1) return null;
  const type = value.slice(0, colonIndex) as EntityType;
  const id = value.slice(colonIndex + 1);
  if (!VALID_ENTITY_TYPES.includes(type) || !id) return null;
  return { type, id };
}

// ── Context ───────────────────────────────────────────────────────────────────

const RelationalNavigationContext = createContext<RelationalNavigationContextType | undefined>(undefined);

export function RelationalNavigationProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialise stack from URL on first render so shared links / hard-reloads
  // restore the drawer state.
  const [stack, setStack] = useState<ViewState[]>(() => {
    const drawerParams = searchParams.getAll("drawer");
    const parsed = drawerParams.map(decodeDrawerParam).filter(Boolean) as ViewState[];
    return parsed.slice(0, MAX_DRAWER_DEPTH);
  });

  // Keep a ref so the keyboard handler always sees the latest stack without
  // needing to re-register the listener.
  const stackRef = useRef(stack);
  stackRef.current = stack;

  // Sync stack → URL whenever the stack changes. We only write `drawer` params
  // and leave all other query params untouched.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("drawer");
        stack.forEach((v) => next.append("drawer", encodeDrawerParam(v)));
        return next;
      },
      { replace: true },
    );
  }, [stack, setSearchParams]);

  // Keyboard shortcuts:
  //   ESC         → The Sheet/Dialog (Radix UI) already closes the topmost drawer.
  //   Shift + ESC → Close ALL open drawers at once.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stackRef.current.length === 0) return;
      if (e.shiftKey) {
        // Prevent Radix from also firing its own ESC handler before we clear.
        e.stopImmediatePropagation();
        setStack([]);
      }
      // Plain ESC is already handled by the Radix Sheet component (onOpenChange).
    };

    window.addEventListener("keydown", handleKeyDown, /* capture */ true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  /** True when the stack has room for at least one more drawer without jumping. */
  const canPush = stack.length < MAX_DRAWER_DEPTH;

  /**
   * Push a new drawer onto the stack.
   * If the stack is already at MAX_DRAWER_DEPTH the oldest entry is dropped
   * automatically ("jump" mechanism) so the UI never exceeds the limit.
   */
  const pushView = useCallback((type: EntityType, id: string) => {
    setStack((prev) => {
      const next = [...prev, { type, id }];
      return next.length > MAX_DRAWER_DEPTH ? next.slice(next.length - MAX_DRAWER_DEPTH) : next;
    });
  }, []);

  const popView = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const clearStack = useCallback(() => {
    setStack([]);
  }, []);

  return (
    <RelationalNavigationContext.Provider value={{ stack, canPush, pushView, popView, clearStack }}>
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
