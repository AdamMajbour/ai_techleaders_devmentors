import { GeneratorError, type AnswerGenerationInput, type AnswerGenerator, type GenerationCandidate } from '../answer-generator.port';

/** Deterministic adapter for tests and rehearsal; production config rejects this adapter by default. */
export class MockAnswerGenerator implements AnswerGenerator {
  async generate(input: AnswerGenerationInput): Promise<GenerationCandidate> {
    const trigger = input.question.match(/\[mock:(unavailable|refused|invalid|unanswerable)\]/i)?.[1]?.toLowerCase();
    if (trigger === 'unavailable') throw new GeneratorError('unavailable', 'Mock provider unavailable.');
    if (trigger === 'refused') throw new GeneratorError('refused', 'Mock provider refused the request.');
    if (trigger === 'unanswerable') {
      return { answerable: false, answer: '', citationIds: [], modelId: 'mock-v1', inputTokens: 1, outputTokens: 0 };
    }
    if (input.notes.length === 0) throw new GeneratorError('unanswerable', 'No source notes are available.');
    return {
      answerable: true,
      answer: trigger === 'invalid' ? 'A deterministic mock answer.' : `A mock answer based on ${input.notes[0].title}.`,
      citationIds: trigger === 'invalid' ? ['unknown-note'] : [input.notes[0].id],
      modelId: 'mock-v1',
      inputTokens: Math.ceil((input.question.length + input.notes.reduce((total, note) => total + note.body.length, 0)) / 4),
      outputTokens: 16,
    };
  }
}
