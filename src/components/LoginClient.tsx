"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mail, X } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { mkTheme } from "@/lib/themes";
import { SCHEMA_VERSION } from "@/lib/version";

// Use light Night City by default — user hasn't picked theme yet.
const t = mkTheme("warroom", false);
const YEAR = new Date().getFullYear();

// Official Google G icon SVG (multicolor — do NOT tint)
function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2045c0-.638-.0573-1.252-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.716v2.2581h2.908c1.7018-1.5668 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.908-2.258c-.8059.54-1.8368.859-3.0482.859-2.344 0-4.3282-1.5836-5.036-3.7105H.957v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71C3.7845 10.17 3.6818 9.5945 3.6818 9s.1027-1.17.2822-1.71V4.9582H.957C.3477 6.173 0 7.5477 0 9c0 1.4523.3477 2.827.957 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.957 4.9582L3.964 7.29C4.6718 5.1632 6.656 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );
}

// Spinner for in-flight states
function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        border: `2.5px solid ${t.bg}`,
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

type AuthState =
  | "idle"
  | "loading_google"
  | "loading_credentials"
  | "loading_signup";

export default function LoginClient() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [emailExpanded, setEmailExpanded] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupSecret, setSignupSecret] = useState("");
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isSignupError, setIsSignupError] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Already signed in — redirect immediately
  useEffect(() => {
    if (status === "authenticated" && session?.user?.fixedUserId) {
      router.replace("/");
    }
  }, [status, session, router]);

  // Auto-focus email input when expanded
  useEffect(() => {
    if (emailExpanded && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [emailExpanded]);

  const isInFlight = authState !== "idle";

  const clearError = useCallback(() => { setError(null); setIsSignupError(false); }, []);

  function getErrorMessage(err: string): string {
    if (err.startsWith("NOT_WHITELISTED:")) {
      const addr = err.replace("NOT_WHITELISTED:", "");
      return `NOT_WHITELISTED:${addr}`;
    }
    if (err === "NOT_WHITELISTED") {
      return email ? `NOT_WHITELISTED:${email}` : "// this email isn't on the access list. ping the admin.";
    }
    if (err === "NO_ACCOUNT") return "NO_ACCOUNT";
    if (err === "WRONG_PASSWORD") return "WRONG_PASSWORD";
    if (err === "OAuthSignin" || err === "OAuthCallback" || err === "OAuthCreateAccount") return "OAUTH_ERROR";
    if (err === "CredentialsSignin") return "WRONG_PASSWORD";
    return "NETWORK_ERROR";
  }

  async function handleGoogleSignIn() {
    setAuthState("loading_google");
    clearError();
    try {
      await signIn(
        "google",
        { callbackUrl: "/" },
        { prompt: "select_account" }
      );
    } catch {
      setAuthState("idle");
      setError("NETWORK_ERROR");
    }
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (isSignup) {
      await handleSignup();
    } else {
      await handleSignIn();
    }
  }

  async function handleSignIn() {
    setAuthState("loading_credentials");
    clearError();
    setIsSignupError(false);
    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    if (result?.ok) {
      // Success — fade out and redirect
      setFadeOut(true);
      setTimeout(() => router.push("/"), 200);
    } else {
      setAuthState("idle");
      const errCode = result?.error ?? "UNKNOWN";
      const mapped = getErrorMessage(errCode);
      setError(mapped);
      // Clear password on credential error
      if (mapped === "WRONG_PASSWORD" || errCode === "CredentialsSignin") {
        setPassword("");
        emailInputRef.current?.focus();
      }
    }
  }

  async function handleSignup() {
    setAuthState("loading_signup");
    clearError();
    setIsSignupError(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, secret: signupSecret }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; email?: string };
      if (!res.ok) {
        setAuthState("idle");
        if (data.error === "NOT_WHITELISTED") {
          setError(`NOT_WHITELISTED:${data.email ?? email}`);
        } else {
          setIsSignupError(false);
          setError(data.error ?? "NETWORK_ERROR");
        }
        return;
      }
      // Signup succeeded — now sign in
      await handleSignIn();
    } catch {
      setAuthState("idle");
      setError("NETWORK_ERROR");
    }
  }

  // Check for OAuth error in URL (next-auth redirects with ?error=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const errParam = params.get("error");
    const emailParam = params.get("email");
    if (errParam === "NOT_WHITELISTED" && emailParam) {
      setError(`NOT_WHITELISTED:${decodeURIComponent(emailParam)}`);
    } else if (errParam) {
      setError(getErrorMessage(errParam));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Already signed in state (SSR won't catch this on fast re-render)
  if (status === "authenticated") {
    return (
      <div style={{
        background: t.bg,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-dm-mono), monospace",
      }}>
        <span style={{ color: t.textDim, fontSize: 15 }}>signed in — redirecting…</span>
      </div>
    );
  }

  // Render the inline error line
  function renderError() {
    if (!error) return null;
    let line: React.ReactNode;

    if (error === "WRONG_PASSWORD") {
      line = (
        <>
          <span style={{ color: t.textDim }}>//</span>
          {" "}
          <span style={{ color: t.red }}>access denied — wrong email or password</span>
        </>
      );
    } else if (error === "NO_ACCOUNT") {
      // Explicit case — no double // prefix
      line = (
        <>
          <span style={{ color: t.textDim }}>//</span>
          {" "}
          <span style={{ color: t.red }}>no password set — try &apos;continue with google&apos; above, or set a password below.</span>
        </>
      );
    } else if (error.startsWith("NOT_WHITELISTED:")) {
      const addr = error.replace("NOT_WHITELISTED:", "");
      line = isSignupError ? (
        <>
          <span style={{ color: t.textDim }}>//</span>
          {" "}
          <span style={{ color: t.text }}>{addr}</span>
          {" "}
          <span style={{ color: t.red }}>isn&apos;t on the access list — signups are invite-only.</span>
        </>
      ) : (
        <>
          <span style={{ color: t.textDim }}>//</span>
          {" "}
          <span style={{ color: t.text }}>{addr}</span>
          {" "}
          <span style={{ color: t.red }}>isn&apos;t on the access list. ping the admin.</span>
        </>
      );
    } else if (error === "OAUTH_ERROR") {
      line = (
        <>
          <span style={{ color: t.textDim }}>//</span>
          {" "}
          <span style={{ color: t.red }}>google sign-in failed. try again or use email.</span>
        </>
      );
    } else if (error === "NETWORK_ERROR") {
      line = (
        <>
          <span style={{ color: t.textDim }}>//</span>
          {" "}
          <span style={{ color: t.red }}>signal lost. try again.</span>
        </>
      );
    } else {
      // Fallback for any other error string (e.g. from signup endpoint)
      // Strip leading "//" if present to avoid double prefix
      const displayError = error.startsWith("//") ? error.slice(2).trim() : error;
      line = (
        <>
          <span style={{ color: t.textDim }}>//</span>
          {" "}
          <span style={{ color: t.red }}>{displayError}</span>
        </>
      );
    }

    return (
      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          fontFamily: "var(--font-dm-mono), monospace",
          animation: "errIn 0.15s ease",
          lineHeight: 1.5,
        }}
      >
        {line}
      </div>
    );
  }

  const googleBtnLabel = authState === "loading_google" ? "opening google…" : "continue with google";

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes errIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); max-height: 0; } to { opacity: 1; transform: translateY(0); max-height: 300px; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .login-google-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0 24px ${t.accent}55 !important; }
        .login-google-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 0 24px ${t.accent}33 !important; }
        .login-email-link:hover { color: ${t.accent} !important; }
        .login-toggle-link:hover { color: ${t.accent} !important; }
        .login-input:focus { border-color: ${t.accent} !important; box-shadow: 0 0 0 3px ${t.accent}22 !important; outline: none; }
        .login-submit-btn:hover:not(:disabled) { opacity: 0.9; }
      `}</style>

      <div
        style={{
          background: t.bg,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "var(--font-dm-sans), sans-serif",
          position: "relative",
          overflow: "hidden",
          animation: fadeOut ? "fadeOut 0.2s ease forwards" : undefined,
        }}
      >
        {/* Ambient radial halo — the only decoration */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${t.accent}14 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Main column */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 440,
            padding: "64px 24px 64px",
            boxSizing: "border-box",
          }}
        >
          {/* Brand lockup */}
          <div style={{ marginBottom: 64 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>🏴‍☠️</span>
              <span
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  color: t.text,
                  letterSpacing: -0.3,
                }}
              >
                Binayah Ultimate
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 13,
                color: t.textDim,
                fontStyle: "italic",
              }}
            >
              {/* t.sub from warroom theme */}
              { }
              // where strategies are forged
            </div>
          </div>

          {/* Google button */}
          <button
            className="login-google-btn"
            onClick={handleGoogleSignIn}
            disabled={isInFlight}
            style={{
              width: "100%",
              height: 44,
              background: t.accent,
              color: t.bg,
              border: "none",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontWeight: 600,
              fontSize: 15,
              cursor: isInFlight ? "not-allowed" : "pointer",
              opacity: isInFlight && authState !== "loading_google" ? 0.5 : 1,
              boxShadow: `0 0 24px ${t.accent}33`,
              transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out, opacity 0.15s",
              letterSpacing: 0,
            }}
            aria-label="Continue with Google"
          >
            {authState === "loading_google" ? <Spinner /> : <GoogleGIcon />}
            {googleBtnLabel}
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "20px 0 0",
              gap: 0,
            }}
          >
            <div style={{ flex: 1, height: 1, background: t.border }} />
            <span
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 13,
                color: t.textDim,
                padding: "0 8px",
                background: t.bg,
              }}
            >
              or
            </span>
            <div style={{ flex: 1, height: 1, background: t.border }} />
          </div>

          {/* Email toggle — styled as secondary CTA matching Google button height */}
          <div style={{ marginTop: 12 }}>
            <button
              className="login-email-link"
              onClick={() => { setEmailExpanded(!emailExpanded); clearError(); }}
              disabled={isInFlight}
              style={{
                width: "100%",
                height: 44,
                background: "transparent",
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: isInFlight ? "not-allowed" : "pointer",
                fontFamily: "var(--font-dm-mono), monospace",
                fontSize: 15,
                color: t.textSec,
                transition: "border-color 0.15s, color 0.15s",
                opacity: isInFlight ? 0.5 : 1,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {emailExpanded ? <X size={14} strokeWidth={2} /> : <Mail size={14} strokeWidth={1.8} />}
                {emailExpanded ? "hide email form" : "sign in with email"}
              </span>
            </button>
          </div>

          {/* Email form — inline expand */}
          {emailExpanded && (
            <form
              onSubmit={handleCredentialsSubmit}
              style={{
                marginTop: 16,
                animation: "slideDown 0.2s ease-out",
                overflow: "hidden",
              }}
              noValidate
            >
              {/* Email input */}
              <input
                ref={emailInputRef}
                className="login-input"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError(); }}
                placeholder="email"
                autoComplete="email"
                readOnly={authState === "loading_credentials" || authState === "loading_signup"}
                style={{
                  width: "100%",
                  height: 44,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: "0 12px",
                  fontSize: 15,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: t.text,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxSizing: "border-box",
                  display: "block",
                  marginBottom: 8,
                }}
              />

              {/* Password input */}
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); clearError(); }}
                placeholder="your password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                readOnly={authState === "loading_credentials" || authState === "loading_signup"}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCredentialsSubmit(e as unknown as React.FormEvent); } }}
                style={{
                  width: "100%",
                  height: 44,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: "0 12px",
                  fontSize: 15,
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  color: t.text,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxSizing: "border-box",
                  display: "block",
                }}
              />

              {/* Signup secret — only shown in signup mode */}
              {isSignup && (
                <input
                  className="login-input"
                  type="password"
                  value={signupSecret}
                  onChange={e => { setSignupSecret(e.target.value); clearError(); }}
                  placeholder="signup secret"
                  autoComplete="off"
                  readOnly={authState === "loading_credentials" || authState === "loading_signup"}
                  style={{
                    width: "100%",
                    height: 44,
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    padding: "0 12px",
                    fontSize: 15,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    color: t.text,
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    boxSizing: "border-box",
                    display: "block",
                    marginTop: 8,
                  }}
                />
              )}

              {/* Bottom row: signup toggle + submit */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  className="login-toggle-link"
                  onClick={() => { setIsSignup(!isSignup); clearError(); setSignupSecret(""); }}
                  disabled={isInFlight}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: isInFlight ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-dm-mono), monospace",
                    fontSize: 13,
                    color: t.textSec,
                    transition: "color 0.15s",
                    flexShrink: 0,
                  }}
                >
                  {isSignup ? "← back to sign in" : "first time? set a password →"}
                </button>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={isInFlight || !email.trim() || !password.trim()}
                  style={{
                    height: 36,
                    padding: "0 16px",
                    background: t.accent,
                    color: t.bg,
                    border: "none",
                    borderRadius: 8,
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: (isInFlight || !email.trim() || !password.trim()) ? "not-allowed" : "pointer",
                    opacity: (isInFlight || !email.trim() || !password.trim()) ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    transition: "opacity 0.15s",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {(authState === "loading_credentials" || authState === "loading_signup") && <Spinner />}
                  {authState === "loading_credentials"
                    ? "verifying…"
                    : authState === "loading_signup"
                    ? "provisioning…"
                    : isSignup
                    ? "create access"
                    : "sign in"}
                </button>
              </div>

              {/* Inline error */}
              {renderError()}
            </form>
          )}

          {/* OAuth error shown outside email form */}
          {!emailExpanded && error && renderError()}
        </div>

        {/* Footer — fixed bottom-left HUD watermark */}
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: 24,
            fontFamily: "var(--font-dm-mono), monospace",
            fontSize: 13,
            color: t.textDim,
            zIndex: 1,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          binayah ultimate · {SCHEMA_VERSION} · {YEAR}
        </div>
      </div>
    </>
  );
}
