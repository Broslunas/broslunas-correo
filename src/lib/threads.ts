import { Db } from 'mongodb';

export function normalizeSubject(subject: string = ''): string {
  return subject.replace(/^(\s*(re|fwd|fw|rv|res|enc)(\[\d+\])?\s*:\s*)+/i, '').trim().toLowerCase();
}

export function extractMessageIds(inReplyTo?: string, references?: string | string[]): string[] {
  const rawList: string[] = [];
  if (inReplyTo) rawList.push(inReplyTo);
  if (references) {
    if (Array.isArray(references)) rawList.push(...references.map(String));
    else rawList.push(String(references));
  }

  const ids = new Set<string>();
  for (const raw of rawList) {
    const tokens = raw.match(/<[^>]+>|[^\s<>]+/g) || [];
    for (const token of tokens) {
      const clean = token.replace(/^<|>$/g, '').trim();
      if (clean) {
        ids.add(clean);
        ids.add(`<${clean}>`);
      }
    }
  }
  return Array.from(ids);
}

// ponytail: basic thread linking by in-reply-to / references / subject; upgrade to full RFC 5256 threading if cross-branch DAG needed
export async function resolveThreadId(
  db: Db,
  params: { messageId?: string; inReplyTo?: string; references?: string | string[]; subject?: string }
): Promise<string> {
  const refIds = extractMessageIds(params.inReplyTo, params.references);
  if (refIds.length > 0) {
    const parent = await db.collection('emails').findOne(
      { messageId: { $in: refIds } },
      { projection: { threadId: 1 } }
    );
    if (parent?.threadId) return parent.threadId;
  }

  const normSub = normalizeSubject(params.subject);
  if (normSub) {
    const matched = await db.collection('emails').findOne(
      { normalizedSubject: normSub },
      { sort: { date: -1 }, projection: { threadId: 1 } }
    );
    if (matched?.threadId) return matched.threadId;
  }

  return crypto.randomUUID();
}
