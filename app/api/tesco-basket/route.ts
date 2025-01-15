import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
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
Convert these recipe ingredients into simple Tesco search terms.
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
  let text = response.text();
  
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
    const { ingredients } = await request.json() as { ingredients: Ingredient[] };
    
    // Use Gemini to normalize ingredients
    const normalizedIngredients = await normalizeIngredients(ingredients);

    // Spawn the Python script as a child process with ingredients as arguments
    const pythonScript = path.join(process.cwd(), 'browser-use', '.vscode', 'tesco_basket.py');
    const pythonProcess = spawn('python3', [
      pythonScript,
      '--ingredients',
      JSON.stringify(normalizedIngredients)
    ]);

    // Handle script output
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python script output: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python script error: ${data}`);
    });

    return NextResponse.json({ message: 'Tesco basket automation started' });
  } catch (err) {
    console.error('Error starting Tesco basket automation:', err);
    return NextResponse.json(
      { error: 'Failed to start Tesco basket automation' },
      { status: 500 }
    );
  }
} 