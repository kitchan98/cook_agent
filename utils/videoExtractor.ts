interface VideoInfo {
  platform: 'youtube' | 'instagram' | 'tiktok';
  id: string;
}

export function extractVideoId(url: string): VideoInfo | null {
  // YouTube
  const youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const youtubeMatch = url.match(youtubeRegExp);
  if (youtubeMatch && youtubeMatch[2].length === 11) {
    return { platform: 'youtube', id: youtubeMatch[2] };
  }

  // Instagram Reels
  const reelsRegExp = /instagram.com\/reels?\/([^\/\?]+)/;
  const reelsMatch = url.match(reelsRegExp);
  if (reelsMatch) {
    return { platform: 'instagram', id: reelsMatch[1] };
  }

  // TikTok
  const tiktokRegExp = /tiktok.com\/@[\w.-]+\/video\/(\d+)/;
  const tiktokMatch = url.match(tiktokRegExp);
  if (tiktokMatch) {
    return { platform: 'tiktok', id: tiktokMatch[1] };
  }

  return null;
} 