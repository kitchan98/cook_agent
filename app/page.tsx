'use client';

import { useState } from 'react';
import type { Recipe } from '../utils/recipeGenerator';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);
  const [servingMultiplier, setServingMultiplier] = useState(1);

  // Helper function to scale cooking time
  const scaleCookingTime = (originalTime: string, scalingFactor: number): string => {
    // Extract numbers and units from cooking time
    const timeMatch = originalTime.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
    if (!timeMatch) return originalTime;

    const [_, timeValue, unit] = timeMatch;
    let scaledMinutes: number;

    // Convert to minutes for calculation
    if (unit.toLowerCase().startsWith('hour')) {
      scaledMinutes = parseInt(timeValue) * 60 * scalingFactor;
    } else {
      scaledMinutes = parseInt(timeValue) * scalingFactor;
    }

    // Convert back to hours and minutes if needed
    if (scaledMinutes >= 60) {
      const hours = Math.floor(scaledMinutes / 60);
      const minutes = Math.round(scaledMinutes % 60);
      return minutes > 0 ? `${hours} hours ${minutes} minutes` : `${hours} hours`;
    }
    
    return `${Math.round(scaledMinutes)} minutes`;
  };

  // Helper function to update recipe with new serving size
  const updateRecipeServings = (desiredServings: number) => {
    if (!recipe || !originalRecipe || !originalRecipe.servings) return;

    const scalingFactor = desiredServings / originalRecipe.servings;
    
    // Create a deep copy of the original recipe
    const updatedRecipe: Recipe = {
      ...originalRecipe,
      ingredients: originalRecipe.ingredients.map(ing => ({
        ...ing,
        quantity: ing.quantity * scalingFactor
      })),
      servings: desiredServings
    };

    // Scale cooking time if available
    if (updatedRecipe.cookingTime && originalRecipe.cookingTime) {
      updatedRecipe.cookingTime = scaleCookingTime(originalRecipe.cookingTime, scalingFactor);
    }

    setRecipe(updatedRecipe);
  };

  // Helper function to format ingredient with scaled quantity
  const formatIngredient = (ingredient: Recipe['ingredients'][0]) => {
    let formattedQuantity: string;

    // Format the quantity based on the value
    if (ingredient.quantity % 1 === 0) {
      formattedQuantity = ingredient.quantity.toString();
    } else {
      // Convert to fraction if it's close to common fractions
      const fraction = toFraction(ingredient.quantity);
      formattedQuantity = fraction || ingredient.quantity.toFixed(2);
    }

    // Don't show unit if it's "whole"
    const unitText = ingredient.unit === 'whole' ? '' : ingredient.unit;
    return `${formattedQuantity}${unitText ? ' ' + unitText : ''} ${ingredient.name}`.trim();
  };

  // Helper function to convert decimal to fraction
  const toFraction = (decimal: number): string | null => {
    const tolerance = 0.01;
    const fractions: [number, string][] = [
      [1/4, "1/4"], [1/3, "1/3"], [1/2, "1/2"],
      [2/3, "2/3"], [3/4, "3/4"]
    ];
    
    // Handle whole numbers with fractions
    const whole = Math.floor(decimal);
    const part = decimal - whole;
    
    for (const [value, display] of fractions) {
      if (Math.abs(part - value) < tolerance) {
        return whole ? `${whole} ${display}` : display;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRecipe(null);
    setOriginalRecipe(null);
    setServingMultiplier(1);

    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }

      setRecipe(data.recipe);
      setOriginalRecipe(data.recipe); // Store the original recipe
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Update the serving size controls
  const handleServingChange = (multiplier: number) => {
    setServingMultiplier(multiplier);
    if (recipe?.servings && originalRecipe?.servings) {
      const newServings = Math.round(originalRecipe.servings * multiplier);
      updateRecipeServings(newServings);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Recipe Extractor
          </h1>
          <p className="text-lg text-gray-600">
            Transform cooking videos into detailed recipes instantly
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="url" className="text-sm font-medium text-gray-700">
                Video URL
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube, TikTok, or Instagram Reels URL"
                className="p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Extract Recipe'
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {recipe && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-900 text-white p-8">
              <h2 className="text-3xl font-bold mb-2">{recipe.title}</h2>
              <p className="text-gray-300">{recipe.description}</p>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex flex-wrap gap-6 items-center">
                {recipe.cookingTime && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{recipe.cookingTime}</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex-1">
                    <div className="flex items-center justify-between max-w-xs p-3 bg-gray-50 rounded-lg">
                      <label className="text-sm font-medium text-gray-700">Adjust Servings:</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleServingChange(Math.max(0.25, servingMultiplier - 0.25))}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Decrease servings"
                        >
                          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-gray-900 font-medium min-w-[3ch] text-center">
                          {recipe.servings}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleServingChange(servingMultiplier + 0.25)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Increase servings"
                        >
                          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        {servingMultiplier !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleServingChange(1)}
                            className="text-sm px-2 py-1 text-blue-600 hover:text-blue-700 focus:outline-none"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Ingredients</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-gray-700">{formatIngredient(ingredient)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Instructions</h3>
                <ol className="space-y-4">
                  {recipe.steps.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </span>
                      <p className="text-gray-700 pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {recipe.tips && recipe.tips.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Tips</h3>
                  <ul className="space-y-2">
                    {recipe.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-700">
                        <svg className="h-6 w-6 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}