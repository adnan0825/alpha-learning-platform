/**
 * Handles OAuth redirect: /oauth/google/callback?code=...&scope=...
 *
 * Dedup strategy — two layers:
 * 1. Module-level `exchangingCode` flag: blocks a second call in the same JS context
 *    (React Strict Mode double-effect, fast re-renders).
 * 2. sessionStorage `alpha_oauth_exchanged`: blocks a second call after unmount/remount
 *    (Strict Mode tears down and recreates the component between the two effect runs).
 */
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Module-level lock — survives re-renders and Strict Mode double-effects in the same JS context.
let exchangingCode = false;

function postAuthNavigate(navigate: ReturnType<typeof useNavigate>) {
  const next = sessionStorage.getItem("post_oauth_path");
  sessionStorage.removeItem("post_oauth_path");
  sessionStorage.removeItem("alpha_google_redirect_uri");
  sessionStorage.removeItem("alpha_oauth_exchanged");
  const path =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
  navigate(path, { replace: true });
}

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogleCode, refreshProfile } = useAuth();
  const { toast } = useToast();
  const didRun = useRef(false);

  useEffect(() => {
    // useRef guard: only run once per component mount
    if (didRun.current) return;
    didRun.current = true;

    const err = searchParams.get("error");
    const desc = searchParams.get("error_description");
    const code = searchParams.get("code");

    const goLogin = (message?: string) => {
      toast({
        title: "Google Sign-In",
        description: message,
        variant: "destructive",
      });
      navigate("/login", { replace: true });
    };

    if (err) {
      goLogin(desc || err);
      return;
    }

    if (!code) {
      navigate("/login", { replace: true });
      return;
    }

    // Module-level lock: prevents double exchange in same JS context
    if (exchangingCode) return;

    // sessionStorage lock: prevents double exchange after Strict Mode remount
    const alreadyExchanged = sessionStorage.getItem("alpha_oauth_exchanged");
    if (alreadyExchanged === code) {
      void refreshProfile().then(() => postAuthNavigate(navigate));
      return;
    }

    exchangingCode = true;
    sessionStorage.setItem("alpha_oauth_exchanged", code);

    const stored = sessionStorage.getItem("alpha_google_redirect_uri");
    const redirectUri =
      stored && stored.endsWith("/oauth/google/callback")
        ? stored
        : `${window.location.origin}/oauth/google/callback`;

    void (async () => {
      try {
        await loginWithGoogleCode(code, redirectUri);
        postAuthNavigate(navigate);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        sessionStorage.removeItem("alpha_oauth_exchanged");
        goLogin(msg);
      } finally {
        exchangingCode = false;
      }
    })();
  }, [searchParams, navigate, loginWithGoogleCode, refreshProfile, toast]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <p className="text-sm font-medium text-foreground">Signing you in…</p>
      <p className="text-xs">Please wait.</p>
    </div>
  );
}
