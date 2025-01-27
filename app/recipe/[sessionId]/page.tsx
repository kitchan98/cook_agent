'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import type { Recipe } from '../../../utils/recipeGenerator';
import { supabase } from '../../../utils/supabase';
import OcadoLoginModal from '@/app/components/OcadoLoginModal';

const VideoEmbed = ({ url }: { url: string }) => {
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop() 
        : new URLSearchParams(new URL(url).search).get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('tiktok.com')) {
      return `https://www.tiktok.com/embed/${url.split('/').pop()}`;
    }
    if (url.includes('instagram.com')) {
      return `https://www.instagram.com/p/${url.split('/').pop()}/embed`;
    }
    return url;
  };

  return (
    <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg">
      <iframe
        src={getEmbedUrl(url)}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

const ShareButton = ({ recipe, url, sessionId }: { recipe: Recipe; url: string; sessionId: string }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkBookmarkStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('recipe_id', sessionId)
        .single();

      if (data) {
        setIsBookmarked(true);
      }
    };

    checkBookmarkStatus();
  }, [sessionId]);

  const showNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleBookmark = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth');
      return;
    }

    try {
      if (isBookmarked) {
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', session.user.id)
          .eq('recipe_id', sessionId);

        if (deleteError) throw deleteError;
        showNotification('Recipe removed from bookmarks');
      } else {
        const { error: insertError } = await supabase
          .from('bookmarks')
          .insert({
            user_id: session.user.id,
            recipe_id: sessionId
          });

        if (insertError) throw insertError;
        showNotification('Recipe bookmarked');
      }
      setIsBookmarked(!isBookmarked);
    } catch {
      showNotification('Failed to update bookmark');
    }
  };

  const generateMarkdown = () => {
    const md = `# ${recipe.title}

${recipe.description}

## Video
${url}

## Cooking Time
${recipe.cookingTime || 'Not specified'}

## Servings
${recipe.servings || 'Not specified'}

## Ingredients
${recipe.ingredients.map(ing => `- ${ing.quantity}${ing.unit !== 'whole' ? ' ' + ing.unit : ''} ${ing.name}`).join('\n')}

## Instructions
${recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${recipe.tips && recipe.tips.length > 0 ? `\n## Tips
${recipe.tips.map(tip => `- ${tip}`).join('\n')}` : ''}`;

    return md;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Copied to clipboard!');
    } catch {
      showNotification('Failed to copy to clipboard');
    }
  };

  const shareableLink = `${window.location.origin}/recipe/${sessionId}`;

  return (
    <div className="flex gap-2">
      <button
        onClick={toggleBookmark}
        className={`p-2 text-white ${isBookmarked ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-600 hover:bg-gray-700'} rounded-lg transition-colors`}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark recipe'}
      >
        <svg className="h-5 w-5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </button>
      <button
        onClick={() => copyToClipboard(shareableLink)}
        className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        title="Copy link"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
      <button
        onClick={() => copyToClipboard(generateMarkdown())}
        className="p-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
        title="Copy as markdown"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

const Drawer = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 w-full sm:w-[32rem] h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-6 border-b">
            <h3 className="text-xl font-semibold text-black">Alternative Ingredients</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 text-black">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default function RecipePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [url, setUrl] = useState('');
  const [servings, setServings] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [alternatives, setAlternatives] = useState<string>('');
  const [citations, setCitations] = useState<string[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [isOcadoModalOpen, setIsOcadoModalOpen] = useState(false);

  const { sessionId } = use(params);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch(`/api/recipe?sessionId=${sessionId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load recipe');
        }
        
        const data = await response.json();
        console.log('Recipe data:', data);
        
        if (data.recipe) {
          setRecipe(data.recipe);
          setUrl(data.url);
          setServings(data.recipe.servings || 1);
        } else {
          throw new Error('Recipe not found');
        }
      } catch (error) {
        console.error('Error loading recipe:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load recipe');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipe();
  }, [sessionId]);

  const adjustQuantity = (quantity: number, originalServings: number, newServings: number) => {
    return Number(((quantity * newServings) / originalServings).toFixed(2));
  };

  const generateAlternatives = async () => {
    setLoadingAlternatives(true);
    
    const handleError = (message: string) => {
      console.error('Error generating alternatives:', message);
      setAlternatives(`Failed to generate alternatives: ${message}`);
      setCitations([]);
    };

    try {
      const response = await fetch('/api/alternatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: recipe?.title,
          ingredients: recipe?.ingredients.map(ing => ing.name)
        })
      });
      
      if (!response.ok) {
        handleError('Failed to generate alternatives');
        return;
      }

      const data = await response.json();
      setAlternatives(data.content);
      setCitations(data.citations || []);
    } catch {
      handleError('An unexpected error occurred');
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleOcadoSubmit = async (credentials: { email: string; password: string }) => {
    if (!recipe) {
      alert('Recipe not found');
      return;
    }

    try {
      const response = await fetch('/api/ocado-basket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: recipe.ingredients,
          credentials
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start Ocado basket automation');
      }

      setIsOcadoModalOpen(false);
      alert('Ocado basket automation started! Check your Ocado basket in 5 min');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to start Ocado basket automation. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errorMessage || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <p className="text-red-700">{errorMessage || 'Recipe not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          <ShareButton recipe={recipe} url={url} sessionId={sessionId} />
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column: Video, Basic Info, and Ingredients */}
            <div className="p-8">
              <VideoEmbed url={url} />
              <div className="mt-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">{recipe.title}</h1>
                <p className="text-gray-600 mb-6">{recipe.description}</p>
                <div className="flex items-center gap-6 text-gray-600 mb-8">
                  {recipe.cookingTime && (
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{recipe.cookingTime}</span>
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-gray-700">Servings:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setServings(prev => Math.max(1, prev - 1))}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center font-medium">{servings}</span>
                        <button
                          onClick={() => setServings(prev => prev + 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ingredients moved to left column */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-semibold text-gray-900">Ingredients</h2>
                    <button
                      onClick={() => {
                        setIsDrawerOpen(true);
                        if (!alternatives) {
                          generateAlternatives();
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>View Alternatives</span>
                    </button>
                    <button
                      onClick={() => setIsOcadoModalOpen(true)}
                      className="relative ml-auto bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-150 flex items-center gap-3 group"
                      title="Let AI help you shop for ingredients at Ocado"
                    >
                      <svg className="h-5 w-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Add to Basket</span>
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 bg-gray-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                        AI will add items for you
                      </div>
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-gray-700">
                          {adjustQuantity(ingredient.quantity, recipe.servings || 1, servings)}
                          {ingredient.unit !== 'whole' ? ' ' + ingredient.unit : ''} {ingredient.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                  {loadingAlternatives ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="prose prose-blue max-w-none">
                        {alternatives ? (
                          <div className="whitespace-pre-wrap">{alternatives}</div>
                        ) : (
                          <p>Generating alternative ingredients...</p>
                        )}
                      </div>
                      {citations && citations.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Sources:</h4>
                          <ul className="space-y-1">
                            {citations.map((citation, index) => (
                              <li key={index}>
                                <a 
                                  href={citation}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                                >
                                  {citation}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </Drawer>
              </div>
            </div>

            {/* Right column: Instructions and Tips */}
            <div className="p-8 bg-gray-50">
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">Instructions</h2>
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
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-900">Tips</h2>
                  <ul className="space-y-2">
                    {recipe.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <svg className="h-6 w-6 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-gray-700">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <OcadoLoginModal
        isOpen={isOcadoModalOpen}
        onClose={() => setIsOcadoModalOpen(false)}
        onSubmit={handleOcadoSubmit}
      />
    </div>
  );
} 