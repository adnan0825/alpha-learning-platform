import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  BarChart3,
  Settings,
  Search,
  Bell,
  CheckCircle2,
  Trophy,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Video,
} from "lucide-react";
import { useLanguage, type TranslationKey } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { getYouTubeVideoId } from "@/lib/youtube";
import { ChromelessYouTube } from "@/components/landing/ChromelessYouTube";
import { Slider } from "@/components/ui/slider";

const NAV: { icon: typeof LayoutDashboard; titleKey: TranslationKey }[] = [
  { icon: LayoutDashboard, titleKey: "hero.mockPageTitle" },
  { icon: BookOpen, titleKey: "nav.myCourses" },
  { icon: Award, titleKey: "nav.certificates" },
  { icon: BarChart3, titleKey: "nav.analytics" },
  { icon: Settings, titleKey: "nav.settings" },
];

/** Falls back to the current uploaded landing intro video when no custom override is configured. */
const DEFAULT_INTRO_VIDEO_URL =
  (typeof import.meta.env.VITE_HERO_INTRO_VIDEO_URL === "string" &&
    import.meta.env.VITE_HERO_INTRO_VIDEO_URL.trim()) ||
  "https://alpha-api-zeky.onrender.com/api/uploads/video/1789914018184-7flk6bkl96.mp4";

const NATIVE_SEEK_SEC = 10;

function formatNativeTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function HeroNativeChromeless({
  src,
  poster,
  label,
}: {
  src: string;
  poster?: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const scrubbingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  /** Muted by default so autoplay works in browsers. */
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  useEffect(() => {
    if (!src.includes("/api/uploads/video/")) {
      setResolvedSrc(src);
      return;
    }
    const controller = new AbortController();
    setResolvedSrc("");
    fetch(`${src}/access`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Video unavailable");
        return response.json() as Promise<{ url: string }>;
      })
      .then((payload) => setResolvedSrc(payload.url))
      .catch(() => setResolvedSrc(""));
    return () => controller.abort();
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      if (scrubbingRef.current) return;
      setCurrentTime(el.currentTime);
      if (Number.isFinite(el.duration) && el.duration > 0)
        setDuration(el.duration);
    };
    const onLoadedMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0)
        setDuration(el.duration);
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoadedMeta);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoadedMeta);
    };
  }, []);

  /** `autoPlay` alone is unreliable after React mount; muted + explicit play matches browser policies. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tryPlay = () => {
      el.muted = true;
      setMuted(true);
      void el.play().catch(() => {});
    };
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) tryPlay();
    else {
      el.addEventListener("canplay", tryPlay, { once: true });
      return () => el.removeEventListener("canplay", tryPlay);
    }
  }, [resolvedSrc]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !playing) return;
    const id = window.setInterval(() => {
      if (scrubbingRef.current) return;
      setCurrentTime(el.currentTime);
      if (Number.isFinite(el.duration) && el.duration > 0)
        setDuration(el.duration);
    }, 400);
    return () => window.clearInterval(id);
  }, [playing]);

  const seekBy = (delta: number) => {
    const v = ref.current;
    if (!v) return;
    const d =
      Number.isFinite(v.duration) && v.duration > 0 ? v.duration : Infinity;
    v.currentTime = Math.max(0, Math.min(d, v.currentTime + delta));
    setCurrentTime(v.currentTime);
  };

  const displayTime = scrubbing ? scrubTime : currentTime;
  const sliderMax = duration > 0 ? duration : 1;
  const sliderValue =
    duration > 0 ? Math.min(scrubbing ? scrubTime : currentTime, duration) : 0;
  const btnClass =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-border/60 bg-background/80 hover:bg-muted/60";
  const primaryBtn =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md bg-accent text-accent-foreground shadow-sm hover:opacity-90";

  return (
    <div className="flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={ref}
          src={resolvedSrc}
          poster={poster}
          className="h-full w-full object-contain"
          playsInline
          preload="auto"
          controls={false}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onContextMenu={(event) => event.preventDefault()}
          autoPlay
          loop
          muted={muted}
          aria-label={label}
        />
      </div>
      <div className="mt-2 space-y-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 dark:bg-muted/15">
        <Slider
          disabled={duration <= 0}
          min={0}
          max={sliderMax}
          step={0.25}
          value={[sliderValue]}
          onValueChange={(vals) => {
            const v = ref.current;
            if (!v) return;
            const t = Math.max(0, Math.min(sliderMax, vals[0] ?? 0));
            setScrubTime(t);
            setCurrentTime(t);
            v.currentTime = t;
          }}
          onPointerDown={() => {
            scrubbingRef.current = true;
            setScrubbing(true);
            setScrubTime(Math.min(currentTime, duration > 0 ? duration : 0));
          }}
          onPointerUp={() => {
            scrubbingRef.current = false;
            setScrubbing(false);
          }}
          onPointerCancel={() => {
            scrubbingRef.current = false;
            setScrubbing(false);
          }}
          className="w-full py-1 [&_.bg-primary]:bg-accent [&_.border-primary]:border-accent [&_.bg-secondary]:bg-muted/80 dark:[&_.bg-secondary]:bg-muted/50"
          aria-label="Seek video"
        />
        <div className="flex items-center justify-center gap-1 text-[10px] tabular-nums text-muted-foreground sm:gap-2 sm:text-xs">
          <span>{formatNativeTime(displayTime)}</span>
          <span className="text-muted-foreground/50">/</span>
          <span>{formatNativeTime(duration)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => seekBy(-NATIVE_SEEK_SEC)}
            className={btnClass}
            aria-label={`Back ${NATIVE_SEEK_SEC} seconds`}
          >
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              const v = ref.current;
              if (!v) return;
              if (v.paused) void v.play();
              else v.pause();
            }}
            className={primaryBtn}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause size={16} />
            ) : (
              <Play size={16} className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => seekBy(NATIVE_SEEK_SEC)}
            className={btnClass}
            aria-label={`Forward ${NATIVE_SEEK_SEC} seconds`}
          >
            <SkipForward size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              const v = ref.current;
              if (!v) return;
              v.muted = !v.muted;
              setMuted(v.muted);
            }}
            className={btnClass}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export type HeroDashboardMockProps = {
  /** Video URL: YouTube (watch / youtu.be) or direct file (mp4…). Overrides env; default is platform YouTube intro. */
  introVideoSrc?: string;
  /** Optional poster image URL for the video. Overrides VITE_HERO_INTRO_VIDEO_POSTER. */
  introVideoPoster?: string;
};

