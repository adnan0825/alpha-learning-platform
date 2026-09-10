import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background dark:bg-[hsl(228_36%_8.5%)]">
      <div
        className="landing-section-mesh pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hero-saas-grid opacity-[0.18] dark:opacity-[0.08]"
        aria-hidden
      />
      <div className="relative z-[1] rounded-2xl border border-border/55 bg-card/90 px-10 py-12 text-center shadow-elevated backdrop-blur-md dark:border-border/40 dark:bg-card/70">
        <h1 className="font-display mb-2 text-5xl font-bold tracking-tight text-foreground">
          404
        </h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Oops! Page not found
        </p>
        <a
          href="/"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
