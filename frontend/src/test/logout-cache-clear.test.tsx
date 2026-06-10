import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

const originalAdapter = api.defaults.adapter;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/todos"]}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.setItem("access_token", "access-token");
  localStorage.setItem("refresh_token", "refresh-token");
  queryClient.setQueryData(["currentUser"], { id: "user-1" });
  queryClient.setQueryData(["todos", { page: 1, size: 10 }], {
    items: [],
    total: 0,
    page: 1,
    size: 10,
  });
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  localStorage.clear();
  queryClient.clear();
});

describe("logout clears user-scoped cache", () => {
  it("removes tokens and clears TanStack Query data after logout", async () => {
    api.defaults.adapter = async (config) => ({
      config,
      data:
        config.url === "/auth/me"
          ? { id: "user-1", email: "user@example.com", created_at: "" }
          : {},
      headers: {},
      status: 200,
      statusText: "OK",
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.logout();
    });

    await waitFor(() => {
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
      expect(queryClient.getQueryData(["currentUser"])).toBeUndefined();
      expect(
        queryClient.getQueryData(["todos", { page: 1, size: 10 }])
      ).toBeUndefined();
    });
  });
});
