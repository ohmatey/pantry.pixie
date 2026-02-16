/**
 * Shared API fetch utility with auth token injection
 */

import { useAuthStore } from "../hooks/useAuth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch<T = any>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<{ success: boolean; data?: T; error?: string; timestamp?: string }> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const json = (await res.json()) as {
    success: boolean;
    data?: T;
    error?: string;
    timestamp?: string;
  };
  if (!json.success) {
    throw new Error(json.error || "Request failed");
  }
  return json;
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiGet<T = any>(path: string, token: string) {
  return apiFetch<T>(path, token);
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiPost<T = any>(path: string, token: string, body: unknown) {
  return apiFetch<T>(path, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiPut<T = any>(path: string, token: string, body: unknown) {
  return apiFetch<T>(path, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiPatch<T = any>(path: string, token: string, body?: unknown) {
  return apiFetch<T>(path, token, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiDelete<T = any>(path: string, token: string) {
  return apiFetch<T>(path, token, { method: "DELETE" });
}
