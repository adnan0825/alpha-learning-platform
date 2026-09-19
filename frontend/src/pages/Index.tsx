/**
 * Landing Page - Alpha
 * Premium editorial design with real imagery, refined typography, and smooth animations.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logo from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  ArrowRight,
  CheckCircle,
  Award,
  Star,
  Smartphone,
  Globe,
  Bot,
  TrendingUp,
  Code,
  MessageCircle,
  Palette,
  Languages,
  MapPin,
  Phone,
  Mail,
  Play,
  Clock,
  ChevronRight,
  Search,
  Menu,
  X,
  Sparkles,
  Quote,
} from "lucide-react";
import {
  coursesAPI,
  settingsAPI,
  type CourseData,
  type FaqItem,
} from "@/lib/api";
import { getPublicIntroVideo } from "@/lib/courseIntro";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { goSignInOrDashboard } from "@/lib/authNavigation";
import { useToast } from "@/hooks/use-toast";
import { HeroDashboardMock } from "@/components/landing/HeroDashboardMock";
import {
  IconTelegram,
  IconFacebook,
  IconLinkedIn,
  IconYouTube,
  IconTikTok,
} from "@/components/landing/SocialBrandIcons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.5,
      ease: [0, 0, 0.2, 1] as const,
    },
  }),
};

type ShowcaseCourse = {
  key: string;
  title: string;
  category: string;
  image: string;
  instructor: string;
  lectures: number;
  duration: string;
  priceLabel: string;
  priceSecondary: string;
  rating: number;
  reviews: number;
  loginRedirect: string;
  /** Free intro playable without login; null if no URL configured. */
  intro: { url: string; title: string } | null;
};

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("All");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [apiCourses, setApiCourses] = useState<CourseData[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [landingAppearance, setLandingAppearance] = useState<{
    heroIntroVideoUrl?: string;
  }>({});
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [faqFetchFailed, setFaqFetchFailed] = useState(false);
  const [introDialog, setIntroDialog] = useState<{
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const published = await coursesAPI.getPublished();
        if (!cancelled) setApiCourses(published);
      } catch {
        if (!cancelled) setApiCourses([]);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [app, faqRes] = await Promise.all([
          settingsAPI.getAppearance(),
          settingsAPI.getFaq(),
        ]);
        if (cancelled) return;
        setLandingAppearance(app || {});
        setFaqItems(Array.isArray(faqRes?.items) ? faqRes.items : []);
        setFaqFetchFailed(false);
      } catch {
        if (!cancelled) {
          setLandingAppearance({});
          setFaqItems([]);
          setFaqFetchFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const faqDisplayItems: FaqItem[] = useMemo(() => {
    const defaultItems: FaqItem[] = [
      {
        id: "default-faq-1",
        question: t("landing.faqDefault1Q"),
        answer: t("landing.faqDefault1A"),
      },
      {
        id: "default-faq-2",
        question: t("landing.faqDefault2Q"),
        answer: t("landing.faqDefault2A"),
      },
      {
        id: "default-faq-3",
        question: t("landing.faqDefault3Q"),
        answer: t("landing.faqDefault3A"),
      },
    ];

    const fromApi = faqItems
      .filter(
        (f) =>
          f.question?.trim() ||
          f.questionSm?.trim() ||
          f.questionSomali?.trim() ||
          f.question_sm?.trim(),
      )
      .map((f, index) => {
        const fallback = defaultItems[index % defaultItems.length];
        return {
          ...f,
          question:
            f.question?.trim() ||
            f.questionSm?.trim() ||
            f.questionSomali?.trim() ||
            f.question_sm?.trim() ||
            fallback.question,
          answer:
            f.answer?.trim() ||
            f.answerSm?.trim() ||
            f.answerSomali?.trim() ||
            f.answer_sm?.trim() ||
            fallback.answer,
        };
      });
    if (fromApi.length > 0) return fromApi;
    return defaultItems;
  }, [faqItems, t]);

  const showcaseCourses: ShowcaseCourse[] = useMemo(() => {
    return apiCourses.map((c) => {
      const intro = getPublicIntroVideo(c);
      return {
        key: c.id,
        title: c.title,
        category: c.category,
        image: c.thumbnail || "",
        instructor: c.instructorName || "Instructor",
        lectures: (c.totalVideos ?? 0) + (intro ? 1 : 0),
        duration: c.duration || "—",
        priceLabel: `ETB ${Number(c.price || 0).toLocaleString()}`,
        priceSecondary: "",
        rating: 4.8,
        reviews: c.enrolledCount ?? 0,
        loginRedirect: `/course/${c.id}`,
        intro,
      };
    });
  }, [apiCourses]);

  const categories = useMemo(() => {
    const cats = [...new Set(showcaseCourses.map((c) => c.category))].sort();
    return ["All", ...cats];
  }, [showcaseCourses]);

  const filteredCourses = useMemo(() => {
    const byCat =
      activeCategory === "All"
        ? showcaseCourses
        : showcaseCourses.filter((c) => c.category === activeCategory);
    const q = courseSearch.trim().toLowerCase();
    if (!q) return byCat;
    return byCat.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [showcaseCourses, activeCategory, courseSearch]);

  const displayedCourses = useMemo(
    () => (showAllCourses ? filteredCourses : filteredCourses.slice(0, 6)),
    [filteredCourses, showAllCourses],
  );

  const openCourse = (course: ShowcaseCourse) => {
    navigate(course.loginRedirect);
  };

  const featureItems: {
    icon: React.ReactNode;
    labelKey: TranslationKey;
    taglineKey: TranslationKey;
    descKey: TranslationKey;
    /** Full-width row on large screens (e.g. flagship program). */
    wide?: boolean;
    /** Slightly stronger border/background. */
    highlighted?: boolean;
  }[] = [
    {
      icon: <Smartphone size={22} />,
      labelKey: "features.offer.mobile",
      taglineKey: "features.offer.mobile.tagline",
      descKey: "features.offer.mobile.desc",
    },
    {
      icon: <Globe size={22} />,
      labelKey: "features.offer.web",
      taglineKey: "features.offer.web.tagline",
      descKey: "features.offer.web.desc",
    },
    {
      icon: <Bot size={22} />,
      labelKey: "features.offer.ai",
      taglineKey: "features.offer.ai.tagline",
      descKey: "features.offer.ai.desc",
    },
    {
      icon: <TrendingUp size={22} />,
      labelKey: "features.offer.marketing",
      taglineKey: "features.offer.marketing.tagline",
      descKey: "features.offer.marketing.desc",
    },
    {
      icon: <Palette size={22} />,
      labelKey: "features.offer.designEditing",
      taglineKey: "features.offer.designEditing.tagline",
      descKey: "features.offer.designEditing.desc",
    },
    {
      icon: <Code size={22} />,
      labelKey: "features.offer.programming",
      taglineKey: "features.offer.programming.tagline",
      descKey: "features.offer.programming.desc",
    },
    {
      icon: <Languages size={22} />,
      labelKey: "features.offer.fluent90",
      taglineKey: "features.offer.fluent90.tagline",
      descKey: "features.offer.fluent90.desc",
      wide: true,
      highlighted: true,
    },
  ];

  const testimonials = [
    {
      name: "Ahmed Ibrahim",
      role: t("landing.testimonial.ahmed.role"),
      text: t("landing.testimonial.ahmed.text"),
      avatar: "A",
    },
    {
      name: "Fatima Hassan",
      role: t("landing.testimonial.fatima.role"),
      text: t("landing.testimonial.fatima.text"),
      avatar: "F",
    },
    {
      name: "Mohammed Abdella",
      role: t("landing.testimonial.mohammed.role"),
      text: t("landing.testimonial.mohammed.text"),
      avatar: "M",
    },
  ];

  return (
    <div className="landing-page-root min-h-screen overflow-x-clip">
      {/* Navigation — sticky below root uses overflow-x-clip so position sticks to viewport */}
      <nav className="sticky top-0 z-[100] border-b border-border/50 bg-background/80 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 dark:border-border/35 dark:bg-background/80 dark:supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-3 rounded-xl outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
          >
            <span className="relative">
              <img
                src={logo}
                alt="Alpha"
                className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-border/40 dark:ring-border/30"
              />
            </span>
            <div className="flex flex-col -space-y-1 leading-none">
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Alpha
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Tech Academy
              </span>
            </div>
          </a>
          <div className="hidden items-center gap-1 md:flex">
            <a
              href="#courses"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/30"
            >
              {t("nav.courses")}
            </a>
            <a
              href="#about"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/30"
            >
              {t("nav.about")}
            </a>
            <a
              href="#testimonials"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/30"
            >
              {t("nav.reviews")}
            </a>
            <a
              href="#contact"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/30"
            >
              {t("nav.contact")}
            </a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Button
                size="sm"
                className="hidden h-9 rounded-lg shadow-glow-accent gradient-accent px-4 text-accent-foreground hover:opacity-90 sm:inline-flex"
                asChild
              >
                <Link to="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="hidden h-9 rounded-lg sm:inline-flex"
                >
                  {t("nav.signin")}
                </Button>
                <Button
                  size="sm"
                  className="hidden h-9 rounded-lg shadow-glow-accent gradient-accent px-4 text-accent-foreground hover:opacity-90 sm:inline-flex"
                  onClick={() => navigate("/login")}
                >
                  {t("nav.getStarted")}{" "}
                  <ChevronRight size={14} className="ml-1" />
                </Button>
              </>
            )}
            <button
              type="button"
              className="rounded-lg p-2 text-foreground md:hidden hover:bg-muted/60"
              aria-label={t("landing.menu")}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border/40 bg-background overflow-hidden"
            >
              <div className="px-4 py-4 flex flex-col gap-3">
                <a
                  href="#courses"
                  className="text-sm font-medium text-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.courses")}
                </a>
                <a
                  href="#about"
                  className="text-sm font-medium text-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.about")}
                </a>
                <a
                  href="#testimonials"
                  className="text-sm font-medium text-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.reviews")}
                </a>
                <a
                  href="#contact"
                  className="text-sm font-medium text-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav.contact")}
                </a>
                {user ? (
                  <Button
                    className="gradient-accent text-accent-foreground w-full mt-2"
                    asChild
                  >
                    <Link to="/dashboard">{t("nav.dashboard")}</Link>
                  </Button>
                ) : (
                  <Button
                    className="gradient-accent text-accent-foreground w-full mt-2"
                    onClick={() => navigate("/login")}
                  >
                    {t("nav.getStarted")}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero — premium SaaS: mesh bg, gradient headline, dashboard mock */}
      <section className="hero-landing-surface relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-[15%] h-[min(100vw,28rem)] w-[min(100vw,28rem)] rounded-full bg-accent/22 blur-[100px]" />
          <div className="absolute top-1/4 -right-20 h-[min(90vw,24rem)] w-[min(90vw,24rem)] rounded-full bg-primary/[0.08] blur-[88px] dark:bg-accent/12" />
          <div className="absolute bottom-0 left-[-10%] h-[18rem] w-[18rem] rounded-full bg-accent/14 blur-[72px]" />
          <div className="absolute bottom-[18%] right-[20%] h-[14rem] w-[14rem] rounded-full bg-[hsl(265_70%_65%)]/18 blur-[80px]" />
        </div>
        <div className="pointer-events-none absolute inset-0 hero-saas-grid opacity-[0.5] dark:opacity-50" />
        <div className="pointer-events-none absolute inset-0 hero-saas-noise mix-blend-overlay" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8 py-20 lg:py-32">
          <div className="flex flex-col items-center">
            <motion.div
              className="w-full flex flex-col items-center text-center"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              <motion.div
                variants={fadeUp}
                custom={0}
                className="flex justify-center mb-7"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.09] px-4 py-1.5 text-sm font-medium text-accent shadow-sm backdrop-blur-sm">
                  <GraduationCap size={16} /> {t("hero.badge")}
                </span>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                custom={1}
                className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem] font-bold leading-[1.06] tracking-tight text-foreground max-w-3xl mx-auto mb-3"
              >
                <span className="block">{t("hero.title1")}</span>
                <span className="mt-1.5 block sm:mt-2 hero-headline-gradient">
                  {t("hero.title2")}
                </span>
              </motion.h1>
              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10 sm:mb-11"
              >
                {t("hero.subtitle")}
              </motion.p>
              <motion.div
                variants={fadeUp}
                custom={3}
                className="flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="gradient-accent h-12 px-8 text-base font-semibold text-accent-foreground shadow-glow-accent rounded-xl hover:opacity-90"
                  onClick={() => goSignInOrDashboard(navigate, !!user)}
                >
                  {user ? t("nav.dashboard") : t("hero.cta")}{" "}
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-border/80 bg-background/40 px-8 text-base backdrop-blur-sm rounded-xl hover:bg-muted/50"
                  onClick={() =>
                    document
                      .getElementById("courses")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t("hero.exploreCourses")}{" "}
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </motion.div>
            </motion.div>

            <div className="relative mt-20 flex w-full max-w-7xl justify-center lg:mt-28">
              <div
                className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[min(55vw,30rem)] w-[min(96vw,56rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px] dark:bg-accent/25"
                aria-hidden
              />

              <div className="relative z-10 w-full max-w-6xl px-1 transition-transform duration-500 ease-out [perspective:1200px] hover:-translate-y-1.5 sm:px-2">
                <div
                  className="mx-auto rounded-[1.35rem] shadow-[0_24px_80px_-20px_hsl(var(--foreground)/0.12)] dark:shadow-[0_28px_90px_-24px_hsl(0_0%_0%/0.45)]"
                  style={{ transform: "rotateX(1.5deg)" }}
                >
                  <div className="relative -rotate-[0.2deg] sm:-rotate-[0.45deg]">
                    <HeroDashboardMock
                      introVideoSrc={
                        landingAppearance.heroIntroVideoUrl?.trim() || undefined
                      }
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-36 rounded-b-[1.25rem] bg-gradient-to-t from-background from-25% via-background/85 via-50% to-transparent sm:h-44 sm:from-20%"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we offer — centered to match hero */}
      <section className="landing-section-mesh relative overflow-hidden bg-[hsl(220_20%_96.5%)] px-4 py-16 dark:bg-muted/20 lg:px-8 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 lg:mb-16 flex w-full flex-col items-center text-center"
          >
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold leading-tight tracking-tight text-foreground max-w-3xl mx-auto">
              {t("features.title")}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              {t("features.subtitle")}
            </p>
          </motion.div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {featureItems.map((f, i) => (
              <motion.article
                key={f.labelKey}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "flex h-full min-h-[14rem] flex-col items-center rounded-2xl border bg-card px-5 py-6 text-center shadow-card transition-all sm:min-h-[15.5rem] sm:px-6 sm:py-7",
                  f.highlighted
                    ? "border-accent/35 ring-2 ring-accent/15 hover:border-accent/45 hover:shadow-elevated hover:ring-accent/25 dark:border-accent/30 dark:bg-accent/[0.04] dark:ring-accent/20 dark:hover:border-accent/40 dark:hover:bg-accent/[0.06]"
                    : "border-border/60 ring-1 ring-border/25 hover:border-accent/35 hover:shadow-elevated hover:ring-accent/12 dark:border-border/40 dark:bg-card/55 dark:ring-border/20 dark:hover:border-accent/25 dark:hover:bg-card/60 dark:hover:shadow-elevated",
                  f.wide && "lg:col-span-3",
                )}
              >
                <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/15">
                  {f.icon}
                </div>
                <div
                  className={cn(
                    "flex w-full flex-col items-center",
                    f.wide && "max-w-2xl",
                  )}
                >
                  <p
                    className={cn(
                      "font-display font-semibold leading-snug text-foreground",
                      f.wide ? "text-base sm:text-lg" : "text-base",
                    )}
                  >
                    {t(f.labelKey)}
                  </p>
                  <p className="mt-1.5 text-sm font-medium leading-snug text-foreground/80">
                    {t(f.taglineKey)}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {t(f.descKey)}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses */}
      <section
        id="courses"
        className="landing-section-mesh relative overflow-hidden bg-[hsl(220_18%_97.8%)] px-4 py-16 dark:bg-transparent lg:px-8 lg:py-24"
      >
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 flex flex-col justify-between gap-6 md:mb-12 md:flex-row md:items-end"
          >
            <div className="max-w-xl">
              <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                <BookOpen size={14} /> {t("popular.title")}
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                {t("popular.title")}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {t("popular.subtitle")}
              </p>
            </div>
            <div className="relative w-full shrink-0 md:w-80">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground/70"
                aria-hidden
              />
              <input
                type="search"
                placeholder={t("landing.searchCourses")}
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="h-11 w-full rounded-2xl border border-border/60 bg-card/90 py-2 pl-10 pr-4 text-sm text-foreground shadow-sm ring-1 ring-border/15 backdrop-blur-md placeholder:text-muted-foreground/80 transition-[box-shadow,border-color] focus:border-accent/35 focus:outline-none focus:ring-2 focus:ring-accent/25 dark:border-border/45 dark:bg-card/75 dark:ring-border/10"
              />
            </div>
          </motion.div>

          {/* Category pills */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-10 flex flex-wrap gap-2 md:mb-12"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
                  activeCategory === cat
                    ? "gradient-accent text-accent-foreground border-transparent shadow-glow-accent"
                    : "border-border/60 bg-card text-muted-foreground shadow-sm ring-1 ring-border/25 hover:border-accent/25 hover:text-foreground hover:shadow dark:border-border/50 dark:bg-card/80 dark:ring-0 dark:shadow-none"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Course grid — featured courses; sign in to open a course */}
          {coursesLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex h-full min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-border/45 bg-card/60 shadow-sm ring-1 ring-border/10 dark:border-border/35 dark:bg-card/40"
                >
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="flex flex-1 flex-col gap-3 p-5 pt-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                      <Skeleton className="h-3 flex-1 max-w-[40%]" />
                    </div>
                    <Skeleton className="h-5 w-[85%]" />
                    <Skeleton className="h-5 w-[55%]" />
                    <div className="mt-2 flex gap-2">
                      <Skeleton className="h-7 w-20 rounded-lg" />
                      <Skeleton className="h-7 w-24 rounded-lg" />
                    </div>
                    <div className="mt-auto space-y-3 border-t border-border/40 pt-4">
                      <div className="flex justify-between gap-4">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              <AnimatePresence mode="popLayout">
                {displayedCourses.map((course, i) => (
                  <motion.div
                    key={course.key}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{
                      delay: i * 0.04,
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    layout
                    className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_2px_28px_-10px_hsl(228_36%_16%/0.14)] ring-1 ring-border/12 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/28 hover:shadow-[0_22px_56px_-14px_hsl(228_36%_16%/0.2)] hover:ring-accent/15 dark:border-border/40 dark:bg-card/85 dark:shadow-none dark:ring-border/10 dark:hover:border-accent/22 dark:hover:shadow-elevated"
                    onClick={() => openCourse(course)}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {course.image ? (
                        <img
                          src={course.image}
                          alt={course.title}
                          className="h-full w-full object-cover transition-[transform,filter] duration-500 ease-out group-hover:scale-[1.04] group-hover:brightness-[1.02]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center gradient-hero">
                          <BookOpen size={40} className="text-white/35" />
                        </div>
                      )}
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/15 to-transparent opacity-90 dark:from-card dark:via-card/20 dark:to-transparent dark:opacity-95"
                        aria-hidden
                      />
                      <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-border/40 bg-background/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md ring-1 ring-border/20 dark:border-border/50 dark:bg-background/75">
                        {course.category}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground opacity-0 shadow-glow-accent ring-4 ring-background/40 transition-all duration-300 scale-90 group-hover:scale-100 group-hover:opacity-100 dark:ring-card/50">
                          <Play
                            size={22}
                            className="ml-1"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5 pt-4">
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-[11px] font-bold text-accent-foreground shadow-sm ring-2 ring-background dark:ring-card">
                          {course.instructor.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {course.instructor}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {t("landing.courseInstructor")}
                          </p>
                        </div>
                      </div>
                      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-accent line-clamp-2">
                        {course.title}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:border-border/35 dark:bg-muted/25">
                          <Clock
                            size={12}
                            className="shrink-0 text-accent/80"
                          />
                          {course.duration}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground dark:border-border/35 dark:bg-muted/25">
                          <BookOpen
                            size={12}
                            className="shrink-0 text-accent/80"
                          />
                          {course.lectures} {t("landing.lessons")}
                        </span>
                      </div>
                      <div className="mt-auto flex flex-col gap-3 border-t border-border/45 pt-4 dark:border-border/35">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {t("landing.from")}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                              <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                                {course.priceLabel}
                              </span>
                              {course.priceSecondary ? (
                                <span className="text-xs text-muted-foreground">
                                  {course.priceSecondary}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-sm font-bold tabular-nums text-foreground">
                                {course.rating.toFixed(1)}
                              </span>
                              <Star
                                size={14}
                                className="fill-accent text-accent"
                                aria-hidden
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {course.reviews} {t("landing.reviews")}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {course.intro ? (
                            <button
                              type="button"
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-background/90 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-accent/30 hover:bg-accent/[0.06]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIntroDialog({
                                  url: course.intro!.url,
                                  title: course.intro!.title,
                                });
                              }}
                            >
                              <Play
                                size={14}
                                className="shrink-0 text-accent"
                                fill="currentColor"
                                aria-hidden
                              />
                              {t("landing.watchIntro")}
                            </button>
                          ) : null}
                          <div className="flex items-center justify-center gap-2 rounded-xl border border-accent/15 bg-accent/[0.07] py-2.5 text-xs font-semibold text-accent transition-colors group-hover:border-accent/25 group-hover:bg-accent/[0.11]">
                            {t("landing.viewCoursePreview")}
                            <ArrowRight
                              size={14}
                              className="transition-transform group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!coursesLoading &&
            filteredCourses.length > displayedCourses.length && (
              <div className="mt-10 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-accent/25 px-6 font-semibold text-accent hover:bg-accent/[0.07]"
                  onClick={() => setShowAllCourses(true)}
                >
                  {t("landing.seeMoreCourses")}
                  <ArrowRight size={16} className="ml-2" aria-hidden />
                </Button>
              </div>
            )}

          {!coursesLoading && filteredCourses.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">
              {showcaseCourses.length === 0
                ? t("landing.noPublishedCourses")
                : t("landing.noMatchingCourses")}
            </p>
          )}
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="landing-section-mesh relative overflow-hidden bg-white px-4 py-20 dark:bg-[hsl(228_32%_9%)] lg:px-8 lg:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_20%,hsl(var(--accent)/0.08),transparent_55%),radial-gradient(ellipse_55%_45%_at_90%_80%,hsl(265_70%_58%/0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_75%_55%_at_15%_15%,hsl(var(--accent)/0.12),transparent_50%),radial-gradient(ellipse_50%_40%_at_85%_85%,hsl(265_65%_50%/0.1),transparent_48%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay opacity-[0.2] dark:opacity-[0.08]"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-5xl px-0 sm:px-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 items-start gap-10 text-center lg:grid-cols-2 lg:gap-14 lg:text-left"
          >
            {/* Column 1 — intro */}
            <div className="mx-auto flex w-full max-w-xl flex-col items-center lg:mx-0 lg:max-w-none lg:items-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.09] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent shadow-sm">
                <Award size={14} /> {t("nav.about")}
              </span>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground lg:justify-start">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <Star size={15} className="fill-accent text-accent" />
                  <span className="font-display tabular-nums">4.8</span>
                </span>
                <span
                  className="hidden h-4 w-px bg-border sm:block"
                  aria-hidden
                />
                <span>{t("about.trustStrip")}</span>
              </div>

              <h2 className="font-display mt-6 text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:mt-7">
                {t("about.title")}
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("about.desc")}
              </p>
            </div>

            {/* Column 2 — promise + list + CTA */}
            <div className="mx-auto flex w-full max-w-xl flex-col items-stretch border-border/40 lg:mx-0 lg:max-w-none lg:border-l lg:pl-10">
              <div className="rounded-2xl border border-border/50 bg-muted/35 px-6 py-5 text-left shadow-sm ring-1 ring-border/20 dark:border-border/40 dark:bg-muted/25 dark:ring-border/15 sm:px-7 sm:py-6">
                <h3 className="font-display text-lg font-bold text-foreground sm:text-xl">
                  {t("about.futureTitle")}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("about.futureDesc")}
                </p>
              </div>

              <ul className="mt-8 space-y-2.5 text-left sm:space-y-3">
                {[
                  t("about.bullet1"),
                  t("about.bullet2"),
                  t("about.bullet3"),
                  t("about.bullet4"),
                  t("about.bullet5"),
                ].map((b) => (
                  <li
                    key={b}
                    className="flex gap-3 rounded-xl border border-border/50 bg-card/80 px-3.5 py-3 shadow-sm ring-1 ring-border/15 backdrop-blur-sm dark:border-border/35 dark:bg-card/40 dark:ring-border/10 sm:px-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/12 text-success sm:h-9 sm:w-9 sm:rounded-xl dark:bg-success/15">
                      <CheckCircle
                        size={17}
                        className="shrink-0 sm:h-[18px] sm:w-[18px]"
                        strokeWidth={2.25}
                      />
                    </span>
                    <span className="pt-0.5 text-sm font-medium leading-relaxed text-foreground">
                      {b}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="h-12 rounded-xl px-8 shadow-glow-accent gradient-accent text-accent-foreground hover:opacity-90 sm:px-10"
                  onClick={() => goSignInOrDashboard(navigate, !!user)}
                >
                  {user ? t("nav.dashboard") : t("about.learnNow")}{" "}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Become an Instructor */}
      <section className="landing-section-mesh relative overflow-hidden bg-[hsl(220_18%_97.8%)] px-4 py-16 dark:bg-background lg:px-8 lg:py-20">
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay opacity-[0.28] dark:opacity-[0.06]"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-[1.75rem] border border-border/55 bg-card shadow-[0_24px_64px_-24px_hsl(228_36%_16%/0.18)] ring-1 ring-border/20 dark:border-border/40 dark:bg-card/70 dark:shadow-elevated dark:ring-border/12"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--accent)/0.06)_0%,transparent_45%,hsl(265_70%_58%/0.05)_100%)] dark:bg-[linear-gradient(135deg,hsl(var(--accent)/0.1)_0%,transparent_50%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/12 blur-3xl dark:bg-accent/18"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl dark:bg-accent/8"
              aria-hidden
            />
            <div className="relative grid gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-14 lg:p-12 lg:pl-14 lg:pr-12">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.09] text-accent shadow-sm ring-1 ring-accent/10 dark:bg-accent/15 dark:ring-accent/20">
                  <Sparkles size={30} strokeWidth={1.75} />
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                  {t("landing.instructor.eyebrow")}
                </span>
                <h3 className="font-display mt-4 text-2xl font-bold leading-[1.2] tracking-tight text-foreground sm:text-3xl lg:text-[2rem]">
                  {t("landing.instructor.title")}{" "}
                  <span className="hero-headline-gradient">
                    {t("landing.instructor.highlight")}
                  </span>
                </h3>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("landing.instructor.subtitle")}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:flex-col lg:items-stretch">
                <Button
                  size="lg"
                  className="h-12 w-full min-w-[14rem] rounded-xl px-8 font-semibold shadow-glow-accent gradient-accent text-accent-foreground hover:opacity-90 sm:w-auto lg:w-full"
                  onClick={() => goSignInOrDashboard(navigate, !!user)}
                >
                  {user ? t("nav.dashboard") : t("landing.instructor.cta")}{" "}
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <p className="max-w-[16rem] text-center text-[11px] leading-snug text-muted-foreground lg:text-left">
                  {t("nav.signin")} — {t("login.instructor")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA — Ready for change */}
      <section className="landing-section-mesh relative overflow-hidden bg-[hsl(220_20%_96.5%)] px-4 py-16 dark:bg-background lg:px-8 lg:py-24">
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay opacity-[0.26] dark:opacity-[0.06]"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto w-full max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[1.75rem] border border-border/55 bg-card text-center shadow-[0_28px_72px_-28px_hsl(228_36%_16%/0.2)] ring-1 ring-border/20 dark:border-border/40 dark:bg-card/65 dark:shadow-elevated dark:ring-border/12"
          >
            <div
              className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-accent/40 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl dark:bg-accent/14"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[hsl(265_70%_58%/0.08)] blur-3xl dark:bg-[hsl(265_65%_50%/0.12)]"
              aria-hidden
            />
            <div className="relative px-6 py-14 sm:px-10 lg:px-16 lg:py-16">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/50 text-accent shadow-sm dark:border-border/40 dark:bg-muted/30">
                <GraduationCap size={28} strokeWidth={1.75} />
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl xl:text-[2.75rem] xl:leading-tight">
                {t("cta.title")}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
                {t("cta.subtitle")}
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                <Button
                  size="lg"
                  className="h-12 rounded-xl px-10 text-base font-semibold shadow-glow-accent gradient-accent text-accent-foreground hover:opacity-90"
                  onClick={() => goSignInOrDashboard(navigate, !!user)}
                >
                  {user ? t("nav.dashboard") : t("cta.startNow")}{" "}
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-2 border-border/70 bg-background/90 px-10 text-base font-medium backdrop-blur-sm transition-colors hover:border-accent/35 hover:bg-accent/[0.06] dark:border-border/50 dark:bg-background/35 dark:hover:bg-muted/25"
                  onClick={() =>
                    document
                      .getElementById("about")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t("cta.learnAboutUs")}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="landing-section-mesh relative overflow-hidden bg-[hsl(220_20%_96.5%)] px-4 py-16 dark:bg-muted/20 lg:px-8 lg:py-24"
      >
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center md:mb-16"
          >
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.07] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
              <MessageCircle size={14} /> {t("landing.testimonials.kicker")}
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              {t("landing.testimonials.title")}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {testimonials.map((item, i) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: i * 0.08,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_20px_50px_-28px_hsl(228_36%_16%/0.14)] ring-1 ring-border/15 transition-all duration-300 hover:-translate-y-1 hover:border-accent/28 hover:shadow-[0_28px_60px_-24px_hsl(228_36%_16%/0.18)] hover:ring-accent/12 dark:border-border/40 dark:bg-card/80 dark:ring-border/10"
              >
                <div
                  className="h-1 w-full bg-gradient-to-r from-accent via-[hsl(220_85%_58%)] to-[hsl(265_70%_62%)] opacity-90"
                  aria-hidden
                />
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <Quote
                      className="h-9 w-9 shrink-0 text-accent/25 transition-colors group-hover:text-accent/40"
                      strokeWidth={1.25}
                      aria-hidden
                    />
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star
                          key={j}
                          size={13}
                          className="fill-accent text-accent"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                    <span className="font-display text-lg font-medium leading-none text-foreground/25">
                      "
                    </span>
                    {item.text}
                    <span className="font-display text-lg font-medium leading-none text-foreground/25">
                      "
                    </span>
                  </p>
                  <div className="mt-8 flex items-center gap-3.5 border-t border-border/45 pt-6 dark:border-border/35">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[hsl(220_78%_48%)] text-sm font-bold text-white shadow-md shadow-[hsl(210_80%_55%/0.25)] ring-2 ring-background dark:ring-card">
                      {item.avatar}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="font-display text-sm font-semibold text-foreground">
                        {item.name}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        {item.role}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <Dialog
        open={introDialog !== null}
        onOpenChange={(open) => !open && setIntroDialog(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {introDialog?.title ?? t("landing.courseIntro")}
            </DialogTitle>
            <DialogDescription>{t("landing.freePreview")}</DialogDescription>
          </DialogHeader>
          {introDialog ? (
            <div className="pt-1">
              <VideoPlayer url={introDialog.url} title={introDialog.title} />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntroDialog(null)}>
              {t("landing.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAQ — always above footer; API items or built-in defaults */}
      <section
        id="faq"
        className="landing-section-mesh relative overflow-hidden border-t border-border/50 bg-[hsl(220_22%_97%)] px-4 py-16 dark:bg-muted/15 lg:px-8 lg:py-24"
      >
        <div
          className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay opacity-[0.35] dark:opacity-[0.1]"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <span className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-accent">
              <MessageCircle size={14} /> {t("landing.faqKicker")}
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              {t("landing.faqTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              {t("landing.faqSubtitle")}
            </p>
            {faqFetchFailed && (
              <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground/80">
                {t("landing.faqOfflineHint")}
              </p>
            )}
          </motion.div>
          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border/60 bg-card/80 px-4 shadow-card ring-1 ring-border/25 backdrop-blur-sm dark:bg-card/60"
          >
            {faqDisplayItems.map((f) => (
              <AccordionItem
                key={f.id}
                value={f.id}
                className="border-border/50"
              >
                <AccordionTrigger className="text-left font-display text-base font-semibold text-foreground hover:no-underline">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="border-t border-border/60 bg-[hsl(220_18%_95.5%)] backdrop-blur-md dark:border-border/35 dark:bg-card/25"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <img src={logo} alt="Alpha" className="h-11 w-11 rounded-xl" />
                <div className="flex flex-col space-y-1 leading-none">
                  <span className="font-display font-bold text-foreground">
                    Alpha
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Tech Academy
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                {t("landing.footerDescription")}
              </p>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("footer.followUs")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href="https://t.me/alpha_contact_825"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                  aria-label="Telegram"
                >
                  <IconTelegram />
                </a>
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                  aria-label="Facebook"
                >
                  <IconFacebook />
                </a>
                <a
                  href="https://www.linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                  aria-label="LinkedIn"
                >
                  <IconLinkedIn />
                </a>
                <a
                  href="https://www.youtube.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                  aria-label="YouTube"
                >
                  <IconYouTube />
                </a>
                <a
                  href="https://www.tiktok.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-accent"
                  aria-label="TikTok"
                >
                  <IconTikTok />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground mb-5">
                {t("nav.courses")}
              </h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="hover:text-foreground transition-colors cursor-pointer">
                  {t("landing.webDevelopment")}
                </li>
                <li className="hover:text-foreground transition-colors cursor-pointer">
                  {t("landing.mobileDevelopment")}
                </li>
                <li className="hover:text-foreground transition-colors cursor-pointer">
                  {t("landing.aiData")}
                </li>
                <li className="hover:text-foreground transition-colors cursor-pointer">
                  {t("landing.digitalMarketing")}
                </li>
                <li className="hover:text-foreground transition-colors cursor-pointer">
                  {t("landing.designVideo")}
                </li>
                <li className="hover:text-foreground transition-colors cursor-pointer">
                  {t("landing.freelancing")}
                </li>
                <li className="hover:text-foreground transition-colors cursor-pointer">
                  {t("landing.programming")}
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground mb-5">
                {t("nav.contact")}
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-3">
                  <MapPin size={15} className="text-accent shrink-0" />{" "}
                  {t("landing.location")}
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={15} className="text-accent shrink-0" />
                  <a
                    href="tel:+251978261753"
                    className="transition-colors hover:text-foreground"
                  >
                    +251 97 826 1753
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <IconTelegram className="h-4 w-4 text-accent shrink-0" />
                  <a
                    href="https://t.me/alpha_contact_825"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    @alpha_contact_825
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={15} className="text-accent shrink-0" />
                  <a
                    href="mailto:alphatechacademy825@gmail.com"
                    className="transition-colors hover:text-foreground"
                  >
                    alphatechacademy825@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 mt-10 pt-8 text-center space-y-6">
            <p className="font-display text-6xl lg:text-8xl font-bold text-foreground/5 select-none tracking-tight">
              Alpha Tech Academy
            </p>
            <p className="text-sm text-muted-foreground">
              © 2026 Alpha Tech Academy. {t("footer.rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
