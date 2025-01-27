import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Ingredient {
  quantity: number;
  unit: string;
  name: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function normalizeIngredients(ingredients: Ingredient[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Convert these recipe ingredients into simple Ocado search terms.
Return a JSON array of objects with 'searchTerm' and 'fullDescription'.
For searchTerm:
- Use the most basic form (usually 1 word, max 2 words)
- Remove all measurements, numbers, and descriptive words
- Focus on the main ingredient name that would work in Tesco's search
- Capitalize the first letter of each word

Examples:
"2 tablespoons extra virgin olive oil, cold pressed" → [{"searchTerm": "Oil", "fullDescription": "2 tablespoons extra virgin olive oil, cold pressed"}]
"1 pound New York strip steak, 1.5 inches thick" → [{"searchTerm": "Steak", "fullDescription": "1 pound New York strip steak, 1.5 inches thick"}]
"2-3 cloves garlic, smashed" → [{"searchTerm": "Garlic", "fullDescription": "2-3 cloves garlic, smashed"}]
"1 tablespoon + 1 teaspoon kosher salt" → [{"searchTerm": "Salt", "fullDescription": "1 tablespoon + 1 teaspoon kosher salt"}]

Ingredients:
${ingredients.map(ing => `${ing.quantity}${ing.unit !== 'whole' ? ' ' + ing.unit : ''} ${ing.name}`).join('\n')}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = await response.text();
  
  try {
    // Remove markdown code block if present
    text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    // Remove any remaining markdown formatting
    text = text.replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Failed to normalize ingredients');
  }
}

export async function POST(request: Request) {
  try {
    const { ingredients, credentials } = await request.json() as { 
      ingredients: Ingredient[];
      credentials: { email: string; password: string };
    };
    
    // Use Gemini to normalize ingredients
    const normalizedIngredients = await normalizeIngredients(ingredients);

    // Forward the request to the automation server
    const automationResponse = await fetch(process.env.AUTOMATION_SERVER_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AUTOMATION_SERVER_KEY}`
      },
      body: JSON.stringify({
        ingredients: normalizedIngredients,
        credentials
      })
    });

    if (!automationResponse.ok) {
      throw new Error('Automation server error');
    }

    return NextResponse.json({ message: 'Ocado basket automation started! Check your basket in about 5 minutes.' });
  } catch (err) {
    console.error('Error starting Ocado basket automation:', err);
    return NextResponse.json(
      { error: 'Failed to start Ocado basket automation' },
      { status: 500 }
    );
  }
} 