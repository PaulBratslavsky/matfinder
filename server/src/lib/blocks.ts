/** Strapi `blocks` rich text, reduced to what the MCP tools read and write: plain paragraphs. */
type TextNode = { type: 'text'; text: string };
type Block = { type: string; children?: (TextNode | Block | { type: string; [key: string]: unknown })[]; [key: string]: unknown };

/** Paragraphs separated by blank lines → one paragraph block each (single newlines stay as soft line breaks). */
export function textToBlocks(text: string): Block[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({ type: 'paragraph', children: [{ type: 'text', text: p }] }));
}

function nodeText(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.text === 'string') return node.text;
  return Array.isArray(node.children) ? node.children.map(nodeText).join('') : '';
}

/** Blocks → plain text, one paragraph per top-level block, separated by blank lines. */
export function blocksToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map(nodeText)
    .map((t) => t.trim())
    .filter(Boolean)
    .join('\n\n');
}
