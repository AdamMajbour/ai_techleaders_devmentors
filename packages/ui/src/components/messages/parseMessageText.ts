export type MessageSegment = { type: 'text' | 'code'; value: string };

const FENCE = /```[^\n`]*\n([\s\S]*?)\n?```/g;

/**
 * Splits a message into plain text and fenced code. Only triple-backtick fences are understood, nothing else
 * is formatted (E01 decision: plain text with code fences). An unclosed fence stays plain text.
 */
export function parseMessageText(text: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let last = 0;
  const pushText = (value: string) => {
    const trimmed = value.replace(/^\n+|\n+$/g, '');
    if (trimmed.trim()) segments.push({ type: 'text', value: trimmed });
  };
  for (const match of text.matchAll(FENCE)) {
    pushText(text.slice(last, match.index));
    if (match[1].trim()) segments.push({ type: 'code', value: match[1] });
    last = (match.index ?? 0) + match[0].length;
  }
  pushText(text.slice(last));
  return segments;
}
