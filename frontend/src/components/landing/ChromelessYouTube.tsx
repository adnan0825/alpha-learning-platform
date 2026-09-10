import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { getYouTubeVideoId } from "@/lib/youtube";
import { Slider } from "@/components/ui/slider";

const SEEK_SEC = 10;

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
  /** Present on real API player — used to set iframe `allow` so autoplay works. */
  getIframe?: () => HTMLIFrameElement;
};

declare global {
  interface Window {
    YT?: { Player: new (el: string | HTMLElement, opts: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

function patchYouTubeIframeAllow(player: YTPlayer) {
  try {
    const iframe = player.getIframe?.();
    if (iframe) iframe.setAttribute("allow", IFRAME_ALLOW);
  } catch {
    /* ignore */
  }
}

function tryPlayYouTube(player: YTPlayer) {
  try {
    player.mute?.();
    player.playVideo?.();
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    try {
      const st = player.getPlayerState?.();
      if (st !== 1 && st !== 3) player.playVideo?.();
    } catch {
      /* ignore */
    }
  }, 150);
  window.setTimeout(() => {
    try {
      const st = player.getPlayerState?.();
      if (st !== 1 && st !== 3) player.playVideo?.();
    } catch {
      /* ignore */
    }
  }, 600);
}

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const t = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(t);
          resolve();
        }
      }, 50);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.body.appendChild(s);
  });
  return apiLoadPromise;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  videoUrl: string;
  className?: string;
  title?: string;
};

/**
 * YouTube IFrame API player with default controls hidden.
 * Transparent overlay blocks clicks on the embed (reduces interaction with in-player promos).
 * Custom controls: seek ±10s, play/pause, mute, progress + time.
 */
export function ChromelessYouTube({ videoUrl, className, title = "Video" }: Props) {
  const vid = getYouTubeVideoId(videoUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  /** Starts muted so autoplay is allowed; user can unmute. */
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const scrubbingRef = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  const syncState = useCallback((p: YTPlayer) => {
    const st = p.getPlayerState?.();
    setPlaying(st === 1 || st === 3);
    try {
      setMuted(p.isMuted?.() ?? false);
    } catch {
      /* ignore */
    }
    try {
      if (!scrubbingRef.current) {
        const t = p.getCurrentTime?.();
        if (typeof t === "number" && Number.isFinite(t)) setCurrentTime(t);
      }
      const d = p.getDuration?.();
      if (typeof d === "number" && Number.isFinite(d) && d > 0) setDuration(d);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!vid || !containerRef.current) return;

    let cancelled = false;

    // Destroy any existing player before creating a new one
    try {
      playerRef.current?.destroy?.();
    } catch {
      /* ignore */
    }
    playerRef.current = null;
    setReady(false);

    (async () => {
      await loadYouTubeAPI();
      if (cancelled || !containerRef.current || !window.YT?.Player) return;

      // Clear container to ensure no stale iframe exists
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      new window.YT.Player(containerRef.current, {
        videoId: vid,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1,
          cc_load_policy: 0,
          enablejsapi: 1,
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: vid,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            if (cancelled) return;
            playerRef.current = e.target;
            patchYouTubeIframeAllow(e.target);
            requestAnimationFrame(() => patchYouTubeIframeAllow(e.target));
            setReady(true);
            setMuted(true);
            tryPlayYouTube(e.target);
            syncState(e.target);
            try {
              const d = e.target.getDuration?.();
              if (typeof d === "number" && Number.isFinite(d) && d > 0) setDuration(d);
            } catch {
              /* ignore */
            }
          },
          onStateChange: (e: { target: YTPlayer }) => {
            if (cancelled) return;
            const st = e.target.getPlayerState?.();
            if (st === 0) {
              try {
                e.target.seekTo?.(0, true);
                e.target.playVideo?.();
              } catch {
                /* ignore */
              }
            }
            syncState(e.target);
          },
        },
      });
    })();

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [vid, syncState]);

  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      if (scrubbingRef.current) return;
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime?.();
        const d = p.getDuration?.();
        if (typeof t === "number" && Number.isFinite(t)) setCurrentTime(t);
        if (typeof d === "number" && Number.isFinite(d) && d > 0) setDuration(d);
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [ready, playing]);

  const seekBy = (delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const t = p.getCurrentTime?.() ?? 0;
      const d = p.getDuration?.() ?? 0;
      const next = Math.max(0, Math.min(d || Infinity, t + delta));
      p.seekTo(next, true);
      setCurrentTime(next);
    } catch {
      /* ignore */
    }
  };

  if (!vid) return null;

  const poster = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  const displayTime = scrubbing ? scrubTime : currentTime;
  const sliderMax = duration > 0 ? duration : 1;
  const sliderValue = duration > 0 ? Math.min(scrubbing ? scrubTime : currentTime, duration) : 0;

  const btnClass =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-border/60 bg-background/80 text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40";
  const primaryBtn =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md bg-accent text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40";

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" title={title} />
        {/* Show thumbnail until video is actually playing */}
        {(!ready || !playing) && (
          <div className="absolute inset-0 z-[15] bg-cover bg-center" style={{ backgroundImage: `url(${poster})` }} aria-hidden />
        )}
        {ready && (
          <div
            className="absolute inset-0 z-10 cursor-default bg-transparent"
            style={{ pointerEvents: "auto" }}
            aria-hidden
            onKeyDown={(e) => e.preventDefault()}
          />
        )}
      </div>

      <div className="mt-2 space-y-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 dark:bg-muted/15">
        <Slider
          disabled={!ready || duration <= 0}
          min={0}
          max={sliderMax}
          step={0.25}
          value={[sliderValue]}
          onValueChange={(vals) => {
            const t = Math.max(0, Math.min(sliderMax, vals[0] ?? 0));
            setScrubTime(t);
            setCurrentTime(t);
            try {
              playerRef.current?.seekTo(t, true);
            } catch {
              /* ignore */
            }
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
          <span>{formatTime(displayTime)}</span>
          <span className="text-muted-foreground/50">/</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" disabled={!ready} onClick={() => seekBy(-SEEK_SEC)} className={btnClass} aria-label={`Back ${SEEK_SEC} seconds`}>
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              const p = playerRef.current;
              if (!p) return;
              if (playing) p.pauseVideo();
              else p.playVideo();
            }}
            className={primaryBtn}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button type="button" disabled={!ready} onClick={() => seekBy(SEEK_SEC)} className={btnClass} aria-label={`Forward ${SEEK_SEC} seconds`}>
            <SkipForward size={16} />
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              const p = playerRef.current;
              if (!p) return;
              if (muted) {
                p.unMute();
                setMuted(false);
              } else {
                p.mute();
                setMuted(true);
              }
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
