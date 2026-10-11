export interface YouTubeProgressPlayer {
  getCurrentTime(): number;
  getDuration(): number;
}

export function youtubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(parsed.hostname)) return null;
    const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function readYouTubeProgress(player: YouTubeProgressPlayer) {
  const position = player.getCurrentTime();
  const duration = player.getDuration();
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return null;
  return { position: Math.max(0, Math.min(position, duration)), duration };
}
