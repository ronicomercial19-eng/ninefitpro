/** Legacy replies sometimes escaped Markdown punctuation before persistence. */
export function normalizeRonMarkdown(content: string): string {
  return content.replace(/\\{1,2}([*#_`])/g, '$1');
}