export function HeroDashboardMock({
  introVideoSrc,
  introVideoPoster,
}: HeroDashboardMockProps = {}) {
  const { t } = useLanguage();
  const videoSrc =
    introVideoSrc?.trim() ||
    (typeof import.meta.env.VITE_HERO_INTRO_VIDEO_URL === "string"
      ? import.meta.env.VITE_HERO_INTRO_VIDEO_URL.trim()
      : "") ||
    DEFAULT_INTRO_VIDEO_URL;

  const youtubeId = getYouTubeVideoId(videoSrc);

  const videoPoster =
    introVideoPoster?.trim() ||
    (typeof import.meta.env.VITE_HERO_INTRO_VIDEO_POSTER === "string"
      ? import.meta.env.VITE_HERO_INTRO_VIDEO_POSTER.trim()
      : "") ||
    undefined;

  const [activeNav, setActiveNav] = useState(0);

  const activities: {
    icon: typeof CheckCircle2;
    iconClass: string;
    titleKey: TranslationKey;
    metaKey: TranslationKey;
  }[] = [
    {
      icon: CheckCircle2,
      iconClass: "text-emerald-600 dark:text-emerald-400",
      titleKey: "hero.mockAct1",
      metaKey: "hero.mockAct1Meta",
    },
    {
      icon: Trophy,
      iconClass: "text-amber-600 dark:text-amber-400",
      titleKey: "hero.mockAct2",
      metaKey: "hero.mockAct2Meta",
    },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-foreground/5 ring-1 ring-border/40",
        "backdrop-blur-xl dark:bg-card/50 dark:ring-border/30",
      )}
    >
      {/* Window chrome */}
      <div className="flex h-9 sm:h-10 items-center gap-2 border-b border-border/50 bg-muted/40 px-3 sm:px-4">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(0_72%_58%)] shadow-sm" />
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(45_95%_52%)] shadow-sm" />
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(145_55%_42%)] shadow-sm" />
        <span className="ml-2 hidden h-5 flex-1 max-w-[min(240px,42%)] truncate rounded-md border border-border/40 bg-background/70 px-2 text-[10px] leading-5 text-muted-foreground/80 sm:block">
          {t("hero.mockUrlBar")}
        </span>
      </div>

      <div className="flex min-h-0 flex-col md:flex-row">
        {/* Mobile nav strip */}
        <div className="flex border-b border-border/50 bg-muted/20 px-2 py-2 md:hidden">
          <div className="flex w-full justify-between gap-1">
            {NAV.map((item, i) => {
              const Icon = item.icon;
              const active = activeNav === i;
              return (
                <button
                  key={item.titleKey}
                  type="button"
                  aria-label={t(item.titleKey)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setActiveNav(i)}
                  className={cn(
                    "flex h-8 flex-1 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-accent/20 text-accent"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon size={16} strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar — interactive */}
        <aside className="hidden w-[52px] shrink-0 flex-col items-center gap-1 border-r border-border/50 bg-muted/25 py-3 md:flex">
          {NAV.map((item, i) => {
            const Icon = item.icon;
            const active = activeNav === i;
            return (
              <button
                key={item.titleKey}
                type="button"
                aria-label={t(item.titleKey)}
                aria-current={active ? "page" : undefined}
                onClick={() => setActiveNav(i)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-accent/20 text-accent shadow-sm ring-1 ring-accent/25"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                <Icon size={17} strokeWidth={2} />
              </button>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1 space-y-2 p-2.5 sm:space-y-2 sm:p-3 lg:p-4">
          {/* Top bar — search + user (app-like) */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={13}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                readOnly
                placeholder={t("hero.mockSearchPlaceholder")}
                className="h-7 w-full cursor-text rounded-md border border-border/50 bg-background/60 py-1 pl-7 pr-2 text-[10px] text-foreground placeholder:text-muted-foreground/70 outline-none transition-shadow focus:border-accent/40 focus:ring-1 focus:ring-accent/15 sm:h-8 sm:text-[11px]"
                aria-label={t("hero.mockSearchPlaceholder")}
              />
            </div>
            <div className="flex items-center justify-end gap-1.5 sm:shrink-0">
              <span className="hidden rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-medium text-accent sm:inline">
                {t("hero.mockLiveBadge")}
              </span>
              <button
                type="button"
                className="relative flex h-7 w-7 items-center justify-center rounded-md border border-border/50 bg-background/50 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell size={14} strokeWidth={2} />
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent shadow-sm ring-2 ring-card" />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent/90 to-accent text-[9px] font-bold text-accent-foreground shadow-sm ring-1 ring-border/30 transition-transform hover:scale-105"
                aria-label="Account"
              >
                AD
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
            <h3 className="truncate font-display text-xs font-semibold text-foreground sm:text-sm">
              {t(NAV[activeNav].titleKey)}
            </h3>
          </div>

          {/* Intro video — wide, centered in main column */}
          <div className="flex w-full justify-center px-0 sm:px-1">
            <div className="w-full max-w-[min(100%,52rem)]">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm ring-1 ring-border/25 dark:bg-background/25">
                <div className="flex items-center justify-between gap-1.5 border-b border-border/40 bg-muted/30 px-2.5 py-1.5 dark:bg-muted/15">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                      <Video size={12} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="truncate text-[10px] font-semibold text-foreground sm:text-[11px]">
                      {t("hero.mockIntroVideoTitle")}
                    </span>
                  </div>
                  <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground ring-1 ring-border/40">
                    {t("hero.mockIntroVideoBadge")}
                  </span>
                </div>
                <div className="p-2 sm:p-3">
                  {youtubeId ? (
                    <ChromelessYouTube
                      videoUrl={videoSrc}
                      title={t("hero.mockIntroVideoTitle")}
                    />
                  ) : videoSrc ? (
                    <HeroNativeChromeless
                      src={videoSrc}
                      poster={videoPoster}
                      label={t("hero.mockIntroVideoTitle")}
                    />
                  ) : (
                    <div className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-muted/80 via-muted/50 to-accent/10 px-2 text-center dark:from-muted/40 dark:via-background/40 dark:to-accent/15">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent ring-1 ring-accent/25 dark:bg-accent/25">
                        <Play
                          className="ml-0.5 h-5 w-5 fill-current"
                          aria-hidden
                        />
                      </span>
                      <p className="line-clamp-2 max-w-[14rem] text-[9px] leading-snug text-muted-foreground sm:text-[10px]">
                        {t("hero.mockIntroVideoPlaceholder")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Activity — compact rows below video */}
          <div className="mx-auto w-full max-w-[min(100%,52rem)] rounded-lg border border-border/50 bg-background/40 p-2 dark:bg-background/20">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("hero.mockActivity")}
            </p>
            <ul className="space-y-0.5">
              {activities.map((row, i) => {
                const Icon = row.icon;
                return (
                  <li key={row.titleKey}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/50"
                    >
                      <Icon
                        size={13}
                        strokeWidth={2}
                        className={cn("shrink-0", row.iconClass)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10px] font-medium text-foreground">
                          {t(row.titleKey)}
                        </span>
                        <span className="block truncate text-[9px] text-muted-foreground">
                          {t(row.metaKey)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/80">
                        {i === 0 ? "2m" : "1h"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
