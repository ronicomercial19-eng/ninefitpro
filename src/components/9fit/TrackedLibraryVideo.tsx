import { useEffect, useRef } from "react";

import { youtubeId, readYouTubeProgress, type YouTubeProgressPlayer } from "@/services/libraryPlayback";
interface PlayerState extends YouTubeProgressPlayer { destroy: () => void; }
interface YouTubePlayer extends PlayerState { getPlayerState: () => number; }
declare global { interface Window { YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer; PlayerState: { PLAYING: number; ENDED: number } }; onYouTubeIframeAPIReady?: () => void; } }

export function TrackedLibraryVideo({ url, title, startSeconds = 0, onProgress, onComplete }: {
  url: string; title: string; startSeconds?: number;
  onProgress: (position: number, duration: number) => void;
  onComplete: (duration: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onProgress, onComplete });
  const lastNativeReport = useRef(0);
  callbacks.current = { onProgress, onComplete };
  const id = youtubeId(url);
  const isFile = /\.(mp4|webm|ogg)(\?|$)/i.test(url);

  useEffect(() => {
    if (!id || !host.current) return;
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let poll: number | undefined;
    const create = () => {
      if (cancelled || !host.current || !window.YT) return;
      const target = document.createElement("div");
      host.current.replaceChildren(target);
      player = new window.YT.Player(target, {
        videoId: id,
        width: "100%",
        height: "100%",
        playerVars: { start: Math.max(0, Math.floor(startSeconds)), playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (event: { data: number }) => {
            if (event.data === window.YT?.PlayerState.PLAYING && player) {
              window.clearInterval(poll);
              poll = window.setInterval(() => {
                if (player) { const progress = readYouTubeProgress(player); if (progress) callbacks.current.onProgress(progress.position, progress.duration); }
              }, 30000);
            } else {
              window.clearInterval(poll);
              if (player && event.data === window.YT?.PlayerState.ENDED) callbacks.current.onComplete(player.getDuration());
              else if (player) { const progress = readYouTubeProgress(player); if (progress) callbacks.current.onProgress(progress.position, progress.duration); }
            }
          },
        },
      });
    };
    if (window.YT?.Player) create();
    else {
      const old = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      if (!old) {
        const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(script);
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previous?.(); create(); };
    }
    return () => { cancelled = true; window.clearInterval(poll); player?.destroy(); };
  }, [id, startSeconds]);

  if (isFile) return <video src={url} controls playsInline preload="metadata" className="absolute inset-0 w-full h-full bg-black object-contain" onLoadedMetadata={(event) => {
    if (startSeconds > 0 && startSeconds < event.currentTarget.duration) event.currentTarget.currentTime = startSeconds;
  }} onPause={(event) => {
    const video = event.currentTarget;
    if (video.duration) callbacks.current.onProgress(video.currentTime, video.duration);
  }} onTimeUpdate={(event) => {
    const video = event.currentTarget;
    if (!video.paused && video.duration && video.currentTime - lastNativeReport.current >= 30) {
      lastNativeReport.current = video.currentTime;
      callbacks.current.onProgress(video.currentTime, video.duration);
    }
  }} onEnded={(event) => callbacks.current.onComplete(event.currentTarget.duration)} />;
  if (id) return <div ref={host} className="absolute inset-0 w-full h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0" aria-label={title} />;
  return <iframe src={url} title={title} className="absolute inset-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
}
