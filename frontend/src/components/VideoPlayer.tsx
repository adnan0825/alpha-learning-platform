/**
 * VideoPlayer - Embeds YouTube videos using iframe.
 * If you see "Playback on other websites has been disabled", the uploader must allow embedding in YouTube Studio.
 */
import React, { useEffect, useState } from "react";
import { ChromelessYouTube } from "@/components/landing/ChromelessYouTube";

interface VideoPlayerProps {
  url: string;
  title?: string;
  initialTime?: number;
  onProgress?: (
    position: number,
    duration: number,
    playing: boolean,
    force?: boolean,
  ) => void;
  onEnded?: () => void;
}

/** Extracts YouTube video ID from various URL formats (watch, embed, youtu.be, Shorts). */
const getYouTubeId = (url: string): string | null => {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*[&?]v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  title = "Course Video",
  initialTime = 0,
  onProgress,
  onEnded,
}) => {
  const videoId = getYouTubeId(url);
  const [source, setSource] = useState(url);

  useEffect(() => {
    if (videoId || !url.includes("/api/uploads/video/")) {
      setSource(url);
      return;
    }
    const controller = new AbortController();
    fetch(`${url}/access`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Video access denied");
        return response.json() as Promise<{ url: string }>;
      })
      .then((payload) => {
        setSource(payload.url);
      })
      .catch(() => setSource(""));
    return () => {
      controller.abort();
    };
  }, [url, videoId]);

  if (!videoId) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-elevated ring-1 ring-border/40">
        {source ? (
          <video
            src={source}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            disableRemotePlayback
            onContextMenu={(event) => event.preventDefault()}
            onLoadedMetadata={(event) => {
              if (initialTime > 0)
                event.currentTarget.currentTime = initialTime;
              const video = event.currentTarget;
              onProgress?.(video.currentTime, video.duration, !video.paused);
            }}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              onProgress?.(video.currentTime, video.duration, !video.paused);
            }}
            onPlay={(event) => {
              const video = event.currentTarget;
              onProgress?.(video.currentTime, video.duration, true);
            }}
            onPause={(event) => {
              const video = event.currentTarget;
              onProgress?.(video.currentTime, video.duration, false, true);
            }}
            onEnded={onEnded}
            preload="metadata"
            className="h-full w-full"
            title={title}
          />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-white">
            Video unavailable
          </p>
        )}
      </div>
    );
  }

  return (
    <ChromelessYouTube
      videoUrl={url}
      title={title}
      initialTime={initialTime}
      autoPlay={false}
      loop={false}
      onProgress={onProgress}
      onEnded={onEnded}
    />
  );
};

export default VideoPlayer;
