/**
 * BUG-02: onError bỏ qua context → optimistic update không rollback
 * BUG-04: queryKey tĩnh ["todos"] bỏ qua page/size params
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateTodo, useTodos } from "@/features/todos/api/todos";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockTodo = {
  id: "1", title: "Original", description: null,
  completed: false, user_id: "u1", created_at: "", updated_at: "", tags: [],
};

const mockList = { items: [mockTodo], total: 1, page: 1, size: 10 };

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("BUG-04: queryKey includes page and size", () => {
  it("useTodos() defaults to a backend-supported page size", async () => {
    const { wrapper } = makeWrapper();
    vi.mocked(api.get).mockResolvedValue({ data: mockList });

    const { result } = renderHook(() => useTodos(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith("/todos", {
      params: {
        page: 1,
        page_size: 10,
        status: undefined,
        tag_id: undefined,
        keyword: undefined,
        date_from: undefined,
        date_to: undefined,
      },
    });
  });

  it("useTodos(1, 20) and useTodos(1, 50) use different cache entries", async () => {
    const { queryClient, wrapper } = makeWrapper();
    vi.mocked(api.get).mockResolvedValue({ data: { ...mockList, size: 20 } });

    const { result: r1 } = renderHook(() => useTodos(1, 20), { wrapper });
    renderHook(() => useTodos(1, 50), { wrapper });

    await waitFor(() => expect(r1.current.isSuccess).toBe(true));

    const key1 = queryClient.getQueryCache().findAll({ queryKey: ["todos", { page: 1, size: 20 }] });
    const key2 = queryClient.getQueryCache().findAll({ queryKey: ["todos", { page: 1, size: 50 }] });

    // Each call registers its own cache entry
    expect(key1.length).toBe(1);
    expect(key2.length).toBe(1);
    expect(key1[0]).not.toBe(key2[0]);
  });
});

describe("BUG-02: onError rolls back optimistic update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restores previous cache when mutation fails", async () => {
    const { queryClient, wrapper } = makeWrapper();

    // Seed cache with known data
    queryClient.setQueryData(["todos", { page: 1, size: 10 }], mockList);

    vi.mocked(api.put).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useUpdateTodo(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: "1", data: { completed: true } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache must be restored to the pre-mutation snapshot
    const cache = queryClient.getQueryData<typeof mockList>(["todos", { page: 1, size: 10 }]);
    expect(cache?.items[0].completed).toBe(false);
  });
});
