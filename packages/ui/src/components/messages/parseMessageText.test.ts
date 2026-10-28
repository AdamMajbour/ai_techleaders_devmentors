import { parseMessageText } from './parseMessageText';

describe('parseMessageText', () => {
  it('returns plain text as one text segment', () => {
    expect(parseMessageText('Hello there')).toEqual([{ type: 'text', value: 'Hello there' }]);
  });

  it('splits text and a fenced code block', () => {
    const segments = parseMessageText('Try this:\n```yaml\nreplicas: 3\n```\nThen reload.');
    expect(segments).toEqual([
      { type: 'text', value: 'Try this:' },
      { type: 'code', value: 'replicas: 3' },
      { type: 'text', value: 'Then reload.' },
    ]);
  });

  it('handles several fences and keeps the code exactly, including indentation', () => {
    const segments = parseMessageText('```\n  a: 1\n    b: 2\n```\nand\n```sh\nls\n```');
    expect(segments.filter((s) => s.type === 'code').map((s) => s.value)).toEqual(['  a: 1\n    b: 2', 'ls']);
  });

  it('leaves an unclosed fence as plain text instead of swallowing the rest', () => {
    const segments = parseMessageText('Look:\n```\nunclosed code');
    expect(segments).toEqual([{ type: 'text', value: 'Look:\n```\nunclosed code' }]);
  });

  it('does not format anything else: bold markers stay literal', () => {
    expect(parseMessageText('**not bold** and `inline`')).toEqual([{ type: 'text', value: '**not bold** and `inline`' }]);
  });

  it('ignores an empty fence and an empty message', () => {
    expect(parseMessageText('```\n```')).toEqual([]);
    expect(parseMessageText('')).toEqual([]);
  });
});
