/**
 * Login Page — Continue with Google (Alpha)
 */
import React, { useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.png";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildGoogleOAuthAuthorizationUrl } from "@/lib/googleOAuth";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();

  const startGoogleRedirect = () => {
    const redirectUri = `${window.location.origin}/oauth/google/callback`;
    sessionStorage.setItem("alpha_google_redirect_uri", redirectUri);
    const url = buildGoogleOAuthAuthorizationUrl(redirectUri);
    if (!url) {
      toast({
        title: t("login.googleUnavailableTitle"),
        description: t("login.googleUnavailableDescription"),
        variant: "destructive",
      });
      return;
    }
    const r = searchParams.get("redirect");
    if (r && r.startsWith("/") && !r.startsWith("//")) {
      sessionStorage.setItem("post_oauth_path", r);
    } else {
      sessionStorage.removeItem("post_oauth_path");
    }
    window.location.assign(url);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const r = searchParams.get("redirect");
    const path =
      r && r.startsWith("/") && !r.startsWith("//") ? r : "/dashboard";
    navigate(path, { replace: true });
  }, [authLoading, user, navigate, searchParams]);

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden items-center justify-center p-12 gradient-hero lg:flex lg:w-1/2">
        <div
          className="pointer-events-none absolute inset-0 hero-saas-noise opacity-30 mix-blend-overlay"
          aria-hidden
        />
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <LanguageSwitcher variant="onDark" />
          <ThemeToggle className="text-white hover:text-white hover:bg-white/20" />
        </div>
        <div className="relative z-[1] max-w-md animate-fade-in">
          <div className="mb-8 flex items-center gap-3">
            <img
              src={logo}
              alt="Alpha"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="flex flex-col space-y-1 leading-none">
              <span className="font-display text-2xl font-bold text-white leading-none">
                Alpha
              </span>
              <span className="text-xs text-white/60 leading-none">
                Tech Academy
              </span>
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4">
            {t("login.learnWithoutLimits")}
          </h1>
          <p className="text-lg text-white/70">{t("login.accessCourses")}</p>
        </div>
      </div>

      <div className="relative flex w-full items-center justify-center overflow-hidden bg-background p-6 dark:bg-[hsl(228_36%_8.5%)] lg:w-1/2">
        <div
          className="landing-section-mesh pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid opacity-[0.2] dark:opacity-[0.09]"
          aria-hidden
        />
        <div className="absolute left-4 top-4 z-10 flex gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft size={16} />
            <span>{t("login.backToHome")}</span>
          </Link>
        </div>
        <div className="absolute top-4 right-4 flex gap-2 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <Card className="relative z-[1] w-full max-w-md rounded-2xl border-border/55 bg-card/95 p-1 shadow-elevated backdrop-blur-md dark:border-border/40 dark:bg-card/75">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <img
                src={logo}
                alt="Alpha"
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="flex flex-col space-y-1 leading-none">
                <span className="font-display text-lg font-bold text-foreground leading-none">
                  Alpha
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  Tech Academy
                </span>
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-2 leading-9">
              {t("login.welcome")}
            </h2>
            <p className="text-muted-foreground mb-8 leading-6">
              {t("login.signinContinue")}
            </p>

            {googleClientId ? (
              <Button
                type="button"
                size="lg"
                className="h-12 w-full gap-3 rounded-xl border border-border/60 bg-white text-[15px] font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                onClick={startGoogleRedirect}
              >
                <svg
                  className="h-5 w-5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t("login.continueGoogle")}
              </Button>
            ) : (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-3 text-center text-sm leading-relaxed text-muted-foreground">
                {t("login.googleUnavailableHelp")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
