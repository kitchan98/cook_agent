import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Check if recipe field exists
    if (!data.recipe) {
      return NextResponse.json({ error: 'Recipe data is missing' }, { status: 404 });
    }

    // Parse the recipe JSON string
    let parsedRecipe;
    try {
      // If recipe is already an object, don't parse it
      parsedRecipe = typeof data.recipe === 'string' ? JSON.parse(data.recipe) : data.recipe;


      // Validate recipe structure
      if (!parsedRecipe) {
        throw new Error('Recipe is null or undefined');
      }

      if (typeof parsedRecipe !== 'object') {
        throw new Error('Recipe is not an object');
      }

      if (!parsedRecipe.title) {
        throw new Error('Recipe title is missing');
      }

      if (!Array.isArray(parsedRecipe.ingredients)) {
        throw new Error('Recipe ingredients is not an array');
      }

      if (!Array.isArray(parsedRecipe.steps)) {
        throw new Error('Recipe steps is not an array');
      }

    } catch (e) {
      return NextResponse.json({ 
        error: 'Invalid recipe format', 
        details: e instanceof Error ? e.message : 'Unknown parsing error'
      }, { status: 500 });
    }

    return NextResponse.json({
      recipe: parsedRecipe,
      url: data.url,
      sessionId: data.session_id
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'An error occurred while retrieving the recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 