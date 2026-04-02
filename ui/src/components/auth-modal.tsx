"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth, getGithubOAuthUrl, GITHUB_CLIENT_ID } from "@/lib/auth";
import { LuGithub } from "react-icons/lu";

interface AuthModalProps {
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export function AuthModal({ onClose, initialMode = "login" }: AuthModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] outline-none";
  const labelCls = "block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md bg-black/30"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[var(--color-surface)] shadow-[var(--shadow-elevated)] w-full max-w-[380px] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            {mode === "login" ? "Log in" : "Sign up"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] hover:bg-[var(--color-layer-2)] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {GITHUB_CLIENT_ID && (
            <>
              <button
                type="button"
                onClick={() => { window.location.href = getGithubOAuthUrl("login"); }}
                className="w-full py-2 text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-layer-1)] transition-colors flex items-center justify-center gap-2"
              >
                <LuGithub size={16} />
                Continue with GitHub
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-[var(--color-border)]" />
                <span className="text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wide">or</span>
                <div className="flex-1 border-t border-[var(--color-border)]" />
              </div>
            </>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ outline: "none", boxShadow: "none" }}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{ outline: "none", boxShadow: "none" }}
                className={inputCls}
                placeholder={mode === "signup" ? "At least 8 characters" : ""}
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? "..." : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <p className="text-center text-xs text-[var(--color-text-tertiary)]">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button onClick={() => { setMode("signup"); setError(""); }} className="text-[var(--color-accent)] hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} className="text-[var(--color-accent)] hover:underline">
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
