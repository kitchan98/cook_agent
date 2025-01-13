import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { title, ingredients } = await request.json();

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{
          role: 'user',
          content: `For this recipe: ${title}, provide alternative ingredients for each item in this list: ${ingredients.join(', ')}. Format the response as a bullet point list with the original ingredient followed by possible substitutes. Focus on common household ingredients and maintain similar taste profiles.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch alternatives');
    }

    const data = await response.json();
    
    return NextResponse.json({
      content: data.choices[0].message.content,
      citations: data.citations || []
    });
  } catch (error) {
    console.error('Error generating alternatives:', error);
    return NextResponse.json(
      { error: 'Failed to generate alternatives' },
      { status: 500 }
    );
  }
} 