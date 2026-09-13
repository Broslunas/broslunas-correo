// ponytail: regex tokenizer covers standard operators; upgrade to full boolean AST if AND/OR parentheses needed
export function parseSearchQuery(rawQuery: string): any[] {
  const clauses: any[] = [];
  if (!rawQuery || typeof rawQuery !== 'string') return clauses;

  const operatorRegex = /\b(from|to|subject|has|is|before|after):(?:"([^"]+)"|(\S+))/gi;
  let match: RegExpExecArray | null;

  while ((match = operatorRegex.exec(rawQuery)) !== null) {
    const key = match[1].toLowerCase();
    const val = (match[2] || match[3] || '').trim();
    if (!val) continue;

    switch (key) {
      case 'from':
        clauses.push({
          $or: [
            { 'from.address': new RegExp(escapeRegex(val), 'i') },
            { 'from.name': new RegExp(escapeRegex(val), 'i') },
          ],
        });
        break;
      case 'to':
        clauses.push({
          $or: [
            { to: new RegExp(escapeRegex(val), 'i') },
            { cc: new RegExp(escapeRegex(val), 'i') },
            { bcc: new RegExp(escapeRegex(val), 'i') },
          ],
        });
        break;
      case 'subject':
        clauses.push({ subject: new RegExp(escapeRegex(val), 'i') });
        break;
      case 'has':
        if (val.toLowerCase() === 'attachment' || val.toLowerCase() === 'attachments') {
          clauses.push({ 'attachments.0': { $exists: true } });
        }
        break;
      case 'is':
        if (val.toLowerCase() === 'unread') {
          clauses.push({ isRead: false });
        } else if (val.toLowerCase() === 'read') {
          clauses.push({ isRead: true });
        } else if (val.toLowerCase() === 'starred') {
          clauses.push({ isStarred: true });
        }
        break;
      case 'before': {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          clauses.push({ date: { $lte: d } });
        }
        break;
      }
      case 'after': {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          clauses.push({ date: { $gte: d } });
        }
        break;
      }
    }
  }

  // Extract leftover free text
  const freeText = rawQuery.replace(operatorRegex, '').trim();
  if (freeText) {
    const regex = new RegExp(escapeRegex(freeText), 'i');
    clauses.push({
      $or: [
        { subject: regex },
        { 'body.text': regex },
        { 'from.name': regex },
        { 'from.address': regex },
        { to: regex },
      ],
    });
  }

  return clauses;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
