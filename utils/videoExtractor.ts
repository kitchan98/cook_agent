interface VideoInfo {
  platform: 'youtube' | 'instagram' | 'tiktok';
  id: string;
}

export function extractVideoId(url: string): VideoInfo | null {
  // YouTube
  const youtubeRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const youtubeMatch = url.match(youtubeRegExp);
  if (youtubeMatch && youtubeMatch[2].length === 11) {
    return { platform: 'youtube', id: youtubeMatch[2] };
  }

  // Instagram Reels
  const reelsMatch = url.includes('instagram.com');
  if (reelsMatch) {
    return { platform: 'instagram', id: url };
  }

  // TikTok
  const tiktokRegExp = /tiktok.com\/@[\w.-]+\/video\/(\d+)/;
  const tiktokMatch = url.match(tiktokRegExp);
  if (tiktokMatch) {
    return { platform: 'tiktok', id: tiktokMatch[1] };
  }

  return null;
} 