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

// Call AI router (OpenAI-compatible) API
async function callAIAPI(prompt: string, customSystemInstruction?: string): Promise<string> {
  const apiKey = process.env.AI_ROUTER_API_KEY || process.env.AI_API_KEY || 'sk-38193f062aa4aa21-taxj8m-0aa6036f';
  const endpoint = (process.env.AI_ROUTER_ENDPOINT || process.env.AI_ENDPOINT || 'https://ai.broslunas.com/v1').replace(/\/+$/, '');
  const model = process.env.AI_MODEL || 'rotate-top';

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (customSystemInstruction) {
    messages.push({ role: 'system', content: customSystemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI router call failed:', errorText);
    throw new Error(`Error en API de IA (${response.status}): ${errorText}`);
  }

  const rawText = await response.text();
  let text = '';

  const trimmed = rawText.trim();
  if (trimmed.startsWith('data:') || trimmed.includes('\ndata:')) {
    // Handle SSE stream fallback if router sends data chunks
    const lines = trimmed.split('\n');
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine.startsWith('data:')) continue;
      const jsonStr = cleanLine.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
        text += delta;
      } catch {
        // Skip invalid SSE chunks
      }
    }
  } else {
    // Normal JSON response
    try {
      const parsed = JSON.parse(trimmed);
      text = parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.delta?.content || '';
    } catch {
      text = trimmed;
    }
  }

  // Strip reasoning block if returned by models like DeepSeek / MiniMax
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  if (!text) {
    throw new Error('Respuesta vacía del servicio de IA');
  }

  return text;
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

      const summary = await callAIAPI(prompt, systemInstruction);
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

      const draft = await callAIAPI(prompt, systemInstruction);
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

      const generated = await callAIAPI(prompt, systemInstruction);
      return NextResponse.json({ text: generated });
    }

    if (action === 'generate_autoreply') {
      if (!promptText) {
        return NextResponse.json({ error: 'Instrucciones requeridas para generar la respuesta automática' }, { status: 400 });
      }

      const systemInstruction = 'Eres un redactor de correos profesional. Genera una respuesta automática de correo (asunto y cuerpo) en español basada en las instrucciones del usuario. Responde en formato JSON puro con las claves "subject" y "body". No uses markdown alrededor del JSON.';
      const prompt = `Genera un asunto y un cuerpo de mensaje de respuesta automática en español basándote en estas instrucciones del usuario:
"${promptText}"

Devuelve un objeto JSON con las siguientes claves:
- "subject": una línea corta para el asunto (puedes incluir {{subject}} si tiene sentido, ej: "Respuesta automática: {{subject}}").
- "body": el cuerpo de la respuesta con saltos de línea \\n (puedes incluir {{sender}} o {{subject}} si tiene sentido).

JSON esperado:`;

      const generated = await callAIAPI(prompt, systemInstruction);
      let cleanJsonText = generated.replace(/```json/gi, '').replace(/```/gi, '').trim();
      try {
        const resultObj = JSON.parse(cleanJsonText);
        return NextResponse.json({ 
          subject: resultObj.subject || 'Respuesta automática',
          body: resultObj.body || ''
        });
      } catch (parseErr) {
        console.error('Failed to parse AI response as JSON:', cleanJsonText);
        return NextResponse.json({ 
          subject: 'Respuesta automática: {{subject}}',
          body: cleanJsonText
        });
      }
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in AI endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
