import assert from 'node:assert';
import { normalizeSubject, extractMessageIds } from '../src/lib/threads';
import { parseSearchQuery } from '../src/lib/search-parser';
import { PREDEFINED_TEMPLATES } from '../src/lib/templates';

// 1. Test subject normalization
assert.strictEqual(normalizeSubject('Re: Proyecto Alpha'), 'proyecto alpha');
assert.strictEqual(normalizeSubject('Fwd: Re: Rv: PRESUPUESTO 2026'), 'presupuesto 2026');
assert.strictEqual(normalizeSubject('  re:  fwd:   re[2]:  hola mundo  '), 'hola mundo');
assert.strictEqual(normalizeSubject(''), '');
console.log('✔ Subject normalization tests passed');

// 2. Test message ID extraction
const ids = extractMessageIds('<msg1@example.com>', '<msg2@example.com> msg3@example.com');
assert.ok(ids.includes('msg1@example.com') && ids.includes('<msg1@example.com>'));
assert.ok(ids.includes('msg2@example.com') && ids.includes('<msg2@example.com>'));
assert.ok(ids.includes('msg3@example.com') && ids.includes('<msg3@example.com>'));
assert.deepStrictEqual(extractMessageIds('', undefined), []);
console.log('✔ Message ID extraction tests passed');

// 3. Test search query parsing
const parsed = parseSearchQuery('from:ana to:juan subject:informe has:attachment is:unread is:starred after:2026-01-01 before:2026-03-01 urgente');
assert.strictEqual(parsed.length, 9);
assert.deepStrictEqual(parsed[3], { 'attachments.0': { $exists: true } });
assert.deepStrictEqual(parsed[4], { isRead: false });
assert.deepStrictEqual(parsed[5], { isStarred: true });
console.log('✔ Search query parser tests passed');

// 4. Test predefined templates
assert.strictEqual(PREDEFINED_TEMPLATES.length, 5);
PREDEFINED_TEMPLATES.forEach((tmpl) => {
  assert.ok(tmpl.id);
  assert.ok(tmpl.title);
  assert.ok(tmpl.bodyHtml.length > 20);
});
console.log('✔ Predefined templates tests passed');

console.log('\nAll feature self-checks passed successfully!');
