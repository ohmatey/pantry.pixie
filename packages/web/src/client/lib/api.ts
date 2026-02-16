/**
 * Shared API fetch utility with auth token injection
 */

import { useAuth } from "@/hooks/useAuth";

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
    useAuth.getState().logout();
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

export function apiGet<T = any>(path: string, token: string) {
  return apiFetch<T>(path, token);
}

export function apiPost<T = any>(path: string, token: string, body: unknown) {
  return apiFetch<T>(path, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPut<T = any>(path: string, token: string, body: unknown) {
  return apiFetch<T>(path, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function apiPatch<T = any>(path: string, token: string, body?: unknown) {
  return apiFetch<T>(path, token, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T = any>(path: string, token: string) {
  return apiFetch<T>(path, token, { method: "DELETE" });
}
