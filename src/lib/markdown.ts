import DOMPurify from 'isomorphic-dompurify';

export function markdownToHtml(md: string): string {
  if (!md) return '';

  let html = md
    // Escape standard HTML entities first to prevent injection
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks ```lang\ncode\n```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre style="background:#f1f5f9;padding:12px;border-radius:6px;overflow-x:auto;"><code>${code.trim()}</code></pre>`;
  });

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 4px;border-radius:4px;">$1</code>');

  // Headers # to ######
  html = html.replace(/^###### (.*$)/gim, '<h6 style="font-size:12px;font-weight:bold;margin:8px 0;">$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5 style="font-size:13px;font-weight:bold;margin:8px 0;">$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4 style="font-size:14px;font-weight:bold;margin:10px 0;">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:16px;font-weight:bold;margin:12px 0;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:18px;font-weight:bold;margin:14px 0;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size:22px;font-weight:bold;margin:16px 0;">$1</h1>');

  // Blockquotes > quote
  html = html.replace(/^\> (.*$)/gim, '<blockquote style="border-left:3px solid #3b82f6;padding-left:10px;margin:8px 0;color:#64748b;">$1</blockquote>');

  // Bold **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

  // Italic *text* or _text_
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

  // Strikethrough ~~text~~
  html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');

  // Links [text](url)
  html = html.replace(/\[(.*?)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">$1</a>');

  // Unordered lists - or *
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li style="margin-left:20px;">$1</li>');

  // Ordered lists 1.
  html = html.replace(/^\s*(\d+)\.\s+(.*)$/gim, '<li style="margin-left:20px;">$2</li>');

  // Wrap consecutive <li> into <ul> or <ol>
  html = html.replace(/(<li.*<\/li>\n?)+/gim, '<ul style="padding-left:10px;margin:8px 0;">$&</ul>');

  // Line breaks to <br>
  html = html.replace(/\n\n/gim, '<br><br>');
  html = html.replace(/\n/gim, '<br>');

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target', 'src', 'style', 'class', 'id', 'href', 'rel'],
  });
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  let md = html;

  // Replace tags
  md = md.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  md = md.replace(/<del>(.*?)<\/del>/gi, '~~$1~~');
  md = md.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<ul[^>]*>/gi, '');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>/gi, '');
  md = md.replace(/<\/ol>/gi, '\n');
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n');
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  md = md.replace(/<br\s*[\/]?>/gi, '\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');
  md = md.replace(/<[^>]+>/g, ''); // strip remaining tags

  // Unescape html entities
  md = md
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  return md.trim();
}
