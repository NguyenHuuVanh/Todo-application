/**
 * BUG-07: isAuthenticated đọc localStorage mỗi render → không reactive
 * BUG-08: JWT hết hạn vẫn qua ProtectedRoute
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "@/router/ProtectedRoute";

// Build a minimal JWT with given exp (seconds since epoch)
function makeToken(exp: number, type: string = "access"): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "user1", exp, type }));
  return `${header}.${payload}.signature`;
}

const expiredToken = makeToken(Math.floor(Date.now() / 1000) - 60);   // 1 min ago
const validToken = makeToken(Math.floor(Date.now() / 1000) + 3600);   // 1 hour ahead
const refreshToken = makeToken(Math.floor(Date.now() / 1000) + 3600, "refresh");

// ProtectedRoute redirects to /login, so we need a Routes setup
import { Routes, Route } from "react-router-dom";

const Protected = () => <div>Protected content</div>;
const Login = () => <div>Login page</div>;

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><Protected /></ProtectedRoute>} />
  </Routes>
);

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("BUG-08: ProtectedRoute rejects expired JWT", () => {
  it("redirects to /login when token is expired", () => {
    localStorage.setItem("access_token", expiredToken);
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("allows access when token is valid", () => {
    localStorage.setItem("access_token", validToken);
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects when token is not an access token", () => {
    localStorage.setItem("access_token", refreshToken);
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects when no token", () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});

describe("BUG-07: isAuthenticated is reactive via useState", () => {
  it("ProtectedRoute reads token fresh on each mount", () => {
    // First render without token → redirect
    const { unmount } = render(
      <MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>
    );
    expect(screen.getByText("Login page")).toBeInTheDocument();
    unmount();

    // Set token then mount again → allowed in
    localStorage.setItem("access_token", validToken);
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
