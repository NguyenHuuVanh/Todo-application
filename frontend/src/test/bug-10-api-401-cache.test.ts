/**
 * BUG-10: Interceptor 401 xoa token nhung khong clear TanStack Query cache
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

const originalAdapter = api.defaults.adapter;

beforeEach(() => {
  window.history.pushState({}, "", "/login");
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  localStorage.clear();
  queryClient.clear();
});

describe("BUG-10: 401 interceptor clears auth and query cache", () => {
  it("clears local tokens and cached user data when API returns 401", async () => {
    localStorage.setItem("access_token", "stale-access-token");
    localStorage.setItem("refresh_token", "stale-refresh-token");
    queryClient.setQueryData(["currentUser"], { id: "user-1" });
    queryClient.setQueryData(["todos", { page: 1, size: 100 }], {
      items: [],
      total: 0,
      page: 1,
      size: 100,
    });

    api.defaults.adapter = async (config) =>
      Promise.reject({
        config,
        response: { status: 401 },
      });

    await expect(api.get("/auth/me")).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(queryClient.getQueryData(["currentUser"])).toBeUndefined();
    expect(
      queryClient.getQueryData(["todos", { page: 1, size: 100 }])
    ).toBeUndefined();
  });
});
