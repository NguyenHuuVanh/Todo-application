import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

function isTokenValid(token: string): boolean {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return false;
    }

    const normalizedPayload = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );
    const payload = JSON.parse(atob(paddedPayload));

    return (
      payload.type === "access" &&
      typeof payload.sub === "string" &&
      typeof payload.exp === "number" &&
      payload.exp * 1000 > Date.now()
    );
  } catch {
    return false;
  }
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem("access_token");

  if (!token || !isTokenValid(token)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
