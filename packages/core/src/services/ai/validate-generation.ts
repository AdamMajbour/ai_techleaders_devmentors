import { z } from 'zod';
import { GeneratorError, type GenerationCandidate } from './answer-generator.port';

const candidateSchema = z.object({
  answerable: z.boolean(),
  answer: z.string(),
  citationIds: z.array(z.string()),
  modelId: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export interface GenerationValidationOptions {
  readonly maxCitations: number;
  readonly maxAnswerChars?: number;
  readonly uncitedOverlapChars?: number;
}

/** Validates untrusted model output before any answer or citations are persisted. */
export function validateGeneration(
  raw: unknown,
  sourceNotes: readonly { id: string; body: string }[],
  options: GenerationValidationOptions,
): GenerationCandidate {
  const parsed = candidateSchema.safeParse(raw);
  if (!parsed.success) throw new GeneratorError('invalid_output', 'The model returned an invalid response shape.');
  const candidate = parsed.data;
  if (!candidate.answerable) throw new GeneratorError('unanswerable', 'The question is not covered by the notes.');
  if (!candidate.answer.trim() || candidate.answer.length > (options.maxAnswerChars ?? 8000)) {
    throw new GeneratorError('invalid_output', 'The generated answer is empty or too long.');
  }
  if (candidate.citationIds.length === 0 || candidate.citationIds.length > options.maxCitations) {
    throw new GeneratorError('invalid_output', 'The generated answer has an invalid number of citations.');
  }
  const citedIds = new Set(candidate.citationIds);
  if (citedIds.size !== candidate.citationIds.length || candidate.citationIds.some((id) => !sourceNotes.some((note) => note.id === id))) {
    throw new GeneratorError('invalid_output', 'The generated answer cites an unknown or duplicate note.');
  }
  const overlapLength = options.uncitedOverlapChars ?? 80;
  if (overlapLength > 0) {
    for (const note of sourceNotes) {
      if (citedIds.has(note.id)) continue;
      for (let offset = 0; offset <= note.body.length - overlapLength; offset += 1) {
        if (candidate.answer.includes(note.body.slice(offset, offset + overlapLength))) {
          throw new GeneratorError('invalid_output', 'The generated answer copied text from an uncited note.');
        }
      }
    }
  }
  return candidate;
}
