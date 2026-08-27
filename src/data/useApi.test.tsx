// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApi, invalidateCache } from "./useApi";

function mockFetchOnce(data: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

beforeEach(() => {
  // Cada teste usa um path único para não colidir com o cache global do módulo.
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useApi", () => {
  it("carrega e retorna data (loading→data)", async () => {
    vi.stubGlobal("fetch", mockFetchOnce([{ a: 1 }]));
    const { result } = renderHook(() => useApi<any[]>("/api/t1"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ a: 1 }]);
    expect(result.current.error).toBeNull();
  });

  it("expõe erro de HTTP e NÃO zera data anterior em refetch com erro", async () => {
    // 1ª chamada OK popula cache/data
    vi.stubGlobal("fetch", mockFetchOnce([{ ok: true }]));
    const { result } = renderHook(() => useApi<any[]>("/api/t2"));
    await waitFor(() => expect(result.current.data).toEqual([{ ok: true }]));

    // Refetch (invalidação) agora falha → data preservado, error setado
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "boom" }) }));
    act(() => invalidateCache("/api/t2"));
    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.data).toEqual([{ ok: true }]); // não piscou p/ vazio
  });

  it("revalida quando o cache é invalidado por prefixo", async () => {
    // Valor atual servido pelo fetch; muda antes da invalidação.
    let current = [{ v: 1 }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => ({ ok: true, status: 200, json: async () => current })),
    );
    const { result } = renderHook(() => useApi<any[]>("/api/t3"));
    await waitFor(() => expect(result.current.data).toEqual([{ v: 1 }]));

    current = [{ v: 2 }];
    act(() => invalidateCache("/api/"));
    await waitFor(() => expect(result.current.data).toEqual([{ v: 2 }]));
  });
});
