/**
 * Layout - Main application shell with sidebar navigation.
 * Brand: Alpha
 * Uses Outlet so the shell persists across route changes.
 */
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import defaultLogo from "@/assets/logo.png";
import { settingsAPI, notificationsAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  Video,
  X,
  GraduationCap,
  Shield,
  PlusCircle,
  Plus,
  Award,
  User,
  BarChart3,
  Settings,
  Bell,
  Map,
  Bookmark,
  StickyNote,
  Trophy,
  HelpCircle,
  FileQuestion,
  Megaphone,
  DollarSign,
  Activity,
  FileText,
  ShieldCheck,
  CreditCard,
  Calendar,
  Tag,
  Palette,
  Languages,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NavItem {
  labelKey?: string;
  label?: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  section?: string;
}

const navItems: NavItem[] = [
  // Student
  {
    labelKey: "nav.home",
    path: "/",
    icon: <Home size={18} />,
    roles: ["student", "instructor", "admin"],
    section: "sidebar.menu",
  },
  {
    labelKey: "nav.dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["student", "instructor", "admin"],
    section: "sidebar.menu",
  },
  {
    labelKey: "nav.browseCourses",
    path: "/browse",
    icon: <Video size={18} />,
    roles: ["student"],
    section: "sidebar.learning",
  },
  {
    labelKey: "nav.myCourses",
    path: "/my-courses",
    icon: <BookOpen size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "sidebar.learningPath",
    path: "/learning-path",
    icon: <Map size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "sidebar.myAssignments",
    path: "/student/assignments",
    icon: <FileText size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "sidebar.calendar",
    path: "/student/calendar",
    icon: <Calendar size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "nav.certificates",
    path: "/certificates",
    icon: <Award size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "sidebar.leaderboard",
    path: "/leaderboard",
    icon: <Trophy size={18} />,
    roles: ["student"],
    section: "sidebar.community",
  },
  {
    labelKey: "sidebar.bookmarks",
    path: "/bookmarks",
    icon: <Bookmark size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "sidebar.myNotes",
    path: "/notes",
    icon: <StickyNote size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "sidebar.notifications",
    path: "/notifications",
    icon: <Bell size={18} />,
    roles: ["student"],
  },
  {
    labelKey: "nav.profile",
    path: "/profile",
    icon: <User size={18} />,
    roles: ["student"],
    section: "sidebar.account",
  },
  {
    labelKey: "sidebar.helpSupport",
    path: "/help",
    icon: <HelpCircle size={18} />,
    roles: ["student"],
  },

  // Instructor
  {
    labelKey: "nav.myCourses",
    path: "/instructor/courses",
    icon: <BookOpen size={18} />,
    roles: ["instructor"],
    section: "sidebar.courses",
  },
  {
    labelKey: "nav.addCourse",
    path: "/instructor/add-course",
    icon: <PlusCircle size={18} />,
    roles: ["instructor"],
  },
  {
    labelKey: "sidebar.quizManager",
    path: "/instructor/quizzes",
    icon: <FileQuestion size={18} />,
    roles: ["instructor"],
  },
  {
    labelKey: "sidebar.assignments",
    path: "/instructor/assignments",
    icon: <FileText size={18} />,
    roles: ["instructor"],
  },
  {
    labelKey: "sidebar.studentGrades",
    path: "/instructor/grades",
    icon: <GraduationCap size={18} />,
    roles: ["instructor"],
    section: "sidebar.students",
  },
  {
    labelKey: "nav.studentProgress",
    path: "/instructor/progress",
    icon: <BarChart3 size={18} />,
    roles: ["instructor"],
  },
  {
    labelKey: "sidebar.announcements",
    path: "/instructor/announcements",
    icon: <Megaphone size={18} />,
    roles: ["instructor"],
    section: "sidebar.communication",
  },
  {
    labelKey: "sidebar.revenue",
    path: "/instructor/revenue",
    icon: <DollarSign size={18} />,
    roles: ["instructor"],
    section: "sidebar.finance",
  },
  {
    labelKey: "sidebar.withdrawals",
    path: "/instructor/withdrawals",
    icon: <CreditCard size={18} />,
    roles: ["instructor"],
  },
  {
    labelKey: "nav.profile",
    path: "/profile",
    icon: <User size={18} />,
    roles: ["instructor"],
    section: "sidebar.account",
  },

  // Admin
  {
    labelKey: "nav.manageUsers",
    path: "/admin/users",
    icon: <Users size={18} />,
    roles: ["admin"],
    section: "sidebar.management",
  },
  {
    labelKey: "nav.manageCourses",
    path: "/admin/courses",
    icon: <BookOpen size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.addCourse",
    path: "/admin/add-course",
    icon: <Plus size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.quizManager",
    path: "/admin/quizzes",
    icon: <FileQuestion size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.contentModeration",
    path: "/admin/moderation",
    icon: <ShieldCheck size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.coupons",
    path: "/admin/coupons",
    icon: <Tag size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "nav.analytics",
    path: "/admin/analytics",
    icon: <BarChart3 size={18} />,
    roles: ["admin"],
    section: "sidebar.insights",
  },
  {
    labelKey: "sidebar.systemLogs",
    path: "/admin/logs",
    icon: <Activity size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.reports",
    path: "/admin/reports",
    icon: <FileText size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.payments",
    path: "/admin/payments",
    icon: <CreditCard size={18} />,
    roles: ["admin"],
    section: "sidebar.finance",
  },
  {
    labelKey: "nav.settings",
    path: "/admin/settings",
    icon: <Settings size={18} />,
    roles: ["admin"],
    section: "sidebar.system",
  },
  {
    labelKey: "sidebar.appearance",
    path: "/admin/appearance",
    icon: <Palette size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.landingFaq",
    path: "/admin/faq",
    icon: <HelpCircle size={18} />,
    roles: ["admin"],
  },
  {
    labelKey: "sidebar.uiTranslations",
    path: "/admin/translations",
    icon: <Languages size={18} />,
    roles: ["admin"],
  },
];

const SIDEBAR_COLLAPSED_KEY = "alpha_sidebar_collapsed";

const Layout: React.FC = () => {
  const { profile, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const { toast } = useToast();

  /** Logo URL from admin; dashboard chrome uses fixed brand tokens (see index.css sidebar / accent). */
  const [brandingLogo, setBrandingLogo] = useState("");

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    let lastShownId: string | null = null;

    const refreshUnread = async () => {
      try {
        const { count } = await notificationsAPI.getCount();
        if (cancelled) return;

        setNotificationUnread((prev) => {
          if (count > prev) {
            // Notification count increased, show a toast
            notificationsAPI
              .getAll()
              .then((list) => {
                if (cancelled) return;
                // Find the first unread notification that hasn't been shown in a toast yet
                const latestUnread = list.find(
                  (n) => !n.read && n.id !== lastShownId,
                );

                if (latestUnread) {
                  lastShownId = latestUnread.id;
                  toast({
                    title: latestUnread.title,
                    description: latestUnread.message,
                    action: latestUnread.link ? (
                      <ToastAction
                        altText="View"
                        onClick={() => navigate(latestUnread.link!)}
                      >
                        View
                      </ToastAction>
                    ) : undefined,
                  });
                }
              })
              .catch((err) => {
                console.error("Failed to fetch notifications for toast:", err);
                // fallback if getAll fails
                toast({
                  title: "New Notification",
                  description: "You have a new unread notification.",
                  action: (
                    <ToastAction
                      altText="View"
                      onClick={() => navigate("/notifications")}
                    >
                      View
                    </ToastAction>
                  ),
                });
              });
          }
          return count;
        });
      } catch (err) {
        console.error("Failed to refresh unread count:", err);
        if (!cancelled) setNotificationUnread(0);
      }
    };
    refreshUnread();
    const id = setInterval(refreshUnread, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [profile, navigate, toast]);

  useEffect(() => {
    const applyLogo = (logo: string) => setBrandingLogo(logo || "");

    const fetchAppearance = async () => {
      try {
        const data = await settingsAPI.getAppearance();
        applyLogo(typeof data.logo === "string" ? data.logo : "");
        localStorage.setItem("alpha_appearance", JSON.stringify(data));
      } catch (error) {
        console.error("Failed to fetch appearance settings:", error);
        const saved = localStorage.getItem("alpha_appearance");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            applyLogo(typeof parsed.logo === "string" ? parsed.logo : "");
          } catch {
            /* ignore */
          }
        }
      }
    };

    fetchAppearance();

    const handleStorageChange = () => {
      const saved = localStorage.getItem("alpha_appearance");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          applyLogo(typeof parsed.logo === "string" ? parsed.logo : "");
        } catch {
          /* ignore */
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  const filteredNav = navItems.filter(
    (item) => profile && item.roles.includes(profile.role),
  );

  const roleIcon = {
    student: <GraduationCap size={14} />,
    instructor: <BookOpen size={14} />,
    admin: <Shield size={14} />,
  };

  const roleLabel = {
    student: t("sidebar.student"),
    instructor: t("sidebar.instructor"),
    admin: t("sidebar.administrator"),
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    handleLogout();
  };

  // Group nav items by section
  let lastSection = "";

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-muted/35 dark:bg-[hsl(228_36%_6%)]">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[4px_0_24px_-12px_hsl(228_36%_16%/0.08)] transition-[transform,width] duration-300 dark:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.35)] lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            sidebarCollapsed ? "lg:w-[4.5rem]" : "lg:w-[260px]",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 border-b border-sidebar-border px-5 py-5",
              sidebarCollapsed && "lg:justify-center lg:px-2 lg:py-4",
            )}
          >
            <img
              src={brandingLogo || defaultLogo}
              alt="SOTA"
              className={cn(
                "h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-sidebar-border/80",
                sidebarCollapsed && "lg:mx-auto",
              )}
            />
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col space-y-1 leading-none",
                sidebarCollapsed && "lg:hidden",
              )}
            >
              <span className="font-display block text-sm font-bold text-sidebar-foreground">
                Alpha
              </span>
              <span className="text-[10px] text-sidebar-foreground/55">
                Tech Academy
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>

          <nav
            className={cn(
              "flex-1 space-y-0.5 overflow-y-auto px-3 py-3",
              sidebarCollapsed && "lg:px-2",
            )}
          >
            {filteredNav.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path !== "/" &&
                  item.path !== "/dashboard" &&
                  location.pathname.startsWith(item.path));
              const showSection = item.section && item.section !== lastSection;
              if (item.section) lastSection = item.section;
              const labelText =
                item.label || (item.labelKey ? t(item.labelKey as any) : "");

              const linkClass = cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                sidebarCollapsed && "lg:justify-center lg:px-2",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow-accent"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              );

              const linkInner = (
                <>
                  <span className="flex shrink-0 [&>svg]:shrink-0">
                    {item.icon}
                  </span>
                  <span className={cn(sidebarCollapsed && "lg:sr-only")}>
                    {labelText}
                  </span>
                </>
              );

              return (
                <React.Fragment key={item.path + (item.labelKey || item.label)}>
                  {showSection && (
                    <p
                      className={cn(
                        "px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40",
                        sidebarCollapsed && "lg:hidden",
                      )}
                    >
                      {item.section.startsWith("sidebar.")
                        ? t(item.section as any)
                        : item.section}
                    </p>
                  )}
                  {sidebarCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={linkClass}
                        >
                          {linkInner}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px]">
                        {labelText}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={linkClass}
                    >
                      {linkInner}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div
            className={cn(
              "border-t border-sidebar-border p-4",
              sidebarCollapsed && "lg:p-2",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/80 p-3 dark:bg-sidebar-accent/50",
                sidebarCollapsed && "lg:flex-col lg:gap-2 lg:p-2",
              )}
            >
              <Avatar
                className={cn(
                  "h-9 w-9 shrink-0 ring-2 ring-sidebar-border/50",
                  sidebarCollapsed && "lg:mx-auto",
                )}
              >
                {profile?.photoURL ? (
                  <AvatarImage
                    src={profile.photoURL}
                    alt=""
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <AvatarFallback className="gradient-accent text-xs font-bold text-accent-foreground">
                  {profile?.displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "min-w-0 flex-1",
                  sidebarCollapsed && "lg:hidden",
                )}
              >
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {profile?.displayName}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-sidebar-foreground/50">
                  {profile && roleIcon[profile.role]}
                  <span>{profile && roleLabel[profile.role]}</span>
                </div>
              </div>
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowLogoutDialog(true)}
                      className="h-8 w-8 shrink-0 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:mx-auto"
                    >
                      <LogOut size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t("common.logout" as any)}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLogoutDialog(true)}
                  className="h-8 w-8 shrink-0 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <LogOut size={16} />
                </Button>
              )}
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-card/85 backdrop-blur-xl dark:border-border/35 dark:bg-card/50 px-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-9 w-9 text-muted-foreground"
              onClick={toggleSidebarCollapsed}
              aria-expanded={!sidebarCollapsed}
              aria-label={
                sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")
              }
            >
              {sidebarCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 ml-auto">
              <LanguageSwitcher />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => navigate("/notifications")}
                aria-label={t("sidebar.notifications")}
              >
                <Bell size={18} />
                {notificationUnread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground shadow-sm">
                    {notificationUnread > 99 ? "99+" : notificationUnread}
                  </span>
                ) : null}
              </Button>
            </div>
          </header>
          <main className="app-main-surface relative flex-1 overflow-y-auto p-4 lg:p-8">
            <div
              className="pointer-events-none absolute inset-0 hero-saas-grid landing-section-grid-overlay"
              aria-hidden
            />
            <div className="relative z-[1]">
              <Outlet />
            </div>
          </main>
        </div>

        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("logout.confirmTitle" as any)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("logout.confirmDescription" as any)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel" as any)}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLogout}>
                {t("common.logout" as any)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default Layout;
