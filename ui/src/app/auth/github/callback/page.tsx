"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGithub, connectGithub, user } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") || "login";

    if (!code) {
      setError("No authorization code received from GitHub");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (state === "connect" && user) {
          await connectGithub(code);
        } else {
          await loginWithGithub(code);
        }
        if (!cancelled) router.push("/");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "GitHub authentication failed");
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams, loginWithGithub, connectGithub, user, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
          >
            Back to Hive
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-[var(--color-text-secondary)]">Connecting to GitHub...</p>
    </div>
  );
}
