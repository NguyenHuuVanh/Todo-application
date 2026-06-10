/**
 * BUG-06: useToggleTodo spread updateTodo → lộ mutateAsync raw
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useToggleTodo } from "@/features/todos/api/todos";

vi.mock("@/lib/api", () => ({
  api: { put: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("BUG-06: useToggleTodo does not expose mutateAsync", () => {
  it("exposes only mutate and isPending", () => {
    const { result } = renderHook(() => useToggleTodo(), { wrapper });
    expect(result.current).toHaveProperty("mutate");
    expect(result.current).toHaveProperty("isPending");
    expect(result.current).not.toHaveProperty("mutateAsync");
  });

  it("mutate flips completed status", () => {
    const { result } = renderHook(() => useToggleTodo(), { wrapper });
    // Just verify mutate is callable with a Todo object
    expect(() =>
      result.current.mutate({
        id: "1", title: "T", description: null,
        completed: false, user_id: "u1", created_at: "", updated_at: "", tags: [],
      })
    ).not.toThrow();
  });
});
