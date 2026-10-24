"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { useLiff } from "./LiffProvider";

// Loads the profile and sends first-time users to onboarding (UX flow step 1).
export function useProfile({ redirectIfMissing = true } = {}) {
  const { ready, apiFetch } = useLiff();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    apiFetch<{ profile: Profile | null; displayName: string | null }>("/api/profile")
      .then((result) => {
        setDisplayName(result.displayName);
        if (!result.profile && redirectIfMissing) {
          router.replace("/onboarding");
          return;
        }
        setProfile(result.profile);
        setLoading(false);
      })
      .catch((loadError: Error) => {
        setError(loadError.message);
        setLoading(false);
      });
  }, [ready, apiFetch, router, redirectIfMissing]);

  return { profile, displayName, loading, error };
}
