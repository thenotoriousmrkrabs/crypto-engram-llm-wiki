export function firstMarkdownHeading(markdown) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : '';
}

export function firstParagraph(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith('---') && !part.startsWith('#')) || '';
}

export function compactWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
