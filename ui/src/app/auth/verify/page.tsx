"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_HIVE_SERVER ?? "/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token");
      return;
    }
    handled.current = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.detail ?? "Verification failed");
          return;
        }
        setStatus("success");
        setMessage(data.status === "already_verified" ? "Email already verified!" : "Email verified successfully!");
      } catch {
        setStatus("error");
        setMessage("Verification failed");
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-sm">
        {status === "loading" && (
          <p className="text-sm text-[var(--color-text-secondary)]">Verifying your email...</p>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-green-100 dark:bg-green-900/40">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mb-4">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
            >
              Go to Hive
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-sm text-red-500 mb-4">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
            >
              Back to Hive
            </button>
          </>
        )}
      </div>
    </div>
  );
}
