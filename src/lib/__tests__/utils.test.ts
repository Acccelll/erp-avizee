import { describe, expect, it } from "vitest";
import { cn, toSlug } from "@/lib/utils";

describe("utils helpers", () => {
  it("deve mesclar classes do tailwind respeitando override", () => {
    expect(cn("px-2 py-2", "px-4", undefined, false && "hidden")).toBe("py-2 px-4");
  });

  it("deve gerar slug sem acentos", () => {
    expect(toSlug("ERP AviZee Configurações")).toBe("erp-avizee-configuracoes");
  });
});
