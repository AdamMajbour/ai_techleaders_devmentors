import { GeneratorError } from './answer-generator.port';
import { MockAnswerGenerator } from './adapters/mock-answer-generator';
import { validateGeneration } from './validate-generation';

const notes = [
  { id: 'note-1', title: 'Arrays', mentorName: 'Mentor One', body: 'How arrays are indexed and traversed.' },
  { id: 'note-2', title: 'Graphs', mentorName: 'Mentor Two', body: 'A'.repeat(100) },
];

describe('validateGeneration', () => {
  const valid = {
    answerable: true,
    answer: 'Use a loop to visit each array element.',
    citationIds: ['note-1'],
    modelId: 'test-model',
    inputTokens: 10,
    outputTokens: 9,
  };

  it('accepts a supported answer with known citations', () => {
    expect(validateGeneration(valid, notes, { maxCitations: 3 })).toEqual(valid);
  });

  it('rejects unknown citations, empty citations, citation overflow, and oversized text', () => {
    expect(() => validateGeneration({ ...valid, citationIds: ['missing'] }, notes, { maxCitations: 3 })).toThrow(GeneratorError);
    expect(() => validateGeneration({ ...valid, citationIds: [] }, notes, { maxCitations: 3 })).toThrow(GeneratorError);
    expect(() => validateGeneration({ ...valid, citationIds: ['note-1', 'note-2'] }, notes, { maxCitations: 1 })).toThrow(GeneratorError);
    expect(() => validateGeneration({ ...valid, answer: 'x'.repeat(9) }, notes, { maxCitations: 3, maxAnswerChars: 8 })).toThrow(GeneratorError);
  });

  it('rejects a verbatim long run from a note that was not cited', () => {
    expect(() => validateGeneration({ ...valid, answer: 'A'.repeat(80) }, notes, { maxCitations: 3 })).toThrow(/uncited note/i);
  });

  it('maps an unanswerable result to its own failure kind', () => {
    expect(() => validateGeneration({ ...valid, answerable: false, answer: '', citationIds: [] }, notes, { maxCitations: 3 }))
      .toThrow(expect.objectContaining({ kind: 'unanswerable' }));
  });
});

describe('MockAnswerGenerator', () => {
  const generator = new MockAnswerGenerator();
  const input = { question: 'How do arrays work?', notes };

  it('generates a deterministic answer and citations', async () => {
    const output = await generator.generate(input);
    expect(output.citationIds).toEqual(['note-1']);
    expect(output.modelId).toBe('mock-v1');
  });

  it.each([
    ['unavailable', 'unavailable'],
    ['refused', 'refused'],
  ])('honors the mock %s failure mode', async (token, kind) => {
    await expect(generator.generate({ ...input, question: `[mock:${token}]` }))
      .rejects.toMatchObject({ kind });
  });

  it('returns invalid citation data for the invalid-output retry path', async () => {
    const output = await generator.generate({ ...input, question: '[mock:invalid]' });
    expect(() => validateGeneration(output, notes, { maxCitations: 3 })).toThrow(/unknown/i);
  });
});
