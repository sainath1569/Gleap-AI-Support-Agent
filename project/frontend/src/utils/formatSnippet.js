/**
 * Utility function to sanitize raw markdown into a clean, single-line text preview
 * for conversation list snippets in Messages.jsx.
 */
export function cleanSnippet(text, maxLength = 60) {
  if (!text) return 'New conversation';

  const cleaned = String(text)
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' [Code] ')
    // Convert table lines into clean bullet-separated text
    .replace(/\|[\s\S]*?\|/g, (match) => {
      const cells = match.split('|').map(c => c.trim()).filter(c => c && !c.match(/^:?-+:?$/));
      return cells.length > 0 ? cells.join(' • ') : ' ';
    })
    // Remove horizontal rules
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, ' ')
    // Remove markdown headers #, ##, ###
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italic markers
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove strikethrough
    .replace(/~~(.*?)~~/g, '$1')
    // Clean markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove blockquote markers
    .replace(/^>\s+/gm, '')
    // Replace newlines and multi-spaces with single space
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'New conversation';
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '...';
}
