"use client";

import liff from "@line/liff";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface LiffContextValue {
  ready: boolean;
  error: string | null;
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const LiffContext = createContext<LiffContextValue | null>(null);

const DEV_LINE_USER_ID = process.env.NEXT_PUBLIC_DEV_LINE_USER_ID;

export function LiffProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEV_LINE_USER_ID) {
      setReady(true);
      return;
    }
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) {
      setError("NEXT_PUBLIC_LIFF_ID is not configured");
      return;
    }
    liff
      .init({ liffId })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        setReady(true);
      })
      .catch((initError: unknown) => {
        setError(initError instanceof Error ? initError.message : "LIFF initialization failed");
      });
  }, []);

  const apiFetch = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const headers = new Headers(init.headers);
    if (DEV_LINE_USER_ID) {
      headers.set("x-dev-line-user-id", DEV_LINE_USER_ID);
    } else {
      const idToken = liff.getIDToken();
      if (idToken) headers.set("Authorization", `Bearer ${idToken}`);
    }
    if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");

    const response = await fetch(path, { ...init, headers });
    if (response.status === 401 && !DEV_LINE_USER_ID) {
      // The cached ID token expired; a fresh login issues a new one.
      liff.logout();
      liff.login({ redirectUri: window.location.href });
    }
    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(response.status, body.error ?? `Request failed (${response.status})`);
    return body as T;
  }, []);

  return <LiffContext.Provider value={{ ready, error, apiFetch }}>{children}</LiffContext.Provider>;
}

export function useLiff(): LiffContextValue {
  const context = useContext(LiffContext);
  if (!context) throw new Error("useLiff must be used inside LiffProvider");
  return context;
}

export function closeLiffWindow() {
  if (liff.isInClient()) liff.closeWindow();
}
