import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

const secret = process.env.JWT_SECRET || 'default_secret_that_should_be_replaced_in_env_local';
const JWT_SECRET = new TextEncoder().encode(secret);

// Helper to authenticate user session
async function getAuthenticatedUser(request: NextRequest): Promise<{ success: boolean; email?: string; errorResponse?: NextResponse }> {
  const token = request.cookies.get('webmail_session')?.value;
  if (!token) {
    return { success: false, errorResponse: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const email = (payload.email as string || '').trim().toLowerCase();

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return { success: false, errorResponse: NextResponse.json({ error: 'Usuario no autorizado' }, { status: 403 }) };
    }

    return {
      success: true,
      email,
    };
  } catch (err) {
    return { success: false, errorResponse: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  }
}

// Call Gemini API with fallback models if the first model fails
async function callGeminiAPI(prompt: string, customSystemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6L8ms8_TV660I_dHngdFjJzgSQCOsYSqpJOocQe2Brg9Q';
  const modelToTry = process.env.GEMINI_MODEL || 'gemini-3.1-flash-live-preview';
  
  // List of models to try in sequence as fallbacks in case the live-flash/preview model fails or is rate-limited
  const models = [modelToTry, 'gemini-3.1-flash-live-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: customSystemInstruction ? { parts: [{ text: customSystemInstruction }] } : undefined,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text;
        }
      } else {
        const errorText = await response.text();
        console.error(`Gemini call failed for model ${model}:`, errorText);
        lastError = new Error(`API error (${response.status}): ${errorText}`);
      }
    } catch (err: any) {
      console.error(`Gemini call exception for model ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo obtener respuesta de la API de Gemini');
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth.success) return auth.errorResponse!;

  try {
    const { action, emailContext, promptText, format = 'html' } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Acción requerida' }, { status: 400 });
    }

    if (action === 'summarize') {
      if (!emailContext || !emailContext.body) {
        return NextResponse.json({ error: 'Contexto de correo incompleto para resumen' }, { status: 400 });
      }

      const systemInstruction = 'Eres un asistente de correo electrónico altamente eficiente. Tu tarea es generar un resumen conciso, estructurado y claro de este correo en español.';
      const prompt = `Por favor resume el siguiente correo electrónico en un máximo de 4 viñetas cortas.

Remitente: ${emailContext.from || 'Desconocido'}
Asunto: ${emailContext.subject || 'Sin asunto'}
Cuerpo del correo:
${emailContext.body.slice(0, 10000)}

Resumen estructurado:`;

      const summary = await callGeminiAPI(prompt, systemInstruction);
      return NextResponse.json({ text: summary });
    }

    if (action === 'reply') {
      if (!emailContext || !emailContext.body) {
        return NextResponse.json({ error: 'Contexto de correo incompleto para respuesta' }, { status: 400 });
      }

      const useHtml = format === 'html';
      const formatInstructions = useHtml 
        ? 'El cuerpo de la respuesta debe tener formato HTML básico (usando <p>, <br>, etc.), pero sin las etiquetas <html> o <body>.'
        : 'El cuerpo de la respuesta debe ser texto plano puro, utilizando saltos de línea estándar para estructurar los párrafos y absolutamente ninguna etiqueta HTML o markdown.';

      const systemInstruction = 'Eres un redactor de correos profesional. Tu tarea es generar una respuesta formal o informal (según el contexto) en español para el correo provisto, siguiendo exactamente las indicaciones del usuario.';
      const prompt = `Genera un borrador de correo electrónico de respuesta en español. ${formatInstructions} Debe ser redactado de forma natural y profesional.

Correo al que se responde:
De: ${emailContext.from || 'Desconocido'}
Asunto: ${emailContext.subject || 'Sin asunto'}
Cuerpo del correo:
${emailContext.body.slice(0, 5000)}

Instrucciones del usuario para la respuesta:
${promptText || 'Responder cordialmente.'}

Borrador de respuesta (solo el contenido de la respuesta):`;

      const draft = await callGeminiAPI(prompt, systemInstruction);
      return NextResponse.json({ text: draft });
    }

    if (action === 'compose') {
      if (!promptText) {
        return NextResponse.json({ error: 'Instrucciones requeridas para componer' }, { status: 400 });
      }

      const useHtml = format === 'html';
      const formatInstructions = useHtml 
        ? 'con formato HTML básico (usando <p>, <br>, etc.) pero sin las etiquetas <html> o <body>.'
        : 'como texto plano puro, utilizando saltos de línea estándar para estructurar los párrafos y absolutamente ninguna etiqueta HTML o markdown.';

      const systemInstruction = 'Eres un redactor de correos profesional. Tu tarea es redactar un correo completo desde cero basándote en las instrucciones del usuario. Redacta en español.';
      const prompt = `Genera un correo electrónico completo en español ${formatInstructions} También devuelve una sugerencia de línea de Asunto al principio, de la forma "Asunto: [Tu asunto aquí]".

Instrucciones del usuario:
${promptText}

Contenido generado:`;

      const generated = await callGeminiAPI(prompt, systemInstruction);
      return NextResponse.json({ text: generated });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in AI endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
