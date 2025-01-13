import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface Recipe {
  title: string;
  description: string;
  ingredients: Array<{
    quantity: number;
    unit: string;
    name: string;
    originalText: string;
  }>;
  steps: string[];
  cookingTime?: string;
  servings?: number;
  tips?: string[];
}

const RECIPE_PROMPT = `
You are a professional chef and recipe writer. Analyze the following video transcript and create a well-structured recipe.
Format your response in plain text without any markdown or special characters, following this structure:

TITLE: [Recipe Name]

DESCRIPTION: [2-3 sentences describing the dish]

COOKING TIME: [Total time needed]
SERVINGS: [Just the number, e.g. "4" not "4 servings"]

INGREDIENTS:
- [List each ingredient with quantity in this format: "QUANTITY UNIT INGREDIENT", e.g. "2 cups flour" or "3 whole eggs"]
- Always use numbers for quantities (e.g. "0.5" or "1/2" instead of "half")
- Use standard units: cups, tablespoons (tbsp), teaspoons (tsp), ounces (oz), pounds (lb), grams (g), whole
- For items without units, use "whole" (e.g. "2 whole eggs")

INSTRUCTIONS:
1. [First step]
2. [Second step]
...

TIPS:
- [Any helpful tips or notes]

Make sure to:
- Keep measurements consistent (use standard US measurements)
- List ingredients in order of use
- Break down instructions into clear, manageable steps
- Include specific temperatures and timing
- Add any helpful tips mentioned in the video

Transcript:
`;

// Add this helper function to parse ingredient strings
function parseIngredient(ingredientText: string): Recipe['ingredients'][0] {
  // Remove leading dash if present
  ingredientText = ingredientText.replace(/^-\s*/, '').trim();
  
  // Regular expression to match quantity, unit, and ingredient name
  // Updated to handle more formats including fractions and mixed numbers
  const regex = /^((?:\d+\s+)?\d+\/\d+|\d*\.?\d+)\s*([a-zA-Z]+|whole)?\s*(.+)$/i;
  const match = ingredientText.match(regex);
  
  if (match) {
    const [_, quantityStr, unit, name] = match;
    
    // Convert mixed numbers and fractions to decimal
    const quantity = quantityStr.includes('/') 
      ? quantityStr.includes(' ')
        ? eval(quantityStr.replace(' ', '+'))
        : eval(quantityStr)
      : parseFloat(quantityStr);
    
    // Normalize common unit variations
    let normalizedUnit = (unit || 'whole').toLowerCase();
    const unitMap: { [key: string]: string } = {
      'tbsp': 'tablespoons',
      'tsp': 'teaspoons',
      'oz': 'ounces',
      'lb': 'pounds',
      'g': 'grams',
      'ml': 'milliliters',
      'l': 'liters',
      'c': 'cups'
    };
    
    normalizedUnit = unitMap[normalizedUnit] || normalizedUnit;
    
    return {
      quantity,
      unit: normalizedUnit,
      name: name.trim(),
      originalText: ingredientText
    };
  }
  
  // If no quantity/unit found, treat as whole item
  return {
    quantity: 1,
    unit: 'whole',
    name: ingredientText,
    originalText: ingredientText
  };
}

export async function generateRecipe(transcript: string): Promise<Recipe> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent(RECIPE_PROMPT + transcript);
    const response = await result.response;
    const text = response.text();
    
    // Parse the generated text into structured format
    const recipe: Recipe = {
      title: '',
      description: '',
      ingredients: [],
      steps: [],
      cookingTime: '',
      servings: undefined,
      tips: []
    };
    
    const sections = text.split('\n\n');
    let currentSection = '';
    
    for (const section of sections) {
      const trimmedSection = section.trim();
      
      if (trimmedSection.startsWith('TITLE:')) {
        recipe.title = trimmedSection.replace('TITLE:', '').trim();
      } else if (trimmedSection.startsWith('DESCRIPTION:')) {
        recipe.description = trimmedSection.replace('DESCRIPTION:', '').trim();
      } else if (trimmedSection.includes('COOKING TIME:') || trimmedSection.includes('SERVINGS:')) {
        // Handle combined cooking time and servings line
        const lines = trimmedSection.split('\n');
        for (const line of lines) {
          if (line.includes('COOKING TIME:')) {
            recipe.cookingTime = line.replace('COOKING TIME:', '').trim();
          }
          if (line.includes('SERVINGS:')) {
            const servingsText = line.replace('SERVINGS:', '').trim();
            const servingsMatch = servingsText.match(/\d+/);
            if (servingsMatch) {
              recipe.servings = parseInt(servingsMatch[0]);
            }
          }
        }
      } else if (trimmedSection.startsWith('INGREDIENTS:')) {
        recipe.ingredients = trimmedSection
          .replace('INGREDIENTS:', '')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && line.startsWith('-'))
          .map(line => parseIngredient(line));
      } else if (trimmedSection.startsWith('INSTRUCTIONS:')) {
        recipe.steps = trimmedSection
          .replace('INSTRUCTIONS:', '')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && /^\d+\./.test(line))
          .map(line => line.replace(/^\d+\.\s*/, ''));
      } else if (trimmedSection.startsWith('TIPS:')) {
        recipe.tips = trimmedSection
          .replace('TIPS:', '')
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && line.startsWith('-'))
          .map(line => line.substring(1).trim());
      }
    }
    
    return recipe;
  } catch (error) {
    console.error('Error generating recipe:', error);
    throw error;
  }
} 