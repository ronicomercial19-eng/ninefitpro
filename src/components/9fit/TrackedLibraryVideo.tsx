import { useEffect, useRef } from "react";

interface PlayerState { currentTime: () => number; duration: () => number; destroy: () => void; }
interface YouTubePlayer extends PlayerState { getPlayerState: () => number; }
declare global { interface Window { YT?: { Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer; PlayerState: { PLAYING: number; ENDED: number } }; onYouTubeIframeAPIReady?: () => void; } }

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v") || parsed.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
    return id && /^[\w-]+$/.test(id) ? id : null;
  } catch { return null; }
}

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
      player = new window.YT.Player(host.current, {
        videoId: id,
        playerVars: { start: Math.max(0, Math.floor(startSeconds)), playsinline: 1, rel: 0 },
        events: {
          onStateChange: (event: { data: number }) => {
            if (event.data === window.YT?.PlayerState.PLAYING && player) {
              window.clearInterval(poll);
              poll = window.setInterval(() => {
                if (player) callbacks.current.onProgress(player.currentTime(), player.duration());
              }, 30000);
            } else {
              window.clearInterval(poll);
              if (player && event.data === window.YT?.PlayerState.ENDED) callbacks.current.onComplete(player.duration());
              else if (player) callbacks.current.onProgress(player.currentTime(), player.duration());
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

  if (isFile) return <video src={url} controls playsInline preload="metadata" className="w-full h-full bg-black" onLoadedMetadata={(event) => {
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
  if (id) return <div ref={host} className="w-full h-full" aria-label={title} />;
  return <div className="flex h-full min-h-0 flex-col bg-black">
    <iframe src={url} title={title} className="w-full min-h-0 flex-1 border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
    <p className="px-3 py-2 text-center text-[10px] text-muted-foreground">O progresso deste provedor é salvo quando o HealthFlix confirma o avanço.</p>
  </div>;
}
