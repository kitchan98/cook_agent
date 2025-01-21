import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId } from '../../../utils/videoExtractor';
import { supabase } from '../../../utils/supabase';
import { getYouTubeTranscript, getTikTokTranscript, getInstagramTranscript } from '../../../utils/transcriptExtractor';
import { generateRecipe } from '../../../utils/recipeGenerator';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    // Transform YouTube Shorts URL to regular watch URL
    const transformedUrl = url.replace('youtube.com/shorts/', 'youtube.com/watch?v=');
    
    const videoInfo = extractVideoId(transformedUrl);

    if (!videoInfo) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    }

    const sessionId = uuidv4();
    let transcript: { text: string; timestamp: string }[] = [];
    let recipe;

    try {
      // Get transcript based on platform
      if (videoInfo.platform === 'youtube') {
        transcript = await getYouTubeTranscript(videoInfo.id);
      } else if (videoInfo.platform === 'instagram') {
        transcript = await getInstagramTranscript(videoInfo.id);
      } else if (videoInfo.platform === 'tiktok') {
        transcript = await getTikTokTranscript(videoInfo.id);
      }

      // Generate structured recipe from transcript
      const transcriptText = transcript.map(t => t.text).join(' ');
      recipe = await generateRecipe(transcriptText);

    } catch (transcriptError) {
      console.error('Error processing video:', transcriptError);
      return NextResponse.json({ 
        error: `Failed to process ${videoInfo.platform} video` 
      }, { status: 500 });
    }

    // Store video information in Supabase
    const { error: dbError } = await supabase
      .from('recipes')
      .insert({
        session_id: sessionId,
        video_platform: videoInfo.platform,
        video_id: videoInfo.id,
        url: transformedUrl,
        transcript: transcript.map(t => `[${t.timestamp}] ${t.text}`).join('\n'),
        recipe: JSON.stringify(recipe),
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Error storing recipe:', dbError);
      return NextResponse.json({ error: 'Failed to store recipe' }, { status: 500 });
    }

    return NextResponse.json({ 
      sessionId,
      videoInfo,
      transcript,
      recipe
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json({ 
      error: 'An error occurred while processing the video' 
    }, { status: 500 });
  }
} 