/**
 * Optional extension: todo tags, filters, and bulk actions
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TagManager } from "@/features/todos/components/TagManager";
import { useBulkUpdateTodoStatus, useTodos } from "@/features/todos/api/todos";
import { api } from "@/lib/api";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

describe("tag form validation", () => {
  it("shows validation error when creating tag without a name", async () => {
    const { wrapper } = makeWrapper();
    render(<TagManager tags={[]} />, { wrapper });

    fireEvent.click(screen.getByRole("button", { name: "Create tag" }));

    expect(await screen.findByText("Tag name is required")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("todo filter query key behavior", () => {
  it("includes every filter parameter in the query key and request params", async () => {
    const { queryClient, wrapper } = makeWrapper();
    vi.mocked(api.get).mockResolvedValue({
      data: { items: [], total: 0, page: 2, size: 10 },
    });

    const filters = {
      status: "active" as const,
      tagId: "tag-1",
      keyword: "invoice",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-10",
    };
    const { result } = renderHook(() => useTodos(2, 10, filters), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith("/todos", {
      params: {
        page: 2,
        page_size: 10,
        status: "active",
        tag_id: "tag-1",
        keyword: "invoice",
        date_from: "2026-06-01",
        date_to: "2026-06-10",
      },
    });
    expect(
      queryClient.getQueryCache().findAll({
        queryKey: [
          "todos",
          {
            page: 2,
            size: 10,
            status: "active",
            tagId: "tag-1",
            keyword: "invoice",
            dateFrom: "2026-06-01",
            dateTo: "2026-06-10",
          },
        ],
      }).length
    ).toBe(1);
  });
});

describe("bulk action handling", () => {
  it("invalidates todo queries on success", async () => {
    const { queryClient, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.mocked(api.patch).mockResolvedValue({ data: { updated_count: 2 } });

    const { result } = renderHook(() => useBulkUpdateTodoStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ todoIds: ["a", "b"], completed: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.patch).toHaveBeenCalledWith("/todos/bulk-status", {
      todo_ids: ["a", "b"],
      completed: true,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["todos"] });
  });

  it("surfaces error state when bulk update fails", async () => {
    const { wrapper } = makeWrapper();
    vi.mocked(api.patch).mockRejectedValue(new Error("Forbidden"));

    const { result } = renderHook(() => useBulkUpdateTodoStatus(), { wrapper });

    await act(async () => {
      result.current.mutate({ todoIds: ["a"], completed: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
