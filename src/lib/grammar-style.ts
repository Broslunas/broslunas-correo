import type { GrammarStyleIssue } from './types/email-features';

const COMMON_REPLACEMENTS: Array<{
  pattern: RegExp;
  replacement: string;
  message: string;
  type: GrammarStyleIssue['type'];
}> = [
  {
    pattern: /\bhaber\s+si\b/gi,
    replacement: 'a ver si',
    message: 'Confusión común entre el verbo "haber" y la expresión "a ver".',
    type: 'spelling',
  },
  {
    pattern: /\becho\s+de\s+menos\b/gi,
    replacement: 'hecho de menos',
    message: 'Del verbo "echar", se escribe "echo de menos" sin hache si es acción propia, o verifica según contexto.',
    type: 'spelling',
  },
  {
    pattern: /\ba\s+sido\b/gi,
    replacement: 'ha sido',
    message: 'Forma del verbo haber compuesta: se escribe "ha sido".',
    type: 'spelling',
  },
  {
    pattern: /\ba\s+habido\b/gi,
    replacement: 'ha habido',
    message: 'Forma compuesta de haber: se escribe "ha habido".',
    type: 'spelling',
  },
  {
    pattern: /\ba\s+hecho\b/gi,
    replacement: 'ha hecho',
    message: 'Forma del verbo haber: "ha hecho".',
    type: 'spelling',
  },
  {
    pattern: /\bpor\s+favor\s+adjunto\b/gi,
    replacement: 'adjunto',
    message: 'Estilo directo: más conciso usar solo "adjunto".',
    type: 'style',
  },
  {
    pattern: /\ba\s+d[ií]a\s+de\s+hoy\b/gi,
    replacement: 'hoy',
    message: 'Redundancia estilística: prefiere "hoy" o "actualmente".',
    type: 'style',
  },
  {
    pattern: /\ben\s+base\s+a\b/gi,
    replacement: 'con base en',
    message: 'Recomendación RAE: prefiere "con base en" o "a juzgar por".',
    type: 'style',
  },
  {
    pattern: /\bdar\s+comienzo\b/gi,
    replacement: 'comenzar',
    message: 'Locución verbal evitable: prefiere "comenzar" o "iniciar".',
    type: 'style',
  },
];

export function analyzeGrammarAndStyle(rawText: string): GrammarStyleIssue[] {
  if (!rawText || !rawText.trim()) return [];
  const issues: GrammarStyleIssue[] = [];
  let idCounter = 1;

  // 1. Check duplicate words (e.g. "el el", "que que")
  const duplicateRegex = /\b([a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{2,})\s+\1\b/gi;
  let match: RegExpExecArray | null;
  while ((match = duplicateRegex.exec(rawText)) !== null) {
    issues.push({
      id: `dup-${idCounter++}`,
      type: 'duplicate',
      text: match[0],
      replacement: match[1],
      message: `Palabra repetida de forma consecutiva ("${match[1]}").`,
    });
  }

  // 2. Common spelling and style patterns
  for (const item of COMMON_REPLACEMENTS) {
    const regex = new RegExp(item.pattern.source, item.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(rawText)) !== null) {
      issues.push({
        id: `rule-${idCounter++}`,
        type: item.type,
        text: m[0],
        replacement: item.replacement,
        message: item.message,
      });
    }
  }

  // 3. Excessively long sentences (>38 words)
  const sentences = rawText.split(/[.!?]\s+/);
  for (const s of sentences) {
    const words = s.trim().split(/\s+/).filter(Boolean);
    if (words.length > 38) {
      issues.push({
        id: `len-${idCounter++}`,
        type: 'clarity',
        text: words.slice(0, 5).join(' ') + '...',
        replacement: '',
        message: `Frase muy larga (${words.length} palabras). Considera dividirla para mejorar legibilidad.`,
      });
    }
  }

  return issues;
}
