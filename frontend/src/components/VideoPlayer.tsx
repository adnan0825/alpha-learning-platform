/**
 * VideoPlayer - Embeds YouTube videos using iframe.
 * If you see "Playback on other websites has been disabled", the uploader must allow embedding in YouTube Studio.
 */
import React from "react";

interface VideoPlayerProps {
  url: string;
  title?: string;
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

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, title = "Course Video" }) => {
  const videoId = getYouTubeId(url);

  if (!videoId) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-muted">
        <p className="text-muted-foreground">Invalid video URL</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="aspect-video overflow-hidden rounded-xl shadow-elevated ring-1 ring-border/40">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          className="h-full w-full"
        />
      </div>
    </div>
  );
};

export default VideoPlayer;
