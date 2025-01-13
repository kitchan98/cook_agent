import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const proxyAgent = new HttpsProxyAgent(process.env.PROXY_URL || 'https://sp2zcwxkow:UqF6xA~y7eGdku3fr5@gate.visitxiangtan.com:10004');

export async function getYouTubeTranscript(videoId: string): Promise<{ text: string; timestamp: string }[]> {
  console.log(`Attempting to get transcript for video ID: ${videoId}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    console.log('Fetching video page through SmartProxy...');
    const response = await axios.get(url, {
      httpsAgent: proxyAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
      }
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = response.data;
    
    // Method 1: Try to find the timedtext URL
    const timedtextUrlMatch = html.match(/"captions":.*?"playerCaptionsTracklistRenderer":.*?"captionTracks":\s*\[.*?"baseUrl":\s*"([^"]+)"/);
    
    if (timedtextUrlMatch) {
      const transcriptUrl = timedtextUrlMatch[1].replace(/\\u0026/g, '&');

      const transcriptResponse = await fetch(transcriptUrl, {
        agent: proxyAgent as any,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible)',
        },
      });
      
      if (transcriptResponse.ok) {
        const transcriptXml = await transcriptResponse.text();
        const $transcript = cheerio.load(transcriptXml, { xmlMode: true });
        return $transcript('text').map((_, el) => ({
          text: $transcript(el).text(),
          timestamp: formatTimestamp(parseFloat($transcript(el).attr('start') || '0'))
        })).get();
      }
    }

    // Method 2: Try to extract transcript from player response
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (playerResponseMatch) {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captions = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (captions && captions.length > 0) {
        const captionUrl = captions[0].baseUrl;
        const captionResponse = await fetch(captionUrl);
        
        if (captionResponse.ok) {
          const captionXml = await captionResponse.text();
          const $caption = cheerio.load(captionXml, { xmlMode: true });
          return $caption('text').map((_, el) => ({
            text: $caption(el).text(),
            timestamp: formatTimestamp(parseFloat($caption(el).attr('start') || '0'))
          })).get();
        }
      }
    }

    return [{ text: 'No transcript available', timestamp: "00:00:00" }];
  } catch (error) {
    console.error('Error in getTranscript:', error);
    throw error;
  }
}

export async function getTikTokTranscript(videoId: string): Promise<{ text: string; timestamp: string }[]> {
  // TikTok doesn't provide direct transcript access
  // We would need to use speech-to-text service or third-party API
  throw new Error('TikTok transcript extraction not implemented yet');
}

export async function getInstagramTranscript(videoId: string): Promise<{ text: string; timestamp: string }[]> {
  // Instagram doesn't provide direct transcript access
  // We would need to use speech-to-text service or third-party API
  throw new Error('Instagram transcript extraction not implemented yet');
} 